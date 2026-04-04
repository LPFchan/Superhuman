import crypto from "node:crypto";
import fs from "node:fs";
import { resolveSessionAgentId } from "../../agents/agent-scope.js";
import { buildContextEngineMaintenanceRuntimeContext } from "../../agents/pi-embedded-runner/context-engine-maintenance.js";
import type { OpenClawConfig } from "../../config/config.js";
import { ensureContextEnginesInitialized } from "../../context-engine/init.js";
import { resolveContextEngine } from "../../context-engine/registry.js";
import type { ContextEngine, CompactResult } from "../../context-engine/types.js";
import { resolveSessionTranscriptCandidates } from "../../gateway/session-utils.fs.js";
import { loadGatewaySessionRow, loadSessionEntry } from "../../gateway/session-utils.js";
import type { CompactionActionResult, CompactionManager, StateStore } from "../runtime/seams.js";

function createId(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

function resolveTranscriptPath(params: {
  sessionId: string;
  storePath?: string;
  sessionFile?: string;
  agentId?: string;
}): string | undefined {
  return resolveSessionTranscriptCandidates(
    params.sessionId,
    params.storePath,
    params.sessionFile,
    params.agentId,
  ).find((candidate) => fs.existsSync(candidate));
}

function toActionResult(result: CompactResult, actionId?: string): CompactionActionResult {
  if (result.ok && result.compacted) {
    return {
      status: "compacted",
      actionId,
      result: result.result,
    };
  }
  if (!result.ok) {
    return {
      status: "failed",
      actionId,
      reason: result.reason ?? "compaction-failed",
      result: result.result,
    };
  }
  return {
    status: "skipped",
    actionId,
    reason: result.reason,
    result: result.result,
  };
}

export class SuperContextEngineCompactionManager implements CompactionManager {
  constructor(
    private readonly params: {
      cfg: OpenClawConfig;
      workspaceDir: string;
      stateStore: StateStore;
    },
  ) {}

  getSnapshot(sessionKey: string) {
    return this.params.stateStore.getContextPressureSnapshot({ sessionKey });
  }

  shouldCompact(sessionKey: string): boolean {
    const snapshot = this.getSnapshot(sessionKey);
    return snapshot.estimatedInputTokens >= snapshot.autocompactThreshold;
  }

  async compact(sessionKey: string): Promise<CompactionActionResult> {
    return await this.runCompaction({
      sessionKey,
      force: false,
      compactionTarget: "threshold",
    });
  }

  async recoverFromOverflow(sessionKey: string): Promise<CompactionActionResult> {
    return await this.runCompaction({
      sessionKey,
      force: true,
      compactionTarget: "budget",
    });
  }

  private async runCompaction(params: {
    sessionKey: string;
    force: boolean;
    compactionTarget: "budget" | "threshold";
  }): Promise<CompactionActionResult> {
    const snapshot = this.getSnapshot(params.sessionKey);
    const createdAt = Date.now();
    const actionId = createId("compaction");
    const session = loadSessionEntry(params.sessionKey);
    const sessionId = session.entry?.sessionId?.trim();
    if (!session.entry || !sessionId) {
      this.recordCompactionAttempt({
        actionId,
        sessionKey: params.sessionKey,
        runId: undefined,
        createdAt,
        status: "unavailable",
        reason: "session-not-found",
        snapshot,
        params,
      });
      return {
        status: "unavailable",
        actionId,
        reason: "session-not-found",
      };
    }

    const agentId = resolveSessionAgentId({
      sessionKey: session.canonicalKey,
      config: this.params.cfg,
    });
    const sessionFile = resolveTranscriptPath({
      sessionId,
      storePath: session.storePath,
      sessionFile: session.entry.sessionFile,
      agentId,
    });
    if (!sessionFile) {
      this.recordCompactionAttempt({
        actionId,
        sessionKey: session.canonicalKey,
        runId: sessionId,
        createdAt,
        status: "unavailable",
        reason: "transcript-not-found",
        snapshot,
        params,
      });
      return {
        status: "unavailable",
        actionId,
        reason: "transcript-not-found",
      };
    }

    ensureContextEnginesInitialized();
    const contextEngine = await resolveContextEngine(this.params.cfg);
    try {
      const gatewayRow = loadGatewaySessionRow(session.canonicalKey);
      const runtimeContext = buildContextEngineMaintenanceRuntimeContext({
        sessionId,
        sessionKey: session.canonicalKey,
        sessionFile,
        runtimeContext: {
          workspaceDir: this.params.workspaceDir,
          config: this.params.cfg,
          sessionFile,
          provider: gatewayRow?.modelProvider,
          model: gatewayRow?.model,
          currentTokenCount: snapshot.estimatedInputTokens,
        },
      });
      try {
        const result = await contextEngine.compact({
          sessionId,
          sessionKey: session.canonicalKey,
          sessionFile,
          tokenBudget: snapshot.configuredContextLimit,
          currentTokenCount: snapshot.estimatedInputTokens,
          force: params.force,
          compactionTarget: params.compactionTarget,
          runtimeContext,
        });
        this.recordCompactionAttempt({
          actionId,
          sessionKey: session.canonicalKey,
          runId: sessionId,
          createdAt,
          status: result.ok ? (result.compacted ? "compacted" : "skipped") : "failed",
          reason: result.reason,
          result,
          snapshot,
          params,
          sessionFile,
        });
        return toActionResult(result, actionId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.recordCompactionAttempt({
          actionId,
          sessionKey: session.canonicalKey,
          runId: sessionId,
          createdAt,
          status: "failed",
          reason,
          snapshot,
          params,
          sessionFile,
        });
        return {
          status: "failed",
          actionId,
          reason,
        };
      }
    } finally {
      await this.disposeEngine(contextEngine);
    }
  }

  private recordCompactionAttempt(params: {
    actionId: string;
    sessionKey: string;
    runId?: string;
    createdAt: number;
    status: "compacted" | "failed" | "skipped" | "unavailable";
    reason?: string;
    result?: CompactResult;
    snapshot: ReturnType<SuperContextEngineCompactionManager["getSnapshot"]>;
    params: {
      force: boolean;
      compactionTarget: "budget" | "threshold";
    };
    sessionFile?: string;
  }): void {
    const completedAt = Date.now();
    const resultDetails =
      params.result?.result?.details && typeof params.result.result.details === "object"
        ? (params.result.result.details as Record<string, unknown>)
        : {};
    const priorRefs = Array.isArray(params.snapshot.persistedCompactionEventRefs)
      ? params.snapshot.persistedCompactionEventRefs
      : [];
    const persistedCompactionEventRefs = [params.actionId, ...priorRefs].slice(0, 20);
    this.params.stateStore.appendAction({
      actionId: params.actionId,
      sessionKey: params.sessionKey,
      runId: params.runId,
      actionType: "super.compaction",
      actionKind: "compaction",
      summary:
        params.status === "compacted"
          ? "Compaction completed"
          : params.status === "skipped"
            ? "Compaction skipped"
            : params.status === "failed"
              ? "Compaction failed"
              : "Compaction unavailable",
      status: params.status,
      createdAt: params.createdAt,
      completedAt,
      details: {
        compactionTarget: params.params.compactionTarget,
        forced: params.params.force,
        thresholdUsed:
          params.params.compactionTarget === "threshold"
            ? params.snapshot.autocompactThreshold
            : params.snapshot.blockingThreshold,
        tokenEstimate: params.snapshot.estimatedInputTokens,
        reason: params.reason,
        sessionFile: params.sessionFile,
        summary: params.result?.result?.summary,
        firstKeptEntryId: params.result?.result?.firstKeptEntryId,
        tokensBefore: params.result?.result?.tokensBefore ?? params.snapshot.estimatedInputTokens,
        tokensAfter: params.result?.result?.tokensAfter,
        ...resultDetails,
      },
    });
    if (params.result?.result?.summary) {
      this.params.stateStore.appendArtifact({
        artifactId: `${params.actionId}:summary`,
        sessionKey: params.sessionKey,
        kind: "compaction-summary",
        label: "Compaction summary",
        location: params.sessionFile,
        createdAt: completedAt,
        metadata: {
          actionId: params.actionId,
          summary: params.result.result.summary,
          firstKeptEntryId: params.result.result.firstKeptEntryId,
          tokensBefore: params.result.result.tokensBefore,
          tokensAfter: params.result.result.tokensAfter,
        },
      });
    }
    this.params.stateStore.recordContextPressureSnapshot({
      sessionKey: params.sessionKey,
      runId: params.runId,
      createdAt: completedAt,
      configuredContextLimit: params.snapshot.configuredContextLimit,
      reservedOutputTokens: params.snapshot.reservedOutputTokens,
      autocompactBufferTokens: params.snapshot.autocompactBufferTokens,
      blockingBufferTokens: params.snapshot.blockingBufferTokens,
      persistedCompactionEventRefs,
    });
  }

  private async disposeEngine(contextEngine: ContextEngine): Promise<void> {
    if (typeof contextEngine.dispose === "function") {
      await contextEngine.dispose();
    }
  }
}
