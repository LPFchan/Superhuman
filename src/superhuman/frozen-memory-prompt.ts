import fs from "node:fs";
import path from "node:path";
import type { MemoryCitationsMode } from "../config/types.memory.js";
import { buildMemoryPromptSection } from "../plugins/memory-state.js";
import { resolveSuperhumanStateDir } from "./state-store.js";

type FrozenMemoryPromptSnapshot = {
  sessionKey: string;
  createdAt: number;
  lines: string[];
};

const SNAPSHOT_DIR = "memory-prompt-snapshots";
const SUSPICIOUS_MEMORY_PATTERNS = [
  /ignore (all|any|the) (previous|prior|system) instructions/i,
  /reveal (the )?(system prompt|hidden prompt)/i,
  /tool call/i,
  /<tool>/i,
];

function sanitizeSnapshotLines(lines: string[]): string[] {
  return lines.filter((line) => !SUSPICIOUS_MEMORY_PATTERNS.some((pattern) => pattern.test(line)));
}

function resolveSnapshotPath(workspaceDir: string, sessionKey: string): string {
  const encoded = Buffer.from(sessionKey).toString("base64url");
  return path.join(resolveSuperhumanStateDir(workspaceDir), SNAPSHOT_DIR, `${encoded}.json`);
}

function loadSnapshot(snapshotPath: string): FrozenMemoryPromptSnapshot | null {
  try {
    const raw = fs.readFileSync(snapshotPath, "utf8");
    const parsed = JSON.parse(raw) as FrozenMemoryPromptSnapshot;
    if (!Array.isArray(parsed.lines)) {
      return null;
    }
    return {
      sessionKey: parsed.sessionKey,
      createdAt: parsed.createdAt,
      lines: parsed.lines.filter((line): line is string => typeof line === "string"),
    };
  } catch {
    return null;
  }
}

function persistSnapshot(snapshotPath: string, snapshot: FrozenMemoryPromptSnapshot): void {
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
}

export function buildFrozenMemoryPromptSection(params: {
  workspaceDir: string;
  sessionKey?: string;
  availableTools: Set<string>;
  citationsMode?: MemoryCitationsMode;
}): string[] {
  const sessionKey = params.sessionKey?.trim();
  if (!sessionKey) {
    return buildMemoryPromptSection({
      availableTools: params.availableTools,
      citationsMode: params.citationsMode,
      sessionKey: undefined,
    });
  }

  const snapshotPath = resolveSnapshotPath(params.workspaceDir, sessionKey);
  const existing = loadSnapshot(snapshotPath);
  if (existing?.sessionKey === sessionKey) {
    return existing.lines;
  }

  const lines = sanitizeSnapshotLines(
    buildMemoryPromptSection({
      availableTools: params.availableTools,
      citationsMode: params.citationsMode,
      sessionKey,
    }),
  );
  persistSnapshot(snapshotPath, {
    sessionKey,
    createdAt: Date.now(),
    lines,
  });
  return lines;
}
