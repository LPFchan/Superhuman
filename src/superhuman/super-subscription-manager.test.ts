import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const enqueueSystemEvent = vi.fn();
const requestHeartbeatNow = vi.fn();

vi.mock("../infra/system-events.js", () => ({
  enqueueSystemEvent: (...args: unknown[]) => enqueueSystemEvent(...args),
}));

vi.mock("../infra/heartbeat-wake.js", () => ({
  requestHeartbeatNow: (...args: unknown[]) => requestHeartbeatNow(...args),
}));

const { createSuperhumanStateStore } = await import("./super-state-store.js");
const { startSuperSubscriptionManager } = await import("./super-subscription-manager.js");

const cleanupPaths = new Set<string>();

afterEach(() => {
  for (const target of cleanupPaths) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  cleanupPaths.clear();
  enqueueSystemEvent.mockReset();
  requestHeartbeatNow.mockReset();
});

describe("SuperSubscriptionManager", () => {
  it("matches structured PR events to active subscriptions and queues them", () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "super-subscription-manager-"));
    cleanupPaths.add(workspaceDir);
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const manager = startSuperSubscriptionManager({ workspaceDir, stateStore });

    manager.upsertSubscription({
      subscriptionId: "sub-1",
      kind: "pr_review",
      sessionKey: "main",
      repo: "openclaw/openclaw",
      pullRequestNumber: 42,
      active: true,
    });

    const result = manager.ingestEvent({
      kind: "pr_review",
      title: "Reviewer requested changes",
      summary: "Please rerun the failing lane.",
      repo: "openclaw/openclaw",
      pullRequestNumber: 42,
      payload: { reviewer: "maintainer" },
    });

    expect(result).toEqual({ queued: true, sessionKey: "main" });
    expect(enqueueSystemEvent).toHaveBeenCalledOnce();
    expect(requestHeartbeatNow).toHaveBeenCalledWith({
      reason: "super-subscription:pr_review",
      sessionKey: "main",
    });
    expect(stateStore.listAutomationEvents({ sessionKey: "main" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          automationKind: "subscription_event",
          triggerSource: "pr_review",
          resultStatus: "queued",
        }),
      ]),
    );

    stateStore.close();
  });
});
