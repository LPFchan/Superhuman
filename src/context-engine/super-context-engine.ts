import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { SessionManager } from "@mariozechner/pi-coding-agent";
import { estimateMessagesTokens } from "../agents/compaction.js";
import type { OpenClawConfig } from "../config/config.js";
import { findGitRoot } from "../infra/git-root.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { listMemoryFiles } from "../plugin-sdk/memory-core-host-runtime-files.js";
import { resolveMemoryFlushPlan } from "../plugins/memory-state.js";
import { emitSessionTranscriptUpdate } from "../sessions/transcript-events.js";
import {
  createSuperhumanStateStore,
  resolveSuperhumanStateDir,
} from "../superhuman/state-store.js";
import { delegateCompactionToRuntime } from "./delegate.js";
import { registerContextEngineForOwner } from "./registry.js";
import type {
  AssembleResult,
  CompactResult,
  ContextEngine,
  ContextEngineInfo,
  ContextEngineRuntimeContext,
  IngestResult,
} from "./types.js";

const log = createSubsystemLogger("context-engine/super-context-engine");

const ENGINE_STATE_DIR = "context-engine";
const KEEP_RECENT_MESSAGES = 12;
const STAGE_BATCH_MESSAGES = 8;
const MIN_STAGEABLE_MESSAGES = 6;
const AUTO_BUFFER_TOKENS = 13_000;
const BREAKER_FAILURE_LIMIT = 3;
const CONSOLIDATION_SESSION_GATE = 3;
const CONSOLIDATION_INTERVAL_MS = 4 * 60 * 60 * 1000;
const TEAM_SYNC_REMOTE_DIR_ENV = "SUPERHUMAN_TEAM_MEMORY_REMOTE_DIR";

type SessionBranchEntry = ReturnType<ReturnType<typeof SessionManager.open>["getBranch"]>[number];
type SessionMessageEntry = Extract<SessionBranchEntry, { type: "message" }>;

type Phase3CommittedCollapse = {
  id: string;
  summary: string;
  firstKeptEntryId: string;
  sourceStartEntryId: string;
  sourceEndEntryId: string;
  messageCount: number;
  estimatedTokens: number;
  committedAt: number;
};

type Phase3StagedCollapse = {
  id: string;
  summary: string;
  firstEntryId: string;
  lastEntryId: string;
  firstKeptEntryId: string;
  messageCount: number;
  estimatedTokens: number;
  createdAt: number;
};

type Phase3BreakerState = {
  consecutiveFailures: number;
  lastFailureAt?: number;
  lastFailureReason?: string;
};

type Phase3ExtractionState = {
  lastFingerprint?: string;
  lastRunAt?: number;
};

type Phase3ConsolidationState = {
  lastRunAt?: number;
  touchedSessions: Record<string, number>;
};

type TeamMemorySyncState = {
  lastPulledHash?: string;
  lastPushedHash?: string;
  lastSyncAt?: number;
};

type Phase3EngineState = {
  version: 1;
  sessionId: string;
  sessionKey?: string;
  createdAt: number;
  updatedAt: number;
  committed: Phase3CommittedCollapse[];
  staged: Phase3StagedCollapse[];
  breaker: Phase3BreakerState;
  extraction: Phase3ExtractionState;
  consolidation: Phase3ConsolidationState;
  teamSync: TeamMemorySyncState;
};

const pendingExtractions = new Set<string>();
const pendingConsolidations = new Set<string>();
const pendingTeamSyncs = new Set<string>();

type VisibleContextState = "original_content" | "collapsed_content" | "restored_files" | "mixed";

function normalizeTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .flatMap((part) => {
      if (!part || typeof part !== "object") {
        return [];
      }
      const record = part as { type?: unknown; text?: unknown };
      return record.type === "text" && typeof record.text === "string" ? [record.text] : [];
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMessageText(message: AgentMessage): string {
  return "content" in message ? normalizeTextContent(message.content) : "";
}

function asTextMessage(text: string, timestamp: number, role: AgentMessage["role"] = "assistant") {
  return {
    role,
    timestamp,
    content: [{ type: "text", text }],
  } as AgentMessage;
}

function summarizeMessages(messages: SessionMessageEntry[]): string {
  const lines: string[] = [];
  for (const entry of messages) {
    const text = extractMessageText(entry.message);
    if (!text) {
      continue;
    }
    const role = entry.message.role === "assistant" ? "Assistant" : "User";
    lines.push(`- ${role}: ${text.slice(0, 220)}`);
    if (lines.length >= 6) {
      break;
    }
  }
  if (lines.length === 0) {
    lines.push("- This span contained tool-heavy or non-text interactions.");
  }
  return ["Collapsed conversation summary:", ...lines].join("\n");
}

function buildCollapseSystemMessage(
  collapse: Phase3CommittedCollapse,
  index: number,
): AgentMessage {
  return asTextMessage(`[collapse ${index + 1}]\n${collapse.summary}`, collapse.committedAt);
}

function resolveVisibleContextState(params: {
  committedCollapseCount: number;
  projectedMessageCount: number;
  restoredArtifacts?: string[];
}): VisibleContextState {
  const restoredArtifacts = params.restoredArtifacts ?? [];
  if (restoredArtifacts.length > 0 && params.committedCollapseCount > 0) {
    return "mixed";
  }
  if (restoredArtifacts.length > 0) {
    return "restored_files";
  }
  if (params.committedCollapseCount === 0) {
    return "original_content";
  }
  if (params.projectedMessageCount <= params.committedCollapseCount) {
    return "collapsed_content";
  }
  return "mixed";
}

function describeVisibleContextState(state: VisibleContextState): string {
  switch (state) {
    case "collapsed_content":
      return "collapsed content only";
    case "restored_files":
      return "restored files";
    case "mixed":
      return "a mixed state of collapsed content and original live turns";
    default:
      return "original content";
  }
}

function resolveWorkspaceDir(runtimeContext?: ContextEngineRuntimeContext): string | undefined {
  const workspaceDir = runtimeContext?.workspaceDir;
  return typeof workspaceDir === "string" && workspaceDir.trim() ? workspaceDir : undefined;
}

function resolveConfig(runtimeContext?: ContextEngineRuntimeContext): OpenClawConfig | undefined {
  const config = runtimeContext?.config;
  return config && typeof config === "object" ? (config as OpenClawConfig) : undefined;
}

function resolveStatePath(workspaceDir: string, sessionId: string, sessionKey?: string): string {
  const key = sessionKey?.trim() || sessionId;
  const encoded = Buffer.from(key).toString("base64url");
  return path.join(resolveSuperhumanStateDir(workspaceDir), ENGINE_STATE_DIR, `${encoded}.json`);
}

function createEmptyState(sessionId: string, sessionKey?: string): Phase3EngineState {
  const now = Date.now();
  return {
    version: 1,
    sessionId,
    sessionKey,
    createdAt: now,
    updatedAt: now,
    committed: [],
    staged: [],
    breaker: { consecutiveFailures: 0 },
    extraction: {},
    consolidation: { touchedSessions: {} },
    teamSync: {},
  };
}

async function loadState(workspaceDir: string, sessionId: string, sessionKey?: string) {
  const statePath = resolveStatePath(workspaceDir, sessionId, sessionKey);
  try {
    const raw = await fsp.readFile(statePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<Phase3EngineState>;
    return {
      statePath,
      state: {
        ...createEmptyState(sessionId, sessionKey),
        ...parsed,
        sessionId,
        sessionKey,
        committed: Array.isArray(parsed.committed) ? parsed.committed : [],
        staged: Array.isArray(parsed.staged) ? parsed.staged : [],
        breaker: parsed.breaker ?? { consecutiveFailures: 0 },
        extraction: parsed.extraction ?? {},
        consolidation: {
          lastRunAt: parsed.consolidation?.lastRunAt,
          touchedSessions: parsed.consolidation?.touchedSessions ?? {},
        },
        teamSync: parsed.teamSync ?? {},
      } satisfies Phase3EngineState,
    };
  } catch {
    return { statePath, state: createEmptyState(sessionId, sessionKey) };
  }
}

async function saveState(statePath: string, state: Phase3EngineState): Promise<void> {
  state.updatedAt = Date.now();
  await fsp.mkdir(path.dirname(statePath), { recursive: true });
  await fsp.writeFile(statePath, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 });
}

function listBranchMessages(
  sessionManager: ReturnType<typeof SessionManager.open>,
): SessionMessageEntry[] {
  return sessionManager
    .getBranch()
    .filter((entry): entry is SessionMessageEntry => entry.type === "message");
}

function projectMessages(
  branchMessages: SessionMessageEntry[],
  state: Phase3EngineState,
): AgentMessage[] {
  if (state.committed.length === 0) {
    return branchMessages.map((entry) => entry.message);
  }

  const firstKeptEntryId = state.committed.at(-1)?.firstKeptEntryId;
  if (!firstKeptEntryId) {
    return branchMessages.map((entry) => entry.message);
  }
  const firstKeptIndex = branchMessages.findIndex((entry) => entry.id === firstKeptEntryId);
  if (firstKeptIndex < 0) {
    return branchMessages.map((entry) => entry.message);
  }
  return [
    ...state.committed.map((collapse, index) => buildCollapseSystemMessage(collapse, index)),
    ...branchMessages.slice(firstKeptIndex).map((entry) => entry.message),
  ];
}

function stageCollapses(branchMessages: SessionMessageEntry[], state: Phase3EngineState): void {
  const firstKeptEntryId = state.committed.at(-1)?.firstKeptEntryId;
  const startIndex = firstKeptEntryId
    ? Math.max(
        0,
        branchMessages.findIndex((entry) => entry.id === firstKeptEntryId),
      )
    : 0;
  const liveMessages = branchMessages.slice(startIndex);
  const eligibleCount = liveMessages.length - KEEP_RECENT_MESSAGES;
  if (eligibleCount < MIN_STAGEABLE_MESSAGES) {
    state.staged = [];
    return;
  }

  const nextStages: Phase3StagedCollapse[] = [];
  let cursor = 0;
  while (cursor + MIN_STAGEABLE_MESSAGES <= eligibleCount) {
    const nextCursor = Math.min(cursor + STAGE_BATCH_MESSAGES, eligibleCount);
    const span = liveMessages.slice(cursor, nextCursor);
    const firstKept = liveMessages[nextCursor];
    if (span.length < MIN_STAGEABLE_MESSAGES || !firstKept) {
      break;
    }
    nextStages.push({
      id: crypto.randomUUID(),
      summary: summarizeMessages(span),
      firstEntryId: span[0].id,
      lastEntryId: span.at(-1)!.id,
      firstKeptEntryId: firstKept.id,
      messageCount: span.length,
      estimatedTokens: estimateMessagesTokens(span.map((entry) => entry.message)),
      createdAt: Date.now(),
    });
    cursor = nextCursor;
  }
  state.staged = nextStages;
}

function resolveCompactionTarget(tokenBudget?: number): number | undefined {
  if (typeof tokenBudget !== "number" || !Number.isFinite(tokenBudget) || tokenBudget <= 0) {
    return undefined;
  }
  return Math.max(1, tokenBudget - AUTO_BUFFER_TOKENS);
}

function needsCompaction(estimatedTokens: number, tokenBudget?: number): boolean {
  const target = resolveCompactionTarget(tokenBudget);
  return target !== undefined && estimatedTokens >= target;
}

function hashMemorySnapshot(contents: Array<{ path: string; hash: string }>): string {
  return crypto.createHash("sha256").update(JSON.stringify(contents)).digest("hex");
}

async function runMemoryExtraction(params: {
  sessionKey?: string;
  sessionId: string;
  workspaceDir: string;
  config?: OpenClawConfig;
  runtimeContext?: ContextEngineRuntimeContext;
  recentMessages: AgentMessage[];
  statePath: string;
  state: Phase3EngineState;
}) {
  const memoryPlan = resolveMemoryFlushPlan({ cfg: params.config });
  const provider =
    typeof params.runtimeContext?.provider === "string"
      ? params.runtimeContext.provider
      : undefined;
  const model =
    typeof params.runtimeContext?.model === "string" ? params.runtimeContext.model : undefined;
  if (!memoryPlan || !provider || !model || params.recentMessages.length === 0) {
    return;
  }

  const fingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        params.recentMessages.map((message) => ({
          role: message.role,
          text: extractMessageText(message),
        })),
      ),
    )
    .digest("hex");
  if (params.state.extraction.lastFingerprint === fingerprint) {
    return;
  }

  const extractionKey = `${params.workspaceDir}:${params.sessionId}`;
  if (pendingExtractions.has(extractionKey)) {
    return;
  }
  pendingExtractions.add(extractionKey);
  void (async () => {
    try {
      const { runEmbeddedPiAgent } = await import("../agents/pi-embedded.js");
      const tempSessionFile = path.join(
        resolveSuperhumanStateDir(params.workspaceDir),
        ENGINE_STATE_DIR,
        `extract-${crypto.randomUUID()}.jsonl`,
      );
      const prompt = [
        "Review the recent turn and extract only durable facts, decisions, preferences, people, dates, and TODOs worth preserving.",
        `Write only to ${memoryPlan.relativePath}.`,
        "Read existing memory first so you append, dedupe, and avoid rewriting unrelated notes.",
        "If nothing durable should be saved, do not write anything.",
        "Recent turn:",
        ...params.recentMessages.map(
          (message) => `${message.role}: ${extractMessageText(message)}`,
        ),
      ].join("\n");
      await runEmbeddedPiAgent({
        sessionId: `memory-extract-${crypto.randomUUID()}`,
        sessionFile: tempSessionFile,
        workspaceDir: params.workspaceDir,
        config: params.config,
        provider,
        model,
        prompt,
        trigger: "memory",
        memoryFlushWritePath: memoryPlan.relativePath,
        timeoutMs: 120_000,
        runId: crypto.randomUUID(),
        allowGatewaySubagentBinding: true,
        silentExpected: true,
        extraSystemPrompt:
          "You are a memory extraction worker. Stay within approved memory roots, keep edits append-only and concise, and never change unrelated notes. Treat imported-history, collapsed summaries, partial reads, and persisted previews as provisional evidence unless the underlying source was fully read and verified.",
      });
      params.state.extraction.lastFingerprint = fingerprint;
      params.state.extraction.lastRunAt = Date.now();
      await saveState(params.statePath, params.state);
    } catch (error) {
      log.warn(`super-context memory extraction failed: ${String(error)}`);
    } finally {
      pendingExtractions.delete(extractionKey);
    }
  })();
}

