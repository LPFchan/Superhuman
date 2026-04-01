import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync, StatementSync } from "node:sqlite";
import { requireNodeSqlite } from "../infra/node-sqlite.js";
import { estimateStringChars, estimateTokensFromChars } from "../utils/cjk-chars.js";
import {
  buildSuperContextPressureSnapshot,
  resolveSuperContextPressureOptionsForSession,
} from "./super-context-pressure.js";
import type {
  AbortNodeStatus,
  AgentRuntimeStage,
  ContextPressureSnapshot,
  ConversationWindow,
  ConversationWindowMessage,
  RuntimeBudgetExhaustionReason,
  RuntimeInvocationMode,
  RuntimeInvocationStatus,
  StateActionAppend,
  StateActionRecord,
  StateAutomationEventAppend,
  StateAutomationEventRecord,
  StateAutomationLoopStateRecord,
  StateAutomationLoopStateUpsert,
  StateAbortNodeRecord,
  StateAbortNodeUpsert,
  StateArtifactAppend,
  StateArtifactRecord,
  StateContextCollapseCommittedSpan,
  StateContextCollapseDroppedSpan,
  StateContextCollapseLedgerRecord,
  StateContextCollapseLedgerUpsert,
  StateContextCollapseStagedSpan,
  StateContextPressureSnapshotAppend,
  StateEvidenceProvenance,
  StateIterationBudgetRecord,
  StateIterationBudgetUpsert,
  StateMessageAppend,
  StateRuntimeInvocationRecord,
  StateRuntimeInvocationUpsert,
  StateRuntimeStageEventAppend,
  StateSessionRecord,
  StateSessionUpsert,
  StateStructuredDetails,
  StateStore,
  StateTeamMemorySyncEventAppend,
  StateTeamMemorySyncEventRecord,
  StateTeamMemorySyncStateRecord,
  StateTeamMemorySyncStateUpsert,
  SuperPartialReadDescriptor,
  SuperSandboxRuntimeSnapshot,
  SuperShellCapabilitySnapshot,
  SuperVerificationStage,
  TeamMemorySyncDirection,
  TeamMemorySyncStatus,
  VerificationOutcome,
} from "./super-runtime-seams.js";

const STATE_DIR_MODE = 0o700;
const STATE_FILE_MODE = 0o600;
const SQLITE_SIDECAR_SUFFIXES = ["", "-shm", "-wal"] as const;

type StateStoreStatements = {
  upsertSession: StatementSync;
  ensureSession: StatementSync;
  insertMessage: StatementSync;
  touchSessionAfterMessage: StatementSync;
  upsertAction: StatementSync;
  selectActions: StatementSync;
  upsertArtifact: StatementSync;
  upsertAutomationLoopState: StatementSync;
  selectAutomationLoopState: StatementSync;
  insertAutomationEvent: StatementSync;
  selectAutomationEvents: StatementSync;
  upsertRuntimeInvocation: StatementSync;
  insertRuntimeStageEvent: StatementSync;
  upsertIterationBudget: StatementSync;
  upsertAbortNode: StatementSync;
  selectSession: StatementSync;
  selectArtifacts: StatementSync;
  selectRuntimeInvocation: StatementSync;
  selectRuntimeStageEvents: StatementSync;
  selectIterationBudgets: StatementSync;
  selectAbortNodes: StatementSync;
  selectConversationWindow: StatementSync;
  selectApproxTokens: StatementSync;
  insertContextPressureSnapshot: StatementSync;
  selectContextPressureSnapshots: StatementSync;
  upsertContextCollapseLedger: StatementSync;
  selectContextCollapseLedger: StatementSync;
  insertTeamMemorySyncEvent: StatementSync;
  selectTeamMemorySyncEvents: StatementSync;
  upsertTeamMemorySyncState: StatementSync;
  selectTeamMemorySyncState: StatementSync;
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
  execution_role: "lead" | "worker" | "subagent" | "remote_peer" | null;
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
  capability_snapshot_json: string | null;
  sandbox_runtime_json: string | null;
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
  provenance_json: string | null;
};

type ArtifactRow = {
  artifact_id: string;
  session_key: string | null;
  message_id: string | null;
  kind: string;
  label: string | null;
  location: string | null;
  created_at: number;
  provenance_json: string | null;
  relationship_kind: string | null;
  parent_artifact_id: string | null;
  preview_artifact_id: string | null;
  full_artifact_id: string | null;
  preview_bytes: number | null;
  full_bytes: number | null;
  storage_path: string | null;
  reopened_at: number | null;
  partial_read_json: string | null;
  verification_action_id: string | null;
  metadata_json: string | null;
};

type ActionRow = {
  action_id: string;
  session_key: string | null;
  run_id: string | null;
  action_type: string;
  action_kind: string | null;
  summary: string;
  status: string | null;
  created_at: number;
  completed_at: number | null;
  verification_stage: string | null;
  verifier_kind: string | null;
  command: string | null;
  exit_code: number | null;
  capability_snapshot_json: string | null;
  sandbox_runtime_json: string | null;
  source_artifact_id: string | null;
  target_artifact_id: string | null;
  details_json: string | null;
};

type AutomationLoopStateRow = {
  session_key: string;
  state: string;
  reason: string | null;
  wake_at: number | null;
  last_activity_at: number | null;
  last_wake_at: number | null;
  last_transition_at: number;
  updated_at: number;
};

type AutomationEventRow = {
  event_id: string;
  session_key: string | null;
  run_id: string | null;
  automation_kind: string;
  trigger_source: string;
  reason: string | null;
  plan_summary: string | null;
  action_summary: string | null;
  result_status: string;
  details_json: string | null;
  created_at: number;
};

type RuntimeInvocationRow = {
  run_id: string;
  session_key: string | null;
  session_id: string;
  workspace_dir: string;
  mode: RuntimeInvocationMode;
  trigger: string | null;
  status: RuntimeInvocationStatus;
  current_stage: AgentRuntimeStage | null;
  started_at: number;
  updated_at: number;
  ended_at: number | null;
  parent_run_id: string | null;
  root_budget_id: string;
  root_abort_node_id: string;
  latest_error: string | null;
  verification_outcome: VerificationOutcome | null;
  verification_required: number;
};

type RuntimeStageEventRow = {
  event_id: string;
  run_id: string;
  session_key: string | null;
  stage: AgentRuntimeStage;
  boundary: "enter" | "exit" | "mark";
  detail: string | null;
  created_at: number;
};

type IterationBudgetRow = {
  budget_id: string;
  run_id: string;
  parent_budget_id: string | null;
  label: string;
  max_iterations: number;
  used_iterations: number;
  refunded_iterations: number;
  exhausted_reason: RuntimeBudgetExhaustionReason | null;
  created_at: number;
  updated_at: number;
};

type AbortNodeRow = {
  abort_node_id: string;
  run_id: string;
  parent_abort_node_id: string | null;
  kind: string;
  label: string;
  status: AbortNodeStatus;
  created_at: number;
  updated_at: number;
  aborted_at: number | null;
  completed_at: number | null;
  reason: string | null;
};

type ContextPressureSnapshotRow = {
  session_key: string;
  run_id: string | null;
  created_at: number;
  estimated_input_tokens: number;
  configured_context_limit: number;
  reserved_output_tokens: number;
  effective_context_limit: number;
  autocompact_buffer_tokens: number;
  blocking_buffer_tokens: number;
  autocompact_threshold: number;
  blocking_threshold: number;
  remaining_budget: number;
  overflow_risk: number;
  compaction_action_refs_json: string | null;
};

type ContextCollapseLedgerRow = {
  session_key: string;
  run_id: string | null;
  updated_at: number;
  committed_spans_json: string | null;
  staged_spans_json: string | null;
  dropped_spans_json: string | null;
  restored_artifacts_json: string | null;
  recovery_mode: string | null;
  visible_context_state: string | null;
  tokens_before: number | null;
  tokens_after: number | null;
  operator_summary: string | null;
};

