import type { BootRunResult } from "../gateway/boot.js";
import type { PluginRegistry as OpenClawPluginRegistry } from "../plugins/registry.js";

export type StateEvidenceSource =
  | "original"
  | "imported_history"
  | "collapsed"
  | "partial_read"
  | "persisted_preview"
  | "restored"
  | "mixed";

export type StateEvidenceProvenance = {
  source: StateEvidenceSource;
  importedFrom?: string;
  externalId?: string;
  sourceTool?: string;
  sourceSessionKey?: string;
  descriptor?: string;
  partialRead?: boolean;
  persistedPreview?: boolean;
  importedHistory?: boolean;
  collapsed?: boolean;
  restored?: boolean;
  previewArtifactId?: string;
  fullArtifactId?: string;
  partialReadArtifactId?: string;
};

export type StateStructuredDetails = Record<string, unknown>;

export type ConversationWindowMessage = {
  messageId: string;
  role: string;
  contentText: string;
  createdAt: number;
  approxTokens: number;
  transcriptMessageId?: string;
  sequence?: number;
  provenance?: StateEvidenceProvenance;
};

export type ConversationWindow = {
  sessionKey: string;
  messages: ConversationWindowMessage[];
  approximateTokenCount: number;
  latestAssistantTurnId?: string;
  latestUserTurnId?: string;
};

export type SuperShellCapabilityMode =
  | "workspace_search_only"
  | "symbol_references"
  | "semantic_rename";

export type SuperShellCapabilitySnapshot = {
  sessionKey: string;
  agentId: string;
  mainSessionKey: string;
  createdAt: number;
  mode: SuperShellCapabilityMode;
  supportsSymbolReferences: boolean;
  supportsSemanticRename: boolean;
  supportsWorkspaceSearchOnly: boolean;
  semanticToolProviderIds: string[];
  workspaceSearchFallbackToolKinds: string[];
};

export type SuperSandboxRuntimeSnapshot = {
  sessionKey: string;
  agentId: string;
  mainSessionKey: string;
  createdAt: number;
  mode: "off" | "all" | "non-main";
  sandboxed: boolean;
  toolPolicy: {
    allow: string[];
    deny: string[];
    sourceKeys: {
      allow: string;
      deny: string;
    };
  };
  remediation: {
    explainCommand: string;
    disableSandboxConfigKey: string;
    suggestMainSession: boolean;
  };
};

export type ContextPressureSnapshot = {
  sessionKey: string;
  runId?: string;
  createdAt?: number;
  estimatedInputTokens: number;
  configuredContextLimit: number;
  reservedOutputTokens: number;
  effectiveContextLimit: number;
  autocompactBufferTokens: number;
  blockingBufferTokens: number;
  autocompactThreshold: number;
  blockingThreshold: number;
  remainingBudget: number;
  overflowRisk: boolean;
  persistedCompactionEventRefs: string[];
};

export type VerificationOutcome = "verified" | "not_verifiable" | "verification_failed";

export type StateContextPressureSnapshotAppend = {
  sessionKey: string;
  runId?: string;
  createdAt: number;
  configuredContextLimit?: number;
  reservedOutputTokens?: number;
  autocompactBufferTokens?: number;
  blockingBufferTokens?: number;
  persistedCompactionEventRefs?: string[];
};

export type TeamMemorySyncDirection = "pull" | "push";

export type TeamMemorySyncStatus = "success" | "blocked" | "failed" | "skipped";

export type StateTeamMemorySyncEventAppend = {
  eventId: string;
  repoRoot: string;
  direction: TeamMemorySyncDirection;
  status: TeamMemorySyncStatus;
  fileCount: number;
  transferHash?: string;
  details?: string;
  createdAt: number;
};

export type StateTeamMemorySyncEventRecord = StateTeamMemorySyncEventAppend;

export type AutomationLoopState = "active" | "paused" | "sleeping" | "disabled";

export type StateAutomationLoopStateRecord = {
  sessionKey: string;
  state: AutomationLoopState;
  reason?: string;
  wakeAt?: number;
  lastActivityAt?: number;
  lastWakeAt?: number;
  lastTransitionAt: number;
  updatedAt: number;
};