async function runMemoryConsolidation(params: {
  sessionKey?: string;
  workspaceDir: string;
  sessionFile: string;
  config?: OpenClawConfig;
  runtimeContext?: ContextEngineRuntimeContext;
  statePath: string;
  state: Phase3EngineState;
}) {
  const provider =
    typeof params.runtimeContext?.provider === "string"
      ? params.runtimeContext.provider
      : undefined;
  const model =
    typeof params.runtimeContext?.model === "string" ? params.runtimeContext.model : undefined;
  const memoryPlan = resolveMemoryFlushPlan({ cfg: params.config });
  if (!provider || !model || !memoryPlan) {
    return;
  }

  const touchedSessions = Object.entries(params.state.consolidation.touchedSessions)
    .filter(([, touchedAt]) => typeof touchedAt === "number" && Number.isFinite(touchedAt))
    .toSorted((a, b) => a[1] - b[1]);
  const now = Date.now();
  const dueByCount = touchedSessions.length >= CONSOLIDATION_SESSION_GATE;
  const dueByTime =
    touchedSessions.length > 0 &&
    now - (params.state.consolidation.lastRunAt ?? 0) >= CONSOLIDATION_INTERVAL_MS;
  if (!dueByCount && !dueByTime) {
    return;
  }

  const consolidationKey = params.workspaceDir;
  if (pendingConsolidations.has(consolidationKey)) {
    return;
  }
  pendingConsolidations.add(consolidationKey);
  void (async () => {
    try {
      const { runEmbeddedPiAgent } = await import("../agents/pi-embedded.js");
      const { appendInjectedAssistantMessageToTranscript } =
        await import("../gateway/server-methods/chat-transcript-inject.js");
      const tempSessionFile = path.join(
        resolveSuperhumanStateDir(params.workspaceDir),
        ENGINE_STATE_DIR,
        `consolidate-${crypto.randomUUID()}.jsonl`,
      );
      const prompt = [
        "Consolidate durable memory from recently touched sessions.",
        `Read only what you need from session transcripts and existing memory. Write only to ${memoryPlan.relativePath}.`,
        "Do not mutate unrelated files. Prefer compact bullet updates and dedupe aggressively.",
        "Do not treat imported-history, collapsed summaries, partial reads, or persisted previews as authoritative memory unless the original source was fully read.",
        `Touched sessions: ${touchedSessions.map(([sessionKey]) => sessionKey).join(", ")}`,
      ].join("\n");
      await runEmbeddedPiAgent({
        sessionId: `memory-consolidate-${crypto.randomUUID()}`,
        sessionFile: tempSessionFile,
        workspaceDir: params.workspaceDir,
        config: params.config,
        provider,
        model,
        prompt,
        trigger: "memory",
        memoryFlushWritePath: memoryPlan.relativePath,
        timeoutMs: 180_000,
        runId: crypto.randomUUID(),
        allowGatewaySubagentBinding: true,
        silentExpected: true,
        extraSystemPrompt:
          "You are a memory consolidation worker. You may read session transcripts and memory roots, but you may only write inside the approved memory path. Imported-history, collapsed summaries, partial reads, and persisted previews must remain marked as provisional unless a full source read confirms them.",
      });
      params.state.consolidation.lastRunAt = Date.now();
      params.state.consolidation.touchedSessions = {};
      await saveState(params.statePath, params.state);
      appendInjectedAssistantMessageToTranscript({
        transcriptPath: params.sessionFile,
        label: "memory consolidation",
        message: `Completed memory consolidation for ${touchedSessions.length} touched session${touchedSessions.length === 1 ? "" : "s"}. Target: ${memoryPlan.relativePath}.`,
      });
      await runTeamMemorySyncIfEnabled({
        workspaceDir: params.workspaceDir,
        config: params.config,
      });
    } catch (error) {
      log.warn(`super-context memory consolidation failed: ${String(error)}`);
    } finally {
      pendingConsolidations.delete(consolidationKey);
    }
  })();
}

