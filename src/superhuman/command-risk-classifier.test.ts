import { describe, expect, it } from "vitest";
import { classifyCommandRisk } from "./command-risk-classifier.js";

describe("classifyCommandRisk", () => {
  it("flags destructive shell patterns as high risk", () => {
    const result = classifyCommandRisk({
      toolName: "bash",
      args: { command: "git reset --hard HEAD" },
    });

    expect(result.risk).toBe("high");
    expect(result.destructivePossible).toBe(true);
    expect(result.reasons).toContain("destructive shell pattern");
  });

  it("flags interpreter inline eval and dangerous env overrides", () => {
    const result = classifyCommandRisk({
      toolName: "exec",
      args: {
        argv: ["python3", "-c", "print('hi')"],
        env: { PATH: "/tmp/bin" },
      },
    });

    expect(result.risk).toBe("high");
    expect(result.reasons.join(" ")).toContain("python3 -c detected");
    expect(result.reasons).toContain("dangerous env override blocked");
  });
});
