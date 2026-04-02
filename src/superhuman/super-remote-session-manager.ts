import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  ExecutionEnvironmentRegistry,
  StateStore,
  SuperExecutionEnvironmentSnapshot,
  SuperShellCapabilityMode,
} from "./super-runtime-seams.js";
import {
  evaluateSuperExecutionCapabilityRequirements,
  resolveCanonicalBackendIdForEnvironmentKind,
  toSuperExecutionEnvironmentCapabilities,
  type SuperExecutionLaunchCapabilityRequirement,
} from "./super-runtime-seams.js";
import { resolveSuperhumanStateDir } from "./super-state-store.js";

export type SuperRemoteSessionState =
  | "launching"
  | "connected"
  | "reconnecting"
  | "interrupted"
  | "stopped"
  | "terminal"
  | "failed";

export type SuperRemoteApprovalResolution =
  | {
      decision: "approved";
      behavior: "allow_once" | "allow_always";
      message?: string;
      updatedInput?: Record<string, unknown>;
    }
  | {
      decision: "denied";
      behavior: "deny";
      message: string;
    };

export type SuperRemotePermissionRequest = {
  requestId: string;
  toolCallId?: string;
  toolName: string;
  input: Record<string, unknown>;
  requiresLocalToolStub: boolean;
  summary: string;
  capabilityRequirements: SuperExecutionLaunchCapabilityRequirement[];
  verification?: Record<string, unknown>;
  provenance?: Record<string, unknown>;
  artifact?: Record<string, unknown>;
  createdAt: number;
};

export type SuperRemoteSessionRecord = {
  workerId: string;
  sessionKey: string;
  controllerSessionKey: string;
  requesterSessionKey: string;
  adapterId: string;
  providerId?: string;
  label: string;
  state: SuperRemoteSessionState;
  createdAt: number;
  updatedAt: number;
  connectedAt?: number;
  disconnectedAt?: number;
  terminalAt?: number;
  lastError?: string;
  lastStage?: string;
  capabilityRequirements: SuperExecutionLaunchCapabilityRequirement[];
  environment: SuperExecutionEnvironmentSnapshot;
  pendingApprovals: SuperRemotePermissionRequest[];
};

export type SuperRemoteSessionEvent =
  | {
      type: "connected";
      workerId: string;
      createdAt: number;
    }
  | {
      type: "reconnecting";
      workerId: string;
      reason?: string;
      createdAt: number;
    }
  | {
      type: "progress";
      workerId: string;
      stage?: string;
      summary: string;
      createdAt: number;
      details?: Record<string, unknown>;
    }
  | {
      type: "approval_requested";
      workerId: string;
      request: SuperRemotePermissionRequest;
      createdAt: number;
    }
  | {
      type: "approval_resolved";
      workerId: string;
      requestId: string;
      resolution: SuperRemoteApprovalResolution | { decision: "expired" };
      createdAt: number;
    }
  | {
      type: "approval_cancelled";
      workerId: string;
      requestId: string;
      toolCallId?: string;
      createdAt: number;
    }
  | {
      type: "artifact";
      workerId: string;
      createdAt: number;
      artifact: Record<string, unknown>;
    }
  | {
      type: "message";
      workerId: string;
      createdAt: number;
      message: Record<string, unknown>;
    }
  | {
      type: "terminal";
      workerId: string;
      createdAt: number;
      summary: string;
      result?: string;
      verificationOutcome?: string;
      provenance?: Record<string, unknown>;
      artifact?: Record<string, unknown>;
      error?: string;
    };

type RemoteSessionStoreSnapshot = {
  version: 1;
  sessions: SuperRemoteSessionRecord[];
  events: Array<SuperRemoteSessionEvent & { eventId: string }>;
};

