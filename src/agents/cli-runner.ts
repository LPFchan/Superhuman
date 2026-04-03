import type { ImageContent } from "@mariozechner/pi-ai";
import type { ThinkLevel } from "../auto-reply/thinking.js";
import type { OpenClawConfig } from "../config/config.js";
import {
  resolveSuperRuntimeInvocationMode,
  SuperhumanAgentRuntimeTurn,
} from "../superhuman/runtime/agent.js";
import { executePreparedCliRun } from "./cli-runner/execute.js";
import { prepareCliRunContext } from "./cli-runner/prepare.js";
import type { RunCliAgentParams } from "./cli-runner/types.js";
import { FailoverError, resolveFailoverStatus } from "./failover-error.js";
import { classifyFailoverReason, isFailoverErrorMessage } from "./pi-embedded-helpers.js";
import type { EmbeddedPiRunResult } from "./pi-embedded-runner.js";

export async function runCliAgent(params: RunCliAgentParams): Promise<EmbeddedPiRunResult> {
  const context = await prepareCliRunContext(params);
  const runtimeTurn = new SuperhumanAgentRuntimeTurn({
    workspaceDir: context.workspaceDir,
    runId: params.runId,
    sessionId: params.sessionId,
    sessionKey: params.sessionKey,
    mode: resolveSuperRuntimeInvocationMode({
      trigger: params.trigger,
      lane: params.lane,
    }),
    trigger: params.trigger,
    maxIterations: 1,
  });
  const detachRuntimeAbort = runtimeTurn.attachAbortSignal(params.abortSignal, "cli-run");
  let runtimeStatus: "completed" | "failed" | "aborted" = "completed";
  let runtimeError: string | undefined;
  runtimeTurn.enterStage("prompt_assembly", "cli context prepared");

  const buildCliRunResult = (resultParams: {
    output: Awaited<ReturnType<typeof executePreparedCliRun>>;
    effectiveCliSessionId?: string;
  }): EmbeddedPiRunResult => {
    runtimeTurn.enterStage("terminal_response", "cli payload assembly");
    const text = resultParams.output.text?.trim();
    const payloads = text ? [{ text }] : undefined;

    return {
      payloads,
      meta: {
        durationMs: Date.now() - context.started,
        systemPromptReport: context.systemPromptReport,
        agentMeta: {
          sessionId: resultParams.effectiveCliSessionId ?? params.sessionId ?? "",
          provider: params.provider,
          model: context.modelId,
          usage: resultParams.output.usage,
          ...(resultParams.effectiveCliSessionId
            ? {
                cliSessionBinding: {
                  sessionId: resultParams.effectiveCliSessionId,
                  ...(params.authProfileId ? { authProfileId: params.authProfileId } : {}),
                  ...(context.extraSystemPromptHash
                    ? { extraSystemPromptHash: context.extraSystemPromptHash }
                    : {}),
                  ...(context.preparedBackend.mcpConfigHash
                    ? { mcpConfigHash: context.preparedBackend.mcpConfigHash }
                    : {}),
                },
              }
            : {}),
        },
      },
    };
  };

  // Try with the provided CLI session ID first
  try {
    try {
      runtimeTurn.enterStage("model_call", "cli execution");
      runtimeTurn.consumeIteration("cli turn");
      const output = await executePreparedCliRun(context, context.reusableCliSession.sessionId);
      const effectiveCliSessionId = output.sessionId ?? context.reusableCliSession.sessionId;
      runtimeStatus = "completed";
      return buildCliRunResult({ output, effectiveCliSessionId });
    } catch (err) {
      if (err instanceof FailoverError) {
        // Check if this is a session expired error and we have a session to clear
        if (
          err.reason === "session_expired" &&
          context.reusableCliSession.sessionId &&
          params.sessionKey
        ) {
          // Clear the expired session ID from the session entry
          // This requires access to the session store, which we don't have here
          // We'll need to modify the caller to handle this case

          // For now, retry without the session ID to create a new session
          runtimeTurn.markStage("model_call", "cli session expired; retrying fresh session");
          runtimeTurn.refundIteration("cli session retry");
          runtimeTurn.consumeIteration("cli session retry");
          const output = await executePreparedCliRun(context, undefined);
          const effectiveCliSessionId = output.sessionId;
          runtimeStatus = "completed";
          return buildCliRunResult({ output, effectiveCliSessionId });
        }
        runtimeStatus = params.abortSignal?.aborted ? "aborted" : "failed";
        runtimeError = err.message;
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      if (isFailoverErrorMessage(message)) {
        const reason = classifyFailoverReason(message) ?? "unknown";
        const status = resolveFailoverStatus(reason);
        runtimeStatus = params.abortSignal?.aborted ? "aborted" : "failed";
        runtimeError = message;
        throw new FailoverError(message, {
          reason,
          provider: params.provider,
          model: context.modelId,
          status,
        });
      }
      runtimeStatus = params.abortSignal?.aborted ? "aborted" : "failed";
      runtimeError = message;
      throw err;
    }
  } finally {
    detachRuntimeAbort();
    runtimeTurn.finish(runtimeStatus, runtimeError);
    await context.preparedBackend.cleanup?.();
  }
}

export async function runClaudeCliAgent(params: {
  sessionId: string;
  sessionKey?: string;
  agentId?: string;
  sessionFile: string;
  workspaceDir: string;
  config?: OpenClawConfig;
  prompt: string;
  provider?: string;
  model?: string;
  thinkLevel?: ThinkLevel;
  timeoutMs: number;
  runId: string;
  extraSystemPrompt?: string;
  ownerNumbers?: string[];
  claudeSessionId?: string;
  images?: ImageContent[];
}): Promise<EmbeddedPiRunResult> {
  return runCliAgent({
    sessionId: params.sessionId,
    sessionKey: params.sessionKey,
    agentId: params.agentId,
    sessionFile: params.sessionFile,
    workspaceDir: params.workspaceDir,
    config: params.config,
    prompt: params.prompt,
    provider: params.provider ?? "claude-cli",
    model: params.model ?? "opus",
    thinkLevel: params.thinkLevel,
    timeoutMs: params.timeoutMs,
    runId: params.runId,
    extraSystemPrompt: params.extraSystemPrompt,
    ownerNumbers: params.ownerNumbers,
    cliSessionId: params.claudeSessionId,
    images: params.images,
    trigger: "user",
  });
}