export type StateAutomationLoopStateUpsert = StateAutomationLoopStateRecord;

export type StateAutomationEventAppend = {
  eventId: string;
  sessionKey?: string;
  runId?: string;
  automationKind: string;
  triggerSource: string;
  reason?: string;
  planSummary?: string;
  actionSummary?: string;
  resultStatus: string;
  details?: StateStructuredDetails;
  createdAt: number;
};

export type StateAutomationEventRecord = StateAutomationEventAppend;

export type StateSessionRecord = {
  sessionKey: string;
  sessionId?: string;
  agentId: string;
  workspaceDir: string;
  executionRole?: "lead" | "worker" | "subagent" | "remote_peer";
  status?: string;
  startedAt?: number;
  endedAt?: number;
  updatedAt?: number;
  displayName?: string;
  label?: string;
  parentSessionKey?: string;
  lastMessageId?: string;
  lastUserTurnId?: string;
  lastAssistantTurnId?: string;
  capabilitySnapshot?: SuperShellCapabilitySnapshot;
  sandboxRuntime?: SuperSandboxRuntimeSnapshot;
  messageCount: number;
};

export type StateSessionUpsert = Omit<StateSessionRecord, "messageCount"> & {
  messageCount?: number;
};

export type StateMessageAppend = {
  messageId: string;
  sessionKey: string;
  role: string;
  contentText: string;
  createdAt: number;
  approxTokens?: number;
  transcriptMessageId?: string;
  runId?: string;
  sequence?: number;
  provenance?: StateEvidenceProvenance;
};

export type SuperActionKind =
  | "agent_lifecycle"
  | "automation"
  | "capability_negotiation"
  | "compaction"
  | "sandbox_policy"
  | "verification"
  | "worker_spawn"
  | (string & {});

export type SuperVerificationStage = "planned" | "running" | "completed" | "failed" | "skipped";

export type SuperVerifierKind =
  | "manual"
  | "runtime"
  | "shell_command"
  | "test_command"
  | "lint"
  | "typecheck"
  | "unknown"
  | (string & {});

export type StateActionRecord = {
  actionId: string;
  sessionKey?: string;
  runId?: string;
  actionType: string;
  actionKind?: SuperActionKind;
  summary: string;
  status?: string;
  createdAt: number;
  completedAt?: number;
  verificationStage?: SuperVerificationStage;
  verifierKind?: SuperVerifierKind;
  command?: string;
  exitCode?: number;
  capabilitySnapshot?: SuperShellCapabilitySnapshot;
  sandboxRuntime?: SuperSandboxRuntimeSnapshot;
  sourceArtifactId?: string;
  targetArtifactId?: string;
  details?: StateStructuredDetails;
};

export type StateActionAppend = StateActionRecord;

export type SuperArtifactKind =
  | "compaction-summary"
  | "full-output"
  | "partial-read-descriptor"
  | "persisted-preview"
  | "transcript-file"
  | "verification-log"
  | (string & {});

export type SuperArtifactRelationship =
  | "derived-from"
  | "full-of"
  | "partial-read-for"
  | "preview-of"
  | "verification-log-for"
  | (string & {});

export type SuperPartialReadDescriptor = {
  startLine?: number;
  endLine?: number;
  startByte?: number;
  endByte?: number;
  omittedBytes?: number;
  byteLimit?: number;
  strategy?: string;
};

export type StateArtifactRecord = {
  artifactId: string;
  sessionKey?: string;
  messageId?: string;
  kind: SuperArtifactKind;
  label?: string;
  location?: string;
  createdAt: number;
  provenance?: StateEvidenceProvenance;
  relationshipKind?: SuperArtifactRelationship;
  parentArtifactId?: string;
  previewArtifactId?: string;
  fullArtifactId?: string;
  previewBytes?: number;
  fullBytes?: number;
  storagePath?: string;
  reopenedAt?: number;
  partialReadDescriptor?: SuperPartialReadDescriptor;
  verificationActionId?: string;
  metadata?: StateStructuredDetails;
};

