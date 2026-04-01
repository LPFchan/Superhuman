import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync, StatementSync } from "node:sqlite";
import { loadGatewaySessionRow } from "../gateway/session-utils.js";
import { requireNodeSqlite } from "../infra/node-sqlite.js";
import type {
  ContextPressureSnapshot,
  ConversationWindow,
  ConversationWindowMessage,
  StateActionAppend,
  StateArtifactAppend,
  StateMessageAppend,
  StateSessionRecord,
  StateSessionUpsert,
  StateStore,
} from "./runtime-seams.js";

const STATE_DIR_MODE = 0o700;
const STATE_FILE_MODE = 0o600;
const SQLITE_SIDECAR_SUFFIXES = ["", "-shm", "-wal"] as const;
const DEFAULT_CONTEXT_LIMIT = 200_000;

type StateStoreStatements = {
  upsertSession: StatementSync;
  ensureSession: StatementSync;
  insertMessage: StatementSync;
  touchSessionAfterMessage: StatementSync;
  upsertAction: StatementSync;
  upsertArtifact: StatementSync;
  selectSession: StatementSync;
  selectArtifacts: StatementSync;
  selectConversationWindow: StatementSync;
  selectApproxTokens: StatementSync;
};

type StateDatabase = {
  db: DatabaseSync;
  path: string;
  statements: StateStoreStatements;
};

type SessionRow = {
  session_key: string;
  session_id: string | null;
  agent_id: string;
  workspace_dir: string;
  status: string | null;
  started_at: number | null;
  ended_at: number | null;
  updated_at: number | null;
  display_name: string | null;
  label: string | null;
  parent_session_key: string | null;
  last_message_id: string | null;
  last_user_turn_id: string | null;
  last_assistant_turn_id: string | null;
  message_count: number;
};

type MessageRow = {
  message_id: string;
  role: string;
  content_text: string;
  created_at: number;
  approx_tokens: number;
  transcript_message_id: string | null;
  sequence: number | null;
};

type ArtifactRow = {
  artifact_id: string;
  session_key: string | null;
  message_id: string | null;
  kind: string;
  label: string | null;
  location: string | null;
  created_at: number;
};

const openDatabases = new Map<string, StateDatabase>();

function normalizePathForComparison(input: string): string {
  const resolved = path.resolve(input);
  try {
    const real = fs.realpathSync.native(resolved);
    return process.platform === "win32" ? real.toLowerCase() : real;
  } catch {
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  }
}

function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

function ensureStatePermissions(dbPath: string): void {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true, mode: STATE_DIR_MODE });
  fs.chmodSync(dir, STATE_DIR_MODE);
  for (const suffix of SQLITE_SIDECAR_SUFFIXES) {
    const candidate = `${dbPath}${suffix}`;
    if (!fs.existsSync(candidate)) {
      continue;
    }
    fs.chmodSync(candidate, STATE_FILE_MODE);
  }
}

function ensureSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_key TEXT PRIMARY KEY,
      session_id TEXT,
      agent_id TEXT NOT NULL,
      workspace_dir TEXT NOT NULL,
      status TEXT,
      started_at INTEGER,
      ended_at INTEGER,
      updated_at INTEGER,
      display_name TEXT,
      label TEXT,
      parent_session_key TEXT,
      last_message_id TEXT,
      last_user_turn_id TEXT,
      last_assistant_turn_id TEXT,
      message_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL UNIQUE,
      session_key TEXT NOT NULL,
      role TEXT NOT NULL,
      content_text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      approx_tokens INTEGER NOT NULL,
      transcript_message_id TEXT,
      run_id TEXT,
      sequence INTEGER,
      FOREIGN KEY(session_key) REFERENCES sessions(session_key)
    );

    CREATE TABLE IF NOT EXISTS actions (
      action_id TEXT PRIMARY KEY,
      session_key TEXT,
      run_id TEXT,
      action_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      artifact_id TEXT PRIMARY KEY,
      session_key TEXT,
      message_id TEXT,
      kind TEXT NOT NULL,
      label TEXT,
      location TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content_text,
      content='messages',
      content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content_text) VALUES (new.rowid, new.content_text);
    END;

    CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content_text)
      VALUES('delete', old.rowid, old.content_text);
    END;

    CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content_text)
      VALUES('delete', old.rowid, old.content_text);
      INSERT INTO messages_fts(rowid, content_text) VALUES (new.rowid, new.content_text);
    END;

    CREATE INDEX IF NOT EXISTS idx_messages_session_created
      ON messages(session_key, created_at, rowid);
    CREATE INDEX IF NOT EXISTS idx_actions_session_created
      ON actions(session_key, created_at);
    CREATE INDEX IF NOT EXISTS idx_artifacts_session_created
      ON artifacts(session_key, created_at);
  `);
}

function createStatements(db: DatabaseSync): StateStoreStatements {
  return {
    upsertSession: db.prepare(`
      INSERT INTO sessions (
        session_key,
        session_id,
        agent_id,
        workspace_dir,
        status,
        started_at,
        ended_at,
        updated_at,
        display_name,
        label,
        parent_session_key,
        last_message_id,
        last_user_turn_id,
        last_assistant_turn_id,
        message_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_key) DO UPDATE SET
        session_id = COALESCE(excluded.session_id, sessions.session_id),
        agent_id = excluded.agent_id,
        workspace_dir = excluded.workspace_dir,
        status = COALESCE(excluded.status, sessions.status),
        started_at = COALESCE(excluded.started_at, sessions.started_at),
        ended_at = COALESCE(excluded.ended_at, sessions.ended_at),
        updated_at = CASE
          WHEN excluded.updated_at IS NULL THEN sessions.updated_at
          WHEN sessions.updated_at IS NULL THEN excluded.updated_at
          WHEN excluded.updated_at > sessions.updated_at THEN excluded.updated_at
          ELSE sessions.updated_at
        END,
        display_name = COALESCE(excluded.display_name, sessions.display_name),
        label = COALESCE(excluded.label, sessions.label),
        parent_session_key = COALESCE(excluded.parent_session_key, sessions.parent_session_key),
        last_message_id = COALESCE(excluded.last_message_id, sessions.last_message_id),
        last_user_turn_id = COALESCE(excluded.last_user_turn_id, sessions.last_user_turn_id),
        last_assistant_turn_id = COALESCE(
          excluded.last_assistant_turn_id,
          sessions.last_assistant_turn_id
        ),
        message_count = CASE
          WHEN excluded.message_count IS NULL OR excluded.message_count = 0 THEN sessions.message_count
          ELSE excluded.message_count
        END
    `),
    ensureSession: db.prepare(`
      INSERT INTO sessions (session_key, agent_id, workspace_dir, message_count)
      VALUES (?, ?, ?, 0)
      ON CONFLICT(session_key) DO NOTHING
    `),
    insertMessage: db.prepare(`
      INSERT OR IGNORE INTO messages (
        message_id,
        session_key,
        role,
        content_text,
        created_at,
        approx_tokens,
        transcript_message_id,
        run_id,
        sequence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    touchSessionAfterMessage: db.prepare(`
      UPDATE sessions SET
        updated_at = CASE
          WHEN updated_at IS NULL OR updated_at < ? THEN ?
          ELSE updated_at
        END,
        last_message_id = ?,
        last_user_turn_id = CASE WHEN ? IS NOT NULL THEN ? ELSE last_user_turn_id END,
        last_assistant_turn_id = CASE WHEN ? IS NOT NULL THEN ? ELSE last_assistant_turn_id END,
        message_count = (SELECT COUNT(*) FROM messages WHERE session_key = ?)
      WHERE session_key = ?
    `),
    upsertAction: db.prepare(`
      INSERT INTO actions (
        action_id,
        session_key,
        run_id,
        action_type,
        summary,
        status,
        created_at,
        completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(action_id) DO UPDATE SET
        session_key = COALESCE(excluded.session_key, actions.session_key),
        run_id = COALESCE(excluded.run_id, actions.run_id),
        action_type = excluded.action_type,
        summary = excluded.summary,
        status = COALESCE(excluded.status, actions.status),
        created_at = excluded.created_at,
        completed_at = COALESCE(excluded.completed_at, actions.completed_at)
    `),
    upsertArtifact: db.prepare(`
      INSERT INTO artifacts (
        artifact_id,
        session_key,
        message_id,
        kind,
        label,
        location,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(artifact_id) DO UPDATE SET
        session_key = COALESCE(excluded.session_key, artifacts.session_key),
        message_id = COALESCE(excluded.message_id, artifacts.message_id),
        kind = excluded.kind,
        label = COALESCE(excluded.label, artifacts.label),
        location = COALESCE(excluded.location, artifacts.location),
        created_at = excluded.created_at
    `),
    selectSession: db.prepare(`
      SELECT
        session_key,
        session_id,
        agent_id,
        workspace_dir,
        status,
        started_at,
        ended_at,
        updated_at,
        display_name,
        label,
        parent_session_key,
        last_message_id,
        last_user_turn_id,
        last_assistant_turn_id,
        message_count
      FROM sessions
      WHERE session_key = ?
    `),
    selectArtifacts: db.prepare(`
      SELECT artifact_id, session_key, message_id, kind, label, location, created_at
      FROM artifacts
      WHERE (? IS NULL OR session_key = ?)
      ORDER BY created_at ASC, artifact_id ASC
    `),
    selectConversationWindow: db.prepare(`
      SELECT message_id, role, content_text, created_at, approx_tokens, transcript_message_id, sequence
      FROM messages
      WHERE session_key = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT ?
    `),
    selectApproxTokens: db.prepare(`
      SELECT COALESCE(SUM(approx_tokens), 0) AS total_tokens
      FROM messages
      WHERE session_key = ?
    `),
  };
}

