import fs from "node:fs";
import path from "node:path";
import type { MemoryCitationsMode } from "../../config/types.memory.js";
import { buildMemoryPromptSection } from "../../plugins/memory-state.js";
import type {
  FrozenMemoryReductionReason,
  StateFrozenMemoryBlockedLine,
} from "../runtime/seams.js";
import { createSuperhumanStateStore, resolveSuperhumanStateDir } from "../state/store.js";

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

function classifyBlockedLine(line: string): StateFrozenMemoryBlockedLine | null {
  if (line.includes(ENTRY_DELIMITER)) {
    return {
      line,
      reason: "delimiter_abuse",
      pattern: ENTRY_DELIMITER,
    };
  }
  if (INVISIBLE_CHARS.some((char) => line.includes(char))) {
    return {
      line,
      reason: "invisible_char",
    };
  }
  for (const pattern of SUSPICIOUS_MEMORY_PATTERNS) {
    if (!pattern.test(line)) {
      continue;
    }
    const reason: FrozenMemoryReductionReason =
      /curl|wget|cat|authorized_keys|\.ssh|\.env|credentials|token|secret|password/i.test(
        pattern.source,
      )
        ? "exfiltration_pattern"
        : "prompt_injection";
    return {
      line,
      reason,
      pattern: pattern.source,
    };
  }
  return null;
}

function reduceSnapshotLines(lines: string[]): {
  safeLines: string[];
  blockedLines: StateFrozenMemoryBlockedLine[];
} {
  const safeLines: string[] = [];
  const blockedLines: StateFrozenMemoryBlockedLine[] = [];
  for (const line of lines) {
    const blocked = classifyBlockedLine(line);
    if (blocked) {
      blockedLines.push(blocked);
      continue;
    }
    safeLines.push(line);
  }
  return { safeLines, blockedLines };
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

  const builtLines = buildMemoryPromptSection({
    availableTools: params.availableTools,
    citationsMode: params.citationsMode,
    sessionKey,
  });
  const { safeLines, blockedLines } = reduceSnapshotLines(builtLines);
  persistSnapshot(snapshotPath, {
    sessionKey,
    createdAt: Date.now(),
    lines: safeLines,
  });
  const store = createSuperhumanStateStore({ workspaceDir: params.workspaceDir });
  try {
    const now = Date.now();
    store.upsertFrozenMemorySnapshot({
      sessionKey,
      snapshotPath,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      safeLineCount: safeLines.length,
      removedLineCount: blockedLines.length,
      blocked: blockedLines.length > 0,
      blockedLines,
    });
    store.appendAction({
      actionId: `frozen-memory:${sessionKey}:${Buffer.from(snapshotPath).toString("base64url")}`,
      sessionKey,
      actionType: "super.memory.frozen_snapshot",
      actionKind: "automation",
      summary:
        blockedLines.length > 0
          ? "Reduced frozen-memory snapshot for safety"
          : "Captured frozen-memory snapshot",
      status: blockedLines.length > 0 ? "blocked" : "completed",
      createdAt: now,
      completedAt: now,
      details: {
        snapshotPath,
        safeLineCount: safeLines.length,
        removedLineCount: blockedLines.length,
        blockedReasons: blockedLines.map((line) => ({
          reason: line.reason,
          pattern: line.pattern,
        })),
      },
    });
  } finally {
    store.close();
  }

  return safeLines;
}
