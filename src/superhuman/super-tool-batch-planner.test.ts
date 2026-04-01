import { describe, expect, it } from "vitest";
import { planSuperToolBatch } from "./super-tool-batch-planner.js";

describe("planSuperToolBatch", () => {
  it("runs explicit parallel-safe batches in parallel", () => {
    expect(
      planSuperToolBatch([
        { toolName: "read", safety: { parallelSafe: true } },
        { toolName: "grep", safety: { parallelSafe: true } },
      ]),
    ).toEqual({ mode: "parallel", reason: "all tools declare parallel safety" });
  });

  it("serializes overlapping path-scoped batches", () => {
    expect(
      planSuperToolBatch([
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

  it("runs read-only capability classes in parallel", () => {
    expect(
      planSuperToolBatch([
        { toolName: "grep_search", safety: { capabilityClass: "text_search" } },
        { toolName: "read", safety: { capabilityClass: "partial_reading" } },
        { toolName: "list_dir", safety: { capabilityClass: "workspace_navigation" } },
      ]),
    ).toEqual({ mode: "parallel", reason: "read-only capability classes can run together" });
  });

  it("serializes symbol renames even when other batch items are read-only", () => {
    expect(
      planSuperToolBatch([
        { toolName: "vscode_renameSymbol", safety: { capabilityClass: "symbol_rename" } },
        { toolName: "vscode_listCodeUsages", safety: { capabilityClass: "symbol_reference" } },
      ]),
    ).toEqual({
      mode: "sequential",
      reason: "symbol rename batches require serialized execution",
    });
  });
});
