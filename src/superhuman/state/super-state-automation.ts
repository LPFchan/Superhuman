import type {
  StateAutomationEventAppend,
  StateAutomationEventRecord,
  StateAutomationLoopStateRecord,
  StateAutomationLoopStateUpsert,
  StateStore,
} from "../super-runtime-seams.js";
import type {
  AutomationEventRow,
  AutomationLoopStateRow,
  SessionRow,
  StateDatabase,
} from "./super-state-db.js";
import { parseJsonValue, stringifyJson } from "./super-state-db.js";

export type AutomationStateStoreApi = Pick<
  StateStore,
  | "upsertAutomationLoopState"
  | "getAutomationLoopState"
  | "appendAutomationEvent"
  | "listAutomationEvents"
>;

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
    details: parseJsonValue(row.details_json),
    createdAt: row.created_at,
  };
}

function ensureSessionForAutomation(params: {
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

export function createAutomationStateStoreApi(params: {
  opened: StateDatabase;
  workspaceDir: string;
}): AutomationStateStoreApi {
  const { opened, workspaceDir } = params;
  return {
    upsertAutomationLoopState(loopState: StateAutomationLoopStateUpsert): void {
      opened.write(() => {
        ensureSessionForAutomation({
          opened,
          sessionKey: loopState.sessionKey,
          workspaceDir,
        });
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
      });
    },

    getAutomationLoopState(sessionKey: string): StateAutomationLoopStateRecord | null {
      const row = opened.statements.selectAutomationLoopState.get(sessionKey) as
        | AutomationLoopStateRow
        | undefined;
      return row ? mapAutomationLoopStateRow(row) : null;
    },

    appendAutomationEvent(event: StateAutomationEventAppend): void {
      opened.write(() => {
        if (event.sessionKey) {
          ensureSessionForAutomation({
            opened,
            sessionKey: event.sessionKey,
            workspaceDir,
          });
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
      });
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
  };
}
