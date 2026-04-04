import { estimateStringChars, estimateTokensFromChars } from "../../utils/cjk-chars.js";
import type {
  ConversationWindow,
  ConversationWindowMessage,
  StateActionAppend,
  StateActionRecord,
  StateArtifactAppend,
  StateArtifactRecord,
  StateEvidenceProvenance,
  StateMessageAppend,
  StateSessionRecord,
  StateSessionUpsert,
  StateStore,
  StateStructuredDetails,
  SuperPartialReadDescriptor,
  SuperSandboxRuntimeSnapshot,
  SuperShellCapabilitySnapshot,
  SuperVerificationStage,
} from "../runtime/seams.js";
import {
  parseJsonValue,
  stringifyJson,
  type ActionRow,
  type ArtifactRow,
  type MessageRow,
  type SessionRow,
  type StateDatabase,
} from "./db.js";

export type SessionStateStoreApi = Pick<
  StateStore,
  | "upsertSession"
  | "appendMessage"
  | "appendAction"
  | "getActions"
  | "appendArtifact"
  | "getSessionSnapshot"
  | "getArtifacts"
  | "getConversationWindow"
>;

function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return Math.max(1, estimateTokensFromChars(estimateStringChars(trimmed)));
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
    latestActivityAt: row.latest_activity_at ?? undefined,
    displayName: row.display_name ?? undefined,
    label: row.label ?? undefined,
    parentSessionKey: row.parent_session_key ?? undefined,
    lastMessageId: row.last_message_id ?? undefined,
    lastUserTurnId: row.last_user_turn_id ?? undefined,
    lastAssistantTurnId: row.last_assistant_turn_id ?? undefined,
    capabilitySnapshot: parseJsonValue<SuperShellCapabilitySnapshot>(row.capability_snapshot_json),
    sandboxRuntime: parseJsonValue<SuperSandboxRuntimeSnapshot>(row.sandbox_runtime_json),
    messageCount: row.message_count ?? 0,
    userMessageCount: row.user_message_count ?? 0,
    assistantMessageCount: row.assistant_message_count ?? 0,
    actionCount: row.action_count ?? 0,
    artifactCount: row.artifact_count ?? 0,
    inputTokenCount: row.input_token_count ?? 0,
    outputTokenCount: row.output_token_count ?? 0,
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

function ensureSessionForWrite(params: {
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

export function createSessionStateStoreApi(params: {
  opened: StateDatabase;
  workspaceDir: string;
}): SessionStateStoreApi {
  const { opened, workspaceDir } = params;
  return {
    upsertSession(session: StateSessionUpsert): void {
      opened.write(() => {
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
          session.latestActivityAt ?? null,
          session.displayName ?? null,
          session.label ?? null,
          session.parentSessionKey ?? null,
          session.lastMessageId ?? null,
          session.lastUserTurnId ?? null,
          session.lastAssistantTurnId ?? null,
          stringifyJson(session.capabilitySnapshot),
          stringifyJson(session.sandboxRuntime),
          session.messageCount ?? 0,
          session.userMessageCount ?? 0,
          session.assistantMessageCount ?? 0,
          session.actionCount ?? 0,
          session.artifactCount ?? 0,
          session.inputTokenCount ?? 0,
          session.outputTokenCount ?? 0,
        );
      });
    },

    appendMessage(message: StateMessageAppend): void {
      const approxTokens =
        typeof message.approxTokens === "number" && Number.isFinite(message.approxTokens)
          ? Math.max(0, Math.floor(message.approxTokens))
          : estimateTokens(message.contentText);
      ensureSessionForWrite({
        opened,
        sessionKey: message.sessionKey,
        workspaceDir,
      });
      opened.write(() => {
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
          message.createdAt,
          message.createdAt,
          message.messageId,
          lastUserTurnId,
          lastUserTurnId,
          lastAssistantTurnId,
          lastAssistantTurnId,
          message.role === "user" ? 1 : 0,
          message.role === "assistant" ? 1 : 0,
          message.role === "user" ? approxTokens : 0,
          message.role === "assistant" ? approxTokens : 0,
          message.sessionKey,
        );
      });
    },

    appendAction(action: StateActionAppend): void {
      opened.write(() => {
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
        if (action.sessionKey) {
          ensureSessionForWrite({
            opened,
            sessionKey: action.sessionKey,
            workspaceDir,
          });
          opened.statements.touchSessionAfterAction.run(
            action.createdAt,
            action.createdAt,
            action.createdAt,
            action.createdAt,
            action.sessionKey,
            action.sessionKey,
          );
        }
      });
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
      opened.write(() => {
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
        if (artifact.sessionKey) {
          ensureSessionForWrite({
            opened,
            sessionKey: artifact.sessionKey,
            workspaceDir,
          });
          opened.statements.touchSessionAfterArtifact.run(
            artifact.createdAt,
            artifact.createdAt,
            artifact.createdAt,
            artifact.createdAt,
            artifact.sessionKey,
            artifact.sessionKey,
          );
        }
      });
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
  };
}