async function copyFileEnsuringDir(source: string, target: string): Promise<void> {
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.copyFile(source, target);
}

function hasSecretLikeContent(content: string): boolean {
  return /(?:api[_-]?key|secret|token|password|authorization)\s*[:=]/i.test(content);
}

async function runTeamMemorySyncIfEnabled(params: {
  workspaceDir: string;
  config?: OpenClawConfig;
}) {
  const remoteRoot = process.env[TEAM_SYNC_REMOTE_DIR_ENV]?.trim();
  if (!remoteRoot) {
    return;
  }
  const repoRoot = findGitRoot(params.workspaceDir);
  if (!repoRoot) {
    return;
  }
  const syncKey = `${repoRoot}:${remoteRoot}`;
  if (pendingTeamSyncs.has(syncKey)) {
    return;
  }
  pendingTeamSyncs.add(syncKey);
  try {
    const statePath = path.join(
      resolveSuperhumanStateDir(params.workspaceDir),
      ENGINE_STATE_DIR,
      "team-memory-sync.json",
    );
    let syncState: TeamMemorySyncState = {};
    try {
      syncState = JSON.parse(await fsp.readFile(statePath, "utf8")) as TeamMemorySyncState;
    } catch {}

    const memoryFiles = await listMemoryFiles(repoRoot);
    const localEntries = await Promise.all(
      memoryFiles.map(async (filePath) => {
        const content = await fsp.readFile(filePath, "utf8");
        const relPath = path.relative(repoRoot, filePath).replace(/\\/g, "/");
        return {
          path: relPath,
          absPath: filePath,
          hash: crypto.createHash("sha256").update(content).digest("hex"),
          content,
        };
      }),
    );
    const localManifestHash = hashMemorySnapshot(
      localEntries.map((entry) => ({ path: entry.path, hash: entry.hash })),
    );
    const remoteManifestPath = path.join(remoteRoot, "manifest.json");
    let remoteManifest: { baseHash?: string; files?: Record<string, string> } = {};
    try {
      remoteManifest = JSON.parse(
        await fsp.readFile(remoteManifestPath, "utf8"),
      ) as typeof remoteManifest;
    } catch {}

    if (
      remoteManifest.baseHash &&
      syncState.lastPulledHash &&
      remoteManifest.baseHash !== syncState.lastPulledHash
    ) {
      const remoteFiles = Object.entries(remoteManifest.files ?? {});
      for (const [relPath] of remoteFiles) {
        const source = path.join(remoteRoot, relPath);
        const target = path.join(repoRoot, relPath);
        if (fs.existsSync(source)) {
          await copyFileEnsuringDir(source, target);
        }
      }
      syncState.lastPulledHash = remoteManifest.baseHash;
      const store = createSuperhumanStateStore({ workspaceDir: params.workspaceDir });
      try {
        store.appendTeamMemorySyncEvent({
          eventId: crypto.randomUUID(),
          repoRoot,
          direction: "pull",
          status: "success",
          fileCount: remoteFiles.length,
          transferHash: remoteManifest.baseHash,
          details: "Pulled remote memory after checksum mismatch before push retry.",
          createdAt: Date.now(),
        });
      } finally {
        store.close();
      }
    }

    const blockedFiles = localEntries.filter((entry) => hasSecretLikeContent(entry.content));
    if (blockedFiles.length > 0) {
      const store = createSuperhumanStateStore({ workspaceDir: params.workspaceDir });
      try {
        store.appendTeamMemorySyncEvent({
          eventId: crypto.randomUUID(),
          repoRoot,
          direction: "push",
          status: "blocked",
          fileCount: blockedFiles.length,
          transferHash: localManifestHash,
          details: `Blocked secret-bearing files: ${blockedFiles.map((entry) => entry.path).join(", ")}`,
          createdAt: Date.now(),
        });
      } finally {
        store.close();
      }
      return;
    }

    const changed = localEntries.filter(
      (entry) => remoteManifest.files?.[entry.path] !== entry.hash,
    );
    for (const entry of changed) {
      await copyFileEnsuringDir(entry.absPath, path.join(remoteRoot, entry.path));
    }
    await fsp.mkdir(remoteRoot, { recursive: true });
    await fsp.writeFile(
      remoteManifestPath,
      JSON.stringify(
        {
          baseHash: localManifestHash,
          files: Object.fromEntries(localEntries.map((entry) => [entry.path, entry.hash])),
          updatedAt: Date.now(),
        },
        null,
        2,
      ),
      "utf8",
    );
    syncState.lastPushedHash = localManifestHash;
    syncState.lastPulledHash = localManifestHash;
    syncState.lastSyncAt = Date.now();
    await fsp.mkdir(path.dirname(statePath), { recursive: true });
    await fsp.writeFile(statePath, JSON.stringify(syncState, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });

    const store = createSuperhumanStateStore({ workspaceDir: params.workspaceDir });
    try {
      store.appendTeamMemorySyncEvent({
        eventId: crypto.randomUUID(),
        repoRoot,
        direction: "push",
        status: changed.length > 0 ? "success" : "skipped",
        fileCount: changed.length,
        transferHash: localManifestHash,
        details:
          changed.length > 0
            ? `Uploaded changed files: ${changed.map((entry) => entry.path).join(", ")}`
            : "No local memory changes to upload.",
        createdAt: Date.now(),
      });
    } finally {
      store.close();
    }
  } catch (error) {
    const repoRoot = findGitRoot(params.workspaceDir) ?? params.workspaceDir;
    const store = createSuperhumanStateStore({ workspaceDir: params.workspaceDir });
    try {
      store.appendTeamMemorySyncEvent({
        eventId: crypto.randomUUID(),
        repoRoot,
        direction: "push",
        status: "failed",
        fileCount: 0,
        details: String(error),
        createdAt: Date.now(),
      });
    } finally {
      store.close();
    }
    log.warn(`super-context team memory sync failed: ${String(error)}`);
  } finally {
    pendingTeamSyncs.delete(syncKey);
  }
}

