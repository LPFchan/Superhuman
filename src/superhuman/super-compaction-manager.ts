import fs from "node:fs";
import { resolveSessionAgentId } from "../agents/agent-scope.js";
import { buildContextEngineMaintenanceRuntimeContext } from "../agents/pi-embedded-runner/context-engine-maintenance.js";
import type { OpenClawConfig } from "../config/config.js";
import { ensureContextEnginesInitialized } from "../context-engine/init.js";
import { resolveContextEngine } from "../context-engine/registry.js";
import type { ContextEngine, CompactResult } from "../context-engine/types.js";
import { resolveSessionTranscriptCandidates } from "../gateway/session-utils.fs.js";
import { loadGatewaySessionRow, loadSessionEntry } from "../gateway/session-utils.js";
import type {
  CompactionActionResult,
  CompactionManager,
  StateStore,
} from "./super-runtime-seams.js";

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

function toActionResult(result: CompactResult): CompactionActionResult {
  if (result.ok && result.compacted) {
    return {
      status: "compacted",
      result: result.result,
    };
  }
  if (!result.ok) {
    return {
      status: "failed",
      reason: result.reason ?? "compaction-failed",
      result: result.result,
    };
  }
  return {
    status: "skipped",
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
    const session = loadSessionEntry(params.sessionKey);
    const sessionId = session.entry?.sessionId?.trim();
    if (!session.entry || !sessionId) {
      return {
        status: "unavailable",
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
      return {
        status: "unavailable",
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
      return toActionResult(result);
    } finally {
      await this.disposeEngine(contextEngine);
    }
  }

  private async disposeEngine(contextEngine: ContextEngine): Promise<void> {
    if (typeof contextEngine.dispose === "function") {
      await contextEngine.dispose();
    }
  }
}
