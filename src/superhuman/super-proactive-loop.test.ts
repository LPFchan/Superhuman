import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SuperProactiveLoop } from "./super-proactive-loop.js";
import { createSuperhumanStateStore } from "./super-state-store.js";

const cleanupPaths = new Set<string>();

afterEach(() => {
  for (const target of cleanupPaths) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  cleanupPaths.clear();
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers();
});

describe("SuperProactiveLoop", () => {
  it("dispatches an idle proactive wake and persists sleep state", async () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "super-proactive-loop-"));
    cleanupPaths.add(workspaceDir);
    const store = createSuperhumanStateStore({ workspaceDir });
    const enqueueSystemEvent = vi.fn();
    const requestHeartbeatNow = vi.fn();
    const loop = new SuperProactiveLoop({
      stateStore: store,
      sessionKey: "main",
      enqueueSystemEvent,
      requestHeartbeatNow,
      tickIntervalMs: 1_000,
      idleThresholdMs: 1_000,
      defaultSleepMs: 5_000,
    });

    loop.start();
    await vi.advanceTimersByTimeAsync(1_001);

    expect(enqueueSystemEvent).toHaveBeenCalledOnce();
    expect(requestHeartbeatNow).toHaveBeenCalledWith({
      reason: "super-proactive-idle",
      sessionKey: "main",
    });
    expect(store.getAutomationLoopState("main")).toEqual(
      expect.objectContaining({
        state: "sleeping",
        reason: "post-dispatch backoff",
        lastWakeAt: expect.any(Number),
      }),
    );
    expect(store.listAutomationEvents({ sessionKey: "main" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          automationKind: "proactive_loop",
          triggerSource: "idle",
          resultStatus: "queued",
          evidencePosture: "trusted_state",
          evidenceSources: ["runtime_state"],
          verificationPosture: "not_required",
          capabilityPosture: "not_required",
        }),
      ]),
    );

    loop.stop();
    store.close();
  });

  it("does not dispatch while paused", async () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "super-proactive-loop-pause-"));
    cleanupPaths.add(workspaceDir);
    const store = createSuperhumanStateStore({ workspaceDir });
    const enqueueSystemEvent = vi.fn();
    const requestHeartbeatNow = vi.fn();
    const loop = new SuperProactiveLoop({
      stateStore: store,
      sessionKey: "main",
      enqueueSystemEvent,
      requestHeartbeatNow,
      tickIntervalMs: 1_000,
      idleThresholdMs: 1_000,
      defaultSleepMs: 5_000,
    });

    loop.start();
    loop.pause("test pause");
    await vi.advanceTimersByTimeAsync(2_500);

    expect(enqueueSystemEvent).not.toHaveBeenCalled();
    expect(requestHeartbeatNow).not.toHaveBeenCalled();
    expect(store.getAutomationLoopState("main")).toEqual(
      expect.objectContaining({
        state: "paused",
        reason: "test pause",
      }),
    );

    loop.stop();
    store.close();
  });
});
