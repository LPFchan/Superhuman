import { describe, expect, it } from "vitest";
import {
  sanitizeSuperReplayMessages,
  sanitizeSuperReplayText,
} from "./super-transcript-hygiene.js";

describe("transcript hygiene", () => {
  it("drops transient runtime warnings and normalizes lone surrogates", () => {
    expect(sanitizeSuperReplayText("ok\n[runtime-warning: noisy]\n\uD800bad")).toBe(
      "ok\nReplacedbad".replace("Replaced", "\uFFFD"),
    );
  });

  it("sanitizes nested replay messages", () => {
    const input = [
      {
        role: "assistant",
        content: [{ type: "text", text: "hello\n[tool-warning: omit]" }],
      },
    ];
    const result = sanitizeSuperReplayMessages(input);
    expect((result[0] as { content: Array<{ text: string }> }).content[0]?.text).toBe("hello");
  });
});
