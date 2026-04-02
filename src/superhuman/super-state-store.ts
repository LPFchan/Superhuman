import { createAutomationStateStoreApi } from "./state/super-state-automation.js";
import { createContextStateStoreApi } from "./state/super-state-context.js";
import {
  closeStateDatabase,
  openStateDatabase,
  resolveSuperhumanStateDbPath,
  resolveSuperhumanStateDir,
} from "./state/super-state-db.js";
import { createRuntimeStateStoreApi } from "./state/super-state-runtime.js";
import { createSessionStateStoreApi } from "./state/super-state-sessions.js";
import type { StateStore } from "./super-runtime-seams.js";

export { resolveSuperhumanStateDbPath, resolveSuperhumanStateDir } from "./state/super-state-db.js";

// Composition root only. Phase-owned persistence behavior belongs in the
// state/* modules so later work does not drift back into a single store god-file.
export function createSuperhumanStateStore(params: { workspaceDir: string }): StateStore {
  const opened = openStateDatabase(resolveSuperhumanStateDbPath(params.workspaceDir));
  return {
    ...createSessionStateStoreApi({
      opened,
      workspaceDir: params.workspaceDir,
    }),
    ...createRuntimeStateStoreApi({ opened }),
    ...createContextStateStoreApi({
      opened,
      workspaceDir: params.workspaceDir,
    }),
    ...createAutomationStateStoreApi({
      opened,
      workspaceDir: params.workspaceDir,
    }),
    close(): void {
      closeStateDatabase(opened);
    },
  };
}
