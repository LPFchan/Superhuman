import type { OpenClawConfig } from "../../config/config.js";
import { SuperContextEngineCompactionManager } from "../super-compaction-manager.js";
import type { CompactionManager, StateStore } from "./seams.js";

export type SuperContextServices = {
  compactionManager: CompactionManager;
  stop: () => void;
};

export function startSuperContextServices(params: {
  cfg: OpenClawConfig;
  workspaceDir: string;
  stateStore: StateStore;
}): SuperContextServices {
  return {
    compactionManager: new SuperContextEngineCompactionManager({
      cfg: params.cfg,
      workspaceDir: params.workspaceDir,
      stateStore: params.stateStore,
    }),
    stop: () => {},
  };
}
