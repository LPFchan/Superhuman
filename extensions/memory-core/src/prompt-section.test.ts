import { describe, expect, it } from "vitest";
import { buildPromptSection } from "./prompt-section.js";

describe("buildPromptSection", () => {
  it("warns that provisional evidence must not be promoted to authoritative memory", () => {
    const lines = buildPromptSection({
      availableTools: new Set(["memory_search", "memory_get"]),
      citationsMode: "on",
    });

    expect(lines.join("\n")).toContain("partial reads");
    expect(lines.join("\n")).toContain("persisted previews");
    expect(lines.join("\n")).toContain("authoritative memory");
  });
});
