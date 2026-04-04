import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const enqueueSystemEvent = vi.fn();
const requestHeartbeatNow = vi.fn();

vi.mock("../../infra/system-events.js", () => ({
  enqueueSystemEvent: (...args: unknown[]) => enqueueSystemEvent(...args),
}));

vi.mock("../../infra/heartbeat-wake.js", () => ({
  requestHeartbeatNow: (...args: unknown[]) => requestHeartbeatNow(...args),
}));

const { createSuperhumanStateStore } = await import("../state/store.js");
const { startSuperNotificationCenter } = await import("./notification-center.js");

const cleanupPaths = new Set<string>();

afterEach(() => {
  for (const target of cleanupPaths) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  cleanupPaths.clear();
  enqueueSystemEvent.mockReset();
  requestHeartbeatNow.mockReset();
});

describe("SuperNotificationCenter", () => {
  it("stores typed notifications and mirrors them into automation events", () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "super-notification-center-"));
    cleanupPaths.add(workspaceDir);
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const center = startSuperNotificationCenter({ workspaceDir, stateStore });

    center.publish({
      kind: "scheduled_run_fired",
      title: "Nightly report",
      message: "Queued nightly report run.",
      sessionKey: "main",
      audit: {
        policySummary: "Notification mirrors a scheduler-driven automation event.",
        evidencePosture: "trusted_state",
        evidenceSources: ["scheduler_state"],
        verificationPosture: "unknown",
        capabilityPosture: "not_required",
      },
      metadata: { jobId: "job-1" },
    });

    expect(center.listNotifications({ sessionKey: "main" })).toEqual([
      expect.objectContaining({
        kind: "scheduled_run_fired",
        title: "Nightly report",
        deliveryStatus: "session_queued",
      }),
    ]);
    expect(enqueueSystemEvent).toHaveBeenCalledOnce();
    expect(requestHeartbeatNow).toHaveBeenCalledWith({
      reason: "super-notification:scheduled_run_fired",
      sessionKey: "main",
    });
    expect(stateStore.listAutomationEvents({ sessionKey: "main" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          automationKind: "notification",
          triggerSource: "scheduled_run_fired",
          evidencePosture: "trusted_state",
          evidenceSources: ["scheduler_state"],
          verificationPosture: "unknown",
        }),
      ]),
    );

    center.stop();
    stateStore.close();
  });

  it("registers operator delivery artifacts", () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "super-notification-artifact-"));
    cleanupPaths.add(workspaceDir);
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const center = startSuperNotificationCenter({ workspaceDir, stateStore });

    const notification = center.publishArtifact({
      sessionKey: "main",
      title: "Artifact ready",
      message: "Delivered the generated audit bundle.",
      label: "audit.json",
      storagePath: "/tmp/audit.json",
      mimeType: "application/json",
    });

    expect(notification.artifactIds).toHaveLength(1);
    expect(stateStore.getArtifacts({ sessionKey: "main" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifactId: notification.artifactIds[0],
          kind: "operator-delivery-file",
          storagePath: "/tmp/audit.json",
        }),
      ]),
    );

    center.stop();
    stateStore.close();
  });
});