export class SuperContextEngine implements ContextEngine {
  readonly info: ContextEngineInfo = {
    id: "super-context",
    name: "Super Context Engine",
    version: "1.0.0",
    ownsCompaction: true,
  };

  async ingest(): Promise<IngestResult> {
    return { ingested: false };
  }

  async assemble(params: {
    sessionId: string;
    sessionKey?: string;
    messages: AgentMessage[];
    tokenBudget?: number;
    model?: string;
    prompt?: string;
    runtimeContext?: ContextEngineRuntimeContext;
  }): Promise<AssembleResult> {
    const workspaceDir = resolveWorkspaceDir(params.runtimeContext);
    if (!workspaceDir) {
      return {
        messages: params.messages,
        estimatedTokens: estimateMessagesTokens(params.messages),
      };
    }
    const { state } = await loadState(workspaceDir, params.sessionId, params.sessionKey);
    if (state.committed.length === 0) {
      return {
        messages: params.messages,
        estimatedTokens: estimateMessagesTokens(params.messages),
      };
    }
    const sessionFile =
      typeof params.runtimeContext?.sessionFile === "string"
        ? params.runtimeContext.sessionFile
        : undefined;
    if (!sessionFile || !fs.existsSync(sessionFile)) {
      return {
        messages: params.messages,
        estimatedTokens: estimateMessagesTokens(params.messages),
      };
    }
    const branchMessages = listBranchMessages(SessionManager.open(sessionFile));
    const projected = projectMessages(branchMessages, state);
    const visibleContextState = resolveVisibleContextState({
      committedCollapseCount: state.committed.length,
      projectedMessageCount: projected.length,
    });
    return {
      messages: projected,
      estimatedTokens: estimateMessagesTokens(projected),
      systemPromptAddition:
        state.committed.length > 0
          ? `Context collapse active: ${state.committed.length} committed summary span${state.committed.length === 1 ? "" : "s"} are projected into the visible conversation view. Visible context source state: ${describeVisibleContextState(visibleContextState)}.`
          : undefined,
    };
  }

