import { describe, expect, it } from "vitest";
import { classifySuperCommandRisk } from "./super-command-risk-classifier.js";

describe("classifySuperCommandRisk", () => {
  it("flags destructive shell patterns as high risk", () => {
    const result = classifySuperCommandRisk({
      toolName: "bash",
      args: { command: "git reset --hard HEAD" },
    });

    expect(result.risk).toBe("high");
    expect(result.destructivePossible).toBe(true);
    expect(result.reasons).toContain("destructive shell pattern");
  });

  it("flags interpreter inline eval and dangerous env overrides", () => {
    const result = classifySuperCommandRisk({
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

  it("covers process-style tools and overwrite redirects", () => {
    const result = classifySuperCommandRisk({
      toolName: "process",
      args: {
        argv: ["sh", "-lc", "cat secret > ~/.ssh/config"],
      },
    });

    expect(result.risk).toBe("high");
    expect(result.destructivePossible).toBe(true);
    expect(result.reasons).toContain("destructive shell pattern");
    expect(result.reasons).toContain("host secret path access");
  });
});
