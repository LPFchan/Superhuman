const TRANSIENT_RUNTIME_WARNING_PREFIXES = [
  "[runtime-warning:",
  "[transient-warning:",
  "[tool-warning:",
] as const;

const TRANSIENT_RUNTIME_WARNING_KEYS = new Set([
  "_budget_warning",
  "budget_warning",
  "budgetWarning",
  "_runtime_warning",
  "runtime_warning",
  "runtimeWarning",
  "_transient_warning",
  "transient_warning",
  "transientWarning",
  "_tool_warning",
  "tool_warning",
  "toolWarning",
]);

function toWellFormedText(text: string): string {
  if (typeof (text as string & { toWellFormed?: () => string }).toWellFormed === "function") {
    return (text as string & { toWellFormed: () => string }).toWellFormed();
  }

  let output = "";
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        output += text[index] + text[index + 1];
        index += 1;
        continue;
      }
      output += "\uFFFD";
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      output += "\uFFFD";
      continue;
    }
    output += text[index];
  }
  return output;
}

function stripTransientRuntimeWarningsFromText(text: string): string {
  const lines = text.split(/\r?\n/);
  const filtered = lines.filter((line) => {
    const normalized = line.trimStart().toLowerCase();
    return !TRANSIENT_RUNTIME_WARNING_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  });
  return filtered.join("\n");
}

function isTransientRuntimeWarningKey(key: string): boolean {
  return TRANSIENT_RUNTIME_WARNING_KEYS.has(key);
}

function shouldDropTransientRuntimeWarningValue(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.trimStart().toLowerCase();
  return TRANSIENT_RUNTIME_WARNING_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function sanitizeSuperReplayText(text: string): string {
  return stripTransientRuntimeWarningsFromText(toWellFormedText(text)).normalize("NFC");
}

function sanitizeMaybeJsonText(text: string): string {
  const sanitizedText = sanitizeSuperReplayText(text);
  const trimmed = sanitizedText.trim();
  if (
    !trimmed ||
    ((trimmed[0] !== "{" || trimmed.at(-1) !== "}") &&
      (trimmed[0] !== "[" || trimmed.at(-1) !== "]"))
  ) {
    return sanitizedText;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const sanitized = sanitizeUnknown(parsed);
    return JSON.stringify(sanitized);
  } catch {
    return sanitizedText;
  }
}

function sanitizeUnknown(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeMaybeJsonText(value);
  }
  if (!Array.isArray(value) && (!value || typeof value !== "object")) {
    return value;
  }
  if (Array.isArray(value)) {
    const nextItems: unknown[] = [];
    for (const item of value) {
      if (shouldDropTransientRuntimeWarningValue(item)) {
        continue;
      }
      nextItems.push(sanitizeUnknown(item));
    }
    return nextItems;
  }
  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (isTransientRuntimeWarningKey(key) || shouldDropTransientRuntimeWarningValue(entry)) {
      continue;
    }
    next[key] = sanitizeUnknown(entry);
  }
  return next;
}

export function sanitizeSuperReplayMessages<T>(messages: T[]): T[] {
  let changed = false;
  const next = messages.map((message) => {
    const sanitized = sanitizeUnknown(message) as T;
    if (sanitized !== message) {
      changed = true;
    }
    return sanitized;
  });
  return changed ? next : messages;
}
