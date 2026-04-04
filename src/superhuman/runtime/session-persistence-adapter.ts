import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveAgentWorkspaceDir, resolveSessionAgentId } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/config.js";
import { resolveSessionKeyForTranscriptFile } from "../../gateway/session-transcript-key.js";
import { loadGatewaySessionRow, loadSessionEntry } from "../../gateway/session-utils.js";
import { loadCombinedSessionStoreForGateway } from "../../gateway/session-utils.js";
import type { AgentEventPayload } from "../../infra/agent-events.js";
import { onAgentEvent } from "../../infra/agent-events.js";
import type { PluginRegistry as OpenClawPluginRegistry } from "../../plugins/registry.js";
import { normalizeInputProvenance } from "../../sessions/input-provenance.js";
import { onSessionLifecycleEvent } from "../../sessions/session-lifecycle-events.js";
import { onSessionStoreMutation } from "../../sessions/session-store-events.js";
import {
  type SessionTranscriptUpdate,
  onSessionTranscriptUpdate,
} from "../../sessions/transcript-events.js";
import {
  resolveSuperContextPressureOptionsFromConfig,
  type ContextPressureSnapshotOptions,
} from "../context/pressure.js";
import { extractSuperReplayAnnotations } from "../transcript/replay-annotations.js";
import type {
  StateArtifactAppend,
  StateEvidenceProvenance,
  SuperArtifactRelationship,
  StateStore,
  StateStructuredDetails,
  StateSessionUpsert,
} from "./seams.js";
import {
  resolveSuperSandboxRuntimeSnapshot,
  resolveSuperShellCapabilitySnapshot,
} from "./shell-contracts.js";

function normalizePathForComparison(input: string): string {
  const resolved = path.resolve(input);
  try {
    const real = fs.realpathSync.native(resolved);
    return process.platform === "win32" ? real.toLowerCase() : real;
  } catch {
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  }
}

function isLifecycleStream(event: AgentEventPayload): boolean {
  return event.stream === "lifecycle";
}

function resolveLifecyclePhase(event: AgentEventPayload): "start" | "end" | "error" | null {
  const phase = typeof event.data.phase === "string" ? event.data.phase : "";
  return phase === "start" || phase === "end" || phase === "error" ? phase : null;
}

function resolveActionSummary(event: AgentEventPayload, phase: "start" | "end" | "error"): string {
  if (phase === "start") {
    return "Agent run started";
  }
  if (phase === "error") {
    return "Agent run failed";
  }
  return "Agent run completed";
}

function resolveActionStatus(phase: "start" | "end" | "error"): string {
  if (phase === "start") {
    return "running";
  }
  if (phase === "error") {
    return "failed";
  }
  return "completed";
}

function resolveLifecycleBoundaryTime(
  event: AgentEventPayload,
  phase: "start" | "end" | "error",
): number {
  if (phase === "start") {
    const startedAt = event.data.startedAt;
    return typeof startedAt === "number" && Number.isFinite(startedAt) ? startedAt : event.ts;
  }
  const endedAt = event.data.endedAt;
  return typeof endedAt === "number" && Number.isFinite(endedAt) ? endedAt : event.ts;
}

