export type ToolCapabilityClass =
  | "text_search"
  | "symbol_reference"
  | "symbol_rename"
  | "workspace_navigation"
  | "partial_reading"
  | "persisted_preview";

type ToolBatchSafety = {
  neverParallel?: boolean;
  parallelSafe?: boolean;
  pathScoped?: boolean;
  interactiveOnly?: boolean;
  destructivePossible?: boolean;
  scopePaths?: string[];
  capabilityClass?: ToolCapabilityClass;
};

export type ToolBatchItem = {
  toolName: string;
  safety: ToolBatchSafety;
};

export type ToolBatchPlan = {
  mode: "parallel" | "sequential";
  reason: string;
};

const READ_ONLY_CAPABILITY_CLASSES = new Set<ToolCapabilityClass>([
  "text_search",
  "symbol_reference",
  "workspace_navigation",
  "partial_reading",
  "persisted_preview",
]);

function normalizeScopePath(input: string): string {
  return input.trim().replace(/\\+/g, "/").replace(/\/+/g, "/");
}

function haveOverlappingScopes(items: ToolBatchItem[]): boolean {
  const scopes = items.flatMap((item) =>
    (item.safety.scopePaths ?? []).map((entry) => normalizeScopePath(entry)),
  );
  for (let index = 0; index < scopes.length; index += 1) {
    const left = scopes[index];
    if (!left) {
      continue;
    }
    for (let otherIndex = index + 1; otherIndex < scopes.length; otherIndex += 1) {
      const right = scopes[otherIndex];
      if (!right) {
        continue;
      }
      if (left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)) {
        return true;
      }
    }
  }
  return false;
}

export function planToolBatch(items: ToolBatchItem[]): ToolBatchPlan {
  if (items.length <= 1) {
    return { mode: "sequential", reason: "single tool call" };
  }
  if (
    items.some(
      (item) =>
        item.safety.neverParallel || item.safety.destructivePossible || item.safety.interactiveOnly,
    )
  ) {
    return { mode: "sequential", reason: "contains non-parallel or destructive tool" };
  }
  if (items.some((item) => item.safety.capabilityClass === "symbol_rename")) {
    return { mode: "sequential", reason: "symbol rename batches require serialized execution" };
  }
  if (items.every((item) => item.safety.parallelSafe)) {
    return { mode: "parallel", reason: "all tools declare parallel safety" };
  }
  if (
    items.every(
      (item) =>
        item.safety.capabilityClass !== undefined &&
        READ_ONLY_CAPABILITY_CLASSES.has(item.safety.capabilityClass),
    )
  ) {
    return { mode: "parallel", reason: "read-only capability classes can run together" };
  }
  if (items.every((item) => item.safety.pathScoped) && !haveOverlappingScopes(items)) {
    return { mode: "parallel", reason: "path-scoped tools do not overlap" };
  }
  return { mode: "sequential", reason: "batch safety is not explicit" };
}