export type StateArtifactAppend = StateArtifactRecord;

export type AgentRuntimeStage =
  | "prompt_assembly"
  | "model_call"
  | "tool_planning"
  | "tool_execution"
  | "verification_planning"
  | "verification_execution"
  | "post_tool_continuation"
  | "terminal_response";

export type RuntimeInvocationMode = "interactive" | "background" | "scheduled" | "remote";

export type RuntimeInvocationStatus = "running" | "completed" | "failed" | "aborted";

export type RuntimeBudgetExhaustionReason =
  | "retry_limit"
  | "tool_loop"
  | "timeout"
  | "aborted"
  | "unknown";

export type AbortNodeStatus = "active" | "completed" | "aborted";

export type StateRuntimeInvocationRecord = {
  runId: string;
  sessionKey?: string;
  sessionId: string;
  workspaceDir: string;
  mode: RuntimeInvocationMode;
  trigger?: string;
  status: RuntimeInvocationStatus;
  currentStage?: AgentRuntimeStage;
  startedAt: number;
  updatedAt: number;
  endedAt?: number;
  parentRunId?: string;
  rootBudgetId: string;
  rootAbortNodeId: string;
  latestError?: string;
  verificationOutcome?: VerificationOutcome;
  verificationRequired?: boolean;
};

export type StateRuntimeInvocationUpsert = StateRuntimeInvocationRecord;

export type StateRuntimeStageEventAppend = {
  eventId: string;
  runId: string;
  sessionKey?: string;
  stage: AgentRuntimeStage;
  boundary: "enter" | "exit" | "mark";
  detail?: string;
  createdAt: number;
};

export type StateIterationBudgetRecord = {
  budgetId: string;
  runId: string;
  parentBudgetId?: string;
  label: string;
  maxIterations: number;
  usedIterations: number;
  refundedIterations: number;
  exhaustedReason?: RuntimeBudgetExhaustionReason;
  createdAt: number;
  updatedAt: number;
};

export type StateIterationBudgetUpsert = StateIterationBudgetRecord;

export type StateAbortNodeRecord = {
  abortNodeId: string;
  runId: string;
  parentAbortNodeId?: string;
  kind: string;
  label: string;
  status: AbortNodeStatus;
  createdAt: number;
  updatedAt: number;
  abortedAt?: number;
  completedAt?: number;
  reason?: string;
};

export type StateAbortNodeUpsert = StateAbortNodeRecord;

export interface StateStore {
  upsertSession(session: StateSessionUpsert): void;
  appendMessage(message: StateMessageAppend): void;
  appendAction(action: StateActionAppend): void;
  getActions(params?: { sessionKey?: string; runId?: string; limit?: number }): StateActionRecord[];
  appendArtifact(artifact: StateArtifactAppend): void;
  upsertAutomationLoopState(loopState: StateAutomationLoopStateUpsert): void;
  getAutomationLoopState(sessionKey: string): StateAutomationLoopStateRecord | null;
  appendAutomationEvent(event: StateAutomationEventAppend): void;
  listAutomationEvents(params?: {
    sessionKey?: string;
    limit?: number;
  }): StateAutomationEventRecord[];
  upsertRuntimeInvocation(invocation: StateRuntimeInvocationUpsert): void;
  appendRuntimeStageEvent(event: StateRuntimeStageEventAppend): void;
  upsertIterationBudget(budget: StateIterationBudgetUpsert): void;
  upsertAbortNode(node: StateAbortNodeUpsert): void;
  getSessionSnapshot(sessionKey: string): StateSessionRecord | null;
  getArtifacts(params?: { sessionKey?: string }): StateArtifactRecord[];
  getRuntimeInvocation(runId: string): StateRuntimeInvocationRecord | null;
  getRuntimeStageEvents(runId: string): StateRuntimeStageEventAppend[];
  getIterationBudgets(runId: string): StateIterationBudgetRecord[];
  getAbortNodes(runId: string): StateAbortNodeRecord[];
  getConversationWindow(params: { sessionKey: string; limit?: number }): ConversationWindow;
  recordContextPressureSnapshot(
    params: StateContextPressureSnapshotAppend,
  ): ContextPressureSnapshot;
  listContextPressureSnapshots(params: {
    sessionKey: string;
    limit?: number;
  }): ContextPressureSnapshot[];
  appendTeamMemorySyncEvent(event: StateTeamMemorySyncEventAppend): void;
  listTeamMemorySyncEvents(params?: {
    repoRoot?: string;
    limit?: number;
  }): StateTeamMemorySyncEventRecord[];
  getContextPressureSnapshot(params: {
    sessionKey: string;
    effectiveContextLimit?: number;
    reservedOutputTokens?: number;
    autocompactBufferTokens?: number;
    blockingBufferTokens?: number;
  }): ContextPressureSnapshot;
  close(): void;
}

