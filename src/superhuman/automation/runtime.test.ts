import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSuperhumanStateStore } from "../state/store.js";
import { startSuperAutomationRuntime } from "./runtime.js";

const cleanupPaths = new Set<string>();

afterEach(() => {
  for (const target of cleanupPaths) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  cleanupPaths.clear();
});

describe("startSuperAutomationRuntime", () => {
  it("records boot and cron automation events", () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "super-automation-runtime-"));
    cleanupPaths.add(workspaceDir);
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const runtime = startSuperAutomationRuntime({
      stateStore,
      sessionRegistry: {
        resolveMainSession: (agentId?: string) => (agentId ? `agent:${agentId}:main` : "main"),
        resolveSession: () => ({ agentId: "main", mainSessionKey: "main" }),
        isMainSession: (sessionKey: string) => sessionKey === "main",
      },
    });

    runtime.recordBootRun({ result: { status: "ran" } });
    runtime.recordCronEvent({
      jobId: "job-1",
      action: "finished",
      status: "ok",
      summary: "cron completed",
      sessionKey: "main",
    });

    expect(stateStore.listAutomationEvents({ limit: 10 })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          automationKind: "boot",
          triggerSource: "boot",
          resultStatus: "ran",
          evidencePosture: "trusted_state",
          evidenceSources: ["runtime_state"],
        }),
        expect.objectContaining({
          automationKind: "scheduled_job",
          triggerSource: "scheduled_job",
          resultStatus: "ok",
          evidencePosture: "trusted_state",
          evidenceSources: ["scheduler_state"],
          verificationPosture: "unknown",
        }),
      ]),
    );

    runtime.stop();
    stateStore.close();
  });
});
