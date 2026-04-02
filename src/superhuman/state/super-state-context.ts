import {
  buildSuperContextPressureSnapshot,
  resolveSuperContextPressureOptionsForSession,
} from "../super-context-pressure.js";
import type {
  ContextPressureSnapshot,
  StateContextCollapseCommittedSpan,
  StateContextCollapseDroppedSpan,
  StateContextCollapseLedgerRecord,
  StateContextCollapseLedgerUpsert,
  StateContextCollapseStagedSpan,
  StateContextPressureSnapshotAppend,
  StateFrozenMemorySnapshotRecord,
  StateFrozenMemorySnapshotUpsert,
  StateMemoryWriteAuditAppend,
  StateMemoryWriteAuditRecord,
  StateStore,
  StateTeamMemorySyncEventAppend,
  StateTeamMemorySyncEventRecord,
  StateTeamMemorySyncStateRecord,
  StateTeamMemorySyncStateUpsert,
  TeamMemorySyncStatus,
} from "../super-runtime-seams.js";
import type {
  ContextCollapseLedgerRow,
  ContextPressureSnapshotRow,
  FrozenMemorySnapshotRow,
  MemoryWriteAuditRow,
  SessionRow,
  StateDatabase,
  TeamMemorySyncEventRow,
  TeamMemorySyncStateRow,
} from "./super-state-db.js";
import { parseJsonValue, stringifyJson } from "./super-state-db.js";

export type ContextStateStoreApi = Pick<
  StateStore,
  | "recordContextPressureSnapshot"
  | "listContextPressureSnapshots"
  | "upsertContextCollapseLedger"
  | "getContextCollapseLedger"
  | "appendMemoryWriteAudit"
  | "listMemoryWriteAudits"
  | "upsertFrozenMemorySnapshot"
  | "getFrozenMemorySnapshot"
  | "appendTeamMemorySyncEvent"
  | "listTeamMemorySyncEvents"
  | "upsertTeamMemorySyncState"
  | "getTeamMemorySyncState"
  | "getContextPressureSnapshot"
>;

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
    blockedFileReasons:
      parseJsonValue<Record<string, string>>(row.blocked_file_reasons_json) ?? undefined,
    uploadedFiles: parseJsonValue<string[]>(row.uploaded_files_json) ?? [],
    withheldFiles: parseJsonValue<string[]>(row.withheld_files_json) ?? [],
    checksumState: parseJsonValue<Record<string, string>>(row.checksum_state_json),
    lastStatus: parseTeamMemorySyncStatus(row.last_status),
    lastDecision: row.last_decision ?? undefined,
    updatedAt: row.updated_at,
  };
}

function mapMemoryWriteAuditRow(row: MemoryWriteAuditRow): StateMemoryWriteAuditRecord {
  return {
    auditId: row.audit_id,
    sessionKey: row.session_key ?? undefined,
    runId: row.run_id ?? undefined,
    operationKind: row.operation_kind as StateMemoryWriteAuditRecord["operationKind"],
    memoryPath: row.memory_path,
    status: row.status as StateMemoryWriteAuditRecord["status"],
    beforeHash: row.before_hash ?? undefined,
    afterHash: row.after_hash ?? undefined,
    beforeLineCount: row.before_line_count,
    afterLineCount: row.after_line_count,
    sourceSessionKeys: parseJsonValue<string[]>(row.source_session_keys_json) ?? [],
    evidenceCounts: parseJsonValue<StateMemoryWriteAuditRecord["evidenceCounts"]>(
      row.evidence_counts_json,
    ) ?? {
      original: 0,
      imported_history: 0,
      collapsed: 0,
      partial_read: 0,
      persisted_preview: 0,
      restored: 0,
      mixed: 0,
    },
    evidenceRefs:
      parseJsonValue<StateMemoryWriteAuditRecord["evidenceRefs"]>(row.evidence_refs_json) ?? [],
    addedEntries:
      parseJsonValue<StateMemoryWriteAuditRecord["addedEntries"]>(row.added_entries_json) ?? [],
    removedEntries: parseJsonValue<string[]>(row.removed_entries_json) ?? [],
    changedAt: row.changed_at,
    operatorSummary: row.operator_summary ?? undefined,
  };
}

function mapFrozenMemorySnapshotRow(row: FrozenMemorySnapshotRow): StateFrozenMemorySnapshotRecord {
  return {
    sessionKey: row.session_key,
    snapshotPath: row.snapshot_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    safeLineCount: row.safe_line_count,
    removedLineCount: row.removed_line_count,
    blocked: row.blocked === 1,
    blockedLines:
      parseJsonValue<StateFrozenMemorySnapshotRecord["blockedLines"]>(row.blocked_lines_json) ?? [],
  };
}

