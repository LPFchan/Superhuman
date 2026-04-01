type ToolBatchSafety = {
  neverParallel?: boolean;
  parallelSafe?: boolean;
  pathScoped?: boolean;
  interactiveOnly?: boolean;
  destructivePossible?: boolean;
  scopePaths?: string[];
};

export type ToolBatchItem = {
  toolName: string;
  safety: ToolBatchSafety;
};

export type ToolBatchPlan = {
  mode: "parallel" | "sequential";
  reason: string;
};

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
  if (items.some((item) => item.safety.neverParallel || item.safety.destructivePossible)) {
    return { mode: "sequential", reason: "contains non-parallel or destructive tool" };
  }
  if (items.every((item) => item.safety.parallelSafe)) {
    return { mode: "parallel", reason: "all tools declare parallel safety" };
  }
  if (items.every((item) => item.safety.pathScoped) && !haveOverlappingScopes(items)) {
    return { mode: "parallel", reason: "path-scoped tools do not overlap" };
  }
  return { mode: "sequential", reason: "batch safety is not explicit" };
}
