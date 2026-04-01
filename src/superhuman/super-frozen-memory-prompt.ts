import fs from "node:fs";
import path from "node:path";
import type { MemoryCitationsMode } from "../config/types.memory.js";
import { buildMemoryPromptSection } from "../plugins/memory-state.js";
import { resolveSuperhumanStateDir } from "./super-state-store.js";

type FrozenMemoryPromptSnapshot = {
  sessionKey: string;
  createdAt: number;
  lines: string[];
};

const SNAPSHOT_DIR = "memory-prompt-snapshots";
const ENTRY_DELIMITER = "\n§\n";
const SUSPICIOUS_MEMORY_PATTERNS = [
  /ignore\s+(previous|all|above|prior)\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /do\s+not\s+tell\s+the\s+user/i,
  /system\s+prompt\s+override/i,
  /disregard\s+(your|all|any)\s+(instructions|rules|guidelines)/i,
  /act\s+as\s+(if|though)\s+you\s+(have\s+no|don't\s+have)\s+(restrictions|limits|rules)/i,
  /reveal\s+(the\s+)?(system prompt|hidden prompt)/i,
  /curl\s+[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|API)/i,
  /wget\s+[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|API)/i,
  /cat\s+[^\n]*(\.env|credentials|\.netrc|\.pgpass|\.npmrc|\.pypirc)/i,
  /authorized_keys/i,
  /\$HOME\/\.ssh|~\/\.ssh/i,
  /\$HOME\/\.hermes\/\.env|~\/\.hermes\/\.env/i,
  /<tool>/i,
];
const INVISIBLE_CHARS = [
  "\u200b",
  "\u200c",
  "\u200d",
  "\u2060",
  "\ufeff",
  "\u202a",
  "\u202b",
  "\u202c",
  "\u202d",
  "\u202e",
];

function sanitizeSnapshotLines(lines: string[]): string[] {
  return lines.filter((line) => {
    if (line.includes(ENTRY_DELIMITER)) {
      return false;
    }
    if (INVISIBLE_CHARS.some((char) => line.includes(char))) {
      return false;
    }
    return !SUSPICIOUS_MEMORY_PATTERNS.some((pattern) => pattern.test(line));
  });
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

export function buildSuperFrozenMemoryPromptSection(params: {
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