  async afterTurn(params: {
    sessionId: string;
    sessionKey?: string;
    sessionFile: string;
    messages: AgentMessage[];
    prePromptMessageCount: number;
    autoCompactionSummary?: string;
    isHeartbeat?: boolean;
    tokenBudget?: number;
    runtimeContext?: ContextEngineRuntimeContext;
  }): Promise<void> {
    const workspaceDir = resolveWorkspaceDir(params.runtimeContext);
    if (!workspaceDir || !fs.existsSync(params.sessionFile)) {
      return;
    }
    const { statePath, state } = await loadState(workspaceDir, params.sessionId, params.sessionKey);
    const sessionManager = SessionManager.open(params.sessionFile);
    const branchMessages = listBranchMessages(sessionManager);
    stageCollapses(branchMessages, state);
    if (params.sessionKey) {
      state.consolidation.touchedSessions[params.sessionKey] = Date.now();
    }
    await saveState(statePath, state);
    if (!params.isHeartbeat) {
      const recentMessages = params.messages.slice(params.prePromptMessageCount);
      await runMemoryExtraction({
        sessionId: params.sessionId,
        sessionKey: params.sessionKey,
        workspaceDir,
        config: resolveConfig(params.runtimeContext),
        runtimeContext: { ...params.runtimeContext, sessionFile: params.sessionFile },
        recentMessages,
        statePath,
        state,
      });
      await runMemoryConsolidation({
        sessionKey: params.sessionKey,
        workspaceDir,
        sessionFile: params.sessionFile,
        config: resolveConfig(params.runtimeContext),
        runtimeContext: { ...params.runtimeContext, sessionFile: params.sessionFile },
        statePath,
        state,
      });
    }
  }