function ensureSessionForContext(params: {
  opened: StateDatabase;
  sessionKey: string;
  workspaceDir: string;
}): void {
  const existingSession = params.opened.statements.selectSession.get(params.sessionKey) as
    | SessionRow
    | undefined;
  const ensuredWorkspaceDir = existingSession?.workspace_dir ?? params.workspaceDir;
  const agentId = existingSession?.agent_id ?? "main";
  params.opened.statements.ensureSession.run(params.sessionKey, agentId, ensuredWorkspaceDir);
}

export function createContextStateStoreApi(params: {
  opened: StateDatabase;
  workspaceDir: string;
}): ContextStateStoreApi {
  const { opened, workspaceDir } = params;
  return {
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
      opened.write(() => {
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
      opened.write(() => {
        ensureSessionForContext({
          opened,
          sessionKey: ledger.sessionKey,
          workspaceDir,
        });
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
      });
    },

    getContextCollapseLedger(sessionKey: string): StateContextCollapseLedgerRecord | null {
      const row = opened.statements.selectContextCollapseLedger.get(sessionKey) as
        | ContextCollapseLedgerRow
        | undefined;
      return row ? mapContextCollapseLedgerRow(row) : null;
    },

    appendMemoryWriteAudit(audit: StateMemoryWriteAuditAppend): void {
      opened.write(() => {
        if (audit.sessionKey) {
          ensureSessionForContext({
            opened,
            sessionKey: audit.sessionKey,
            workspaceDir,
          });
        }
        opened.statements.insertMemoryWriteAudit.run(
          audit.auditId,
          audit.sessionKey ?? null,
          audit.runId ?? null,
          audit.operationKind,
          audit.memoryPath,
          audit.status,
          audit.beforeHash ?? null,
          audit.afterHash ?? null,
          audit.beforeLineCount,
          audit.afterLineCount,
          stringifyJson(audit.sourceSessionKeys),
          stringifyJson(audit.evidenceCounts),
          stringifyJson(audit.evidenceRefs),
          stringifyJson(audit.addedEntries),
          stringifyJson(audit.removedEntries),
          audit.changedAt,
          audit.operatorSummary ?? null,
        );
      });
    },

    listMemoryWriteAudits(paramsIn?: {
      sessionKey?: string;
      limit?: number;
    }): StateMemoryWriteAuditRecord[] {
      const limit =
        typeof paramsIn?.limit === "number" && Number.isFinite(paramsIn.limit)
          ? Math.max(1, Math.floor(paramsIn.limit))
          : 20;
      const sessionKey = paramsIn?.sessionKey?.trim() || null;
      const rows = opened.statements.selectMemoryWriteAudits.all(
        sessionKey,
        sessionKey,
        limit,
      ) as MemoryWriteAuditRow[];
      return rows.map((row) => mapMemoryWriteAuditRow(row));
    },

    upsertFrozenMemorySnapshot(snapshot: StateFrozenMemorySnapshotUpsert): void {
      opened.write(() => {
        ensureSessionForContext({
          opened,
          sessionKey: snapshot.sessionKey,
          workspaceDir,
        });
        opened.statements.upsertFrozenMemorySnapshot.run(
          snapshot.sessionKey,
          snapshot.snapshotPath,
          snapshot.createdAt,
          snapshot.updatedAt,
          snapshot.safeLineCount,
          snapshot.removedLineCount,
          snapshot.blocked ? 1 : 0,
          stringifyJson(snapshot.blockedLines),
        );
      });
    },

    getFrozenMemorySnapshot(sessionKey: string): StateFrozenMemorySnapshotRecord | null {
      const row = opened.statements.selectFrozenMemorySnapshot.get(sessionKey) as
        | FrozenMemorySnapshotRow
        | undefined;
      return row ? mapFrozenMemorySnapshotRow(row) : null;
    },

    appendTeamMemorySyncEvent(event: StateTeamMemorySyncEventAppend): void {
      opened.write(() => {
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
      });
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
      opened.write(() => {
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
          stringifyJson(state.blockedFileReasons),
          stringifyJson(state.uploadedFiles),
          stringifyJson(state.withheldFiles),
          stringifyJson(state.checksumState),
          state.lastStatus ?? null,
          state.lastDecision ?? null,
          state.updatedAt,
        );
      });
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
      ) as Array<{ action_id: string; action_kind: string | null }>;
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
          .filter((action) => action.action_kind === "compaction")
          .map((action) => action.action_id),
      });
    },
  };
}