export interface SessionRegistry {
  resolveMainSession(agentId?: string): string;
  resolveSession(params: { sessionKey?: string; runId?: string }): {
    sessionKey?: string;
    agentId: string;
    mainSessionKey: string;
  };
  isMainSession(sessionKey: string): boolean;
}

export interface ChannelRegistry {
  listLoadedChannels(): string[];
  hasChannel(channelId: string): boolean;
}

export type SuperPluginCapabilitySummary = {
  id: string;
  name: string;
  description?: string;
  kinds: string[];
  channels: string[];
  commands: string[];
  services: string[];
  toolNames: string[];
  bundleCapabilities: string[];
  hasConfigSchema: boolean;
};

export interface PluginRegistry {
  listLoadedPlugins(): string[];
  hasPlugin(pluginId: string): boolean;
  getCapabilitySummary(): SuperPluginCapabilitySummary[];
}

export interface WorkspaceBootstrap {
  runBootChecks(agentId?: string): Promise<BootRunResult>;
}

export interface ShellCapabilityRegistry {
  getSnapshot(params: { sessionKey: string }): SuperShellCapabilitySnapshot;
}

export interface SandboxRuntimeRegistry {
  getSnapshot(params: { sessionKey?: string }): SuperSandboxRuntimeSnapshot;
}

export interface CompactionManager {
  getSnapshot(sessionKey: string): ContextPressureSnapshot;
  shouldCompact(sessionKey: string): boolean;
  compact(sessionKey: string): Promise<CompactionActionResult>;
  recoverFromOverflow(sessionKey: string): Promise<CompactionActionResult>;
}

export type CompactionActionResult =
  | {
      status: "compacted";
      actionId?: string;
      result?: {
        summary?: string;
        firstKeptEntryId?: string;
        tokensBefore: number;
        tokensAfter?: number;
        details?: unknown;
      };
    }
  | {
      status: "skipped";
      actionId?: string;
      reason?: string;
      result?: {
        summary?: string;
        firstKeptEntryId?: string;
        tokensBefore: number;
        tokensAfter?: number;
        details?: unknown;
      };
    }
  | {
      status: "failed";
      actionId?: string;
      reason: string;
      result?: {
        summary?: string;
        firstKeptEntryId?: string;
        tokensBefore: number;
        tokensAfter?: number;
        details?: unknown;
      };
    }
  | {
      status: "unavailable";
      actionId?: string;
      reason?: string;
    };

function toKinds(kind: OpenClawPluginRegistry["plugins"][number]["kind"]): string[] {
  if (!kind) {
    return [];
  }
  return Array.isArray(kind) ? [...kind] : [kind];
}

export function createSuperPluginCapabilityRegistry(
  registry: OpenClawPluginRegistry,
): PluginRegistry {
  return {
    listLoadedPlugins: () => registry.plugins.map((entry) => entry.id),
    hasPlugin: (pluginId) => registry.plugins.some((entry) => entry.id === pluginId),
    getCapabilitySummary: () =>
      registry.plugins.map((entry) => ({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        kinds: toKinds(entry.kind),
        channels: [...entry.channelIds],
        commands: [...entry.commands],
        services: [...entry.services],
        toolNames: [...entry.toolNames],
        bundleCapabilities: [...(entry.bundleCapabilities ?? [])],
        hasConfigSchema: entry.configSchema,
      })),
  };
}