function openStateDatabase(dbPath: string): StateDatabase {
  const normalizedPath = normalizePathForComparison(dbPath);
  const cached = openDatabases.get(normalizedPath);
  if (cached) {
    return cached;
  }
  ensureStatePermissions(dbPath);
  const { DatabaseSync } = requireNodeSqlite();
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  ensureSchema(db);
  ensureStatePermissions(dbPath);
  const opened = {
    db,
    path: normalizedPath,
    statements: createStatements(db),
  };
  openDatabases.set(normalizedPath, opened);
  return opened;
}

function mapSessionRow(row: SessionRow): StateSessionRecord {
  return {
    sessionKey: row.session_key,
    sessionId: row.session_id ?? undefined,
    agentId: row.agent_id,
    workspaceDir: row.workspace_dir,
    status: row.status ?? undefined,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    displayName: row.display_name ?? undefined,
    label: row.label ?? undefined,
    parentSessionKey: row.parent_session_key ?? undefined,
    lastMessageId: row.last_message_id ?? undefined,
    lastUserTurnId: row.last_user_turn_id ?? undefined,
    lastAssistantTurnId: row.last_assistant_turn_id ?? undefined,
    messageCount: row.message_count ?? 0,
  };
}

function mapConversationRows(
  sessionKey: string,
  rows: MessageRow[],
  session: SessionRow | null,
): ConversationWindow {
  const messages = rows.toReversed().map(
    (row): ConversationWindowMessage => ({
      messageId: row.message_id,
      role: row.role,
      contentText: row.content_text,
      createdAt: row.created_at,
      approxTokens: row.approx_tokens,
      transcriptMessageId: row.transcript_message_id ?? undefined,
      sequence: row.sequence ?? undefined,
    }),
  );
  return {
    sessionKey,
    messages,
    approximateTokenCount: messages.reduce((total, message) => total + message.approxTokens, 0),
    latestAssistantTurnId: session?.last_assistant_turn_id ?? undefined,
    latestUserTurnId: session?.last_user_turn_id ?? undefined,
  };
}

function mapArtifactRow(row: ArtifactRow): StateArtifactAppend {
  return {
    artifactId: row.artifact_id,
    sessionKey: row.session_key ?? undefined,
    messageId: row.message_id ?? undefined,
    kind: row.kind,
    label: row.label ?? undefined,
    location: row.location ?? undefined,
    createdAt: row.created_at,
  };
}

export function resolveSuperhumanStateDir(workspaceDir: string): string {
  return path.join(path.resolve(workspaceDir), ".superhuman");
}

export function resolveSuperhumanStateDbPath(workspaceDir: string): string {
  return path.join(resolveSuperhumanStateDir(workspaceDir), "state.db");
}

