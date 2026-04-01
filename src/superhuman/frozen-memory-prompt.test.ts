import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { registerMemoryPromptSection, clearMemoryPluginState } from "../plugins/memory-state.js";
import { buildFrozenMemoryPromptSection } from "./frozen-memory-prompt.js";

const cleanupPaths = new Set<string>();

afterEach(() => {
  clearMemoryPluginState();
  for (const target of cleanupPaths) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  cleanupPaths.clear();
});

describe("buildFrozenMemoryPromptSection", () => {
  it("reuses the first snapshot for a session even if the builder changes", () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "superhuman-memory-prompt-"));
    cleanupPaths.add(workspaceDir);

    registerMemoryPromptSection(() => ["first snapshot"]);
    const first = buildFrozenMemoryPromptSection({
      workspaceDir,
      sessionKey: "main",
      availableTools: new Set(["memory_search"]),
    });

    registerMemoryPromptSection(() => ["second snapshot"]);
    const second = buildFrozenMemoryPromptSection({
      workspaceDir,
      sessionKey: "main",
      availableTools: new Set(["memory_search"]),
    });

    expect(first).toEqual(["first snapshot"]);
    expect(second).toEqual(["first snapshot"]);
  });
});