export type SuperRemoteTransportEnvelope =
  | { type: "connected" }
  | { type: "reconnecting"; reason?: string }
  | { type: "progress"; stage?: string; summary: string; details?: Record<string, unknown> }
  | {
      type: "approval_request";
      requestId: string;
      toolCallId?: string;
      toolName: string;
      input: Record<string, unknown>;
      capabilityRequirements?: SuperExecutionLaunchCapabilityRequirement[];
      verification?: Record<string, unknown>;
      provenance?: Record<string, unknown>;
      artifact?: Record<string, unknown>;
    }
  | { type: "approval_cancel"; requestId: string; toolCallId?: string }
  | {
      type: "approval_resolved";
      requestId: string;
      resolution: SuperRemoteApprovalResolution | { decision: "expired" };
    }
  | { type: "artifact"; artifact: Record<string, unknown> }
  | { type: "message"; message: Record<string, unknown> }
  | {
      type: "terminal";
      summary: string;
      result?: string;
      verificationOutcome?: string;
      provenance?: Record<string, unknown>;
      artifact?: Record<string, unknown>;
      error?: string;
    };

export interface SuperRemoteSessionTransport {
  connect(): Promise<void>;
  sendInput(params: { message: string; interrupt?: boolean }): Promise<boolean>;
  interrupt(): Promise<boolean>;
  stop(): Promise<boolean>;
  resolveApproval(
    requestId: string,
    resolution: SuperRemoteApprovalResolution | { decision: "expired" },
  ): Promise<boolean>;
  close(): Promise<void>;
}

export type SuperRemoteSessionTransportFactory = (params: {
  workerId: string;
  sessionKey: string;
  adapterId: string;
  emit: (event: SuperRemoteTransportEnvelope) => void;
}) => SuperRemoteSessionTransport;

export type SuperRemoteSessionManager = {
  setEventHandler: (handler?: (event: SuperRemoteSessionEvent) => void) => void;
  registerTransportFactory: (
    adapterId: string,
    factory: SuperRemoteSessionTransportFactory,
  ) => void;
  launchSession: (params: {
    workerId: string;
    sessionKey: string;
    controllerSessionKey: string;
    requesterSessionKey: string;
    adapterId?: string;
    providerId?: string;
    label?: string;
    capabilityMode: SuperShellCapabilityMode;
    capabilityRequirements: SuperExecutionLaunchCapabilityRequirement[];
    supportsArtifactReplay?: boolean;
    supportsProvenanceReplay?: boolean;
    supportsVerificationReplay?: boolean;
    supportsComputerUse?: boolean;
    workspaceSearchFallbackToolKinds?: string[];
    semanticToolProviderIds?: string[];
  }) => Promise<SuperRemoteSessionRecord>;
  listSessions: () => SuperRemoteSessionRecord[];
  getSession: (workerId: string) => SuperRemoteSessionRecord | null;
  listEvents: (workerId?: string) => Array<SuperRemoteSessionEvent & { eventId: string }>;
  continueSession: (params: {
    workerId: string;
    message: string;
    interrupt?: boolean;
  }) => Promise<boolean>;
  interruptSession: (workerId: string) => Promise<boolean>;
  stopSession: (workerId: string) => Promise<boolean>;
  resolveApproval: (params: {
    workerId: string;
    requestId: string;
    resolution: SuperRemoteApprovalResolution | { decision: "expired" };
  }) => Promise<boolean>;
  stop: () => void;
};

const STORE_FILE_MODE = 0o600;
const STORE_DIR_MODE = 0o700;

function resolveStorePath(workspaceDir: string): string {
  return path.join(resolveSuperhumanStateDir(workspaceDir), "remote-sessions.json");
}

function createEmptySnapshot(): RemoteSessionStoreSnapshot {
  return {
    version: 1,
    sessions: [],
    events: [],
  };
}

function normalizeEnvironmentSnapshot(
  environment: SuperExecutionEnvironmentSnapshot,
): SuperExecutionEnvironmentSnapshot {
  return {
    ...environment,
    backendId: resolveCanonicalBackendIdForEnvironmentKind(environment.kind),
  };
}

