import type {
  StateAbortNodeRecord,
  StateAbortNodeUpsert,
  StateIterationBudgetRecord,
  StateIterationBudgetUpsert,
  StateRuntimeInvocationRecord,
  StateRuntimeInvocationUpsert,
  StateRuntimeStageEventAppend,
  StateStore,
} from "../runtime/seams.js";
import type {
  AbortNodeRow,
  IterationBudgetRow,
  RuntimeInvocationRow,
  RuntimeStageEventRow,
  StateDatabase,
} from "./db.js";

export type RuntimeStateStoreApi = Pick<
  StateStore,
  | "upsertRuntimeInvocation"
  | "appendRuntimeStageEvent"
  | "upsertIterationBudget"
  | "upsertAbortNode"
  | "getRuntimeInvocation"
  | "getRuntimeStageEvents"
  | "getIterationBudgets"
  | "getAbortNodes"
>;

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

export function createRuntimeStateStoreApi(params: {
  opened: StateDatabase;
}): RuntimeStateStoreApi {
  const { opened } = params;
  return {
    upsertRuntimeInvocation(invocation: StateRuntimeInvocationUpsert): void {
      const trigger = typeof invocation.trigger === "string" ? invocation.trigger : null;
      const currentStage =
        typeof invocation.currentStage === "string" ? invocation.currentStage : null;
      const latestError =
        typeof invocation.latestError === "string" ? invocation.latestError : null;
      const verificationOutcome =
        typeof invocation.verificationOutcome === "string" ? invocation.verificationOutcome : null;
      opened.write(() => {
        opened.statements.upsertRuntimeInvocation.run(
          invocation.runId,
          invocation.sessionKey ?? null,
          invocation.sessionId,
          invocation.workspaceDir,
          invocation.mode,
          trigger,
          invocation.status,
          currentStage,
          invocation.startedAt,
          invocation.updatedAt,
          invocation.endedAt ?? null,
          invocation.parentRunId ?? null,
          invocation.rootBudgetId,
          invocation.rootAbortNodeId,
          latestError,
          verificationOutcome,
          invocation.verificationRequired ? 1 : 0,
        );
      });
    },

    appendRuntimeStageEvent(event: StateRuntimeStageEventAppend): void {
      opened.write(() => {
        opened.statements.insertRuntimeStageEvent.run(
          event.eventId,
          event.runId,
          event.sessionKey ?? null,
          event.stage,
          event.boundary,
          event.detail ?? null,
          event.createdAt,
        );
      });
    },

    upsertIterationBudget(budget: StateIterationBudgetUpsert): void {
      opened.write(() => {
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
      });
    },

    upsertAbortNode(node: StateAbortNodeUpsert): void {
      opened.write(() => {
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
      });
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
  };
}
