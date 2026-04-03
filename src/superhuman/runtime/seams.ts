import type { StreamFn } from "@mariozechner/pi-agent-core";
import type { ProviderCapabilities } from "../../agents/provider-capabilities.js";
import type { BootRunResult } from "../../gateway/boot.js";
import type { PluginRegistry as OpenClawPluginRegistry } from "../../plugins/registry.js";
import type {
  ProviderCreateStreamFnContext,
  ProviderDefaultThinkingPolicyContext,
  ProviderNormalizeTransportContext,
  ProviderPreparedRuntimeAuth,
  ProviderPrepareRuntimeAuthContext,
  ProviderThinkingPolicyContext,
} from "../../plugins/types.js";

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
  replayAnnotations?: StateReplayAnnotation[];
};

export type StateStructuredDetails = Record<string, unknown>;

export type StateReplayAnnotation =
  | {
      kind: "verification";
      outcome?: VerificationOutcome;
      stage?: SuperVerificationStage;
      verifierKind?: SuperVerifierKind;
      summary?: string;
      command?: string;
      exitCode?: number;
    }
  | {
      kind: "partial_read";
      sourceTool?: string;
      descriptor?: string;
      requestedRange?: {
        startLine?: number;
        endLine?: number;
      };
      returnedRange?: {
        startLine?: number;
        endLine?: number;
      };
      totalKnownLines?: number;
      limitKind?: string;
      continuationHint?: string;
      artifactId?: string;
      fullArtifactId?: string;
    }
  | {
      kind: "persisted_preview";
      descriptor?: string;
      previewArtifactId?: string;
      fullArtifactId?: string;
      storagePath?: string;
      previewBytes?: number;
      fullBytes?: number;
    }
  | {
      kind: "imported_history";
      importedFrom?: string;
      externalId?: string;
      sourceSessionKey?: string;
      descriptor?: string;
    };

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

export type SuperExecutionEnvironmentKind =
  | "local"
  | "remote"
  | "scheduled_remote"
  | "computer_use";

export type SuperExecutionBackendId = "local" | "acp" | "remote_peer" | "computer_use";

export type SuperExecutionCapabilityBundleId =
  | "workspace_navigation"
  | "semantic_code"
  | "verification"
  | "artifact_replay"
  | "provenance_replay"
  | "computer_control";

export type SuperExecutionCapabilityBundle = {
  id: SuperExecutionCapabilityBundleId;
  label: string;
  required: boolean;
  available: boolean;
  details?: string;
};

export type SuperExecutionEnvironmentCapabilities = {
  supportsWorkspaceSearchFallback: boolean;
  supportsSymbolReferences: boolean;
  supportsSemanticRename: boolean;
  supportsVerificationReplay: boolean;
  supportsArtifactReplay: boolean;
  supportsProvenanceReplay: boolean;
  supportsComputerUse: boolean;
  workspaceSearchFallbackToolKinds: string[];
  semanticToolProviderIds: string[];
  bundles: SuperExecutionCapabilityBundle[];
};

export type SuperExecutionEnvironmentSnapshot = {
  environmentId: string;
  sessionKey?: string;
  workerId?: string;
  label: string;
  kind: SuperExecutionEnvironmentKind;
  backendId: SuperExecutionBackendId;
  providerId?: string;
  createdAt: number;
  updatedAt: number;
  capabilityMode: SuperShellCapabilityMode;
  capabilities: SuperExecutionEnvironmentCapabilities;
};

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

export type StateContextCollapseCommittedSpan = {
  collapseId: string;
  summary: string;
  firstKeptEntryId: string;
  sourceStartEntryId: string;
  sourceEndEntryId: string;
  messageCount: number;
  estimatedTokens: number;
  committedAt: number;
};

export type StateContextCollapseStagedSpan = {
  collapseId: string;
  summary: string;
  firstEntryId: string;
  lastEntryId: string;
  firstKeptEntryId: string;
  messageCount: number;
  estimatedTokens: number;
  stagedAt: number;
};

export type StateContextCollapseDroppedSpan = {
  collapseId?: string;
  sourceStartEntryId?: string;
  sourceEndEntryId?: string;
};

export type StateContextCollapseLedgerRecord = {
  sessionKey: string;
  runId?: string;
  updatedAt: number;
  committedSpans: StateContextCollapseCommittedSpan[];
  stagedSpans: StateContextCollapseStagedSpan[];
  droppedSpans: StateContextCollapseDroppedSpan[];
  restoredArtifacts: string[];
  recoveryMode?: string;
  visibleContextState?: string;
  tokensBefore?: number;
  tokensAfter?: number;
  operatorSummary?: string;
};

