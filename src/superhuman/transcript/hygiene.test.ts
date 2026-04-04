import { describe, expect, it } from "vitest";
import { sanitizeSuperReplayMessages, sanitizeSuperReplayText } from "./hygiene.js";

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

  it("drops transient warning keys from structured tool-result payloads", () => {
    const input = [
      {
        role: "tool",
        content: JSON.stringify({
          ok: true,
          _budget_warning: "[runtime-warning: budget pressure]",
        }),
        details: {
          status: "ok",
          _budget_warning: "[runtime-warning: budget pressure]",
          nested: {
            runtimeWarning: "[tool-warning: omit]",
            keep: "safe",
          },
          items: [
            "keep",
            "[transient-warning: omit]",
            { toolWarning: "[tool-warning: omit]", still: "here" },
          ],
        },
      },
    ];

    const result = sanitizeSuperReplayMessages(input) as Array<{
      content: string;
      details: {
        status: string;
        nested: { keep: string };
        items: Array<unknown>;
      };
    }>;

    expect(result[0]?.content).toBe('{"ok":true}');
    expect(result[0]?.details).toEqual({
      status: "ok",
      nested: { keep: "safe" },
      items: ["keep", { still: "here" }],
    });
  });
});
