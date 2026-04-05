# Phase 5 Boundary Documentation

## Purpose

This document records the approved dependency direction after the Phase 5 downstream subtree normalization.

The goal of this phase was not to eliminate every shared-core reference to Superhuman.
The goal was to make those references deliberate, named, reviewable bridge seams instead of accidental spread.

## Approved Dependency Direction

1. Shared core may expose hooks, registries, typed runtime seams, and bootstrap points.
2. Downstream Superhuman code may consume shared core freely.
3. Shared core must not import `src/superhuman/**` except through deliberate bridge files with a concrete product reason.
4. Plugin-facing contracts stay on inherited OpenClaw compatibility surfaces unless a versioned replacement and migration path ship together.
5. Tests may cross the boundary more directly than production code when they are validating compatibility or runtime integration, but those imports should stay localized to the test files that need them.

## Downstream Namespace After Cleanup

The downstream subtree now uses domain folders instead of file-level `super-*` names:

- `src/superhuman/automation/`
- `src/superhuman/context/`
- `src/superhuman/orchestration/`
- `src/superhuman/policy/`
- `src/superhuman/remote/`
- `src/superhuman/runtime/`
- `src/superhuman/state/`
- `src/superhuman/transcript/`

The TypeScript file count in `src/superhuman/` remained stable at 55 files across the Phase 5 cleanup window.
What changed was the naming model: the baseline commit `ddd2bb87c8` still had 46 `super-*` filenames inside `src/superhuman/`, while the current tree has 0.

## Approved Shared-Core Bridge Files

These production files currently import the downstream namespace and are the approved bridge surface after Phase 5:

- `src/acp/control-plane/manager.core.ts`
- `src/agents/cli-runner.ts`
- `src/agents/pi-embedded-runner/run.ts`
- `src/agents/pi-embedded-runner/run/attempt.ts`
- `src/agents/pi-embedded-runner/run/params.ts`
- `src/agents/pi-tool-definition-adapter.ts`
- `src/agents/pi-tools.abort.ts`
- `src/agents/pi-tools.before-tool-call.ts`
- `src/agents/pi-tools.ts`
- `src/agents/system-prompt.ts`
- `src/agents/tools/sessions-spawn-tool.ts`
- `src/config/paths.ts`
- `src/context-engine/super-context-engine.ts`
- `src/gateway/cli-session-history.merge.ts`
- `src/gateway/server-close.ts`
- `src/gateway/server-cron.ts`
- `src/gateway/server-methods/types.ts`
- `src/gateway/server-startup.ts`
- `src/gateway/server.impl.ts`
- `src/hooks/bundled/boot-md/handler.ts`
- `src/infra/dotenv.ts`

## Interpretation

The bridge-file count did not drop in raw production-file terms during this slice.
Compared with baseline commit `ddd2bb87c8`, the list grew from 19 to 21 files.

The two additions are:

- `src/config/paths.ts`
- `src/infra/dotenv.ts`

Those are runtime identity migration compatibility seams from Phase 4, not new product-shaping spread.
They remain acceptable in Phase 5 because they are part of the documented OpenClaw-to-Superhuman path and environment alias behavior.

## Boundary Rules Going Forward

- New shared-core imports of `src/superhuman/**` require explicit bridge justification.
- Shared-core feature work should prefer registries, typed seam accessors, or runtime bootstrap hooks over direct downstream imports.
- Config, state, and environment alias code may continue to reference downstream runtime behavior only where upgrade compatibility requires it.
- Plugin SDK, manifest, install, and discovery contracts are outside the scope of this boundary cleanup and remain compatibility-governed surfaces.

## Phase 5 Conclusion

Phase 5 succeeded at the structural part of the boundary cleanup:

- downstream code is concentrated in stable domain folders
- redundant `super-*` filenames inside `src/superhuman/` are gone
- shared-core knowledge of Superhuman is recorded as an explicit bridge list instead of being left implicit
- compatibility-driven bridge files are distinguishable from ordinary product logic
