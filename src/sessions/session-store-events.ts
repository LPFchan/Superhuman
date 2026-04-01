import type { SessionEntry } from "../config/sessions/types.js";

export type SessionStoreMutationEvent =
  | {
      kind: "upsert";
      storePath: string;
      sessionKey: string;
      entry: SessionEntry;
      previousEntry?: SessionEntry;
    }
  | {
      kind: "delete";
      storePath: string;
      sessionKey: string;
      previousEntry: SessionEntry;
    };

type SessionStoreMutationListener = (event: SessionStoreMutationEvent) => void;

const SESSION_STORE_MUTATION_LISTENERS = new Set<SessionStoreMutationListener>();

export function onSessionStoreMutation(listener: SessionStoreMutationListener): () => void {
  SESSION_STORE_MUTATION_LISTENERS.add(listener);
  return () => {
    SESSION_STORE_MUTATION_LISTENERS.delete(listener);
  };
}

export function emitSessionStoreMutation(event: SessionStoreMutationEvent): void {
  for (const listener of SESSION_STORE_MUTATION_LISTENERS) {
    try {
      listener(event);
    } catch {
      // Best-effort only.
    }
  }
}
