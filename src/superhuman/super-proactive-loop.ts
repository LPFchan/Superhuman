import crypto from "node:crypto";
import { createTrustedStateAutomationPolicy } from "./super-automation-policy.js";
import { getActiveSuperNotificationCenter } from "./super-notification-center.js";
import type {
  AutomationLoopState,
  StateAutomationEventAppend,
  StateAutomationLoopStateRecord,
  StateStore,
} from "./super-runtime-seams.js";

type TimerHandle = ReturnType<typeof setTimeout>;

function createId(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

function buildWakeMessage(params: {
  sessionKey: string;
  idleForMs: number;
  triggeredAt: number;
}): string {
  return [
    "<super-proactive-wake>",
    `session_key: ${params.sessionKey}`,
    "trigger_source: idle",
    `idle_for_ms: ${params.idleForMs}`,
    `triggered_at_ms: ${params.triggeredAt}`,
    "mode: proactive",
    "instruction: evaluate whether there is useful work to do; if not, defer and wait for the next wake.",
    "</super-proactive-wake>",
  ].join("\n");
}

export class SuperProactiveLoop {
  private readonly stateStore: StateStore;
  private readonly sessionKey: string;
  private readonly enqueueSystemEvent: (params: {
    sessionKey: string;
    text: string;
    contextKey?: string;
  }) => void;
  private readonly requestHeartbeatNow: (params: { reason: string; sessionKey: string }) => void;
  private readonly nowMs: () => number;
  private readonly setTimeoutFn: typeof setTimeout;
  private readonly clearTimeoutFn: typeof clearTimeout;
  private readonly tickIntervalMs: number;
  private readonly idleThresholdMs: number;
  private readonly defaultSleepMs: number;
  private timer: TimerHandle | null = null;
  private started = false;
  private state: StateAutomationLoopStateRecord | null = null;

  constructor(params: {
    stateStore: StateStore;
    sessionKey: string;
    enqueueSystemEvent: (params: { sessionKey: string; text: string; contextKey?: string }) => void;
    requestHeartbeatNow: (params: { reason: string; sessionKey: string }) => void;
    nowMs?: () => number;
    setTimeoutFn?: typeof setTimeout;
    clearTimeoutFn?: typeof clearTimeout;
    tickIntervalMs?: number;
    idleThresholdMs?: number;
    defaultSleepMs?: number;
  }) {
    this.stateStore = params.stateStore;
    this.sessionKey = params.sessionKey;
    this.enqueueSystemEvent = params.enqueueSystemEvent;
    this.requestHeartbeatNow = params.requestHeartbeatNow;
    this.nowMs = params.nowMs ?? (() => Date.now());
    this.setTimeoutFn = params.setTimeoutFn ?? setTimeout;
    this.clearTimeoutFn = params.clearTimeoutFn ?? clearTimeout;
    this.tickIntervalMs = Math.max(1_000, params.tickIntervalMs ?? 60_000);
    this.idleThresholdMs = Math.max(1_000, params.idleThresholdMs ?? 5 * 60_000);
    this.defaultSleepMs = Math.max(this.tickIntervalMs, params.defaultSleepMs ?? 15 * 60_000);
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    const now = this.nowMs();
    const persisted = this.stateStore.getAutomationLoopState(this.sessionKey);
    this.state = persisted ?? {
      sessionKey: this.sessionKey,
      state: "active",
      lastActivityAt: now,
      lastTransitionAt: now,
      updatedAt: now,
    };
    if (!persisted) {
      this.persistLoopState(this.state, {
        triggerSource: "internal",
        reason: "phase5 proactive loop initialized",
        actionSummary: "Initialized proactive loop",
        resultStatus: "active",
      });
    }
    this.scheduleNext();
  }

  stop(): void {
    this.started = false;
    if (this.timer) {
      this.clearTimeoutFn(this.timer);
      this.timer = null;
    }
  }

  getState(): StateAutomationLoopStateRecord | null {
    return this.state;
  }

  recordActivity(params?: { sessionKey?: string; at?: number }): void {
    if (params?.sessionKey && params.sessionKey !== this.sessionKey) {
      return;
    }
    const current = this.ensureState();
    const now = params?.at ?? this.nowMs();
    this.state = {
      ...current,
      lastActivityAt: now,
      updatedAt: now,
    };
    this.stateStore.upsertAutomationLoopState(this.state);
    this.scheduleNext();
  }

  resume(reason = "operator resume"): void {
    this.transitionState({
      state: "active",
      reason,
      triggerSource: "operator",
      actionSummary: "Resumed proactive loop",
      resultStatus: "active",
    });
  }

  pause(reason = "operator pause"): void {
    this.transitionState({
      state: "paused",
      reason,
      triggerSource: "operator",
      actionSummary: "Paused proactive loop",
      resultStatus: "paused",
    });
  }

  disable(reason = "operator disable"): void {
    this.transitionState({
      state: "disabled",
      reason,
      triggerSource: "operator",
      actionSummary: "Disabled proactive loop",
      resultStatus: "disabled",
    });
  }

  sleepUntil(wakeAt: number, reason = "deferred"): void {
    this.transitionState({
      state: "sleeping",
      reason,
      wakeAt,
      triggerSource: "internal",
      actionSummary: "Deferred proactive loop",
      resultStatus: "sleeping",
    });
  }

  private ensureState(): StateAutomationLoopStateRecord {
    if (this.state) {
      return this.state;
    }
    const now = this.nowMs();
    this.state = {
      sessionKey: this.sessionKey,
      state: "active",
      lastActivityAt: now,
      lastTransitionAt: now,
      updatedAt: now,
    };
    return this.state;
  }

  private transitionState(params: {
    state: AutomationLoopState;
    reason?: string;
    wakeAt?: number;
    triggerSource: string;
    actionSummary: string;
    resultStatus: string;
  }): void {
    const current = this.ensureState();
    const now = this.nowMs();
    this.state = {
      ...current,
      state: params.state,
      reason: params.reason,
      wakeAt: params.state === "sleeping" ? params.wakeAt : undefined,
      lastTransitionAt: now,
      updatedAt: now,
      ...(params.state !== "sleeping" ? { wakeAt: undefined } : {}),
    };
    this.persistLoopState(this.state, {
      triggerSource: params.triggerSource,
      reason: params.reason,
      actionSummary: params.actionSummary,
      resultStatus: params.resultStatus,
    });
    this.scheduleNext();
  }

  private persistLoopState(
    state: StateAutomationLoopStateRecord,
    event: Pick<
      StateAutomationEventAppend,
      "triggerSource" | "reason" | "actionSummary" | "resultStatus"
    >,
  ): void {
    this.stateStore.upsertAutomationLoopState(state);
    this.stateStore.appendAutomationEvent({
      eventId: createId("automation"),
      sessionKey: this.sessionKey,
      automationKind: "proactive_loop",
      triggerSource: event.triggerSource,
      reason: event.reason,
      actionSummary: event.actionSummary,
      resultStatus: event.resultStatus,
      ...createTrustedStateAutomationPolicy({
        policySummary:
          "Proactive loop transitions are driven only by trusted local runtime state and do not themselves relax downstream verification or capability rules.",
        evidenceSources: ["runtime_state"],
      }),
      details: {
        state: state.state,
        wakeAt: state.wakeAt,
        lastActivityAt: state.lastActivityAt,
      },
      createdAt: state.updatedAt,
    });
  }

  private scheduleNext(delayMs?: number): void {
    if (!this.started) {
      return;
    }
    if (this.timer) {
      this.clearTimeoutFn(this.timer);
      this.timer = null;
    }
    const state = this.ensureState();
    const now = this.nowMs();
    const nextDelay =
      typeof delayMs === "number" ? Math.max(0, delayMs) : this.resolveNextDelayMs(state, now);
    this.timer = this.setTimeoutFn(() => {
      this.timer = null;
      this.onTimer();
    }, nextDelay);
  }

  private resolveNextDelayMs(state: StateAutomationLoopStateRecord, now: number): number {
    if (state.state === "disabled" || state.state === "paused") {
      return this.tickIntervalMs;
    }
    if (state.state === "sleeping") {
      if (typeof state.wakeAt === "number") {
        return Math.max(0, state.wakeAt - now);
      }
      return this.defaultSleepMs;
    }
    const lastActivityAt = state.lastActivityAt ?? now;
    const idleForMs = Math.max(0, now - lastActivityAt);
    if (idleForMs >= this.idleThresholdMs) {
      return 0;
    }
    return Math.min(this.tickIntervalMs, this.idleThresholdMs - idleForMs);
  }

  private onTimer(): void {
    if (!this.started) {
      return;
    }
    const state = this.ensureState();
    const now = this.nowMs();
    if (state.state === "disabled" || state.state === "paused") {
      this.scheduleNext();
      return;
    }
    if (state.state === "sleeping") {
      if (typeof state.wakeAt === "number" && state.wakeAt > now) {
        this.scheduleNext(state.wakeAt - now);
        return;
      }
      this.transitionState({
        state: "active",
        reason: "sleep interval elapsed",
        triggerSource: "internal",
        actionSummary: "Reactivated proactive loop after sleep",
        resultStatus: "active",
      });
      return;
    }
    const lastActivityAt = state.lastActivityAt ?? now;
    const idleForMs = Math.max(0, now - lastActivityAt);
    if (idleForMs < this.idleThresholdMs) {
      this.scheduleNext(this.idleThresholdMs - idleForMs);
      return;
    }
    const wakeMessage = buildWakeMessage({
      sessionKey: this.sessionKey,
      idleForMs,
      triggeredAt: now,
    });
    this.enqueueSystemEvent({
      sessionKey: this.sessionKey,
      text: wakeMessage,
      contextKey: `super-proactive:${now}`,
    });
    this.requestHeartbeatNow({
      reason: "super-proactive-idle",
      sessionKey: this.sessionKey,
    });
    this.stateStore.appendAutomationEvent({
      eventId: createId("automation"),
      sessionKey: this.sessionKey,
      automationKind: "proactive_loop",
      triggerSource: "idle",
      reason: "idle threshold reached",
      actionSummary: "Queued proactive wake for idle session",
      resultStatus: "queued",
      ...createTrustedStateAutomationPolicy({
        policySummary:
          "The idle wake was queued from trusted session activity state only; the downstream proactive run must still evaluate evidence quality before taking any substantive action.",
        evidenceSources: ["runtime_state"],
      }),
      details: {
        idleForMs,
      },
      createdAt: now,
    });
    getActiveSuperNotificationCenter()?.publish({
      kind: "proactive_action_taken",
      title: "Proactive wake queued",
      message: `Queued a proactive wake after ${idleForMs}ms of inactivity.`,
      sessionKey: this.sessionKey,
      audit: createTrustedStateAutomationPolicy({
        policySummary:
          "This notification reflects an idle-driven proactive wake sourced from trusted runtime state rather than verified task evidence.",
        evidenceSources: ["runtime_state"],
      }),
      metadata: {
        idleForMs,
      },
    });
    const nextState: StateAutomationLoopStateRecord = {
      ...state,
      state: "sleeping",
      reason: "post-dispatch backoff",
      wakeAt: now + this.defaultSleepMs,
      lastWakeAt: now,
      lastTransitionAt: now,
      updatedAt: now,
    };
    this.state = nextState;
    this.persistLoopState(nextState, {
      triggerSource: "internal",
      reason: "post-dispatch backoff",
      actionSummary: "Deferred proactive loop after wake dispatch",
      resultStatus: "sleeping",
    });
    this.scheduleNext();
  }
}
