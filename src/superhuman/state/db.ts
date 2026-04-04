import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { requireNodeSqlite } from "../../infra/node-sqlite.js";
import { bootstrapStateDatabase } from "./schema.js";
import { normalizePathForComparison, type StateStoreStatements } from "./shared.js";
import { createStateStoreStatements } from "./statements.js";

const WAL_CHECKPOINT_INTERVAL = 32;
const WRITE_RETRY_DELAYS_MS = [10, 25, 50, 100] as const;
const STATE_DIR_MODE = 0o700;

export * from "./shared.js";

export type StateDatabase = {
  db: DatabaseSync;
  path: string;
  statements: StateStoreStatements;
  write<T>(operation: () => T): T;
};

const openDatabases = new Map<string, StateDatabase>();

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isRetryableSqliteWriteError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = "code" in error ? String(error.code) : "";
  if (code === "SQLITE_BUSY" || code === "SQLITE_LOCKED") {
    return true;
  }
  const message = error.message.toLowerCase();
  return message.includes("database is locked") || message.includes("database is busy");
}

function createWriteRunner(db: DatabaseSync): StateDatabase["write"] {
  let transactionDepth = 0;
  let committedWrites = 0;

  return function write<T>(operation: () => T): T {
    if (transactionDepth > 0) {
      transactionDepth += 1;
      try {
        return operation();
      } finally {
        transactionDepth -= 1;
      }
    }

    let attempt = 0;
    while (true) {
      try {
        db.exec("BEGIN IMMEDIATE;");
        transactionDepth = 1;
        try {
          const result = operation();
          transactionDepth = 0;
          db.exec("COMMIT;");
          committedWrites += 1;
          if (committedWrites % WAL_CHECKPOINT_INTERVAL === 0) {
            db.exec("PRAGMA wal_checkpoint(PASSIVE);");
          }
          return result;
        } catch (error) {
          transactionDepth = 0;
          try {
            db.exec("ROLLBACK;");
          } catch {
            // Ignore rollback failures after the original write error.
          }
          throw error;
        }
      } catch (error) {
        if (attempt >= WRITE_RETRY_DELAYS_MS.length || !isRetryableSqliteWriteError(error)) {
          throw error;
        }
        sleep(WRITE_RETRY_DELAYS_MS[attempt]);
        attempt += 1;
      }
    }
  };
}

export function resolveSuperhumanStateDir(workspaceDir: string): string {
  return path.join(path.resolve(workspaceDir), ".superhuman");
}

export function resolveSuperhumanStateDbPath(workspaceDir: string): string {
  return path.join(resolveSuperhumanStateDir(workspaceDir), "state.db");
}

export function openStateDatabase(dbPath: string): StateDatabase {
  const normalizedPath = normalizePathForComparison(dbPath);
  const cached = openDatabases.get(normalizedPath);
  if (cached) {
    return cached;
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true, mode: STATE_DIR_MODE });
  const { DatabaseSync } = requireNodeSqlite();
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  bootstrapStateDatabase({ db, dbPath });
  const opened: StateDatabase = {
    db,
    path: normalizedPath,
    statements: createStateStoreStatements(db),
    write: createWriteRunner(db),
  };
  openDatabases.set(normalizedPath, opened);
  return opened;
}

export function closeStateDatabase(opened: StateDatabase): void {
  const cached = openDatabases.get(opened.path);
  if (!cached) {
    return;
  }
  try {
    cached.db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch {
    // Best-effort cleanup only.
  }
  cached.db.close();
  openDatabases.delete(opened.path);
}
