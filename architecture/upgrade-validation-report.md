# Upgrade Validation Report

## Scope

This report covers the migration behaviors that matter most when moving an OpenClaw-shaped install to Superhuman.

## Validated Areas

### Runtime and state identity migration

Focused validation passed for the normalized downstream runtime cluster:

- `src/superhuman/runtime/agent.test.ts`
- `src/superhuman/runtime/gateway.test.ts`
- `src/superhuman/runtime/seam-integration.test.ts`
- `src/superhuman/runtime/session-persistence-adapter.test.ts`
- `src/superhuman/state/store.test.ts`

Result: 5 files passed, 20 tests passed.

### Legacy config and state discovery

Focused upgrade compatibility validation passed for:

- `src/config/io.compat.test.ts`
- `src/infra/state-migrations.state-dir.test.ts`
- `src/daemon/inspect.test.ts`
- `src/cli/update-cli/restart-helper.test.ts`

Result: 4 files passed, 38 tests passed, 3 skipped.

### UI storage migration note

`ui/src/ui/storage.node.test.ts` remains outside the repo wrapper's default scoped include set, so it was not re-run through the wrapper during this final pass.
The runtime migration work earlier in the migration wave already updated the Control UI storage keys and fallback behavior, and the public migration docs now document the intended behavior.

## Upgrade Posture

The repository is partially aligned with the intended migration model:

- Superhuman names are canonical
- legacy OpenClaw-shaped config and state paths remain readable for upgrade compatibility
- service and restart helper naming are trending Superhuman-first, but not every user-facing surface is cleaned up yet
- many legacy surfaces are documented as compatibility behavior, though some docs and UI copy still present them too prominently
