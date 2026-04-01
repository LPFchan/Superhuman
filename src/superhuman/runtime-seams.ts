import type { BootRunResult } from "../gateway/boot.js";
import type { PluginRegistry as OpenClawPluginRegistry } from "../plugins/registry.js";

export type ConversationWindowMessage = {
  messageId: string;
  role: string;
  contentText: string;
  createdAt: number;
  approxTokens: number;
  transcriptMessageId?: string;
  sequence?: number;
};

export type ConversationWindow = {
  sessionKey: string;
  messages: ConversationWindowMessage[];
  approximateTokenCount: number;
  latestAssistantTurnId?: string;
  latestUserTurnId?: string;
};

export type ContextPressureSnapshot = {
  sessionKey: string;
  estimatedInputTokens: number;
  effectiveContextLimit: number;
  remainingBudget: number;
  overflowRisk: boolean;
};

export type StateSessionRecord = {
  sessionKey: string;
  sessionId?: string;
  agentId: string;
  workspaceDir: string;
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
};

export type StateActionAppend = {
  actionId: string;
  sessionKey?: string;
  runId?: string;
  actionType: string;
  summary: string;
  status?: string;
  createdAt: number;
  completedAt?: number;
};

export type StateArtifactAppend = {
  artifactId: string;
  sessionKey?: string;
  messageId?: string;
  kind: string;
  label?: string;
  location?: string;
  createdAt: number;
};

export interface StateStore {
  upsertSession(session: StateSessionUpsert): void;
  appendMessage(message: StateMessageAppend): void;
  appendAction(action: StateActionAppend): void;
  appendArtifact(artifact: StateArtifactAppend): void;
  getSessionSnapshot(sessionKey: string): StateSessionRecord | null;
  getArtifacts(params?: { sessionKey?: string }): StateArtifactAppend[];
  getConversationWindow(params: { sessionKey: string; limit?: number }): ConversationWindow;
  getContextPressureSnapshot(params: {
    sessionKey: string;
    effectiveContextLimit?: number;
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

export interface PluginRegistry {
  listLoadedPlugins(): string[];
  hasPlugin(pluginId: string): boolean;
  getCapabilitySummary(): Array<{
    id: string;
    channels: string[];
    commands: string[];
    services: string[];
  }>;
}

export interface WorkspaceBootstrap {
  runBootChecks(agentId?: string): Promise<BootRunResult>;
}

export interface CompactionManager {
  getSnapshot(sessionKey: string): ContextPressureSnapshot;
  shouldCompact(sessionKey: string): boolean;
  compact(sessionKey: string): Promise<{ status: "skipped" }>;
  recoverFromOverflow(sessionKey: string): Promise<{ status: "unavailable" }>;
}

export class NoopCompactionManager implements CompactionManager {
  constructor(private readonly resolveSnapshot: (sessionKey: string) => ContextPressureSnapshot) {}

  getSnapshot(sessionKey: string): ContextPressureSnapshot {
    return this.resolveSnapshot(sessionKey);
  }

  shouldCompact(_sessionKey: string): boolean {
    return false;
  }

  async compact(_sessionKey: string): Promise<{ status: "skipped" }> {
    return { status: "skipped" };
  }

  async recoverFromOverflow(_sessionKey: string): Promise<{ status: "unavailable" }> {
    return { status: "unavailable" };
  }
}

export function createPluginCapabilityRegistry(registry: OpenClawPluginRegistry): PluginRegistry {
  return {
    listLoadedPlugins: () => registry.plugins.map((entry) => entry.id),
    hasPlugin: (pluginId) => registry.plugins.some((entry) => entry.id === pluginId),
    getCapabilitySummary: () =>
      registry.plugins.map((entry) => ({
        id: entry.id,
        channels: [...entry.channelIds],
        commands: [...entry.commands],
        services: [...entry.services],
      })),
  };
}
