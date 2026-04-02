import type { ExecAsk, ExecSecurity, SystemRunApprovalPlan } from "../infra/exec-approvals.js";
import {
  DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS,
  DEFAULT_APPROVAL_TIMEOUT_MS,
} from "./bash-tools.exec-runtime.js";
import { callGatewayTool } from "./tools/gateway.js";

export type RequestExecApprovalDecisionParams = {
  id: string;
  command?: string;
  commandArgv?: string[];
  systemRunPlan?: SystemRunApprovalPlan;
  env?: Record<string, string>;
  cwd: string;
  nodeId?: string;
  host: "gateway" | "node";
  security: ExecSecurity;
  ask: ExecAsk;
  agentId?: string;
  resolvedPath?: string;
  sessionKey?: string;
  turnSourceChannel?: string;
  turnSourceTo?: string;
  turnSourceAccountId?: string;
  turnSourceThreadId?: string | number;
  allowedResolutionKeys?: Array<"command" | "cwd">;
};

export type ExecApprovalResolution = {
  decision: string | null;
  command?: string;
  cwd?: string | null;
  feedback?: string;
};

type ExecApprovalRequestToolParams = RequestExecApprovalDecisionParams & {
  timeoutMs: number;
  twoPhase: true;
};

function buildExecApprovalRequestToolParams(
  params: RequestExecApprovalDecisionParams,
): ExecApprovalRequestToolParams {
  return {
    id: params.id,
    ...(params.command ? { command: params.command } : {}),
    ...(params.commandArgv ? { commandArgv: params.commandArgv } : {}),
    systemRunPlan: params.systemRunPlan,
    env: params.env,
    cwd: params.cwd,
    nodeId: params.nodeId,
    host: params.host,
    security: params.security,
    ask: params.ask,
    agentId: params.agentId,
    resolvedPath: params.resolvedPath,
    sessionKey: params.sessionKey,
    turnSourceChannel: params.turnSourceChannel,
    turnSourceTo: params.turnSourceTo,
    turnSourceAccountId: params.turnSourceAccountId,
    turnSourceThreadId: params.turnSourceThreadId,
    allowedResolutionKeys: params.allowedResolutionKeys,
    timeoutMs: DEFAULT_APPROVAL_TIMEOUT_MS,
    twoPhase: true,
  };
}

type ParsedDecision = { present: boolean; value: string | null };

function parseDecision(value: unknown): ParsedDecision {
  if (!value || typeof value !== "object") {
    return { present: false, value: null };
  }
  // Distinguish "field missing" from "field present but null/invalid".
  // Registration responses intentionally omit `decision`; decision waits can include it.
  if (!Object.hasOwn(value, "decision")) {
    return { present: false, value: null };
  }
  const decision = (value as { decision?: unknown }).decision;
  return { present: true, value: typeof decision === "string" ? decision : null };
}

