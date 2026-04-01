import { describe, expect, it } from "vitest";
import { planToolBatch } from "./tool-batch-planner.js";

describe("planToolBatch", () => {
  it("runs explicit parallel-safe batches in parallel", () => {
    expect(
      planToolBatch([
        { toolName: "read", safety: { parallelSafe: true } },
        { toolName: "grep", safety: { parallelSafe: true } },
      ]),
    ).toEqual({ mode: "parallel", reason: "all tools declare parallel safety" });
  });

  it("serializes overlapping path-scoped batches", () => {
    expect(
      planToolBatch([
        {
          toolName: "edit-a",
          safety: { pathScoped: true, scopePaths: ["src/app"] },
        },
        {
          toolName: "edit-b",
          safety: { pathScoped: true, scopePaths: ["src/app/utils"] },
        },
      ]),
    ).toEqual({ mode: "sequential", reason: "batch safety is not explicit" });
  });
});