  async compact(params: {
    sessionId: string;
    sessionKey?: string;
    sessionFile: string;
    tokenBudget?: number;
    force?: boolean;
    currentTokenCount?: number;
    compactionTarget?: "budget" | "threshold";
    customInstructions?: string;
    runtimeContext?: ContextEngineRuntimeContext;
  }): Promise<CompactResult> {
    const workspaceDir = resolveWorkspaceDir(params.runtimeContext);
    if (!workspaceDir || !fs.existsSync(params.sessionFile)) {
      return await delegateCompactionToRuntime(params);
    }

    const { statePath, state } = await loadState(workspaceDir, params.sessionId, params.sessionKey);
    const sessionManager = SessionManager.open(params.sessionFile);
    const branchMessages = listBranchMessages(sessionManager);
    stageCollapses(branchMessages, state);
    const projectedBefore = projectMessages(branchMessages, state);
    const tokensBefore = params.currentTokenCount ?? estimateMessagesTokens(projectedBefore);
    if (!params.force && state.breaker.consecutiveFailures >= BREAKER_FAILURE_LIMIT) {
      return {
        ok: false,
        compacted: false,
        reason: "compaction-breaker-open",
        result: {
          tokensBefore,
          details: {
            lastFailureAt: state.breaker.lastFailureAt,
            lastFailureReason: state.breaker.lastFailureReason,
          },
        },
      };
    }

    let compactedCount = 0;
    const committedNow: Phase3CommittedCollapse[] = [];
    while (state.staged.length > 0) {
      const currentProjected = projectMessages(branchMessages, state);
      const currentTokens = estimateMessagesTokens(currentProjected);
      if (!params.force && !needsCompaction(currentTokens, params.tokenBudget)) {
        break;
      }
      const stage = state.staged.shift();
      if (!stage) {
        break;
      }
      const committed: Phase3CommittedCollapse = {
        id: stage.id,
        summary: stage.summary,
        firstKeptEntryId: stage.firstKeptEntryId,
        sourceStartEntryId: stage.firstEntryId,
        sourceEndEntryId: stage.lastEntryId,
        messageCount: stage.messageCount,
        estimatedTokens: stage.estimatedTokens,
        committedAt: Date.now(),
      };
      state.committed.push(committed);
      committedNow.push(committed);
      compactedCount += 1;
      stageCollapses(branchMessages, state);
    }

    if (compactedCount > 0) {
      state.breaker = { consecutiveFailures: 0 };
      await saveState(statePath, state);
      const projectedAfter = projectMessages(branchMessages, state);
      const tokensAfter = estimateMessagesTokens(projectedAfter);
      const visibleContextState = resolveVisibleContextState({
        committedCollapseCount: state.committed.length,
        projectedMessageCount: projectedAfter.length,
      });
      const latestFirstKeptEntryId = state.committed.at(-1)?.firstKeptEntryId;
      if (!latestFirstKeptEntryId) {
        return {
          ok: false,
          compacted: false,
          reason: "missing-first-kept-entry",
          result: { tokensBefore, tokensAfter },
        };
      }
      sessionManager.appendCompaction(
        committedNow.map((entry) => entry.summary).join("\n\n"),
        latestFirstKeptEntryId,
        tokensBefore,
        {
          kind: "super-context-collapse",
          committedCollapseIds: committedNow.map((entry) => entry.id),
          committedCount: compactedCount,
        },
        false,
      );
      emitSessionTranscriptUpdate(params.sessionFile);
      return {
        ok: true,
        compacted: true,
        result: {
          summary: committedNow.map((entry) => entry.summary).join("\n\n"),
          firstKeptEntryId: state.committed.at(-1)?.firstKeptEntryId,
          tokensBefore,
          tokensAfter,
          details: {
            committedCount: compactedCount,
            projectedMessages: projectedAfter.length,
            recoveryMode: "collapse",
            visibleContextState,
            visibleContextDescription: describeVisibleContextState(visibleContextState),
            droppedSpans: committedNow.map((entry) => ({
              collapseId: entry.id,
              sourceStartEntryId: entry.sourceStartEntryId,
              sourceEndEntryId: entry.sourceEndEntryId,
            })),
            restoredArtifacts: [],
          },
        },
      };
    }

    try {
      const fallback = await delegateCompactionToRuntime(params);
      const fallbackVisibleContextState = resolveVisibleContextState({
        committedCollapseCount: 0,
        projectedMessageCount: branchMessages.length,
      });
      if (fallback.ok && fallback.compacted) {
        state.committed = [];
        state.staged = [];
        state.breaker = { consecutiveFailures: 0 };
        await saveState(statePath, state);
      } else {
        state.breaker = {
          consecutiveFailures: state.breaker.consecutiveFailures + 1,
          lastFailureAt: Date.now(),
          lastFailureReason: fallback.reason ?? "fallback-no-progress",
        };
        await saveState(statePath, state);
      }
      if (fallback.result) {
        fallback.result.details = {
          ...(fallback.result.details && typeof fallback.result.details === "object"
            ? (fallback.result.details as Record<string, unknown>)
            : {}),
          recoveryMode: "runtime_fallback",
          visibleContextState: fallbackVisibleContextState,
          visibleContextDescription: describeVisibleContextState(fallbackVisibleContextState),
          droppedSpans: [],
          restoredArtifacts: [],
        };
      }
      return fallback;
    } catch (error) {
      state.breaker = {
        consecutiveFailures: state.breaker.consecutiveFailures + 1,
        lastFailureAt: Date.now(),
        lastFailureReason: String(error),
      };
      await saveState(statePath, state);
      return {
        ok: false,
        compacted: false,
        reason: String(error),
        result: { tokensBefore },
      };
    }
  }

  async dispose(): Promise<void> {}
}

export function registerSuperContextEngine(): void {
  registerContextEngineForOwner("super-context", () => new SuperContextEngine(), "core", {
    allowSameOwnerRefresh: true,
  });
}