function loadSnapshot(storePath: string): RemoteSessionStoreSnapshot {
  if (!fs.existsSync(storePath)) {
    return createEmptySnapshot();
  }
  try {
    const parsed = JSON.parse(
      fs.readFileSync(storePath, "utf8"),
    ) as Partial<RemoteSessionStoreSnapshot>;
    return {
      version: 1,
      sessions: Array.isArray(parsed.sessions)
        ? parsed.sessions.map((record) => ({
            ...record,
            environment: normalizeEnvironmentSnapshot(record.environment),
          }))
        : [],
      events: Array.isArray(parsed.events)
        ? (parsed.events as Array<SuperRemoteSessionEvent & { eventId: string }>)
        : [],
    };
  } catch {
    return createEmptySnapshot();
  }
}

function persistSnapshot(storePath: string, snapshot: RemoteSessionStoreSnapshot): void {
  const dir = path.dirname(storePath);
  fs.mkdirSync(dir, { recursive: true, mode: STORE_DIR_MODE });
  fs.chmodSync(dir, STORE_DIR_MODE);
  const tempPath = `${storePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), { mode: STORE_FILE_MODE });
  fs.renameSync(tempPath, storePath);
  fs.chmodSync(storePath, STORE_FILE_MODE);
}

function summarizeUnknownToolRequest(toolName: string, input: Record<string, unknown>): string {
  const preview = Object.entries(input)
    .slice(0, 3)
    .map(([key, value]) => `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join(", ");
  return preview ? `${toolName}: ${preview}` : toolName;
}

function cloneApprovalRequest(request: SuperRemotePermissionRequest): SuperRemotePermissionRequest {
  return {
    ...request,
    input: { ...request.input },
    capabilityRequirements: [...request.capabilityRequirements],
    verification: request.verification ? { ...request.verification } : undefined,
    provenance: request.provenance ? { ...request.provenance } : undefined,
    artifact: request.artifact ? { ...request.artifact } : undefined,
  };
}

function cloneRecord(record: SuperRemoteSessionRecord): SuperRemoteSessionRecord {
  return {
    ...record,
    environment: {
      ...normalizeEnvironmentSnapshot(record.environment),
      capabilities: {
        ...record.environment.capabilities,
        workspaceSearchFallbackToolKinds: [
          ...record.environment.capabilities.workspaceSearchFallbackToolKinds,
        ],
        semanticToolProviderIds: [...record.environment.capabilities.semanticToolProviderIds],
        bundles: record.environment.capabilities.bundles.map((bundle) => ({ ...bundle })),
      },
    },
    pendingApprovals: record.pendingApprovals.map((request) => cloneApprovalRequest(request)),
  };
}

