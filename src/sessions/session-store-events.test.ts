import { describe, expect, it } from "vitest";
import { emitSessionStoreMutation, onSessionStoreMutation } from "./session-store-events.js";

describe("session-store-events", () => {
  it("notifies listeners for upsert and delete mutations", () => {
    const received: string[] = [];
    const unsubscribe = onSessionStoreMutation((event) => {
      received.push(`${event.kind}:${event.sessionKey}`);
    });

    emitSessionStoreMutation({
      kind: "upsert",
      storePath: "/tmp/sessions.json",
      sessionKey: "main",
      entry: {
        sessionId: "run-1",
        updatedAt: 1,
      },
    });
    emitSessionStoreMutation({
      kind: "delete",
      storePath: "/tmp/sessions.json",
      sessionKey: "main",
      previousEntry: {
        sessionId: "run-1",
        updatedAt: 2,
      },
    });
    unsubscribe();

    expect(received).toEqual(["upsert:main", "delete:main"]);
  });
});
