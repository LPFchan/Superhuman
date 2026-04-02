import fs from "node:fs";
import path from "node:path";
import type { StatementSync } from "node:sqlite";
import type {
  AbortNodeStatus,
  AgentRuntimeStage,
  RuntimeBudgetExhaustionReason,
  RuntimeInvocationMode,
  RuntimeInvocationStatus,
  TeamMemorySyncDirection,
  TeamMemorySyncStatus,
  VerificationOutcome,
} from "../super-runtime-seams.js";

export type StateStoreStatements = {
  upsertSession: StatementSync;
  ensureSession: StatementSync;
  insertMessage: StatementSync;
  touchSessionAfterMessage: StatementSync;
  upsertAction: StatementSync;
  touchSessionAfterAction: StatementSync;
  selectActions: StatementSync;
  upsertArtifact: StatementSync;
  touchSessionAfterArtifact: StatementSync;
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
  insertMemoryWriteAudit: StatementSync;
  selectMemoryWriteAudits: StatementSync;
  upsertFrozenMemorySnapshot: StatementSync;
  selectFrozenMemorySnapshot: StatementSync;
  insertTeamMemorySyncEvent: StatementSync;
  selectTeamMemorySyncEvents: StatementSync;
  upsertTeamMemorySyncState: StatementSync;
  selectTeamMemorySyncState: StatementSync;
};

export type SessionRow = {
  session_key: string;
  session_id: string | null;
  agent_id: string;
  workspace_dir: string;
  execution_role: "lead" | "worker" | "subagent" | "remote_peer" | null;
  status: string | null;
  started_at: number | null;
  ended_at: number | null;
  updated_at: number | null;
  latest_activity_at: number | null;
  display_name: string | null;
  label: string | null;
  parent_session_key: string | null;
  last_message_id: string | null;
  last_user_turn_id: string | null;
  last_assistant_turn_id: string | null;
  capability_snapshot_json: string | null;
  sandbox_runtime_json: string | null;
  message_count: number;
  user_message_count: number;
  assistant_message_count: number;
  action_count: number;
  artifact_count: number;
  input_token_count: number;
  output_token_count: number;
};

export type MessageRow = {
  message_id: string;
  role: string;
  content_text: string;
  created_at: number;
  approx_tokens: number;
  transcript_message_id: string | null;
  sequence: number | null;
  provenance_json: string | null;
};

export type ArtifactRow = {
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

export type ActionRow = {
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

export type AutomationLoopStateRow = {
  session_key: string;
  state: string;
  reason: string | null;
  wake_at: number | null;
  last_activity_at: number | null;
  last_wake_at: number | null;
  last_transition_at: number;
  updated_at: number;
};

export type AutomationEventRow = {
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

export type RuntimeInvocationRow = {
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

export type RuntimeStageEventRow = {
  event_id: string;
  run_id: string;
  session_key: string | null;
  stage: AgentRuntimeStage;
  boundary: "enter" | "exit" | "mark";
  detail: string | null;
  created_at: number;
};

export type IterationBudgetRow = {
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

export type AbortNodeRow = {
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

export type ContextPressureSnapshotRow = {
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

export type ContextCollapseLedgerRow = {
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

export type TeamMemorySyncEventRow = {
  event_id: string;
  repo_root: string;
  direction: TeamMemorySyncDirection;
  status: TeamMemorySyncStatus;
  file_count: number;
  transfer_hash: string | null;
  details: string | null;
  created_at: number;
};

export type TeamMemorySyncStateRow = {
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
  blocked_file_reasons_json: string | null;
  uploaded_files_json: string | null;
  withheld_files_json: string | null;
  checksum_state_json: string | null;
  last_status: string | null;
  last_decision: string | null;
  updated_at: number;
};

export type MemoryWriteAuditRow = {
  audit_id: string;
  session_key: string | null;
  run_id: string | null;
  operation_kind: string;
  memory_path: string;
  status: string;
  before_hash: string | null;
  after_hash: string | null;
  before_line_count: number;
  after_line_count: number;
  source_session_keys_json: string | null;
  evidence_counts_json: string | null;
  evidence_refs_json: string | null;
  added_entries_json: string | null;
  removed_entries_json: string | null;
  changed_at: number;
  operator_summary: string | null;
};

export type FrozenMemorySnapshotRow = {
  session_key: string;
  snapshot_path: string;
  created_at: number;
  updated_at: number;
  safe_line_count: number;
  removed_line_count: number;
  blocked: number;
  blocked_lines_json: string | null;
};

export function normalizePathForComparison(input: string): string {
  const resolved = path.resolve(input);
  try {
    const real = fs.realpathSync.native(resolved);
    return process.platform === "win32" ? real.toLowerCase() : real;
  } catch {
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  }
}

export function stringifyJson(value: unknown): string | null {
  if (!value) {
    return null;
  }
  return JSON.stringify(value);
}

export function parseJsonValue<T>(value: string | null | undefined): T | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}