export function startSuperRemoteSessionManager(params: {
  workspaceDir: string;
  stateStore: StateStore;
  environmentRegistry: ExecutionEnvironmentRegistry;
  onEvent?: (event: SuperRemoteSessionEvent) => void;
}): SuperRemoteSessionManager {
  const storePath = resolveStorePath(params.workspaceDir);
  let snapshot = loadSnapshot(storePath);
  // The JSON sidecar still carries the only full remote session record today, so startup must
  // rehydrate its environment declarations before any runtime asks the registry for capability truth.
  for (const record of snapshot.sessions) {
    params.environmentRegistry.upsertSnapshot(record.environment);
  }
  const transports = new Map<string, SuperRemoteSessionTransport>();
  const factories = new Map<string, SuperRemoteSessionTransportFactory>();
  let eventHandler = params.onEvent;

  const save = () => {
    persistSnapshot(storePath, snapshot);
  };

  const appendEvent = (event: SuperRemoteSessionEvent) => {
    snapshot.events.push({
      ...event,
      eventId: crypto.randomUUID(),
    });
    save();
    const sessionRecord = snapshot.sessions.find((record) => record.workerId === event.workerId);
    const sessionKey = sessionRecord?.sessionKey;
    const runId = `remote:${event.workerId}`;
    if (event.type === "approval_requested") {
      params.stateStore.appendAction({
        actionId: `remote-approval-requested:${event.workerId}:${event.request.requestId}`,
        sessionKey,
        runId,
        actionType: "super.remote.approval-requested",
        actionKind: "capability_negotiation",
        summary: `Remote approval requested for ${event.request.toolName}`,
        status: "running",
        createdAt: event.createdAt,
        details: {
          toolName: event.request.toolName,
          summary: event.request.summary,
          verification: event.request.verification,
          provenance: event.request.provenance,
          artifact: event.request.artifact,
        },
      });
    } else if (event.type === "approval_resolved") {
      params.stateStore.appendAction({
        actionId: `remote-approval-resolved:${event.workerId}:${event.requestId}`,
        sessionKey,
        runId,
        actionType: "super.remote.approval-resolved",
        actionKind: "capability_negotiation",
        summary: `Remote approval ${event.resolution.decision}`,
        status: "completed",
        createdAt: event.createdAt,
        completedAt: event.createdAt,
        details: {
          resolution: event.resolution,
        },
      });
    } else if (event.type === "terminal") {
      params.stateStore.appendAction({
        actionId: `remote-terminal:${event.workerId}:${event.createdAt}`,
        sessionKey,
        runId,
        actionType: "super.remote.terminal",
        actionKind: "agent_lifecycle",
        summary: event.summary,
        status: event.error ? "failed" : "completed",
        createdAt: event.createdAt,
        completedAt: event.createdAt,
        details: {
          result: event.result,
          verificationOutcome: event.verificationOutcome,
          provenance: event.provenance,
          artifact: event.artifact,
          error: event.error,
        },
      });
    } else if (event.type === "progress") {
      params.stateStore.appendAction({
        actionId: `remote-progress:${event.workerId}:${event.createdAt}`,
        sessionKey,
        runId,
        actionType: "super.remote.progress",
        actionKind: "agent_lifecycle",
        summary: event.summary,
        status: "running",
        createdAt: event.createdAt,
        details: {
          stage: event.stage,
          ...event.details,
        },
      });
    }
    eventHandler?.(event);
  };

  const patchRecord = (
    workerId: string,
    patch: Partial<SuperRemoteSessionRecord>,
  ): SuperRemoteSessionRecord | null => {
    const index = snapshot.sessions.findIndex((record) => record.workerId === workerId);
    if (index < 0) {
      return null;
    }
    const current = snapshot.sessions[index];
    const next = cloneRecord({
      ...current,
      ...patch,
      environment: patch.environment ? patch.environment : current.environment,
      pendingApprovals: patch.pendingApprovals ?? current.pendingApprovals,
    });
    snapshot.sessions[index] = next;
    save();
    params.environmentRegistry.upsertSnapshot(next.environment);
    return cloneRecord(next);
  };

  const handleTransportEvent = (workerId: string, event: SuperRemoteTransportEnvelope) => {
    const record = snapshot.sessions.find((entry) => entry.workerId === workerId);
    if (!record) {
      return;
    }
    const now = Date.now();
    switch (event.type) {
      case "connected":
        patchRecord(workerId, {
          state: "connected",
          connectedAt: now,
          updatedAt: now,
        });
        appendEvent({ type: "connected", workerId, createdAt: now });
        return;
      case "reconnecting":
        patchRecord(workerId, {
          state: "reconnecting",
          disconnectedAt: now,
          updatedAt: now,
        });
        appendEvent({ type: "reconnecting", workerId, reason: event.reason, createdAt: now });
        return;
      case "progress":
        patchRecord(workerId, {
          updatedAt: now,
          lastStage: event.stage ?? record.lastStage,
        });
        appendEvent({
          type: "progress",
          workerId,
          stage: event.stage,
          summary: event.summary,
          details: event.details,
          createdAt: now,
        });
        return;
      case "approval_request": {
        const request: SuperRemotePermissionRequest = {
          requestId: event.requestId,
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          input: { ...event.input },
          requiresLocalToolStub: true,
          summary: summarizeUnknownToolRequest(event.toolName, event.input),
          capabilityRequirements: [...(event.capabilityRequirements ?? [])],
          verification: event.verification ? { ...event.verification } : undefined,
          provenance: event.provenance ? { ...event.provenance } : undefined,
          artifact: event.artifact ? { ...event.artifact } : undefined,
          createdAt: now,
        };
        patchRecord(workerId, {
          updatedAt: now,
          pendingApprovals: [...record.pendingApprovals, request],
        });
        appendEvent({
          type: "approval_requested",
          workerId,
          request,
          createdAt: now,
        });
        return;
      }
      case "approval_cancel": {
        const pendingApprovals = record.pendingApprovals.filter(
          (request) => request.requestId !== event.requestId,
        );
        patchRecord(workerId, {
          updatedAt: now,
          pendingApprovals,
        });
        appendEvent({
          type: "approval_cancelled",
          workerId,
          requestId: event.requestId,
          toolCallId: event.toolCallId,
          createdAt: now,
        });
        return;
      }
      case "approval_resolved": {
        const pendingApprovals = record.pendingApprovals.filter(
          (request) => request.requestId !== event.requestId,
        );
        patchRecord(workerId, {
          updatedAt: now,
          pendingApprovals,
        });
        appendEvent({
          type: "approval_resolved",
          workerId,
          requestId: event.requestId,
          resolution: event.resolution,
          createdAt: now,
        });
        return;
      }
      case "artifact":
        appendEvent({
          type: "artifact",
          workerId,
          artifact: { ...event.artifact },
          createdAt: now,
        });
        return;
      case "message":
        appendEvent({
          type: "message",
          workerId,
          message: { ...event.message },
          createdAt: now,
        });
        return;
      case "terminal":
        patchRecord(workerId, {
          state: event.error ? "failed" : "terminal",
          terminalAt: now,
          updatedAt: now,
          lastError: event.error,
          pendingApprovals: [],
        });
        appendEvent({
          type: "terminal",
          workerId,
          summary: event.summary,
          result: event.result,
          verificationOutcome: event.verificationOutcome,
          provenance: event.provenance ? { ...event.provenance } : undefined,
          artifact: event.artifact ? { ...event.artifact } : undefined,
          error: event.error,
          createdAt: now,
        });
        return;
    }
  };

  return {
    setEventHandler(handler) {
      eventHandler = handler;
    },

    registerTransportFactory(adapterId, factory) {
      factories.set(adapterId.trim(), factory);
    },

    async launchSession(launchParams) {
      const adapterId = launchParams.adapterId?.trim() || "remote_peer";
      const environment: SuperExecutionEnvironmentSnapshot = {
        environmentId: `remote:${launchParams.workerId}`,
        workerId: launchParams.workerId,
        sessionKey: launchParams.sessionKey,
        label: launchParams.label?.trim() || `Remote peer ${launchParams.sessionKey}`,
        kind: "remote",
        backendId: "remote_peer",
        providerId: launchParams.providerId?.trim() || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        capabilityMode: launchParams.capabilityMode,
        capabilities: toSuperExecutionEnvironmentCapabilities({
          capabilityMode: launchParams.capabilityMode,
          supportsArtifactReplay: launchParams.supportsArtifactReplay === true,
          supportsProvenanceReplay: launchParams.supportsProvenanceReplay === true,
          supportsVerificationReplay: launchParams.supportsVerificationReplay === true,
          supportsComputerUse: launchParams.supportsComputerUse === true,
          workspaceSearchFallbackToolKinds: launchParams.workspaceSearchFallbackToolKinds,
          semanticToolProviderIds: launchParams.semanticToolProviderIds,
        }),
      };
      const capabilityCheck = evaluateSuperExecutionCapabilityRequirements({
        environment,
        required: launchParams.capabilityRequirements,
      });
      if (!capabilityCheck.satisfied) {
        throw new Error(
          `Remote environment missing capabilities: ${capabilityCheck.missing.join(", ")}`,
        );
      }
      const record: SuperRemoteSessionRecord = {
        workerId: launchParams.workerId,
        sessionKey: launchParams.sessionKey,
        controllerSessionKey: launchParams.controllerSessionKey,
        requesterSessionKey: launchParams.requesterSessionKey,
        adapterId,
        providerId: launchParams.providerId?.trim() || undefined,
        label: launchParams.label?.trim() || `Remote peer ${launchParams.sessionKey}`,
        state: "launching",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        capabilityRequirements: [...launchParams.capabilityRequirements],
        environment,
        pendingApprovals: [],
      };
      snapshot.sessions = snapshot.sessions
        .filter((entry) => entry.workerId !== record.workerId)
        .concat(record);
      save();
      params.environmentRegistry.upsertSnapshot(environment);
      params.stateStore.upsertSession({
        sessionKey: record.sessionKey,
        sessionId: `remote:${record.workerId}`,
        agentId: "remote",
        workspaceDir: params.workspaceDir,
        executionRole: "remote_peer",
        status: "running",
        startedAt: record.createdAt,
        updatedAt: record.updatedAt,
        displayName: record.label,
      });
      params.stateStore.appendAction({
        actionId: `remote-capability:${record.workerId}`,
        sessionKey: record.sessionKey,
        runId: `remote:${record.workerId}`,
        actionType: "super.remote.capability-negotiation",
        actionKind: "capability_negotiation",
        summary: "Remote environment capabilities declared",
        status: "completed",
        createdAt: record.createdAt,
        completedAt: record.createdAt,
        details: {
          workerId: record.workerId,
          backendId: record.environment.backendId,
          adapterId: record.adapterId,
          providerId: record.providerId,
          environment: record.environment,
          requiredCapabilities: record.capabilityRequirements,
        },
      });
      const factory = factories.get(adapterId);
      if (!factory) {
        throw new Error(`No remote transport factory registered for adapter ${adapterId}`);
      }
      const transport = factory({
        workerId: record.workerId,
        sessionKey: record.sessionKey,
        adapterId,
        emit: (event) => handleTransportEvent(record.workerId, event),
      });
      transports.set(record.workerId, transport);
      await transport.connect();
      return cloneRecord(record);
    },

    listSessions() {
      return snapshot.sessions.map((record) => cloneRecord(record));
    },

    getSession(workerId) {
      const record = snapshot.sessions.find((entry) => entry.workerId === workerId.trim());
      return record ? cloneRecord(record) : null;
    },

    listEvents(workerId) {
      const trimmed = workerId?.trim();
      return snapshot.events
        .filter((event) => !trimmed || event.workerId === trimmed)
        .map((event) => ({ ...event }));
    },

    async continueSession({ workerId, message, interrupt }) {
      const transport = transports.get(workerId.trim());
      if (!transport) {
        return false;
      }
      return await transport.sendInput({ message, interrupt });
    },

    async interruptSession(workerId) {
      const trimmed = workerId.trim();
      const transport = transports.get(trimmed);
      if (!transport) {
        return false;
      }
      const ok = await transport.interrupt();
      if (ok) {
        patchRecord(trimmed, {
          state: "interrupted",
          updatedAt: Date.now(),
        });
      }
      return ok;
    },

    async stopSession(workerId) {
      const trimmed = workerId.trim();
      const transport = transports.get(trimmed);
      if (!transport) {
        return false;
      }
      const ok = await transport.stop();
      if (ok) {
        patchRecord(trimmed, {
          state: "stopped",
          updatedAt: Date.now(),
        });
      }
      return ok;
    },

    async resolveApproval({ workerId, requestId, resolution }) {
      const trimmed = workerId.trim();
      const transport = transports.get(trimmed);
      if (!transport) {
        return false;
      }
      const ok = await transport.resolveApproval(requestId, resolution);
      if (ok) {
        handleTransportEvent(trimmed, {
          type: "approval_resolved",
          requestId,
          resolution,
        });
      }
      return ok;
    },

    stop() {
      for (const transport of transports.values()) {
        void transport.close();
      }
      transports.clear();
    },
  };
}