export type StateContextCollapseLedgerUpsert = StateContextCollapseLedgerRecord;

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

export type StateMemoryEvidenceRef = {
  sessionKey?: string;
  messageId?: string;
  role: string;
  excerpt: string;
  timestamp?: number;
  source: StateEvidenceSource;
};

export type StateMemoryWriteAuditEntry = {
  entry: string;
  supportingEvidence: StateMemoryEvidenceRef[];
  sourceSessionKeys: string[];
  evidenceSources: StateEvidenceSource[];
};

export type StateMemoryWriteAuditStatus = "completed" | "failed" | "skipped" | "unchanged";

export type StateMemoryWriteAuditRecord = {
  auditId: string;
  sessionKey?: string;
  runId?: string;
  operationKind: "extraction" | "consolidation";
  memoryPath: string;
  status: StateMemoryWriteAuditStatus;
  beforeHash?: string;
  afterHash?: string;
  beforeLineCount: number;
  afterLineCount: number;
  sourceSessionKeys: string[];
  evidenceCounts: Record<StateEvidenceSource, number>;
  evidenceRefs: StateMemoryEvidenceRef[];
  addedEntries: StateMemoryWriteAuditEntry[];
  removedEntries: string[];
  changedAt: number;
  operatorSummary?: string;
};

export type StateMemoryWriteAuditAppend = StateMemoryWriteAuditRecord;

export type FrozenMemoryReductionReason =
  | "delimiter_abuse"
  | "exfiltration_pattern"
  | "invisible_char"
  | "prompt_injection";

export type StateFrozenMemoryBlockedLine = {
  line: string;
  reason: FrozenMemoryReductionReason;
  pattern?: string;
};

export type StateFrozenMemorySnapshotRecord = {
  sessionKey: string;
  snapshotPath: string;
  createdAt: number;
  updatedAt: number;
  safeLineCount: number;
  removedLineCount: number;
  blocked: boolean;
  blockedLines: StateFrozenMemoryBlockedLine[];
};

export type StateFrozenMemorySnapshotUpsert = StateFrozenMemorySnapshotRecord;

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

export type StateTeamMemorySyncStateRecord = {
  repoRoot: string;
  remoteRoot?: string;
  lastPulledHash?: string;
  lastPushedHash?: string;
  lastSyncAt?: number;
  lastPullAt?: number;
  lastPushAt?: number;
  lastRetryAt?: number;
  conflictRetryCount: number;
  blockedFiles: string[];
  blockedFileReasons?: Record<string, string>;
  uploadedFiles: string[];
  withheldFiles: string[];
  checksumState?: Record<string, string>;
  lastStatus?: TeamMemorySyncStatus;
  lastDecision?: string;
  updatedAt: number;
};

export type StateTeamMemorySyncStateUpsert = StateTeamMemorySyncStateRecord;

export type AutomationLoopState = "active" | "paused" | "sleeping" | "disabled";

export type AutomationEvidenceSource =
  | StateEvidenceSource
  | "runtime_state"
  | "scheduler_state"
  | "structured_external";

export type AutomationEvidencePosture =
  | "verified"
  | "trusted_state"
  | "structured_external"
  | "provisional"
  | "mixed"
  | "unknown";

export type AutomationVerificationPosture =
  | "verified"
  | "not_required"
  | "not_verifiable"
  | "verification_failed"
  | "unknown";

export type AutomationCapabilityPosture = "satisfied" | "not_required" | "blocked" | "unknown";

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
  policySummary?: string;
  actionSummary?: string;
  resultStatus: string;
  evidencePosture?: AutomationEvidencePosture;
  evidenceSources?: AutomationEvidenceSource[];
  verificationPosture?: AutomationVerificationPosture;
  verificationOutcome?: VerificationOutcome;
  capabilityPosture?: AutomationCapabilityPosture;
  capabilityMode?: SuperShellCapabilityMode;
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
  latestActivityAt?: number;
  displayName?: string;
  label?: string;
  parentSessionKey?: string;
  lastMessageId?: string;
  lastUserTurnId?: string;
  lastAssistantTurnId?: string;
  capabilitySnapshot?: SuperShellCapabilitySnapshot;
  sandboxRuntime?: SuperSandboxRuntimeSnapshot;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  actionCount: number;
  artifactCount: number;
  inputTokenCount: number;
  outputTokenCount: number;
};

