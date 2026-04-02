import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";

const STATE_DIR_MODE = 0o700;
const STATE_FILE_MODE = 0o600;
const SQLITE_SIDECAR_SUFFIXES = ["", "-shm", "-wal"] as const;

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

function ensureStateSchema(db: DatabaseSync): void {
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
      latest_activity_at INTEGER,
      display_name TEXT,
      label TEXT,
      parent_session_key TEXT,
      last_message_id TEXT,
      last_user_turn_id TEXT,
      last_assistant_turn_id TEXT,
      capability_snapshot_json TEXT,
      sandbox_runtime_json TEXT,
      message_count INTEGER NOT NULL DEFAULT 0,
      user_message_count INTEGER NOT NULL DEFAULT 0,
      assistant_message_count INTEGER NOT NULL DEFAULT 0,
      action_count INTEGER NOT NULL DEFAULT 0,
      artifact_count INTEGER NOT NULL DEFAULT 0,
      input_token_count INTEGER NOT NULL DEFAULT 0,
      output_token_count INTEGER NOT NULL DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS memory_write_audits (
      audit_id TEXT PRIMARY KEY,
      session_key TEXT,
      run_id TEXT,
      operation_kind TEXT NOT NULL,
      memory_path TEXT NOT NULL,
      status TEXT NOT NULL,
      before_hash TEXT,
      after_hash TEXT,
      before_line_count INTEGER NOT NULL,
      after_line_count INTEGER NOT NULL,
      source_session_keys_json TEXT,
      evidence_counts_json TEXT,
      evidence_refs_json TEXT,
      added_entries_json TEXT,
      removed_entries_json TEXT,
      changed_at INTEGER NOT NULL,
      operator_summary TEXT,
      FOREIGN KEY(session_key) REFERENCES sessions(session_key)
    );

    CREATE INDEX IF NOT EXISTS idx_memory_write_audits_session_changed
      ON memory_write_audits(session_key, changed_at DESC, audit_id DESC);

    CREATE TABLE IF NOT EXISTS frozen_memory_snapshots (
      session_key TEXT PRIMARY KEY,
      snapshot_path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      safe_line_count INTEGER NOT NULL DEFAULT 0,
      removed_line_count INTEGER NOT NULL DEFAULT 0,
      blocked INTEGER NOT NULL DEFAULT 0,
      blocked_lines_json TEXT
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
      blocked_file_reasons_json TEXT,
      uploaded_files_json TEXT,
      withheld_files_json TEXT,
      checksum_state_json TEXT,
      last_status TEXT,
      last_decision TEXT,
      updated_at INTEGER NOT NULL
    );
  `);
  ensureColumn(db, "sessions", "execution_role", "TEXT");
  ensureColumn(db, "sessions", "capability_snapshot_json", "TEXT");
  ensureColumn(db, "sessions", "sandbox_runtime_json", "TEXT");
  ensureColumn(db, "sessions", "latest_activity_at", "INTEGER");
  ensureColumn(db, "sessions", "user_message_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "sessions", "assistant_message_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "sessions", "action_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "sessions", "artifact_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "sessions", "input_token_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "sessions", "output_token_count", "INTEGER NOT NULL DEFAULT 0");
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
  ensureColumn(db, "memory_write_audits", "before_hash", "TEXT");
  ensureColumn(db, "memory_write_audits", "after_hash", "TEXT");
  ensureColumn(db, "memory_write_audits", "before_line_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "memory_write_audits", "after_line_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "memory_write_audits", "source_session_keys_json", "TEXT");
  ensureColumn(db, "memory_write_audits", "evidence_counts_json", "TEXT");
  ensureColumn(db, "memory_write_audits", "evidence_refs_json", "TEXT");
  ensureColumn(db, "memory_write_audits", "added_entries_json", "TEXT");
  ensureColumn(db, "memory_write_audits", "removed_entries_json", "TEXT");
  ensureColumn(db, "memory_write_audits", "operator_summary", "TEXT");
  ensureColumn(db, "frozen_memory_snapshots", "safe_line_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "frozen_memory_snapshots", "removed_line_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "frozen_memory_snapshots", "blocked", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "frozen_memory_snapshots", "blocked_lines_json", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "remote_root", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "last_pulled_hash", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "last_pushed_hash", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "last_sync_at", "INTEGER");
  ensureColumn(db, "team_memory_sync_state", "last_pull_at", "INTEGER");
  ensureColumn(db, "team_memory_sync_state", "last_push_at", "INTEGER");
  ensureColumn(db, "team_memory_sync_state", "last_retry_at", "INTEGER");
  ensureColumn(db, "team_memory_sync_state", "conflict_retry_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "team_memory_sync_state", "blocked_files_json", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "blocked_file_reasons_json", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "uploaded_files_json", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "withheld_files_json", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "checksum_state_json", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "last_status", "TEXT");
  ensureColumn(db, "team_memory_sync_state", "last_decision", "TEXT");
}

export function bootstrapStateDatabase(params: { db: DatabaseSync; dbPath: string }): void {
  ensureStatePermissions(params.dbPath);
  ensureStateSchema(params.db);
  ensureStatePermissions(params.dbPath);
}
