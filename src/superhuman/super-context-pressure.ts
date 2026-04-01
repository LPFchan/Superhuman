import { resolveSessionAgentId } from "../agents/agent-scope.js";
import { resolveContextWindowInfo } from "../agents/context-window-guard.js";
import { DEFAULT_CONTEXT_TOKENS } from "../agents/defaults.js";
import { resolveCompactionReserveTokensFloor } from "../agents/pi-settings.js";
import type { OpenClawConfig } from "../config/config.js";
import { loadGatewaySessionRow, resolveSessionModelRef } from "../gateway/session-utils.js";
import type { ContextPressureSnapshot } from "./super-runtime-seams.js";

export const DEFAULT_RESERVED_OUTPUT_TOKENS = 4_096;
export const DEFAULT_AUTOCOMPACT_BUFFER_TOKENS = 13_000;
export const DEFAULT_BLOCKING_BUFFER_TOKENS = 3_000;

export type ContextPressureSnapshotOptions = {
  sessionKey: string;
  estimatedInputTokens: number;
  configuredContextLimit?: number;
  reservedOutputTokens?: number;
  autocompactBufferTokens?: number;
  blockingBufferTokens?: number;
  persistedCompactionEventRefs?: string[];
  createdAt?: number;
  runId?: string;
};

function toNonNegativeInt(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.floor(value);
}

function toPositiveInt(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.floor(value);
}

export function buildSuperContextPressureSnapshot(
  params: ContextPressureSnapshotOptions,
): ContextPressureSnapshot {
  const configuredContextLimit = Math.max(
    1,
    toPositiveInt(params.configuredContextLimit) ?? DEFAULT_CONTEXT_TOKENS,
  );
  const reservedOutputTokens = Math.min(
    configuredContextLimit - 1,
    Math.max(0, toNonNegativeInt(params.reservedOutputTokens) ?? DEFAULT_RESERVED_OUTPUT_TOKENS),
  );
  const effectiveContextLimit = Math.max(1, configuredContextLimit - reservedOutputTokens);
  const autocompactBufferTokens = Math.max(
    0,
    Math.min(
      effectiveContextLimit,
      toNonNegativeInt(params.autocompactBufferTokens) ?? DEFAULT_AUTOCOMPACT_BUFFER_TOKENS,
    ),
  );
  const blockingBufferTokens = Math.max(
    0,
    Math.min(
      effectiveContextLimit,
      toNonNegativeInt(params.blockingBufferTokens) ?? DEFAULT_BLOCKING_BUFFER_TOKENS,
    ),
  );
  const estimatedInputTokens = Math.max(0, toNonNegativeInt(params.estimatedInputTokens) ?? 0);
  const autocompactThreshold = Math.max(0, effectiveContextLimit - autocompactBufferTokens);
  const blockingThreshold = Math.max(0, effectiveContextLimit - blockingBufferTokens);
  const remainingBudget = Math.max(0, effectiveContextLimit - estimatedInputTokens);
  return {
    sessionKey: params.sessionKey,
    runId: params.runId,
    createdAt: params.createdAt,
    estimatedInputTokens,
    configuredContextLimit,
    reservedOutputTokens,
    effectiveContextLimit,
    autocompactBufferTokens,
    blockingBufferTokens,
    autocompactThreshold,
    blockingThreshold,
    remainingBudget,
    overflowRisk:
      estimatedInputTokens >= autocompactThreshold || estimatedInputTokens >= blockingThreshold,
    persistedCompactionEventRefs: [...(params.persistedCompactionEventRefs ?? [])],
  };
}

export function resolveSuperContextPressureOptionsForSession(params: {
  sessionKey: string;
  configuredContextLimit?: number;
  reservedOutputTokens?: number;
  autocompactBufferTokens?: number;
  blockingBufferTokens?: number;
}): Omit<ContextPressureSnapshotOptions, "estimatedInputTokens"> {
  const session = loadGatewaySessionRow(params.sessionKey);
  const configuredContextLimit =
    toPositiveInt(params.configuredContextLimit) ??
    toPositiveInt(session?.contextTokens) ??
    DEFAULT_CONTEXT_TOKENS;
  const explicitReservedOutputTokens = toNonNegativeInt(params.reservedOutputTokens);
  const reservedOutputTokens =
    explicitReservedOutputTokens !== undefined
      ? Math.min(configuredContextLimit - 1, explicitReservedOutputTokens)
      : Math.min(
          configuredContextLimit - 1,
          Math.max(DEFAULT_RESERVED_OUTPUT_TOKENS, toPositiveInt(session?.outputTokens) ?? 0),
        );
  return {
    sessionKey: params.sessionKey,
    configuredContextLimit,
    reservedOutputTokens,
    autocompactBufferTokens: params.autocompactBufferTokens,
    blockingBufferTokens: params.blockingBufferTokens,
  };
}

export function resolveSuperContextPressureOptionsFromConfig(params: {
  cfg: OpenClawConfig;
  sessionKey: string;
}): Omit<ContextPressureSnapshotOptions, "estimatedInputTokens"> {
  const gatewayRow = loadGatewaySessionRow(params.sessionKey);
  const agentId = resolveSessionAgentId({ sessionKey: params.sessionKey, config: params.cfg });
  const modelRef = resolveSessionModelRef(params.cfg, gatewayRow ?? undefined, agentId);
  const contextInfo = resolveContextWindowInfo({
    cfg: params.cfg,
    provider: modelRef.provider,
    modelId: modelRef.model,
    modelContextWindow: gatewayRow?.contextTokens,
    defaultTokens: DEFAULT_CONTEXT_TOKENS,
  });
  const reserveCeiling = Math.max(0, resolveCompactionReserveTokensFloor(params.cfg));
  const observedOutputTokens =
    toPositiveInt(gatewayRow?.outputTokens) ?? DEFAULT_RESERVED_OUTPUT_TOKENS;
  const reservedOutputTokens = Math.min(
    Math.max(1, contextInfo.tokens - 1),
    reserveCeiling > 0
      ? Math.max(DEFAULT_RESERVED_OUTPUT_TOKENS, Math.min(observedOutputTokens, reserveCeiling))
      : Math.max(DEFAULT_RESERVED_OUTPUT_TOKENS, observedOutputTokens),
  );
  return {
    sessionKey: params.sessionKey,
    configuredContextLimit: contextInfo.tokens,
    reservedOutputTokens,
    autocompactBufferTokens: DEFAULT_AUTOCOMPACT_BUFFER_TOKENS,
    blockingBufferTokens: DEFAULT_BLOCKING_BUFFER_TOKENS,
  };
}