function extractMessageText(message: unknown): string {
  if (!message || typeof message !== "object") {
    return "";
  }
  const value = message as {
    content?: unknown;
    text?: unknown;
  };
  if (typeof value.text === "string") {
    return value.text.trim();
  }
  if (typeof value.content === "string") {
    return value.content.trim();
  }
  if (!Array.isArray(value.content)) {
    return "";
  }
  return value.content
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (!item || typeof item !== "object") {
        return "";
      }
      const text = (item as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .filter((part) => part.trim().length > 0)
    .join("\n")
    .trim();
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function resolveTranscriptMessageId(update: SessionTranscriptUpdate): string | undefined {
  if (typeof update.messageId === "string" && update.messageId.trim()) {
    return update.messageId.trim();
  }
  if (!update.message || typeof update.message !== "object") {
    return undefined;
  }
  const meta = (update.message as { __openclaw?: unknown }).__openclaw;
  if (!meta || typeof meta !== "object") {
    return undefined;
  }
  const metaId = (meta as { id?: unknown }).id;
  return typeof metaId === "string" && metaId.trim() ? metaId.trim() : undefined;
}

function resolveTranscriptSequence(update: SessionTranscriptUpdate): number | undefined {
  if (!update.message || typeof update.message !== "object") {
    return undefined;
  }
  const meta = (update.message as { __openclaw?: unknown }).__openclaw;
  if (!meta || typeof meta !== "object") {
    return undefined;
  }
  const sequence = (meta as { seq?: unknown }).seq;
  return typeof sequence === "number" && Number.isFinite(sequence) ? sequence : undefined;
}

function resolveMessageId(params: {
  sessionKey: string;
  update: SessionTranscriptUpdate;
  role: string;
  contentText: string;
  createdAt: number;
  sequence?: number;
}): string {
  const transcriptMessageId = resolveTranscriptMessageId(params.update);
  if (transcriptMessageId) {
    return `${params.sessionKey}:${transcriptMessageId}`;
  }
  const hash = crypto.createHash("sha1");
  hash.update(params.sessionKey);
  hash.update("\n");
  hash.update(params.role);
  hash.update("\n");
  hash.update(String(params.sequence ?? ""));
  hash.update("\n");
  hash.update(String(params.createdAt));
  hash.update("\n");
  hash.update(params.contentText);
  return `${params.sessionKey}:msg:${hash.digest("hex")}`;
}

function resolveOpenClawMeta(message: unknown): Record<string, unknown> | undefined {
  if (!message || typeof message !== "object") {
    return undefined;
  }
  const meta = (message as { __openclaw?: unknown }).__openclaw;
  return meta && typeof meta === "object" && !Array.isArray(meta)
    ? (meta as Record<string, unknown>)
    : undefined;
}

function resolveMessageProvenance(message: unknown): StateEvidenceProvenance | undefined {
  if (!message || typeof message !== "object") {
    return undefined;
  }
  const meta = resolveOpenClawMeta(message);
  const inputProvenance = normalizeInputProvenance(
    (message as { provenance?: unknown }).provenance,
  );

  const importedFrom = typeof meta?.importedFrom === "string" ? meta.importedFrom : undefined;
  const externalId = typeof meta?.externalId === "string" ? meta.externalId : undefined;
  const sourceTool =
    typeof inputProvenance?.sourceTool === "string"
      ? inputProvenance.sourceTool
      : typeof meta?.sourceTool === "string"
        ? meta.sourceTool
        : undefined;
  const sourceSessionKey =
    typeof inputProvenance?.sourceSessionKey === "string"
      ? inputProvenance.sourceSessionKey
      : typeof meta?.sourceSessionKey === "string"
        ? meta.sourceSessionKey
        : undefined;
  const partialRead =
    meta?.truncated === true || meta?.partialRead === true || meta?.partial_read === true;
  const persistedPreview =
    meta?.persistedPreview === true ||
    meta?.persisted_preview === true ||
    meta?.previewDerived === true;
  const collapsed = meta?.kind === "compaction" || meta?.collapsed === true;
  const restored = meta?.restored === true || Array.isArray(meta?.restoredArtifacts);
  const importedHistory = Boolean(importedFrom);

  const sources = [
    importedHistory ? "imported_history" : undefined,
    collapsed ? "collapsed" : undefined,
    partialRead ? "partial_read" : undefined,
    persistedPreview ? "persisted_preview" : undefined,
    restored ? "restored" : undefined,
  ].filter((value): value is NonNullable<StateEvidenceProvenance["source"]> => Boolean(value));

  let source: StateEvidenceProvenance["source"] = "original";
  if (sources.length === 1) {
    source = sources[0];
  } else if (sources.length > 1) {
    source = "mixed";
  } else if (inputProvenance?.kind === "inter_session") {
    source = "imported_history";
  }

  if (
    source === "original" &&
    !importedFrom &&
    !externalId &&
    !sourceTool &&
    !sourceSessionKey &&
    !partialRead &&
    !persistedPreview &&
    !collapsed &&
    !restored
  ) {
    return undefined;
  }

  return {
    source,
    importedFrom,
    externalId,
    sourceTool,
    sourceSessionKey,
    partialRead,
    persistedPreview,
    importedHistory,
    collapsed,
    restored,
    replayAnnotations: extractSuperReplayAnnotations(meta ?? {}),
    descriptor:
      typeof meta?.descriptor === "string"
        ? meta.descriptor
        : typeof inputProvenance?.originSessionId === "string"
          ? inputProvenance.originSessionId
          : undefined,
  };
}

function buildTranscriptArtifactMetadata(update: SessionTranscriptUpdate): StateStructuredDetails {
  const meta = resolveOpenClawMeta(update.message);
  return {
    transcriptMessageId: resolveTranscriptMessageId(update),
    sequence: resolveTranscriptSequence(update),
    sourceKind: typeof meta?.kind === "string" ? meta.kind : undefined,
  };
}

function resolveShellCapabilitySnapshot(params: {
  cfg: OpenClawConfig;
  sessionKey: string;
  pluginRegistry?: OpenClawPluginRegistry;
}) {
  return resolveSuperShellCapabilitySnapshot(params);
}

function resolveSandboxRuntimeSnapshot(params: { cfg: OpenClawConfig; sessionKey: string }) {
  return resolveSuperSandboxRuntimeSnapshot(params);
}

function buildProvenanceArtifacts(params: {
  sessionKey: string;
  createdAt: number;
  transcriptMessageId?: string;
  messageId: string;
  provenance?: StateEvidenceProvenance;
  message: unknown;
}): StateArtifactAppend[] {
  const meta = resolveOpenClawMeta(params.message);
  const artifactKey = params.transcriptMessageId ?? params.messageId;
  const artifacts: StateArtifactAppend[] = [];

  let fullArtifactId: string | undefined;
  const storagePath =
    normalizeOptionalString(meta?.storagePath) ??
    normalizeOptionalString(meta?.storage_path) ??
    normalizeOptionalString(meta?.fullStoragePath) ??
    normalizeOptionalString(meta?.full_storage_path);
  const fullBytes =
    normalizeOptionalNumber(meta?.fullBytes) ?? normalizeOptionalNumber(meta?.full_bytes);
  if (storagePath || fullBytes !== undefined) {
    fullArtifactId = `full:${params.sessionKey}:${artifactKey}`;
    artifacts.push({
      artifactId: fullArtifactId,
      sessionKey: params.sessionKey,
      messageId: params.messageId,
      kind: "full-output",
      label: "Persisted full output",
      location: storagePath,
      createdAt: params.createdAt,
      provenance: params.provenance,
      fullBytes,
      storagePath,
      metadata: {
        transcriptMessageId: params.transcriptMessageId,
      },
    });
  }

  if (params.provenance?.persistedPreview) {
    const previewArtifactId = `preview:${params.sessionKey}:${artifactKey}`;
    if (params.provenance) {
      params.provenance.previewArtifactId = previewArtifactId;
      if (fullArtifactId) {
        params.provenance.fullArtifactId = fullArtifactId;
      }
    }
    artifacts.push({
      artifactId: previewArtifactId,
      sessionKey: params.sessionKey,
      messageId: params.messageId,
      kind: "persisted-preview",
      label: "Persisted preview",
      createdAt: params.createdAt,
      provenance: params.provenance,
      relationshipKind: "preview-of" satisfies SuperArtifactRelationship,
      fullArtifactId,
      previewBytes:
        normalizeOptionalNumber(meta?.previewBytes) ?? normalizeOptionalNumber(meta?.preview_bytes),
      fullBytes,
      storagePath,
      metadata: {
        transcriptMessageId: params.transcriptMessageId,
        descriptor: params.provenance.descriptor,
      },
    });
  }

  if (params.provenance?.partialRead) {
    const partialArtifactId = `partial-read:${params.sessionKey}:${artifactKey}`;
    if (params.provenance) {
      params.provenance.partialReadArtifactId = partialArtifactId;
      if (fullArtifactId) {
        params.provenance.fullArtifactId = fullArtifactId;
      }
    }
    artifacts.push({
      artifactId: partialArtifactId,
      sessionKey: params.sessionKey,
      messageId: params.messageId,
      kind: "partial-read-descriptor",
      label: "Partial read descriptor",
      createdAt: params.createdAt,
      provenance: params.provenance,
      relationshipKind: "partial-read-for" satisfies SuperArtifactRelationship,
      fullArtifactId,
      reopenedAt:
        normalizeOptionalNumber(meta?.reopenedAt) ?? normalizeOptionalNumber(meta?.reopened_at),
      partialReadDescriptor: {
        startLine:
          normalizeOptionalNumber(meta?.startLine) ?? normalizeOptionalNumber(meta?.start_line),
        endLine: normalizeOptionalNumber(meta?.endLine) ?? normalizeOptionalNumber(meta?.end_line),
        startByte:
          normalizeOptionalNumber(meta?.startByte) ?? normalizeOptionalNumber(meta?.start_byte),
        endByte: normalizeOptionalNumber(meta?.endByte) ?? normalizeOptionalNumber(meta?.end_byte),
        omittedBytes:
          normalizeOptionalNumber(meta?.omittedBytes) ??
          normalizeOptionalNumber(meta?.omitted_bytes),
        byteLimit:
          normalizeOptionalNumber(meta?.byteLimit) ?? normalizeOptionalNumber(meta?.byte_limit),
        strategy: normalizeOptionalString(meta?.strategy),
        requestedRange: {
          startLine:
            normalizeOptionalNumber(meta?.requestedStartLine) ??
            normalizeOptionalNumber(meta?.requested_start_line) ??
            normalizeOptionalNumber(meta?.startLine) ??
            normalizeOptionalNumber(meta?.start_line),
          endLine:
            normalizeOptionalNumber(meta?.requestedEndLine) ??
            normalizeOptionalNumber(meta?.requested_end_line) ??
            normalizeOptionalNumber(meta?.endLine) ??
            normalizeOptionalNumber(meta?.end_line),
        },
        returnedRange: {
          startLine:
            normalizeOptionalNumber(meta?.returnedStartLine) ??
            normalizeOptionalNumber(meta?.returned_start_line) ??
            normalizeOptionalNumber(meta?.startLine) ??
            normalizeOptionalNumber(meta?.start_line),
          endLine:
            normalizeOptionalNumber(meta?.returnedEndLine) ??
            normalizeOptionalNumber(meta?.returned_end_line) ??
            normalizeOptionalNumber(meta?.endLine) ??
            normalizeOptionalNumber(meta?.end_line),
        },
        totalKnownLines:
          normalizeOptionalNumber(meta?.totalKnownLines) ??
          normalizeOptionalNumber(meta?.total_known_lines),
        limitKind:
          normalizeOptionalString(meta?.limitKind) ?? normalizeOptionalString(meta?.limit_kind),
        continuationHint:
          normalizeOptionalString(meta?.continuationHint) ??
          normalizeOptionalString(meta?.continuation_hint),
      },
      metadata: {
        transcriptMessageId: params.transcriptMessageId,
        descriptor: params.provenance.descriptor,
      },
    });
  }

  return artifacts;
}

function resolveSessionSnapshot(params: {
  cfg: OpenClawConfig;
  workspaceDir: string;
  sessionKey: string;
  runId?: string;
  pluginRegistry?: OpenClawPluginRegistry;
}): StateSessionUpsert | null {
  const agentId = resolveSessionAgentId({ sessionKey: params.sessionKey, config: params.cfg });
  const workspaceDir = resolveAgentWorkspaceDir(params.cfg, agentId);
  if (
    normalizePathForComparison(workspaceDir) !== normalizePathForComparison(params.workspaceDir)
  ) {
    return null;
  }
  const gatewayRow = loadGatewaySessionRow(params.sessionKey);
  const loaded = loadSessionEntry(params.sessionKey);
  const sessionId = gatewayRow?.sessionId ?? loaded.entry?.sessionId ?? params.runId;
  return {
    sessionKey: params.sessionKey,
    sessionId,
    agentId,
    workspaceDir,
    executionRole: gatewayRow?.executionRole ?? loaded.entry?.executionRole,
    status: gatewayRow?.status ?? loaded.entry?.status,
    startedAt: gatewayRow?.startedAt ?? loaded.entry?.startedAt,
    endedAt: gatewayRow?.endedAt ?? loaded.entry?.endedAt,
    updatedAt: gatewayRow?.updatedAt ?? loaded.entry?.updatedAt,
    displayName: gatewayRow?.displayName ?? loaded.entry?.displayName,
    label: gatewayRow?.label ?? loaded.entry?.label,
    parentSessionKey: gatewayRow?.parentSessionKey ?? loaded.entry?.parentSessionKey,
    capabilitySnapshot: resolveShellCapabilitySnapshot({
      cfg: params.cfg,
      sessionKey: params.sessionKey,
      pluginRegistry: params.pluginRegistry,
    }),
    sandboxRuntime: resolveSandboxRuntimeSnapshot({
      cfg: params.cfg,
      sessionKey: params.sessionKey,
    }),
  };
}

function resolveSessionSnapshotFromEntry(params: {
  cfg: OpenClawConfig;
  workspaceDir: string;
  sessionKey: string;
  pluginRegistry?: OpenClawPluginRegistry;
  entry: {
    sessionId?: string;
    executionRole?: "lead" | "worker" | "subagent" | "remote_peer";
    status?: string;
    startedAt?: number;
    endedAt?: number;
    updatedAt?: number;
    displayName?: string;
    label?: string;
    parentSessionKey?: string;
    spawnedWorkspaceDir?: string;
  };
}): StateSessionUpsert | null {
  const agentId = resolveSessionAgentId({ sessionKey: params.sessionKey, config: params.cfg });
  const configuredWorkspaceDir = resolveAgentWorkspaceDir(params.cfg, agentId);
  const effectiveWorkspaceDir = params.entry.spawnedWorkspaceDir ?? configuredWorkspaceDir;
  if (
    normalizePathForComparison(effectiveWorkspaceDir) !==
    normalizePathForComparison(params.workspaceDir)
  ) {
    return null;
  }
  return {
    sessionKey: params.sessionKey,
    sessionId: params.entry.sessionId,
    agentId,
    workspaceDir: effectiveWorkspaceDir,
    executionRole: params.entry.executionRole,
    status: params.entry.status,
    startedAt: params.entry.startedAt,
    endedAt: params.entry.endedAt,
    updatedAt: params.entry.updatedAt,
    displayName: params.entry.displayName,
    label: params.entry.label,
    parentSessionKey: params.entry.parentSessionKey,
    capabilitySnapshot: resolveShellCapabilitySnapshot({
      cfg: params.cfg,
      sessionKey: params.sessionKey,
      pluginRegistry: params.pluginRegistry,
    }),
    sandboxRuntime: resolveSandboxRuntimeSnapshot({
      cfg: params.cfg,
      sessionKey: params.sessionKey,
    }),
  };
}

function resolveTurnBoundaryContextPressureOptions(params: {
  cfg: OpenClawConfig;
  sessionKey: string;
}): Omit<ContextPressureSnapshotOptions, "estimatedInputTokens"> {
  return resolveSuperContextPressureOptionsFromConfig({
    cfg: params.cfg,
    sessionKey: params.sessionKey,
  });
}

export class SuperSessionPersistenceAdapter {
  private readonly unsubscribers: Array<() => void> = [];

  constructor(
    private readonly params: {
      cfg: OpenClawConfig;
      workspaceDir: string;
      stateStore: StateStore;
      pluginRegistry?: OpenClawPluginRegistry;
    },
  ) {}

  start(): void {
    this.seedSessions();
    this.unsubscribers.push(onSessionStoreMutation((event) => this.onSessionStoreMutation(event)));
    this.unsubscribers.push(onSessionLifecycleEvent((event) => this.onSessionLifecycle(event)));
    this.unsubscribers.push(onAgentEvent((event) => this.onAgentEvent(event)));
    this.unsubscribers.push(onSessionTranscriptUpdate((update) => this.onTranscriptUpdate(update)));
  }

  stop(): void {
    while (this.unsubscribers.length > 0) {
      const unsubscribe = this.unsubscribers.pop();
      unsubscribe?.();
    }
  }

  private projectSessionSnapshot(snapshot: StateSessionUpsert): void {
    this.params.stateStore.upsertSession(snapshot);
    if (!snapshot.capabilitySnapshot && !snapshot.sandboxRuntime) {
      return;
    }
    const createdAt = snapshot.updatedAt ?? snapshot.startedAt ?? snapshot.endedAt ?? Date.now();
    this.params.stateStore.appendAction({
      actionId: `session:${snapshot.sessionKey}:capability-negotiation`,
      sessionKey: snapshot.sessionKey,
      runId: snapshot.sessionId,
      actionType: "super.session.capability-negotiation",
      actionKind: "capability_negotiation",
      summary: "Advertised shell capability and sandbox state",
      status: "completed",
      createdAt,
      completedAt: createdAt,
      capabilitySnapshot: snapshot.capabilitySnapshot,
      sandboxRuntime: snapshot.sandboxRuntime,
      details: {
        executionRole: snapshot.executionRole,
        status: snapshot.status,
        parentSessionKey: snapshot.parentSessionKey,
      },
    });
  }

  private seedSessions(): void {
    const { store } = loadCombinedSessionStoreForGateway(this.params.cfg);
    for (const sessionKey of Object.keys(store)) {
      const snapshot = resolveSessionSnapshot({
        cfg: this.params.cfg,
        workspaceDir: this.params.workspaceDir,
        sessionKey,
        pluginRegistry: this.params.pluginRegistry,
      });
      if (snapshot) {
        this.projectSessionSnapshot(snapshot);
      }
    }
  }

  private onSessionLifecycle(event: { sessionKey: string }): void {
    const snapshot = resolveSessionSnapshot({
      cfg: this.params.cfg,
      workspaceDir: this.params.workspaceDir,
      sessionKey: event.sessionKey,
      pluginRegistry: this.params.pluginRegistry,
    });
    if (!snapshot) {
      return;
    }
    this.projectSessionSnapshot(snapshot);
  }

  private onSessionStoreMutation(event: {
    kind: "upsert" | "delete";
    storePath: string;
    sessionKey: string;
    entry?: {
      sessionId?: string;
      status?: string;
      startedAt?: number;
      endedAt?: number;
      updatedAt?: number;
      displayName?: string;
      label?: string;
      parentSessionKey?: string;
      spawnedWorkspaceDir?: string;
    };
  }): void {
    if (event.kind !== "upsert" || !event.entry) {
      return;
    }
    const snapshot = resolveSessionSnapshotFromEntry({
      cfg: this.params.cfg,
      workspaceDir: this.params.workspaceDir,
      sessionKey: event.sessionKey,
      pluginRegistry: this.params.pluginRegistry,
      entry: event.entry,
    });
    if (!snapshot) {
      return;
    }
    this.projectSessionSnapshot(snapshot);
  }

  private onAgentEvent(event: AgentEventPayload): void {
    if (!isLifecycleStream(event) || !event.sessionKey) {
      return;
    }
    const phase = resolveLifecyclePhase(event);
    if (!phase) {
      return;
    }
    const snapshot = resolveSessionSnapshot({
      cfg: this.params.cfg,
      workspaceDir: this.params.workspaceDir,
      sessionKey: event.sessionKey,
      runId: event.runId,
      pluginRegistry: this.params.pluginRegistry,
    });
    if (!snapshot) {
      return;
    }
    if (phase === "start") {
      const startedAt = resolveLifecycleBoundaryTime(event, phase);
      snapshot.status = "running";
      snapshot.startedAt = startedAt;
      snapshot.updatedAt = startedAt;
      snapshot.endedAt = undefined;
    } else {
      const endedAt = resolveLifecycleBoundaryTime(event, phase);
      snapshot.status = phase === "error" ? "failed" : "done";
      snapshot.endedAt = endedAt;
      snapshot.updatedAt = endedAt;
    }
    this.projectSessionSnapshot(snapshot);
    this.params.stateStore.appendAction({
      actionId: `${event.runId}:lifecycle:${phase}`,
      sessionKey: event.sessionKey,
      runId: event.runId,
      actionType: "agent.lifecycle",
      actionKind: "agent_lifecycle",
      summary: resolveActionSummary(event, phase),
      status: resolveActionStatus(phase),
      createdAt: event.ts,
      completedAt: phase === "start" ? undefined : event.ts,
      capabilitySnapshot: snapshot.capabilitySnapshot,
      sandboxRuntime: snapshot.sandboxRuntime,
    });
    if (phase === "end" || phase === "error") {
      this.params.stateStore.recordContextPressureSnapshot({
        runId: event.runId,
        createdAt: resolveLifecycleBoundaryTime(event, phase),
        ...resolveTurnBoundaryContextPressureOptions({
          cfg: this.params.cfg,
          sessionKey: event.sessionKey,
        }),
      });
    }
  }

  private onTranscriptUpdate(update: SessionTranscriptUpdate): void {
    const sessionKey = update.sessionKey ?? resolveSessionKeyForTranscriptFile(update.sessionFile);
    if (!sessionKey || update.message === undefined) {
      return;
    }
    const snapshot = resolveSessionSnapshot({
      cfg: this.params.cfg,
      workspaceDir: this.params.workspaceDir,
      sessionKey,
      pluginRegistry: this.params.pluginRegistry,
    });
    if (!snapshot) {
      return;
    }
    this.projectSessionSnapshot(snapshot);
    if (!update.message || typeof update.message !== "object") {
      return;
    }
    const roleValue = (update.message as { role?: unknown }).role;
    const role = typeof roleValue === "string" ? roleValue : "unknown";
    const contentText = extractMessageText(update.message);
    if (!contentText) {
      return;
    }
    const timestampValue = (update.message as { timestamp?: unknown }).timestamp;
    const createdAt =
      typeof timestampValue === "number" && Number.isFinite(timestampValue)
        ? timestampValue
        : Date.now();
    const sequence = resolveTranscriptSequence(update);
    const provenance = resolveMessageProvenance(update.message);
    const messageId = resolveMessageId({
      sessionKey,
      update,
      role,
      contentText,
      createdAt,
      sequence,
    });
    this.params.stateStore.appendMessage({
      messageId,
      sessionKey,
      role,
      contentText,
      createdAt,
      transcriptMessageId: resolveTranscriptMessageId(update),
      sequence,
      provenance,
    });
    this.params.stateStore.appendArtifact({
      artifactId: `transcript:${sessionKey}:${update.sessionFile}`,
      sessionKey,
      kind: "transcript-file",
      label: "Session transcript",
      location: update.sessionFile,
      createdAt,
      provenance,
      metadata: buildTranscriptArtifactMetadata(update),
    });
    for (const artifact of buildProvenanceArtifacts({
      sessionKey,
      createdAt,
      transcriptMessageId: resolveTranscriptMessageId(update),
      messageId,
      provenance,
      message: update.message,
    })) {
      this.params.stateStore.appendArtifact(artifact);
    }
  }
}