export function createSuperhumanStateStore(params: { workspaceDir: string }): StateStore {
  const dbPath = resolveSuperhumanStateDbPath(params.workspaceDir);
  const opened = openStateDatabase(dbPath);

  return {
    upsertSession(session: StateSessionUpsert): void {
      opened.statements.upsertSession.run(
        session.sessionKey,
        session.sessionId ?? null,
        session.agentId,
        session.workspaceDir,
        session.status ?? null,
        session.startedAt ?? null,
        session.endedAt ?? null,
        session.updatedAt ?? null,
        session.displayName ?? null,
        session.label ?? null,
        session.parentSessionKey ?? null,
        session.lastMessageId ?? null,
        session.lastUserTurnId ?? null,
        session.lastAssistantTurnId ?? null,
        session.messageCount ?? 0,
      );
    },

    appendMessage(message: StateMessageAppend): void {
      const approxTokens =
        typeof message.approxTokens === "number" && Number.isFinite(message.approxTokens)
          ? Math.max(0, Math.floor(message.approxTokens))
          : estimateTokens(message.contentText);
      const existingSession = opened.statements.selectSession.get(message.sessionKey) as
        | SessionRow
        | undefined;
      const workspaceDir = existingSession?.workspace_dir ?? params.workspaceDir;
      const agentId = existingSession?.agent_id ?? "main";
      opened.statements.ensureSession.run(message.sessionKey, agentId, workspaceDir);
      const result = opened.statements.insertMessage.run(
        message.messageId,
        message.sessionKey,
        message.role,
        message.contentText,
        message.createdAt,
        approxTokens,
        message.transcriptMessageId ?? null,
        message.runId ?? null,
        message.sequence ?? null,
      ) as { changes?: number };
      if ((result.changes ?? 0) === 0) {
        return;
      }
      const lastUserTurnId = message.role === "user" ? message.messageId : null;
      const lastAssistantTurnId = message.role === "assistant" ? message.messageId : null;
      opened.statements.touchSessionAfterMessage.run(
        message.createdAt,
        message.createdAt,
        message.messageId,
        lastUserTurnId,
        lastUserTurnId,
        lastAssistantTurnId,
        lastAssistantTurnId,
        message.sessionKey,
        message.sessionKey,
      );
    },

    appendAction(action: StateActionAppend): void {
      opened.statements.upsertAction.run(
        action.actionId,
        action.sessionKey ?? null,
        action.runId ?? null,
        action.actionType,
        action.summary,
        action.status ?? null,
        action.createdAt,
        action.completedAt ?? null,
      );
    },

    appendArtifact(artifact: StateArtifactAppend): void {
      opened.statements.upsertArtifact.run(
        artifact.artifactId,
        artifact.sessionKey ?? null,
        artifact.messageId ?? null,
        artifact.kind,
        artifact.label ?? null,
        artifact.location ?? null,
        artifact.createdAt,
      );
    },

    getSessionSnapshot(sessionKey: string): StateSessionRecord | null {
      const row = opened.statements.selectSession.get(sessionKey) as SessionRow | undefined;
      return row ? mapSessionRow(row) : null;
    },

    getArtifacts(paramsIn?: { sessionKey?: string }): StateArtifactAppend[] {
      const sessionKey = paramsIn?.sessionKey ?? null;
      const rows = opened.statements.selectArtifacts.all(sessionKey, sessionKey) as ArtifactRow[];
      return rows.map((row) => mapArtifactRow(row));
    },

    getConversationWindow(paramsIn: { sessionKey: string; limit?: number }): ConversationWindow {
      const limit =
        typeof paramsIn.limit === "number" && Number.isFinite(paramsIn.limit)
          ? Math.max(1, Math.floor(paramsIn.limit))
          : 200;
      const rows = opened.statements.selectConversationWindow.all(
        paramsIn.sessionKey,
        limit,
      ) as MessageRow[];
      const session = opened.statements.selectSession.get(paramsIn.sessionKey) as
        | SessionRow
        | undefined;
      return mapConversationRows(paramsIn.sessionKey, rows, session ?? null);
    },

    getContextPressureSnapshot(paramsIn: {
      sessionKey: string;
      effectiveContextLimit?: number;
    }): ContextPressureSnapshot {
      const totalRow = opened.statements.selectApproxTokens.get(paramsIn.sessionKey) as
        | { total_tokens?: number }
        | undefined;
      const session = loadGatewaySessionRow(paramsIn.sessionKey);
      const effectiveContextLimit =
        paramsIn.effectiveContextLimit ?? session?.contextTokens ?? DEFAULT_CONTEXT_LIMIT;
      const estimatedInputTokens = Math.max(0, totalRow?.total_tokens ?? 0);
      const remainingBudget = Math.max(0, effectiveContextLimit - estimatedInputTokens);
      return {
        sessionKey: paramsIn.sessionKey,
        estimatedInputTokens,
        effectiveContextLimit,
        remainingBudget,
        overflowRisk: estimatedInputTokens >= Math.floor(effectiveContextLimit * 0.9),
      };
    },

    close(): void {
      const cached = openDatabases.get(opened.path);
      if (!cached) {
        return;
      }
      cached.db.close();
      openDatabases.delete(opened.path);
    },
  };
}