function parseString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseExpiresAtMs(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export type ExecApprovalRegistration = {
  id: string;
  expiresAtMs: number;
  finalResolution?: ExecApprovalResolution;
};

export async function registerExecApprovalRequest(
  params: RequestExecApprovalDecisionParams,
): Promise<ExecApprovalRegistration> {
  // Two-phase registration is critical: the ID must be registered server-side
  // before exec returns `approval-pending`, otherwise `/approve` can race and orphan.
  const registrationResult = await callGatewayTool<{
    id?: string;
    expiresAtMs?: number;
    decision?: string;
  }>(
    "exec.approval.request",
    { timeoutMs: DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS },
    buildExecApprovalRequestToolParams(params),
    { expectFinal: false },
  );
  const decision = parseDecision(registrationResult);
  const id = parseString(registrationResult?.id) ?? params.id;
  const expiresAtMs =
    parseExpiresAtMs(registrationResult?.expiresAtMs) ?? Date.now() + DEFAULT_APPROVAL_TIMEOUT_MS;
  if (decision.present) {
    return {
      id,
      expiresAtMs,
      finalResolution: {
        decision: decision.value,
        command: parseString((registrationResult as { command?: unknown })?.command),
        cwd:
          Object.hasOwn(registrationResult ?? {}, "cwd") &&
          (typeof (registrationResult as { cwd?: unknown })?.cwd === "string" ||
            (registrationResult as { cwd?: unknown })?.cwd === null)
            ? ((registrationResult as { cwd?: string | null }).cwd ?? null)
            : undefined,
        feedback: parseString((registrationResult as { feedback?: unknown })?.feedback),
      },
    };
  }
  return { id, expiresAtMs };
}

export async function waitForExecApprovalDecision(id: string): Promise<ExecApprovalResolution> {
  try {
    const decisionResult = await callGatewayTool<{
      decision?: string;
      command?: string;
      cwd?: string | null;
      feedback?: string;
    }>("exec.approval.waitDecision", { timeoutMs: DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS }, { id });
    return {
      decision: parseDecision(decisionResult).value,
      command: parseString(decisionResult?.command),
      cwd:
        Object.hasOwn(decisionResult ?? {}, "cwd") &&
        (typeof decisionResult?.cwd === "string" || decisionResult?.cwd === null)
          ? (decisionResult?.cwd ?? null)
          : undefined,
      feedback: parseString(decisionResult?.feedback),
    };
  } catch (err) {
    // Timeout/cleanup path: treat missing/expired as no decision so askFallback applies.
    const message = String(err).toLowerCase();
    if (message.includes("approval expired or not found")) {
      return { decision: null };
    }
    throw err;
  }
}

export async function resolveRegisteredExecApprovalDecision(params: {
  approvalId: string;
  preResolvedResolution?: ExecApprovalResolution;
}): Promise<ExecApprovalResolution> {
  if (params.preResolvedResolution !== undefined) {
    return params.preResolvedResolution;
  }
  return await waitForExecApprovalDecision(params.approvalId);
}

export async function requestExecApprovalDecision(
  params: RequestExecApprovalDecisionParams,
): Promise<ExecApprovalResolution> {
  const registration = await registerExecApprovalRequest(params);
  if (registration.finalResolution !== undefined) {
    return registration.finalResolution;
  }
  return await waitForExecApprovalDecision(registration.id);
}

type HostExecApprovalParams = {
  approvalId: string;
  command?: string;
  commandArgv?: string[];
  systemRunPlan?: SystemRunApprovalPlan;
  env?: Record<string, string>;
  workdir: string;
  host: "gateway" | "node";
  nodeId?: string;
  security: ExecSecurity;
  ask: ExecAsk;
  agentId?: string;
  resolvedPath?: string;
  sessionKey?: string;
  turnSourceChannel?: string;
  turnSourceTo?: string;
  turnSourceAccountId?: string;
  turnSourceThreadId?: string | number;
  allowedResolutionKeys?: Array<"command" | "cwd">;
};

type ExecApprovalRequesterContext = {
  agentId?: string;
  sessionKey?: string;
};

export function buildExecApprovalRequesterContext(params: ExecApprovalRequesterContext): {
  agentId?: string;
  sessionKey?: string;
} {
  return {
    agentId: params.agentId,
    sessionKey: params.sessionKey,
  };
}

type ExecApprovalTurnSourceContext = {
  turnSourceChannel?: string;
  turnSourceTo?: string;
  turnSourceAccountId?: string;
  turnSourceThreadId?: string | number;
};

export function buildExecApprovalTurnSourceContext(
  params: ExecApprovalTurnSourceContext,
): ExecApprovalTurnSourceContext {
  return {
    turnSourceChannel: params.turnSourceChannel,
    turnSourceTo: params.turnSourceTo,
    turnSourceAccountId: params.turnSourceAccountId,
    turnSourceThreadId: params.turnSourceThreadId,
  };
}

function buildHostApprovalDecisionParams(
  params: HostExecApprovalParams,
): RequestExecApprovalDecisionParams {
  return {
    id: params.approvalId,
    command: params.command,
    commandArgv: params.commandArgv,
    systemRunPlan: params.systemRunPlan,
    env: params.env,
    cwd: params.workdir,
    nodeId: params.nodeId,
    host: params.host,
    security: params.security,
    ask: params.ask,
    ...buildExecApprovalRequesterContext({
      agentId: params.agentId,
      sessionKey: params.sessionKey,
    }),
    resolvedPath: params.resolvedPath,
    allowedResolutionKeys: params.allowedResolutionKeys,
    ...buildExecApprovalTurnSourceContext(params),
  };
}

export async function requestExecApprovalDecisionForHost(
  params: HostExecApprovalParams,
): Promise<ExecApprovalResolution> {
  return await requestExecApprovalDecision(buildHostApprovalDecisionParams(params));
}

export async function registerExecApprovalRequestForHost(
  params: HostExecApprovalParams,
): Promise<ExecApprovalRegistration> {
  return await registerExecApprovalRequest(buildHostApprovalDecisionParams(params));
}

export async function registerExecApprovalRequestForHostOrThrow(
  params: HostExecApprovalParams,
): Promise<ExecApprovalRegistration> {
  try {
    return await registerExecApprovalRequestForHost(params);
  } catch (err) {
    throw new Error(`Exec approval registration failed: ${String(err)}`, { cause: err });
  }
}
