import { stripInboundMetadata } from "../auto-reply/reply/strip-inbound-meta.js";
import { extractSuperReplayAnnotations } from "../superhuman/transcript/replay-annotations.js";

const DEDUPE_TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

type HistoryMessageMeta = Record<string, unknown>;

type HistoryProvenance = {
  source:
    | "original"
    | "imported_history"
    | "collapsed"
    | "partial_read"
    | "persisted_preview"
    | "mixed";
  importedFrom?: string;
};

function extractComparableText(message: unknown): string | undefined {
  if (!message || typeof message !== "object") {
    return undefined;
  }
  const record = message as { role?: unknown; text?: unknown; content?: unknown };
  const role = typeof record.role === "string" ? record.role : undefined;
  const parts: string[] = [];
  if (typeof record.text === "string") {
    parts.push(record.text);
  }
  if (typeof record.content === "string") {
    parts.push(record.content);
  } else if (Array.isArray(record.content)) {
    for (const block of record.content) {
      if (block && typeof block === "object" && "text" in block && typeof block.text === "string") {
        parts.push(block.text);
      }
    }
  }
  if (parts.length === 0) {
    return undefined;
  }
  const joined = parts.join("\n").trim();
  if (!joined) {
    return undefined;
  }
  const visible = role === "user" ? stripInboundMetadata(joined) : joined;
  const normalized = visible.replace(/\s+/g, " ").trim();
  return normalized || undefined;
}

function resolveFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function resolveComparableTimestamp(message: unknown): number | undefined {
  if (!message || typeof message !== "object") {
    return undefined;
  }
  return resolveFiniteNumber((message as { timestamp?: unknown }).timestamp);
}

function resolveComparableRole(message: unknown): string | undefined {
  if (!message || typeof message !== "object") {
    return undefined;
  }
  const role = (message as { role?: unknown }).role;
  return typeof role === "string" ? role : undefined;
}

function resolveImportedExternalId(message: unknown): string | undefined {
  if (!message || typeof message !== "object") {
    return undefined;
  }
  const meta =
    "__openclaw" in message &&
    (message as { __openclaw?: unknown }).__openclaw &&
    typeof (message as { __openclaw?: unknown }).__openclaw === "object"
      ? ((message as { __openclaw?: Record<string, unknown> }).__openclaw ?? {})
      : undefined;
  const externalId = meta?.externalId;
  return typeof externalId === "string" && externalId.trim() ? externalId : undefined;
}

function resolveOpenClawMeta(message: unknown): HistoryMessageMeta | undefined {
  if (!message || typeof message !== "object") {
    return undefined;
  }
  const meta = (message as { __openclaw?: unknown }).__openclaw;
  return meta && typeof meta === "object" && !Array.isArray(meta)
    ? (meta as HistoryMessageMeta)
    : undefined;
}

function resolveHistoryProvenance(message: unknown): HistoryProvenance {
  const meta = resolveOpenClawMeta(message);
  const importedFrom = typeof meta?.importedFrom === "string" ? meta.importedFrom : undefined;
  const partialRead = meta?.truncated === true || meta?.partialRead === true;
  const preview = meta?.persistedPreview === true || meta?.persisted_preview === true;
  const collapsed = meta?.kind === "compaction" || meta?.collapsed === true;

  const sources = [
    importedFrom ? "imported_history" : undefined,
    collapsed ? "collapsed" : undefined,
    partialRead ? "partial_read" : undefined,
    preview ? "persisted_preview" : undefined,
  ].filter((value): value is NonNullable<HistoryProvenance["source"]> => Boolean(value));

  if (sources.length === 0) {
    return { source: "original" };
  }
  if (sources.length === 1) {
    return { source: sources[0], importedFrom };
  }
  return { source: "mixed", importedFrom };
}

function withHistoryProvenance(message: unknown): unknown {
  if (!message || typeof message !== "object") {
    return message;
  }
  const record = message as Record<string, unknown>;
  const meta = resolveOpenClawMeta(message) ?? {};
  return {
    ...record,
    __openclaw: {
      ...meta,
      historyProvenance: resolveHistoryProvenance(message),
      replayAnnotations: extractSuperReplayAnnotations(meta),
    },
  };
}

function isEquivalentImportedMessage(existing: unknown, imported: unknown): boolean {
  const importedExternalId = resolveImportedExternalId(imported);
  if (importedExternalId && resolveImportedExternalId(existing) === importedExternalId) {
    return true;
  }

  const existingRole = resolveComparableRole(existing);
  const importedRole = resolveComparableRole(imported);
  if (!existingRole || existingRole !== importedRole) {
    return false;
  }

  const existingText = extractComparableText(existing);
  const importedText = extractComparableText(imported);
  if (!existingText || !importedText || existingText !== importedText) {
    return false;
  }

  const existingTimestamp = resolveComparableTimestamp(existing);
  const importedTimestamp = resolveComparableTimestamp(imported);
  if (existingTimestamp === undefined || importedTimestamp === undefined) {
    return true;
  }

  return Math.abs(existingTimestamp - importedTimestamp) <= DEDUPE_TIMESTAMP_WINDOW_MS;
}

function compareHistoryMessages(
  a: { message: unknown; order: number },
  b: { message: unknown; order: number },
): number {
  const aTimestamp = resolveComparableTimestamp(a.message);
  const bTimestamp = resolveComparableTimestamp(b.message);
  if (aTimestamp !== undefined && bTimestamp !== undefined && aTimestamp !== bTimestamp) {
    return aTimestamp - bTimestamp;
  }
  if (aTimestamp !== undefined && bTimestamp === undefined) {
    return -1;
  }
  if (aTimestamp === undefined && bTimestamp !== undefined) {
    return 1;
  }
  return a.order - b.order;
}

export function mergeImportedChatHistoryMessages(params: {
  localMessages: unknown[];
  importedMessages: unknown[];
}): unknown[] {
  if (params.importedMessages.length === 0) {
    return params.localMessages.map((message) => withHistoryProvenance(message));
  }
  const merged = params.localMessages.map((message, index) => ({
    message: withHistoryProvenance(message),
    order: index,
  }));
  let nextOrder = merged.length;
  for (const imported of params.importedMessages) {
    if (merged.some((existing) => isEquivalentImportedMessage(existing.message, imported))) {
      continue;
    }
    merged.push({ message: withHistoryProvenance(imported), order: nextOrder });
    nextOrder += 1;
  }
  merged.sort(compareHistoryMessages);
  return merged.map((entry) => entry.message);
}