type TeamMemorySyncEventRow = {
  event_id: string;
  repo_root: string;
  direction: TeamMemorySyncDirection;
  status: TeamMemorySyncStatus;
  file_count: number;
  transfer_hash: string | null;
  details: string | null;
  created_at: number;
};

type TeamMemorySyncStateRow = {
  repo_root: string;
  remote_root: string | null;
  last_pulled_hash: string | null;
  last_pushed_hash: string | null;
  last_sync_at: number | null;
  last_pull_at: number | null;
  last_push_at: number | null;
  last_retry_at: number | null;
  conflict_retry_count: number;
  blocked_files_json: string | null;
  checksum_state_json: string | null;
  last_status: string | null;
  last_decision: string | null;
  updated_at: number;
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
  return Math.max(1, estimateTokensFromChars(estimateStringChars(trimmed)));
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

function ensureColumn(
  db: DatabaseSync,
  tableName: string,
  columnName: string,
  definition: string,
): void {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name?: string }>;
  if (columns.some((column) => column.name === columnName)) {
    return;
  }
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
}

function stringifyJson(value: unknown): string | null {
  if (!value) {
    return null;
  }
  return JSON.stringify(value);
}

function parseJsonValue<T>(value: string | null | undefined): T | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function ensureSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_key TEXT PRIMARY KEY,
      session_id TEXT,
      agent_id TEXT NOT NULL,
      workspace_dir TEXT NOT NULL,
      execution_role TEXT,
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
      capability_snapshot_json TEXT,
      sandbox_runtime_json TEXT,
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
      provenance_json TEXT,
      FOREIGN KEY(session_key) REFERENCES sessions(session_key)
    );

    CREATE TABLE IF NOT EXISTS actions (
      action_id TEXT PRIMARY KEY,
      session_key TEXT,
      run_id TEXT,
      action_type TEXT NOT NULL,
      action_kind TEXT,
      summary TEXT NOT NULL,
      status TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      verification_stage TEXT,
      verifier_kind TEXT,
      command TEXT,
      exit_code INTEGER,
      capability_snapshot_json TEXT,
      sandbox_runtime_json TEXT,
      source_artifact_id TEXT,
      target_artifact_id TEXT,
      details_json TEXT
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      artifact_id TEXT PRIMARY KEY,
      session_key TEXT,
      message_id TEXT,
      kind TEXT NOT NULL,
      label TEXT,
      location TEXT,
      created_at INTEGER NOT NULL,
      provenance_json TEXT,
      relationship_kind TEXT,
      parent_artifact_id TEXT,
      preview_artifact_id TEXT,
      full_artifact_id TEXT,
      preview_bytes INTEGER,
      full_bytes INTEGER,
      storage_path TEXT,
      reopened_at INTEGER,
      partial_read_json TEXT,
      verification_action_id TEXT,
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS automation_loop_state (
      session_key TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      reason TEXT,
      wake_at INTEGER,
      last_activity_at INTEGER,
      last_wake_at INTEGER,
      last_transition_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(session_key) REFERENCES sessions(session_key)
    );

    CREATE TABLE IF NOT EXISTS automation_events (
      event_id TEXT PRIMARY KEY,
      session_key TEXT,
      run_id TEXT,
      automation_kind TEXT NOT NULL,
      trigger_source TEXT NOT NULL,
      reason TEXT,
      plan_summary TEXT,
      action_summary TEXT,
      result_status TEXT NOT NULL,
      details_json TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(session_key) REFERENCES sessions(session_key)
    );

    CREATE TABLE IF NOT EXISTS runtime_invocations (
      run_id TEXT PRIMARY KEY,
      session_key TEXT,
      session_id TEXT NOT NULL,
      workspace_dir TEXT NOT NULL,
      mode TEXT NOT NULL,
      trigger TEXT,
      status TEXT NOT NULL,
      current_stage TEXT,
      started_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      ended_at INTEGER,
      parent_run_id TEXT,
      root_budget_id TEXT NOT NULL,
      root_abort_node_id TEXT NOT NULL,
      latest_error TEXT,
      verification_outcome TEXT,
      verification_required INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS runtime_stage_events (
      event_id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      session_key TEXT,
      stage TEXT NOT NULL,
      boundary TEXT NOT NULL,
      detail TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(run_id) REFERENCES runtime_invocations(run_id)
    );

    CREATE TABLE IF NOT EXISTS iteration_budgets (
      budget_id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      parent_budget_id TEXT,
      label TEXT NOT NULL,
      max_iterations INTEGER NOT NULL,
      used_iterations INTEGER NOT NULL,
      refunded_iterations INTEGER NOT NULL,
      exhausted_reason TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(run_id) REFERENCES runtime_invocations(run_id)
    );

    CREATE TABLE IF NOT EXISTS abort_nodes (
      abort_node_id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      parent_abort_node_id TEXT,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      aborted_at INTEGER,
      completed_at INTEGER,
      reason TEXT,
      FOREIGN KEY(run_id) REFERENCES runtime_invocations(run_id)
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
    CREATE INDEX IF NOT EXISTS idx_actions_session_kind_created
      ON actions(session_key, action_kind, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_artifacts_session_created
      ON artifacts(session_key, created_at);
    CREATE INDEX IF NOT EXISTS idx_automation_events_session_created
      ON automation_events(session_key, created_at DESC, event_id DESC);
    CREATE INDEX IF NOT EXISTS idx_runtime_stage_events_run_created
      ON runtime_stage_events(run_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_iteration_budgets_run_updated
      ON iteration_budgets(run_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_abort_nodes_run_updated
      ON abort_nodes(run_id, updated_at);

    CREATE TABLE IF NOT EXISTS context_pressure_snapshots (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      session_key TEXT NOT NULL,
      run_id TEXT,
      created_at INTEGER NOT NULL,
      estimated_input_tokens INTEGER NOT NULL,
      configured_context_limit INTEGER NOT NULL,
      reserved_output_tokens INTEGER NOT NULL,
      effective_context_limit INTEGER NOT NULL,
      autocompact_buffer_tokens INTEGER NOT NULL,
      blocking_buffer_tokens INTEGER NOT NULL,
      autocompact_threshold INTEGER NOT NULL,
      blocking_threshold INTEGER NOT NULL,
      remaining_budget INTEGER NOT NULL,
      overflow_risk INTEGER NOT NULL DEFAULT 0,
      compaction_action_refs_json TEXT,
      FOREIGN KEY(session_key) REFERENCES sessions(session_key)
    );

    CREATE INDEX IF NOT EXISTS idx_context_pressure_session_created
      ON context_pressure_snapshots(session_key, created_at DESC, rowid DESC);

    CREATE TABLE IF NOT EXISTS context_collapse_ledger (
      session_key TEXT PRIMARY KEY,
      run_id TEXT,
      updated_at INTEGER NOT NULL,
      committed_spans_json TEXT,
      staged_spans_json TEXT,
      dropped_spans_json TEXT,
      restored_artifacts_json TEXT,
      recovery_mode TEXT,
      visible_context_state TEXT,
      tokens_before INTEGER,
      tokens_after INTEGER,
      operator_summary TEXT,
      FOREIGN KEY(session_key) REFERENCES sessions(session_key)
    );

    CREATE TABLE IF NOT EXISTS team_memory_sync_events (
      event_id TEXT PRIMARY KEY,
      repo_root TEXT NOT NULL,
      direction TEXT NOT NULL,
      status TEXT NOT NULL,
      file_count INTEGER NOT NULL,
      transfer_hash TEXT,
      details TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_team_memory_sync_repo_created
      ON team_memory_sync_events(repo_root, created_at DESC, event_id DESC);

    CREATE TABLE IF NOT EXISTS team_memory_sync_state (
      repo_root TEXT PRIMARY KEY,
      remote_root TEXT,
      last_pulled_hash TEXT,
      last_pushed_hash TEXT,
      last_sync_at INTEGER,
      last_pull_at INTEGER,
      last_push_at INTEGER,
      last_retry_at INTEGER,
      conflict_retry_count INTEGER NOT NULL DEFAULT 0,
      blocked_files_json TEXT,
      checksum_state_json TEXT,
      last_status TEXT,
      last_decision TEXT,
      updated_at INTEGER NOT NULL
    );
  `);
  ensureColumn(db, "sessions", "execution_role", "TEXT");
  ensureColumn(db, "sessions", "capability_snapshot_json", "TEXT");
  ensureColumn(db, "sessions", "sandbox_runtime_json", "TEXT");
  ensureColumn(db, "messages", "provenance_json", "TEXT");
  ensureColumn(db, "actions", "action_kind", "TEXT");
  ensureColumn(db, "actions", "verification_stage", "TEXT");
  ensureColumn(db, "actions", "verifier_kind", "TEXT");
  ensureColumn(db, "actions", "command", "TEXT");
  ensureColumn(db, "actions", "exit_code", "INTEGER");
  ensureColumn(db, "actions", "capability_snapshot_json", "TEXT");
  ensureColumn(db, "actions", "sandbox_runtime_json", "TEXT");
  ensureColumn(db, "actions", "source_artifact_id", "TEXT");
  ensureColumn(db, "actions", "target_artifact_id", "TEXT");
  ensureColumn(db, "actions", "details_json", "TEXT");
  ensureColumn(db, "artifacts", "provenance_json", "TEXT");
  ensureColumn(db, "artifacts", "relationship_kind", "TEXT");
  ensureColumn(db, "artifacts", "parent_artifact_id", "TEXT");
  ensureColumn(db, "artifacts", "preview_artifact_id", "TEXT");
  ensureColumn(db, "artifacts", "full_artifact_id", "TEXT");
  ensureColumn(db, "artifacts", "preview_bytes", "INTEGER");
  ensureColumn(db, "artifacts", "full_bytes", "INTEGER");
  ensureColumn(db, "artifacts", "storage_path", "TEXT");
  ensureColumn(db, "artifacts", "reopened_at", "INTEGER");
  ensureColumn(db, "artifacts", "partial_read_json", "TEXT");
  ensureColumn(db, "artifacts", "verification_action_id", "TEXT");
  ensureColumn(db, "artifacts", "metadata_json", "TEXT");
  ensureColumn(db, "runtime_invocations", "verification_outcome", "TEXT");
  ensureColumn(db, "runtime_invocations", "verification_required", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(
    db,
    "context_pressure_snapshots",
    "autocompact_buffer_tokens",
    "INTEGER NOT NULL DEFAULT 0",
  );
  ensureColumn(
    db,
    "context_pressure_snapshots",
    "blocking_buffer_tokens",
    "INTEGER NOT NULL DEFAULT 0",
  );
  ensureColumn(db, "context_pressure_snapshots", "compaction_action_refs_json", "TEXT");
  ensureColumn(db, "context_collapse_ledger", "run_id", "TEXT");
  ensureColumn(db, "context_collapse_ledger", "committed_spans_json", "TEXT");
  ensureColumn(db, "context_collapse_ledger", "staged_spans_json", "TEXT");
  ensureColumn(db, "context_collapse_ledger", "dropped_spans_json", "TEXT");
  ensureColumn(db, "context_collapse_ledger", "restored_artifacts_json", "TEXT");
  ensureColumn(db, "context_collapse_ledger", "recovery_mode", "TEXT");
  ensureColumn(db, "context_collapse_ledger", "visible_context_state", "TEXT");
  ensureColumn(db, "context_collapse_ledger", "tokens_before", "INTEGER");
  ensureColumn(db, "context_collapse_ledger", "tokens_after", "INTEGER");
  ensureColumn(db, "context_collapse_ledger", "operator_summary", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "remote_root", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "last_pulled_hash", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "last_pushed_hash", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "last_sync_at", "INTEGER");
  ensureColumn(db, "team_memory_sync_state", "last_pull_at", "INTEGER");
  ensureColumn(db, "team_memory_sync_state", "last_push_at", "INTEGER");
  ensureColumn(db, "team_memory_sync_state", "last_retry_at", "INTEGER");
  ensureColumn(db, "team_memory_sync_state", "conflict_retry_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "team_memory_sync_state", "blocked_files_json", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "checksum_state_json", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "last_status", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "last_decision", "TEXT");
}

function createStatements(db: DatabaseSync): StateStoreStatements {
  return {
    upsertSession: db.prepare(`
      INSERT INTO sessions (
        session_key,
        session_id,
        agent_id,
        workspace_dir,
        execution_role,
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
        capability_snapshot_json,
        sandbox_runtime_json,
        message_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_key) DO UPDATE SET
        session_id = COALESCE(excluded.session_id, sessions.session_id),
        agent_id = excluded.agent_id,
        workspace_dir = excluded.workspace_dir,
        execution_role = COALESCE(excluded.execution_role, sessions.execution_role),
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
        capability_snapshot_json = COALESCE(
          excluded.capability_snapshot_json,
          sessions.capability_snapshot_json
        ),
        sandbox_runtime_json = COALESCE(
          excluded.sandbox_runtime_json,
          sessions.sandbox_runtime_json
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
        sequence,
        provenance_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        action_kind,
        summary,
        status,
        created_at,
        completed_at,
        verification_stage,
        verifier_kind,
        command,
        exit_code,
        capability_snapshot_json,
        sandbox_runtime_json,
        source_artifact_id,
        target_artifact_id,
        details_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(action_id) DO UPDATE SET
        session_key = COALESCE(excluded.session_key, actions.session_key),
        run_id = COALESCE(excluded.run_id, actions.run_id),
        action_type = excluded.action_type,
        action_kind = COALESCE(excluded.action_kind, actions.action_kind),
        summary = excluded.summary,
        status = COALESCE(excluded.status, actions.status),
        created_at = excluded.created_at,
        completed_at = COALESCE(excluded.completed_at, actions.completed_at),
        verification_stage = COALESCE(
          excluded.verification_stage,
          actions.verification_stage
        ),
        verifier_kind = COALESCE(excluded.verifier_kind, actions.verifier_kind),
        command = COALESCE(excluded.command, actions.command),
        exit_code = COALESCE(excluded.exit_code, actions.exit_code),
        capability_snapshot_json = COALESCE(
          excluded.capability_snapshot_json,
          actions.capability_snapshot_json
        ),
        sandbox_runtime_json = COALESCE(
          excluded.sandbox_runtime_json,
          actions.sandbox_runtime_json
        ),
        source_artifact_id = COALESCE(excluded.source_artifact_id, actions.source_artifact_id),
        target_artifact_id = COALESCE(excluded.target_artifact_id, actions.target_artifact_id),
        details_json = COALESCE(excluded.details_json, actions.details_json)
    `),
    selectActions: db.prepare(`
      SELECT
        action_id,
        session_key,
        run_id,
        action_type,
        action_kind,
        summary,
        status,
        created_at,
        completed_at,
        verification_stage,
        verifier_kind,
        command,
        exit_code,
        capability_snapshot_json,
        sandbox_runtime_json,
        source_artifact_id,
        target_artifact_id,
        details_json
      FROM actions
      WHERE (? IS NULL OR session_key = ?)
        AND (? IS NULL OR run_id = ?)
      ORDER BY created_at DESC, action_id DESC
      LIMIT ?
    `),
    upsertArtifact: db.prepare(`
      INSERT INTO artifacts (
        artifact_id,
        session_key,
        message_id,
        kind,
        label,
        location,
        created_at,
        provenance_json,
        relationship_kind,
        parent_artifact_id,
        preview_artifact_id,
        full_artifact_id,
        preview_bytes,
        full_bytes,
        storage_path,
        reopened_at,
        partial_read_json,
        verification_action_id,
        metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(artifact_id) DO UPDATE SET
        session_key = COALESCE(excluded.session_key, artifacts.session_key),
        message_id = COALESCE(excluded.message_id, artifacts.message_id),
        kind = excluded.kind,
        label = COALESCE(excluded.label, artifacts.label),
        location = COALESCE(excluded.location, artifacts.location),
        created_at = excluded.created_at,
        provenance_json = COALESCE(excluded.provenance_json, artifacts.provenance_json),
        relationship_kind = COALESCE(excluded.relationship_kind, artifacts.relationship_kind),
        parent_artifact_id = COALESCE(excluded.parent_artifact_id, artifacts.parent_artifact_id),
        preview_artifact_id = COALESCE(
          excluded.preview_artifact_id,
          artifacts.preview_artifact_id
        ),
        full_artifact_id = COALESCE(excluded.full_artifact_id, artifacts.full_artifact_id),
        preview_bytes = COALESCE(excluded.preview_bytes, artifacts.preview_bytes),
        full_bytes = COALESCE(excluded.full_bytes, artifacts.full_bytes),
        storage_path = COALESCE(excluded.storage_path, artifacts.storage_path),
        reopened_at = COALESCE(excluded.reopened_at, artifacts.reopened_at),
        partial_read_json = COALESCE(excluded.partial_read_json, artifacts.partial_read_json),
        verification_action_id = COALESCE(
          excluded.verification_action_id,
          artifacts.verification_action_id
        ),
        metadata_json = COALESCE(excluded.metadata_json, artifacts.metadata_json)
    `),
    upsertAutomationLoopState: db.prepare(`
      INSERT INTO automation_loop_state (
        session_key,
        state,
        reason,
        wake_at,
        last_activity_at,
        last_wake_at,
        last_transition_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_key) DO UPDATE SET
        state = excluded.state,
        reason = COALESCE(excluded.reason, automation_loop_state.reason),
        wake_at = excluded.wake_at,
        last_activity_at = COALESCE(
          excluded.last_activity_at,
          automation_loop_state.last_activity_at
        ),
        last_wake_at = COALESCE(excluded.last_wake_at, automation_loop_state.last_wake_at),
        last_transition_at = excluded.last_transition_at,
        updated_at = excluded.updated_at
    `),
    selectAutomationLoopState: db.prepare(`
      SELECT
        session_key,
        state,
        reason,
        wake_at,
        last_activity_at,
        last_wake_at,
        last_transition_at,
        updated_at
      FROM automation_loop_state
      WHERE session_key = ?
    `),
    insertAutomationEvent: db.prepare(`
      INSERT OR REPLACE INTO automation_events (
        event_id,
        session_key,
        run_id,
        automation_kind,
        trigger_source,
        reason,
        plan_summary,
        action_summary,
        result_status,
        details_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    selectAutomationEvents: db.prepare(`
      SELECT
        event_id,
        session_key,
        run_id,
        automation_kind,
        trigger_source,
        reason,
        plan_summary,
        action_summary,
        result_status,
        details_json,
        created_at
      FROM automation_events
      WHERE (? IS NULL OR session_key = ?)
      ORDER BY created_at DESC, event_id DESC
      LIMIT ?
    `),
    upsertRuntimeInvocation: db.prepare(`
      INSERT INTO runtime_invocations (
        run_id,
        session_key,
        session_id,
        workspace_dir,
        mode,
        trigger,
        status,
        current_stage,
        started_at,
        updated_at,
        ended_at,
        parent_run_id,
        root_budget_id,
        root_abort_node_id,
        latest_error,
        verification_outcome,
        verification_required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(run_id) DO UPDATE SET
        session_key = COALESCE(excluded.session_key, runtime_invocations.session_key),
        session_id = excluded.session_id,
        workspace_dir = excluded.workspace_dir,
        mode = excluded.mode,
        trigger = COALESCE(excluded.trigger, runtime_invocations.trigger),
        status = excluded.status,
        current_stage = COALESCE(excluded.current_stage, runtime_invocations.current_stage),
        started_at = runtime_invocations.started_at,
        updated_at = excluded.updated_at,
        ended_at = COALESCE(excluded.ended_at, runtime_invocations.ended_at),
        parent_run_id = COALESCE(excluded.parent_run_id, runtime_invocations.parent_run_id),
        root_budget_id = excluded.root_budget_id,
        root_abort_node_id = excluded.root_abort_node_id,
        latest_error = COALESCE(excluded.latest_error, runtime_invocations.latest_error),
        verification_outcome = COALESCE(
          excluded.verification_outcome,
          runtime_invocations.verification_outcome
        ),
        verification_required = MAX(
          runtime_invocations.verification_required,
          excluded.verification_required
        )
    `),
    insertRuntimeStageEvent: db.prepare(`
      INSERT OR IGNORE INTO runtime_stage_events (
        event_id,
        run_id,
        session_key,
        stage,
        boundary,
        detail,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    upsertIterationBudget: db.prepare(`
      INSERT INTO iteration_budgets (
        budget_id,
        run_id,
        parent_budget_id,
        label,
        max_iterations,
        used_iterations,
        refunded_iterations,
        exhausted_reason,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(budget_id) DO UPDATE SET
        run_id = excluded.run_id,
        parent_budget_id = COALESCE(excluded.parent_budget_id, iteration_budgets.parent_budget_id),
        label = excluded.label,
        max_iterations = excluded.max_iterations,
        used_iterations = excluded.used_iterations,
        refunded_iterations = excluded.refunded_iterations,
        exhausted_reason = COALESCE(excluded.exhausted_reason, iteration_budgets.exhausted_reason),
        created_at = iteration_budgets.created_at,
        updated_at = excluded.updated_at
    `),
    upsertAbortNode: db.prepare(`
      INSERT INTO abort_nodes (
        abort_node_id,
        run_id,
        parent_abort_node_id,
        kind,
        label,
        status,
        created_at,
        updated_at,
        aborted_at,
        completed_at,
        reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(abort_node_id) DO UPDATE SET
        run_id = excluded.run_id,
        parent_abort_node_id = COALESCE(excluded.parent_abort_node_id, abort_nodes.parent_abort_node_id),
        kind = excluded.kind,
        label = excluded.label,
        status = excluded.status,
        created_at = abort_nodes.created_at,
        updated_at = excluded.updated_at,
        aborted_at = COALESCE(excluded.aborted_at, abort_nodes.aborted_at),
        completed_at = COALESCE(excluded.completed_at, abort_nodes.completed_at),
        reason = COALESCE(excluded.reason, abort_nodes.reason)
    `),
    selectSession: db.prepare(`
      SELECT
        session_key,
        session_id,
        agent_id,
        workspace_dir,
        execution_role,
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
        capability_snapshot_json,
        sandbox_runtime_json,
        message_count
      FROM sessions
      WHERE session_key = ?
    `),
    selectArtifacts: db.prepare(`
      SELECT
        artifact_id,
        session_key,
        message_id,
        kind,
        label,
        location,
        created_at,
        provenance_json,
        relationship_kind,
        parent_artifact_id,
        preview_artifact_id,
        full_artifact_id,
        preview_bytes,
        full_bytes,
        storage_path,
        reopened_at,
        partial_read_json,
        verification_action_id,
        metadata_json
      FROM artifacts
      WHERE (? IS NULL OR session_key = ?)
      ORDER BY created_at ASC, artifact_id ASC
    `),
    selectRuntimeInvocation: db.prepare(`
      SELECT
        run_id,
        session_key,
        session_id,
        workspace_dir,
        mode,
        trigger,
        status,
        current_stage,
        started_at,
        updated_at,
        ended_at,
        parent_run_id,
        root_budget_id,
        root_abort_node_id,
        latest_error,
        verification_outcome,
        verification_required
      FROM runtime_invocations
      WHERE run_id = ?
    `),
    selectRuntimeStageEvents: db.prepare(`
      SELECT event_id, run_id, session_key, stage, boundary, detail, created_at
      FROM runtime_stage_events
      WHERE run_id = ?
      ORDER BY created_at ASC, event_id ASC
    `),
    selectIterationBudgets: db.prepare(`
      SELECT
        budget_id,
        run_id,
        parent_budget_id,
        label,
        max_iterations,
        used_iterations,
        refunded_iterations,
        exhausted_reason,
        created_at,
        updated_at
      FROM iteration_budgets
      WHERE run_id = ?
      ORDER BY created_at ASC, budget_id ASC
    `),
    selectAbortNodes: db.prepare(`
      SELECT
        abort_node_id,
        run_id,
        parent_abort_node_id,
        kind,
        label,
        status,
        created_at,
        updated_at,
        aborted_at,
        completed_at,
        reason
      FROM abort_nodes
      WHERE run_id = ?
      ORDER BY created_at ASC, abort_node_id ASC
    `),
    selectConversationWindow: db.prepare(`
      SELECT
        message_id,
        role,
        content_text,
        created_at,
        approx_tokens,
        transcript_message_id,
        sequence,
        provenance_json
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
    insertContextPressureSnapshot: db.prepare(`
      INSERT INTO context_pressure_snapshots (
        session_key,
        run_id,
        created_at,
        estimated_input_tokens,
        configured_context_limit,
        reserved_output_tokens,
        effective_context_limit,
        autocompact_buffer_tokens,
        blocking_buffer_tokens,
        autocompact_threshold,
        blocking_threshold,
        remaining_budget,
        overflow_risk,
        compaction_action_refs_json
      ) VALUES (
        $sessionKey,
        $runId,
        $createdAt,
        $estimatedInputTokens,
        $configuredContextLimit,
        $reservedOutputTokens,
        $effectiveContextLimit,
        $autocompactBufferTokens,
        $blockingBufferTokens,
        $autocompactThreshold,
        $blockingThreshold,
        $remainingBudget,
        $overflowRisk,
        $compactionActionRefsJson
      )
    `),
    selectContextPressureSnapshots: db.prepare(`
      SELECT
        session_key,
        run_id,
        created_at,
        estimated_input_tokens,
        configured_context_limit,
        reserved_output_tokens,
        effective_context_limit,
        autocompact_buffer_tokens,
        blocking_buffer_tokens,
        autocompact_threshold,
        blocking_threshold,
        remaining_budget,
        overflow_risk,
        compaction_action_refs_json
      FROM context_pressure_snapshots
      WHERE session_key = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT ?
    `),
    upsertContextCollapseLedger: db.prepare(`
      INSERT INTO context_collapse_ledger (
        session_key,
        run_id,
        updated_at,
        committed_spans_json,
        staged_spans_json,
        dropped_spans_json,
        restored_artifacts_json,
        recovery_mode,
        visible_context_state,
        tokens_before,
        tokens_after,
        operator_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_key) DO UPDATE SET
        run_id = COALESCE(excluded.run_id, context_collapse_ledger.run_id),
        updated_at = excluded.updated_at,
        committed_spans_json = COALESCE(
          excluded.committed_spans_json,
          context_collapse_ledger.committed_spans_json
        ),
        staged_spans_json = COALESCE(
          excluded.staged_spans_json,
          context_collapse_ledger.staged_spans_json
        ),
        dropped_spans_json = COALESCE(
          excluded.dropped_spans_json,
          context_collapse_ledger.dropped_spans_json
        ),
        restored_artifacts_json = COALESCE(
          excluded.restored_artifacts_json,
          context_collapse_ledger.restored_artifacts_json
        ),
        recovery_mode = COALESCE(excluded.recovery_mode, context_collapse_ledger.recovery_mode),
        visible_context_state = COALESCE(
          excluded.visible_context_state,
          context_collapse_ledger.visible_context_state
        ),
        tokens_before = COALESCE(excluded.tokens_before, context_collapse_ledger.tokens_before),
        tokens_after = COALESCE(excluded.tokens_after, context_collapse_ledger.tokens_after),
        operator_summary = COALESCE(
          excluded.operator_summary,
          context_collapse_ledger.operator_summary
        )
    `),
    selectContextCollapseLedger: db.prepare(`
      SELECT
        session_key,
        run_id,
        updated_at,
        committed_spans_json,
        staged_spans_json,
        dropped_spans_json,
        restored_artifacts_json,
        recovery_mode,
        visible_context_state,
        tokens_before,
        tokens_after,
        operator_summary
      FROM context_collapse_ledger
      WHERE session_key = ?
    `),
    insertTeamMemorySyncEvent: db.prepare(`
      INSERT OR REPLACE INTO team_memory_sync_events (
        event_id,
        repo_root,
        direction,
        status,
        file_count,
        transfer_hash,
        details,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    selectTeamMemorySyncEvents: db.prepare(`
      SELECT
        event_id,
        repo_root,
        direction,
        status,
        file_count,
        transfer_hash,
        details,
        created_at
      FROM team_memory_sync_events
      WHERE (? IS NULL OR repo_root = ?)
      ORDER BY created_at DESC, event_id DESC
      LIMIT ?
    `),
    upsertTeamMemorySyncState: db.prepare(`
      INSERT INTO team_memory_sync_state (
        repo_root,
        remote_root,
        last_pulled_hash,
        last_pushed_hash,
        last_sync_at,
        last_pull_at,
        last_push_at,
        last_retry_at,
        conflict_retry_count,
        blocked_files_json,
        checksum_state_json,
        last_status,
        last_decision,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(repo_root) DO UPDATE SET
        remote_root = COALESCE(excluded.remote_root, team_memory_sync_state.remote_root),
        last_pulled_hash = COALESCE(
          excluded.last_pulled_hash,
          team_memory_sync_state.last_pulled_hash
        ),
        last_pushed_hash = COALESCE(
          excluded.last_pushed_hash,
          team_memory_sync_state.last_pushed_hash
        ),
        last_sync_at = COALESCE(excluded.last_sync_at, team_memory_sync_state.last_sync_at),
        last_pull_at = COALESCE(excluded.last_pull_at, team_memory_sync_state.last_pull_at),
        last_push_at = COALESCE(excluded.last_push_at, team_memory_sync_state.last_push_at),
        last_retry_at = COALESCE(excluded.last_retry_at, team_memory_sync_state.last_retry_at),
        conflict_retry_count = excluded.conflict_retry_count,
        blocked_files_json = COALESCE(
          excluded.blocked_files_json,
          team_memory_sync_state.blocked_files_json
        ),
        checksum_state_json = COALESCE(
          excluded.checksum_state_json,
          team_memory_sync_state.checksum_state_json
        ),
        last_status = COALESCE(excluded.last_status, team_memory_sync_state.last_status),
        last_decision = COALESCE(excluded.last_decision, team_memory_sync_state.last_decision),
        updated_at = excluded.updated_at
    `),
    selectTeamMemorySyncState: db.prepare(`
      SELECT
        repo_root,
        remote_root,
        last_pulled_hash,
        last_pushed_hash,
        last_sync_at,
        last_pull_at,
        last_push_at,
        last_retry_at,
        conflict_retry_count,
        blocked_files_json,
        checksum_state_json,
        last_status,
        last_decision,
        updated_at
      FROM team_memory_sync_state
      WHERE repo_root = ?
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
    executionRole: row.execution_role ?? undefined,
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
    capabilitySnapshot: parseJsonValue<SuperShellCapabilitySnapshot>(row.capability_snapshot_json),
    sandboxRuntime: parseJsonValue<SuperSandboxRuntimeSnapshot>(row.sandbox_runtime_json),
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
      provenance: parseJsonValue<StateEvidenceProvenance>(row.provenance_json),
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

function mapActionRow(row: ActionRow): StateActionRecord {
  return {
    actionId: row.action_id,
    sessionKey: row.session_key ?? undefined,
    runId: row.run_id ?? undefined,
    actionType: row.action_type,
    actionKind: row.action_kind ?? undefined,
    summary: row.summary,
    status: row.status ?? undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    verificationStage: parseVerificationStage(row.verification_stage),
    verifierKind: row.verifier_kind ?? undefined,
    command: row.command ?? undefined,
    exitCode: row.exit_code ?? undefined,
    capabilitySnapshot: parseJsonValue<SuperShellCapabilitySnapshot>(row.capability_snapshot_json),
    sandboxRuntime: parseJsonValue<SuperSandboxRuntimeSnapshot>(row.sandbox_runtime_json),
    sourceArtifactId: row.source_artifact_id ?? undefined,
    targetArtifactId: row.target_artifact_id ?? undefined,
    details: parseJsonValue<StateStructuredDetails>(row.details_json),
  };
}

function parseVerificationStage(value: string | null): SuperVerificationStage | undefined {
  switch (value) {
    case "planned":
    case "running":
    case "completed":
    case "failed":
    case "skipped":
      return value;
    default:
      return undefined;
  }
}

function parseTeamMemorySyncStatus(value: string | null): TeamMemorySyncStatus | undefined {
  switch (value) {
    case "success":
    case "blocked":
    case "failed":
    case "skipped":
      return value;
    default:
      return undefined;
  }
}

function mapArtifactRow(row: ArtifactRow): StateArtifactRecord {
  return {
    artifactId: row.artifact_id,
    sessionKey: row.session_key ?? undefined,
    messageId: row.message_id ?? undefined,
    kind: row.kind,
    label: row.label ?? undefined,
    location: row.location ?? undefined,
    createdAt: row.created_at,
    provenance: parseJsonValue<StateEvidenceProvenance>(row.provenance_json),
    relationshipKind: row.relationship_kind ?? undefined,
    parentArtifactId: row.parent_artifact_id ?? undefined,
    previewArtifactId: row.preview_artifact_id ?? undefined,
    fullArtifactId: row.full_artifact_id ?? undefined,
    previewBytes: row.preview_bytes ?? undefined,
    fullBytes: row.full_bytes ?? undefined,
    storagePath: row.storage_path ?? undefined,
    reopenedAt: row.reopened_at ?? undefined,
    partialReadDescriptor: parseJsonValue<SuperPartialReadDescriptor>(row.partial_read_json),
    verificationActionId: row.verification_action_id ?? undefined,
    metadata: parseJsonValue<StateStructuredDetails>(row.metadata_json),
  };
}

function mapAutomationLoopStateRow(row: AutomationLoopStateRow): StateAutomationLoopStateRecord {
  return {
    sessionKey: row.session_key,
    state: row.state as StateAutomationLoopStateRecord["state"],
    reason: row.reason ?? undefined,
    wakeAt: row.wake_at ?? undefined,
    lastActivityAt: row.last_activity_at ?? undefined,
    lastWakeAt: row.last_wake_at ?? undefined,
    lastTransitionAt: row.last_transition_at,
    updatedAt: row.updated_at,
  };
}

function mapAutomationEventRow(row: AutomationEventRow): StateAutomationEventRecord {
  return {
    eventId: row.event_id,
    sessionKey: row.session_key ?? undefined,
    runId: row.run_id ?? undefined,
    automationKind: row.automation_kind,
    triggerSource: row.trigger_source,
    reason: row.reason ?? undefined,
    planSummary: row.plan_summary ?? undefined,
    actionSummary: row.action_summary ?? undefined,
    resultStatus: row.result_status,
    details: parseJsonValue<StateStructuredDetails>(row.details_json),
    createdAt: row.created_at,
  };
}

function mapRuntimeInvocationRow(row: RuntimeInvocationRow): StateRuntimeInvocationRecord {
  return {
    runId: row.run_id,
    sessionKey: row.session_key ?? undefined,
    sessionId: row.session_id,
    workspaceDir: row.workspace_dir,
    mode: row.mode,
    trigger: row.trigger ?? undefined,
    status: row.status,
    currentStage: row.current_stage ?? undefined,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    endedAt: row.ended_at ?? undefined,
    parentRunId: row.parent_run_id ?? undefined,
    rootBudgetId: row.root_budget_id,
    rootAbortNodeId: row.root_abort_node_id,
    latestError: row.latest_error ?? undefined,
    verificationOutcome: row.verification_outcome ?? undefined,
    verificationRequired: row.verification_required === 1,
  };
}

function mapRuntimeStageEventRow(row: RuntimeStageEventRow): StateRuntimeStageEventAppend {
  return {
    eventId: row.event_id,
    runId: row.run_id,
    sessionKey: row.session_key ?? undefined,
    stage: row.stage,
    boundary: row.boundary,
    detail: row.detail ?? undefined,
    createdAt: row.created_at,
  };
}

function mapIterationBudgetRow(row: IterationBudgetRow): StateIterationBudgetRecord {
  return {
    budgetId: row.budget_id,
    runId: row.run_id,
    parentBudgetId: row.parent_budget_id ?? undefined,
    label: row.label,
    maxIterations: row.max_iterations,
    usedIterations: row.used_iterations,
    refundedIterations: row.refunded_iterations,
    exhaustedReason: row.exhausted_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAbortNodeRow(row: AbortNodeRow): StateAbortNodeRecord {
  return {
    abortNodeId: row.abort_node_id,
    runId: row.run_id,
    parentAbortNodeId: row.parent_abort_node_id ?? undefined,
    kind: row.kind,
    label: row.label,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    abortedAt: row.aborted_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    reason: row.reason ?? undefined,
  };
}

function mapContextPressureSnapshotRow(row: ContextPressureSnapshotRow): ContextPressureSnapshot {
  return {
    sessionKey: row.session_key,
    runId: row.run_id ?? undefined,
    createdAt: row.created_at,
    estimatedInputTokens: row.estimated_input_tokens,
    configuredContextLimit: row.configured_context_limit,
    reservedOutputTokens: row.reserved_output_tokens,
    effectiveContextLimit: row.effective_context_limit,
    autocompactBufferTokens: row.autocompact_buffer_tokens,
    blockingBufferTokens: row.blocking_buffer_tokens,
    autocompactThreshold: row.autocompact_threshold,
    blockingThreshold: row.blocking_threshold,
    remainingBudget: row.remaining_budget,
    overflowRisk: row.overflow_risk === 1,
    persistedCompactionEventRefs: parseJsonValue<string[]>(row.compaction_action_refs_json) ?? [],
  };
}

function mapContextCollapseLedgerRow(
  row: ContextCollapseLedgerRow,
): StateContextCollapseLedgerRecord {
  return {
    sessionKey: row.session_key,
    runId: row.run_id ?? undefined,
    updatedAt: row.updated_at,
    committedSpans:
      parseJsonValue<StateContextCollapseCommittedSpan[]>(row.committed_spans_json) ?? [],
    stagedSpans: parseJsonValue<StateContextCollapseStagedSpan[]>(row.staged_spans_json) ?? [],
    droppedSpans: parseJsonValue<StateContextCollapseDroppedSpan[]>(row.dropped_spans_json) ?? [],
    restoredArtifacts: parseJsonValue<string[]>(row.restored_artifacts_json) ?? [],
    recoveryMode: row.recovery_mode ?? undefined,
    visibleContextState: row.visible_context_state ?? undefined,
    tokensBefore: row.tokens_before ?? undefined,
    tokensAfter: row.tokens_after ?? undefined,
    operatorSummary: row.operator_summary ?? undefined,
  };
}

function mapTeamMemorySyncEventRow(row: TeamMemorySyncEventRow): StateTeamMemorySyncEventRecord {
  return {
    eventId: row.event_id,
    repoRoot: row.repo_root,
    direction: row.direction,
    status: row.status,
    fileCount: row.file_count,
    transferHash: row.transfer_hash ?? undefined,
    details: row.details ?? undefined,
    createdAt: row.created_at,
  };
}

function mapTeamMemorySyncStateRow(row: TeamMemorySyncStateRow): StateTeamMemorySyncStateRecord {
  return {
    repoRoot: row.repo_root,
    remoteRoot: row.remote_root ?? undefined,
    lastPulledHash: row.last_pulled_hash ?? undefined,
    lastPushedHash: row.last_pushed_hash ?? undefined,
    lastSyncAt: row.last_sync_at ?? undefined,
    lastPullAt: row.last_pull_at ?? undefined,
    lastPushAt: row.last_push_at ?? undefined,
    lastRetryAt: row.last_retry_at ?? undefined,
    conflictRetryCount: row.conflict_retry_count,
    blockedFiles: parseJsonValue<string[]>(row.blocked_files_json) ?? [],
    checksumState: parseJsonValue<Record<string, string>>(row.checksum_state_json),
    lastStatus: parseTeamMemorySyncStatus(row.last_status),
    lastDecision: row.last_decision ?? undefined,
    updatedAt: row.updated_at,
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
        session.executionRole ?? null,
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
        stringifyJson(session.capabilitySnapshot),
        stringifyJson(session.sandboxRuntime),
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
        stringifyJson(message.provenance),
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
        action.actionKind ?? null,
        action.summary,
        action.status ?? null,
        action.createdAt,
        action.completedAt ?? null,
        action.verificationStage ?? null,
        action.verifierKind ?? null,
        action.command ?? null,
        action.exitCode ?? null,
        stringifyJson(action.capabilitySnapshot),
        stringifyJson(action.sandboxRuntime),
        action.sourceArtifactId ?? null,
        action.targetArtifactId ?? null,
        stringifyJson(action.details),
      );
    },

    getActions(paramsIn?: {
      sessionKey?: string;
      runId?: string;
      limit?: number;
    }): StateActionRecord[] {
      const limit =
        typeof paramsIn?.limit === "number" && Number.isFinite(paramsIn.limit)
          ? Math.max(1, Math.floor(paramsIn.limit))
          : 100;
      const sessionKey = paramsIn?.sessionKey?.trim() || null;
      const runId = paramsIn?.runId?.trim() || null;
      const rows = opened.statements.selectActions.all(
        sessionKey,
        sessionKey,
        runId,
        runId,
        limit,
      ) as ActionRow[];
      return rows.map((row) => mapActionRow(row));
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
        stringifyJson(artifact.provenance),
        artifact.relationshipKind ?? null,
        artifact.parentArtifactId ?? null,
        artifact.previewArtifactId ?? null,
        artifact.fullArtifactId ?? null,
        artifact.previewBytes ?? null,
        artifact.fullBytes ?? null,
        artifact.storagePath ?? null,
        artifact.reopenedAt ?? null,
        stringifyJson(artifact.partialReadDescriptor),
        artifact.verificationActionId ?? null,
        stringifyJson(artifact.metadata),
      );
    },

    upsertAutomationLoopState(loopState: StateAutomationLoopStateUpsert): void {
      const existingSession = opened.statements.selectSession.get(loopState.sessionKey) as
        | SessionRow
        | undefined;
      const workspaceDir = existingSession?.workspace_dir ?? params.workspaceDir;
      const agentId = existingSession?.agent_id ?? "main";
      opened.statements.ensureSession.run(loopState.sessionKey, agentId, workspaceDir);
      opened.statements.upsertAutomationLoopState.run(
        loopState.sessionKey,
        loopState.state,
        loopState.reason ?? null,
        loopState.wakeAt ?? null,
        loopState.lastActivityAt ?? null,
        loopState.lastWakeAt ?? null,
        loopState.lastTransitionAt,
        loopState.updatedAt,
      );
    },

    getAutomationLoopState(sessionKey: string): StateAutomationLoopStateRecord | null {
      const row = opened.statements.selectAutomationLoopState.get(sessionKey) as
        | AutomationLoopStateRow
        | undefined;
      return row ? mapAutomationLoopStateRow(row) : null;
    },

    appendAutomationEvent(event: StateAutomationEventAppend): void {
      if (event.sessionKey) {
        const existingSession = opened.statements.selectSession.get(event.sessionKey) as
          | SessionRow
          | undefined;
        const workspaceDir = existingSession?.workspace_dir ?? params.workspaceDir;
        const agentId = existingSession?.agent_id ?? "main";
        opened.statements.ensureSession.run(event.sessionKey, agentId, workspaceDir);
      }
      opened.statements.insertAutomationEvent.run(
        event.eventId,
        event.sessionKey ?? null,
        event.runId ?? null,
        event.automationKind,
        event.triggerSource,
        event.reason ?? null,
        event.planSummary ?? null,
        event.actionSummary ?? null,
        event.resultStatus,
        stringifyJson(event.details),
        event.createdAt,
      );
    },

    listAutomationEvents(paramsIn?: {
      sessionKey?: string;
      limit?: number;
    }): StateAutomationEventRecord[] {
      const limit =
        typeof paramsIn?.limit === "number" && Number.isFinite(paramsIn.limit)
          ? Math.max(1, Math.floor(paramsIn.limit))
          : 50;
      const sessionKey = paramsIn?.sessionKey?.trim() || null;
      const rows = opened.statements.selectAutomationEvents.all(
        sessionKey,
        sessionKey,
        limit,
      ) as AutomationEventRow[];
      return rows.map((row) => mapAutomationEventRow(row));
    },

    upsertRuntimeInvocation(invocation: StateRuntimeInvocationUpsert): void {
      opened.statements.upsertRuntimeInvocation.run(
        invocation.runId,
        invocation.sessionKey ?? null,
        invocation.sessionId,
        invocation.workspaceDir,
        invocation.mode,
        invocation.trigger ?? null,
        invocation.status,
        invocation.currentStage ?? null,
        invocation.startedAt,
        invocation.updatedAt,
        invocation.endedAt ?? null,
        invocation.parentRunId ?? null,
        invocation.rootBudgetId,
        invocation.rootAbortNodeId,
        invocation.latestError ?? null,
        invocation.verificationOutcome ?? null,
        invocation.verificationRequired ? 1 : 0,
      );
    },

    appendRuntimeStageEvent(event: StateRuntimeStageEventAppend): void {
      opened.statements.insertRuntimeStageEvent.run(
        event.eventId,
        event.runId,
        event.sessionKey ?? null,
        event.stage,
        event.boundary,
        event.detail ?? null,
        event.createdAt,
      );
    },

    upsertIterationBudget(budget: StateIterationBudgetUpsert): void {
      opened.statements.upsertIterationBudget.run(
        budget.budgetId,
        budget.runId,
        budget.parentBudgetId ?? null,
        budget.label,
        budget.maxIterations,
        budget.usedIterations,
        budget.refundedIterations,
        budget.exhaustedReason ?? null,
        budget.createdAt,
        budget.updatedAt,
      );
    },

    upsertAbortNode(node: StateAbortNodeUpsert): void {
      opened.statements.upsertAbortNode.run(
        node.abortNodeId,
        node.runId,
        node.parentAbortNodeId ?? null,
        node.kind,
        node.label,
        node.status,
        node.createdAt,
        node.updatedAt,
        node.abortedAt ?? null,
        node.completedAt ?? null,
        node.reason ?? null,
      );
    },

    getSessionSnapshot(sessionKey: string): StateSessionRecord | null {
      const row = opened.statements.selectSession.get(sessionKey) as SessionRow | undefined;
      return row ? mapSessionRow(row) : null;
    },

    getArtifacts(paramsIn?: { sessionKey?: string }): StateArtifactRecord[] {
      const sessionKey = paramsIn?.sessionKey ?? null;
      const rows = opened.statements.selectArtifacts.all(sessionKey, sessionKey) as ArtifactRow[];
      return rows.map((row) => mapArtifactRow(row));
    },

    getRuntimeInvocation(runId: string): StateRuntimeInvocationRecord | null {
      const row = opened.statements.selectRuntimeInvocation.get(runId) as
        | RuntimeInvocationRow
        | undefined;
      return row ? mapRuntimeInvocationRow(row) : null;
    },

    getRuntimeStageEvents(runId: string): StateRuntimeStageEventAppend[] {
      const rows = opened.statements.selectRuntimeStageEvents.all(runId) as RuntimeStageEventRow[];
      return rows.map((row) => mapRuntimeStageEventRow(row));
    },

    getIterationBudgets(runId: string): StateIterationBudgetRecord[] {
      const rows = opened.statements.selectIterationBudgets.all(runId) as IterationBudgetRow[];
      return rows.map((row) => mapIterationBudgetRow(row));
    },

    getAbortNodes(runId: string): StateAbortNodeRecord[] {
      const rows = opened.statements.selectAbortNodes.all(runId) as AbortNodeRow[];
      return rows.map((row) => mapAbortNodeRow(row));
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

    recordContextPressureSnapshot(
      paramsIn: StateContextPressureSnapshotAppend,
    ): ContextPressureSnapshot {
      const totalRow = opened.statements.selectApproxTokens.get(paramsIn.sessionKey) as
        | { total_tokens?: number }
        | undefined;
      const snapshot = buildSuperContextPressureSnapshot({
        estimatedInputTokens: Math.max(0, totalRow?.total_tokens ?? 0),
        createdAt: paramsIn.createdAt,
        runId: paramsIn.runId,
        persistedCompactionEventRefs: [...(paramsIn.persistedCompactionEventRefs ?? [])],
        ...resolveSuperContextPressureOptionsForSession({
          sessionKey: paramsIn.sessionKey,
          configuredContextLimit: paramsIn.configuredContextLimit,
          reservedOutputTokens: paramsIn.reservedOutputTokens,
          autocompactBufferTokens: paramsIn.autocompactBufferTokens,
          blockingBufferTokens: paramsIn.blockingBufferTokens,
        }),
      });
      opened.statements.insertContextPressureSnapshot.run({
        sessionKey: snapshot.sessionKey,
        runId: snapshot.runId ?? null,
        createdAt: snapshot.createdAt ?? paramsIn.createdAt,
        estimatedInputTokens: snapshot.estimatedInputTokens,
        configuredContextLimit: snapshot.configuredContextLimit,
        reservedOutputTokens: snapshot.reservedOutputTokens,
        effectiveContextLimit: snapshot.effectiveContextLimit,
        autocompactBufferTokens: snapshot.autocompactBufferTokens,
        blockingBufferTokens: snapshot.blockingBufferTokens,
        autocompactThreshold: snapshot.autocompactThreshold,
        blockingThreshold: snapshot.blockingThreshold,
        remainingBudget: snapshot.remainingBudget,
        overflowRisk: snapshot.overflowRisk ? 1 : 0,
        compactionActionRefsJson: JSON.stringify(snapshot.persistedCompactionEventRefs),
      });
      return snapshot;
    },

    listContextPressureSnapshots(paramsIn: {
      sessionKey: string;
      limit?: number;
    }): ContextPressureSnapshot[] {
      const limit =
        typeof paramsIn.limit === "number" && Number.isFinite(paramsIn.limit)
          ? Math.max(1, Math.floor(paramsIn.limit))
          : 20;
      const rows = opened.statements.selectContextPressureSnapshots.all(
        paramsIn.sessionKey,
        limit,
      ) as ContextPressureSnapshotRow[];
      return rows.map((row) => mapContextPressureSnapshotRow(row));
    },

    upsertContextCollapseLedger(ledger: StateContextCollapseLedgerUpsert): void {
      const existingSession = opened.statements.selectSession.get(ledger.sessionKey) as
        | SessionRow
        | undefined;
      const workspaceDir = existingSession?.workspace_dir ?? params.workspaceDir;
      const agentId = existingSession?.agent_id ?? "main";
      opened.statements.ensureSession.run(ledger.sessionKey, agentId, workspaceDir);
      opened.statements.upsertContextCollapseLedger.run(
        ledger.sessionKey,
        ledger.runId ?? null,
        ledger.updatedAt,
        stringifyJson(ledger.committedSpans),
        stringifyJson(ledger.stagedSpans),
        stringifyJson(ledger.droppedSpans),
        stringifyJson(ledger.restoredArtifacts),
        ledger.recoveryMode ?? null,
        ledger.visibleContextState ?? null,
        ledger.tokensBefore ?? null,
        ledger.tokensAfter ?? null,
        ledger.operatorSummary ?? null,
      );
    },

    getContextCollapseLedger(sessionKey: string): StateContextCollapseLedgerRecord | null {
      const row = opened.statements.selectContextCollapseLedger.get(sessionKey) as
        | ContextCollapseLedgerRow
        | undefined;
      return row ? mapContextCollapseLedgerRow(row) : null;
    },

    appendTeamMemorySyncEvent(event: StateTeamMemorySyncEventAppend): void {
      opened.statements.insertTeamMemorySyncEvent.run(
        event.eventId,
        event.repoRoot,
        event.direction,
        event.status,
        event.fileCount,
        event.transferHash ?? null,
        event.details ?? null,
        event.createdAt,
      );
    },

    listTeamMemorySyncEvents(paramsIn?: {
      repoRoot?: string;
      limit?: number;
    }): StateTeamMemorySyncEventRecord[] {
      const limit =
        typeof paramsIn?.limit === "number" && Number.isFinite(paramsIn.limit)
          ? Math.max(1, Math.floor(paramsIn.limit))
          : 20;
      const repoRoot = paramsIn?.repoRoot?.trim() || null;
      const rows = opened.statements.selectTeamMemorySyncEvents.all(
        repoRoot,
        repoRoot,
        limit,
      ) as TeamMemorySyncEventRow[];
      return rows.map((row) => mapTeamMemorySyncEventRow(row));
    },

    upsertTeamMemorySyncState(state: StateTeamMemorySyncStateUpsert): void {
      opened.statements.upsertTeamMemorySyncState.run(
        state.repoRoot,
        state.remoteRoot ?? null,
        state.lastPulledHash ?? null,
        state.lastPushedHash ?? null,
        state.lastSyncAt ?? null,
        state.lastPullAt ?? null,
        state.lastPushAt ?? null,
        state.lastRetryAt ?? null,
        state.conflictRetryCount,
        stringifyJson(state.blockedFiles),
        stringifyJson(state.checksumState),
        state.lastStatus ?? null,
        state.lastDecision ?? null,
        state.updatedAt,
      );
    },

    getTeamMemorySyncState(repoRoot: string): StateTeamMemorySyncStateRecord | null {
      const row = opened.statements.selectTeamMemorySyncState.get(repoRoot) as
        | TeamMemorySyncStateRow
        | undefined;
      return row ? mapTeamMemorySyncStateRow(row) : null;
    },

    getContextPressureSnapshot(paramsIn: {
      sessionKey: string;
      effectiveContextLimit?: number;
      reservedOutputTokens?: number;
      autocompactBufferTokens?: number;
      blockingBufferTokens?: number;
    }): ContextPressureSnapshot {
      const totalRow = opened.statements.selectApproxTokens.get(paramsIn.sessionKey) as
        | { total_tokens?: number }
        | undefined;
      const compactionActions = opened.statements.selectActions.all(
        paramsIn.sessionKey,
        paramsIn.sessionKey,
        null,
        null,
        20,
      ) as ActionRow[];
      return buildSuperContextPressureSnapshot({
        estimatedInputTokens: Math.max(0, totalRow?.total_tokens ?? 0),
        ...resolveSuperContextPressureOptionsForSession({
          sessionKey: paramsIn.sessionKey,
          configuredContextLimit: paramsIn.effectiveContextLimit,
          reservedOutputTokens: paramsIn.reservedOutputTokens,
          autocompactBufferTokens: paramsIn.autocompactBufferTokens,
          blockingBufferTokens: paramsIn.blockingBufferTokens,
        }),
        persistedCompactionEventRefs: compactionActions
          .map((row) => mapActionRow(row))
          .filter((action) => action.actionKind === "compaction")
          .map((action) => action.actionId),
      });
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
