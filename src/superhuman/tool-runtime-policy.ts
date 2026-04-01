import type { AnyAgentTool } from "../agents/tools/common.js";
import type { SuperhumanAgentRuntimeTurn } from "./agent-runtime.js";
import { planToolBatch, type ToolBatchItem } from "./tool-batch-planner.js";

export type RuntimeToolSafetyMeta = {
  neverParallel?: boolean;
  parallelSafe?: boolean;
  pathScoped?: boolean;
  interactiveOnly?: boolean;
  destructivePossible?: boolean;
  scopeKey?: string;
};

export type RuntimeToolExecutionContext = {
  runtimeTurn: SuperhumanAgentRuntimeTurn;
};

export type ScheduledToolExecution<T> = {
  toolName: string;
  params: unknown;
  safety?: RuntimeToolSafetyMeta;
  run: () => Promise<T>;
};

type PendingToolExecutionAny = {
  toolName: string;
  params: unknown;
  safety?: RuntimeToolSafetyMeta;
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

const runtimeToolSafetyMeta = new WeakMap<AnyAgentTool, RuntimeToolSafetyMeta>();
const runtimeToolExecutionContext = new WeakMap<AnyAgentTool, RuntimeToolExecutionContext>();

const COMMON_PATH_PARAM_KEYS = [
  "path",
  "filePath",
  "dirPath",
  "workspaceFolder",
  "oldPath",
  "newPath",
  "scopePath",
  "scopePaths",
  "filePaths",
  "paths",
] as const;

function normalizeScopePath(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.includes("\n") || trimmed.includes("\r")) {
    return undefined;
  }
  return trimmed.replace(/\\+/g, "/").replace(/\/+/g, "/");
}

function collectScopePaths(value: unknown, into: Set<string>): void {
  if (typeof value === "string") {
    const normalized = normalizeScopePath(value);
    if (normalized) {
      into.add(normalized);
    }
    return;
  }
  if (!Array.isArray(value)) {
    return;
  }
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }
    const normalized = normalizeScopePath(entry);
    if (normalized) {
      into.add(normalized);
    }
  }
}

function resolveScopePathsFromParams(params: unknown): string[] {
  if (!params || typeof params !== "object") {
    return [];
  }
  const record = params as Record<string, unknown>;
  const paths = new Set<string>();
  for (const key of COMMON_PATH_PARAM_KEYS) {
    collectScopePaths(record[key], paths);
  }
  return [...paths];
}

function toToolBatchItem(params: {
  toolName: string;
  safety?: RuntimeToolSafetyMeta;
  args: unknown;
}): ToolBatchItem {
  const scopePaths = params.safety?.pathScoped ? resolveScopePathsFromParams(params.args) : [];
  return {
    toolName: params.toolName,
    safety: {
      neverParallel: params.safety?.neverParallel,
      parallelSafe: params.safety?.parallelSafe,
      pathScoped: params.safety?.pathScoped,
      interactiveOnly: params.safety?.interactiveOnly,
      destructivePossible: params.safety?.destructivePossible,
      scopePaths,
    },
  };
}

export function setRuntimeToolSafetyMeta(tool: AnyAgentTool, meta: RuntimeToolSafetyMeta): void {
  runtimeToolSafetyMeta.set(tool, meta);
}

export function getRuntimeToolSafetyMeta(tool: AnyAgentTool): RuntimeToolSafetyMeta | undefined {
  return runtimeToolSafetyMeta.get(tool);
}

export function copyRuntimeToolSafetyMeta(source: AnyAgentTool, target: AnyAgentTool): void {
  const meta = runtimeToolSafetyMeta.get(source);
  if (meta) {
    runtimeToolSafetyMeta.set(target, meta);
  }
}

export function setRuntimeToolExecutionContext(
  tool: AnyAgentTool,
  context: RuntimeToolExecutionContext,
): void {
  runtimeToolExecutionContext.set(tool, context);
}

export function getRuntimeToolExecutionContext(
  tool: AnyAgentTool,
): RuntimeToolExecutionContext | undefined {
  return runtimeToolExecutionContext.get(tool);
}

export function copyRuntimeToolExecutionContext(source: AnyAgentTool, target: AnyAgentTool): void {
  const context = runtimeToolExecutionContext.get(source);
  if (context) {
    runtimeToolExecutionContext.set(target, context);
  }
}

export function applyDefaultRuntimeToolSafety(params: {
  tools: AnyAgentTool[];
  scopeKey?: string;
}): void {
  for (const tool of params.tools) {
    const toolName = tool.name.trim().toLowerCase();
    if (toolName === "bash" || toolName === "exec") {
      setRuntimeToolSafetyMeta(tool, {
        neverParallel: true,
        destructivePossible: true,
        scopeKey: params.scopeKey,
      });
      continue;
    }
    if (toolName === "process") {
      setRuntimeToolSafetyMeta(tool, {
        neverParallel: true,
        scopeKey: params.scopeKey,
      });
      continue;
    }
    if (
      toolName === "write" ||
      toolName === "edit" ||
      toolName === "apply_patch" ||
      toolName === "read"
    ) {
      setRuntimeToolSafetyMeta(tool, {
        pathScoped: true,
        parallelSafe: toolName === "read",
        scopeKey: params.scopeKey,
      });
    }
  }
}

export function applyRuntimeToolExecutionContext(params: {
  tools: AnyAgentTool[];
  context: RuntimeToolExecutionContext;
}): void {
  for (const tool of params.tools) {
    setRuntimeToolExecutionContext(tool, params.context);
  }
}

export function createToolExecutionScheduler() {
  const queue: PendingToolExecutionAny[] = [];
  let draining = false;

  const drain = () => {
    if (draining) {
      return;
    }
    draining = true;
    queueMicrotask(async () => {
      try {
        while (queue.length > 0) {
          const batch = [queue.shift() as PendingToolExecutionAny];
          let batchItems = batch.map((entry) =>
            toToolBatchItem({
              toolName: entry.toolName,
              safety: entry.safety,
              args: entry.params,
            }),
          );

          while (queue.length > 0) {
            const next = queue[0];
            const nextItem = toToolBatchItem({
              toolName: next.toolName,
              safety: next.safety,
              args: next.params,
            });
            const plan = planToolBatch([...batchItems, nextItem]);
            if (plan.mode !== "parallel") {
              break;
            }
            batch.push(queue.shift() as PendingToolExecutionAny);

            batchItems = [...batchItems, nextItem];
          }

          if (batch.length === 1) {
            const only = batch[0];
            try {
              only.resolve(await only.run());
            } catch (error) {
              only.reject(error);
            }
            continue;
          }

          const results = await Promise.allSettled(batch.map((entry) => entry.run()));
          for (const [index, result] of results.entries()) {
            const entry = batch[index];
            if (result.status === "fulfilled") {
              entry.resolve(result.value);
            } else {
              entry.reject(result.reason);
            }
          }
        }
      } finally {
        draining = false;
        if (queue.length > 0) {
          drain();
        }
      }
    });
  };

  return {
    schedule<T>(execution: ScheduledToolExecution<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push({
          toolName: execution.toolName,
          params: execution.params,
          safety: execution.safety,
          run: async () => await execution.run(),
          resolve: (value) => resolve(value as T),
          reject,
        });
        drain();
      });
    },
  };
}