export type StateSessionUpsert = Omit<
  StateSessionRecord,
  | "messageCount"
  | "userMessageCount"
  | "assistantMessageCount"
  | "actionCount"
  | "artifactCount"
  | "inputTokenCount"
  | "outputTokenCount"
> & {
  messageCount?: number;
  userMessageCount?: number;
  assistantMessageCount?: number;
  actionCount?: number;
  artifactCount?: number;
  inputTokenCount?: number;
  outputTokenCount?: number;
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
  requestedRange?: {
    startLine?: number;
    endLine?: number;
  };
  returnedRange?: {
    startLine?: number;
    endLine?: number;
  };
  totalKnownLines?: number;
  limitKind?: string;
  continuationHint?: string;
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
  upsertContextCollapseLedger(ledger: StateContextCollapseLedgerUpsert): void;
  getContextCollapseLedger(sessionKey: string): StateContextCollapseLedgerRecord | null;
  appendMemoryWriteAudit(audit: StateMemoryWriteAuditAppend): void;
  listMemoryWriteAudits(params?: {
    sessionKey?: string;
    limit?: number;
  }): StateMemoryWriteAuditRecord[];
  upsertFrozenMemorySnapshot(snapshot: StateFrozenMemorySnapshotUpsert): void;
  getFrozenMemorySnapshot(sessionKey: string): StateFrozenMemorySnapshotRecord | null;
  appendTeamMemorySyncEvent(event: StateTeamMemorySyncEventAppend): void;
  listTeamMemorySyncEvents(params?: {
    repoRoot?: string;
    limit?: number;
  }): StateTeamMemorySyncEventRecord[];
  upsertTeamMemorySyncState(state: StateTeamMemorySyncStateUpsert): void;
  getTeamMemorySyncState(repoRoot: string): StateTeamMemorySyncStateRecord | null;
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

export type SuperPluginShellContract = {
  id: string;
  name: string;
  providesWorkspaceSearchFallback: boolean;
  providesSymbolReferences: boolean;
  providesSemanticRename: boolean;
  semanticToolProviderIds: string[];
  toolNames: string[];
  bundleCapabilities: string[];
  hasConfigSchema: boolean;
};

export type SuperSandboxToolDecision = {
  sessionKey: string;
  agentId: string;
  mainSessionKey: string;
  toolName: string;
  sandboxed: boolean;
  allowed: boolean;
  reason: "sandbox_disabled" | "allowed" | "blocked_by_deny" | "blocked_by_allow";
  blockedBy?: "deny" | "allow";
  policySourceKey?: string;
  remediation: {
    explainCommand: string;
    disableSandboxConfigKey: string;
    suggestMainSession: boolean;
  };
};

export interface PluginRegistry {
  listLoadedPlugins(): string[];
  hasPlugin(pluginId: string): boolean;
  getCapabilitySummary(): SuperPluginCapabilitySummary[];
  getShellContracts(): SuperPluginShellContract[];
}

export interface WorkspaceBootstrap {
  runBootChecks(agentId?: string): Promise<BootRunResult>;
}

export interface ShellCapabilityRegistry {
  getSnapshot(params: { sessionKey: string }): SuperShellCapabilitySnapshot;
}

export interface ExecutionEnvironmentRegistry {
  getSnapshot(params: {
    sessionKey?: string;
    workerId?: string;
    kind?: SuperExecutionEnvironmentKind;
  }): SuperExecutionEnvironmentSnapshot | null;
  listSnapshots(): SuperExecutionEnvironmentSnapshot[];
  upsertSnapshot(snapshot: SuperExecutionEnvironmentSnapshot): void;
}

export interface SandboxRuntimeRegistry {
  getSnapshot(params: { sessionKey?: string }): SuperSandboxRuntimeSnapshot;
  evaluateTool(params: { sessionKey?: string; toolName: string }): SuperSandboxToolDecision;
}

export type SuperExecutionLaunchCapabilityRequirement =
  | SuperShellCapabilityMode
  | "verification_replay"
  | "artifact_replay"
  | "provenance_replay"
  | "computer_use";

export type SuperExecutionCapabilityRequirementResult = {
  satisfied: boolean;
  missing: SuperExecutionLaunchCapabilityRequirement[];
};

export type SuperExecutionBackendDescriptor = {
  id: SuperExecutionBackendId;
  label: string;
  environmentKinds: SuperExecutionEnvironmentKind[];
  supportsRemoteSessions: boolean;
  supportsReconnect: boolean;
  supportsComputerUse: boolean;
};

export type SuperExecutionProviderDescriptor = {
  id: string;
  label: string;
  configured: boolean;
  pluginBacked: boolean;
  providerFamily: ProviderCapabilities["providerFamily"];
  supportsReasoning: boolean;
  supportsToolCalling: boolean;
  supportsVision: boolean;
};

export interface SuperExecutionProviderAdapter {
  describe(): SuperExecutionProviderDescriptor;
  resolveCapabilities(): ProviderCapabilities;
  normalizeTransport(
    context: ProviderNormalizeTransportContext,
  ): { api?: string | null; baseUrl?: string } | undefined;
  resolveStreamFn(context: ProviderCreateStreamFnContext): StreamFn | undefined;
  prepareRuntimeAuth(
    context: ProviderPrepareRuntimeAuthContext,
  ): Promise<ProviderPreparedRuntimeAuth | null | undefined>;
  supportsXHighThinking(context: ProviderThinkingPolicyContext): boolean | undefined;
  resolveDefaultThinkingLevel(context: ProviderDefaultThinkingPolicyContext): string | undefined;
}

export interface ExecutionBackendRegistry {
  listBackends(): SuperExecutionBackendDescriptor[];
  getBackend(backendId: string): SuperExecutionBackendDescriptor | null;
}

export interface ExecutionProviderRegistry {
  listProviders(): SuperExecutionProviderDescriptor[];
  getProvider(providerId: string): SuperExecutionProviderDescriptor | null;
  getAdapter(providerId: string): SuperExecutionProviderAdapter | null;
  getPreferredProvider(params?: { agentId?: string }): SuperExecutionProviderDescriptor | null;
}

export type SuperComputerUsePermissionRequest = {
  requestId: string;
  sessionKey: string;
  workerId?: string;
  action: string;
  details?: Record<string, unknown>;
};

export type SuperComputerUsePermissionResolution = {
  granted: boolean;
  scope: "once" | "session";
  reason?: string;
};

export type SuperComputerUseSessionSnapshot = {
  sessionKey: string;
  workerId?: string;
  adapterId?: string;
  adapterSessionId?: string;
  interactive: boolean;
  enabled: boolean;
  lockOwnerSessionKey?: string;
  selectedDisplayId?: string;
  availableDisplays: SuperComputerUseDisplayDescriptor[];
  startedAt?: number;
  actionCount: number;
  lastActionAt?: number;
  lastAction?: string;
  lastResultStatus?: SuperComputerUseActionResult["status"];
  pendingApproval?: SuperComputerUsePermissionRequest;
  updatedAt: number;
};

export type SuperComputerUseDisplayDescriptor = {
  id: string;
  label: string;
  primary?: boolean;
};

export type SuperComputerUseAdapterDescriptor = {
  id: string;
  label: string;
  supportsApprovals: boolean;
  supportsShellGating: boolean;
  supportsMultipleDisplays: boolean;
};

export type SuperComputerUseActionRequest = {
  requestId: string;
  sessionKey: string;
  workerId?: string;
  action: string;
  toolName?: string;
  mode: RuntimeInvocationMode;
  displayId?: string;
  requiresApproval?: boolean;
  payload?: Record<string, unknown>;
};

export type SuperComputerUseActionResult =
  | {
      status: "completed";
      output?: Record<string, unknown>;
      details?: Record<string, unknown>;
    }
  | {
      status: "approval_required";
      permission: SuperComputerUsePermissionResolution;
      details?: Record<string, unknown>;
    }
  | {
      status: "blocked";
      reason: string;
      details?: Record<string, unknown>;
    };

export interface SuperComputerUseAdapter {
  describe(): SuperComputerUseAdapterDescriptor;
  startSession(params: { sessionKey: string; workerId?: string; displayId?: string }):
    | Promise<{
        sessionId: string;
        displays: SuperComputerUseDisplayDescriptor[];
        selectedDisplayId?: string;
        details?: Record<string, unknown>;
      }>
    | {
        sessionId: string;
        displays: SuperComputerUseDisplayDescriptor[];
        selectedDisplayId?: string;
        details?: Record<string, unknown>;
      };
  dispatchAction(
    request: SuperComputerUseActionRequest,
  ): Promise<SuperComputerUseActionResult> | SuperComputerUseActionResult;
  stopSession(params: {
    sessionKey: string;
    workerId?: string;
    adapterSessionId?: string;
  }): Promise<void> | void;
}

export interface SuperComputerUseRuntime {
  isEnabled(): boolean;
  canUseInMode(mode: RuntimeInvocationMode): boolean;
  listAdapters(): SuperComputerUseAdapterDescriptor[];
  getAdapter(adapterId: string): SuperComputerUseAdapterDescriptor | null;
  getSessionSnapshot(params: {
    sessionKey: string;
    workerId?: string;
  }): SuperComputerUseSessionSnapshot;
  startSession(params: {
    sessionKey: string;
    workerId?: string;
    mode: RuntimeInvocationMode;
    adapterId?: string;
    displayId?: string;
  }): Promise<SuperComputerUseSessionSnapshot>;
  acquireSessionLock(params: { sessionKey: string; workerId?: string }): boolean;
  releaseSessionLock(params: { sessionKey: string; workerId?: string }): void;
  setSelectedDisplay(params: { sessionKey: string; displayId?: string }): void;
  dispatchAction(request: SuperComputerUseActionRequest): Promise<SuperComputerUseActionResult>;
  requestPermission(
    request: SuperComputerUsePermissionRequest,
  ): SuperComputerUsePermissionResolution | null;
  resolvePermission(params: {
    requestId: string;
    resolution: SuperComputerUsePermissionResolution;
  }): boolean;
  stopSession(params: { sessionKey: string; workerId?: string }): Promise<void>;
  cleanupSessionTurn(params: { sessionKey: string; workerId?: string }): void;
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
  const plugins = registry?.plugins ?? [];
  const shellContracts = plugins.map((entry) => {
    const normalizedToolNames = entry.toolNames.map((toolName) => toolName.trim().toLowerCase());
    const providesSemanticRename = normalizedToolNames.some(
      (toolName) => toolName === "symbol_rename" || toolName === "vscode_renamesymbol",
    );
    const semanticToolProviderIds = normalizedToolNames.some((toolName) =>
      toolName.startsWith("lsp_references_"),
    )
      ? [entry.id]
      : [];
    return {
      id: entry.id,
      name: entry.name,
      providesWorkspaceSearchFallback: true,
      providesSymbolReferences: semanticToolProviderIds.length > 0,
      providesSemanticRename,
      semanticToolProviderIds,
      toolNames: [...entry.toolNames],
      bundleCapabilities: [...(entry.bundleCapabilities ?? [])],
      hasConfigSchema: Boolean(entry.configSchema),
    };
  });
  return {
    listLoadedPlugins: () => plugins.map((entry) => entry.id),
    hasPlugin: (pluginId) => plugins.some((entry) => entry.id === pluginId),
    getCapabilitySummary: () =>
      plugins.map((entry) => ({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        kinds: toKinds(entry.kind),
        channels: [...entry.channelIds],
        commands: [...entry.commands],
        services: [...entry.services],
        toolNames: [...entry.toolNames],
        bundleCapabilities: [...(entry.bundleCapabilities ?? [])],
        hasConfigSchema: Boolean(entry.configSchema),
      })),
    getShellContracts: () => shellContracts,
  };
}

export function buildSuperExecutionCapabilityBundles(params: {
  capabilityMode: SuperShellCapabilityMode;
  supportsArtifactReplay?: boolean;
  supportsProvenanceReplay?: boolean;
  supportsVerificationReplay?: boolean;
  supportsComputerUse?: boolean;
  workspaceSearchFallbackToolKinds?: string[];
  semanticToolProviderIds?: string[];
}): SuperExecutionCapabilityBundle[] {
  const workspaceFallbackKinds = params.workspaceSearchFallbackToolKinds ?? [];
  const semanticProviders = params.semanticToolProviderIds ?? [];
  return [
    {
      id: "workspace_navigation",
      label: "Workspace navigation",
      required: true,
      available: workspaceFallbackKinds.length > 0,
      details:
        workspaceFallbackKinds.length > 0
          ? `Fallback tools: ${workspaceFallbackKinds.join(", ")}`
          : "No workspace-search fallback declared.",
    },
    {
      id: "semantic_code",
      label: "Semantic code operations",
      required: params.capabilityMode !== "workspace_search_only",
      available: params.capabilityMode !== "workspace_search_only",
      details:
        semanticProviders.length > 0
          ? `Providers: ${semanticProviders.join(", ")}`
          : "Semantic tooling unavailable; search-only fallback remains.",
    },
    {
      id: "verification",
      label: "Verification replay",
      required: false,
      available: params.supportsVerificationReplay === true,
      details:
        params.supportsVerificationReplay === true
          ? "Verification metadata is preserved across this environment."
          : params.supportsVerificationReplay === false
            ? "Verification metadata cannot be replayed in this environment."
            : "Verification replay support is undeclared for this environment.",
    },
    {
      id: "artifact_replay",
      label: "Artifact replay",
      required: false,
      available: params.supportsArtifactReplay === true,
      details:
        params.supportsArtifactReplay === true
          ? "Artifacts remain reopenable and provenance-linked."
          : params.supportsArtifactReplay === false
            ? "Artifacts degrade to plain text only."
            : "Artifact replay support is undeclared for this environment.",
    },
    {
      id: "provenance_replay",
      label: "Provenance replay",
      required: false,
      available: params.supportsProvenanceReplay === true,
      details:
        params.supportsProvenanceReplay === true
          ? "Structured provenance is preserved."
          : params.supportsProvenanceReplay === false
            ? "Structured provenance cannot be replayed."
            : "Structured provenance replay support is undeclared.",
    },
    {
      id: "computer_control",
      label: "Computer use",
      required: false,
      available: params.supportsComputerUse === true,
      details:
        params.supportsComputerUse === true
          ? "Interactive computer-use dispatch is available."
          : "Computer-use dispatch is unavailable.",
    },
  ];
}

export function toSuperExecutionEnvironmentCapabilities(params: {
  capabilityMode: SuperShellCapabilityMode;
  supportsArtifactReplay?: boolean;
  supportsProvenanceReplay?: boolean;
  supportsVerificationReplay?: boolean;
  supportsComputerUse?: boolean;
  workspaceSearchFallbackToolKinds?: string[];
  semanticToolProviderIds?: string[];
}): SuperExecutionEnvironmentCapabilities {
  const workspaceSearchFallbackToolKinds = params.workspaceSearchFallbackToolKinds ?? [];
  const semanticToolProviderIds = params.semanticToolProviderIds ?? [];
  return {
    supportsWorkspaceSearchFallback: workspaceSearchFallbackToolKinds.length > 0,
    supportsSymbolReferences:
      params.capabilityMode === "symbol_references" || params.capabilityMode === "semantic_rename",
    supportsSemanticRename: params.capabilityMode === "semantic_rename",
    supportsVerificationReplay: params.supportsVerificationReplay === true,
    supportsArtifactReplay: params.supportsArtifactReplay === true,
    supportsProvenanceReplay: params.supportsProvenanceReplay === true,
    supportsComputerUse: params.supportsComputerUse === true,
    workspaceSearchFallbackToolKinds: [...workspaceSearchFallbackToolKinds],
    semanticToolProviderIds: [...semanticToolProviderIds],
    bundles: buildSuperExecutionCapabilityBundles(params),
  };
}

export function resolveCanonicalBackendIdForEnvironmentKind(
  kind: SuperExecutionEnvironmentKind,
): SuperExecutionBackendId {
  switch (kind) {
    case "remote":
    case "scheduled_remote":
      return "remote_peer";
    case "computer_use":
      return "computer_use";
    case "local":
    default:
      return "local";
  }
}

export function evaluateSuperExecutionCapabilityRequirements(params: {
  environment: SuperExecutionEnvironmentSnapshot;
  required: SuperExecutionLaunchCapabilityRequirement[];
}): SuperExecutionCapabilityRequirementResult {
  const missing = params.required.filter((requirement) => {
    switch (requirement) {
      case "semantic_rename":
        return !params.environment.capabilities.supportsSemanticRename;
      case "symbol_references":
        return !params.environment.capabilities.supportsSymbolReferences;
      case "workspace_search_only":
        return !params.environment.capabilities.supportsWorkspaceSearchFallback;
      case "verification_replay":
        return !params.environment.capabilities.supportsVerificationReplay;
      case "artifact_replay":
        return !params.environment.capabilities.supportsArtifactReplay;
      case "provenance_replay":
        return !params.environment.capabilities.supportsProvenanceReplay;
      case "computer_use":
        return !params.environment.capabilities.supportsComputerUse;
      default:
        return true;
    }
  });
  return {
    satisfied: missing.length === 0,
    missing,
  };
}
