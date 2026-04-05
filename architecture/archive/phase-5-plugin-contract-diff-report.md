# Phase 5 Plugin Contract Diff and Compatibility Report

## Summary

Phase 5 changed the organization of `src/superhuman/`.
It did not rename plugin-facing compatibility contracts.

The practical contract diff for this phase is therefore:

- no plugin SDK namespace rename
- no plugin manifest filename rename
- no plugin id rename
- no `@openclaw/*` package rename
- no install metadata key rename
- no discovery-rule rename

This is the correct outcome for the migration wave.

## Retained Compatibility Contracts

The following inherited OpenClaw surfaces remain canonical compatibility contracts after Phase 5:

- `openclaw/plugin-sdk/*`
- root `openclaw` host package expectations used by plugins
- `@openclaw/<id>` package names
- `openclaw.plugin.json`
- manifest `id` values
- `openclaw.install.npmSpec`
- `openclaw.channel.id`
- loader and registry semantics under `src/plugins/**`

Phase 5 deliberately left those surfaces untouched while reorganizing downstream Superhuman-owned runtime code.

## Evidence From The Current Tree

- `tsconfig.json` and `vitest.config.ts` still publish and resolve the `openclaw/plugin-sdk/*` alias family.
- The extension tree still imports `openclaw/plugin-sdk/*` extensively, which confirms the namespace remains an active public contract rather than dead compatibility baggage.
- Plugin tests and fixtures still use `openclaw.plugin.json` as the manifest artifact name.
- Plugin install and metadata tests still assert `@openclaw/*` package naming and `openclaw.install.npmSpec` behavior.

## Focused Compatibility Validation

The following targeted tests were run after the Phase 5 cleanup:

1. `src/channels/plugins/bundled.shape-guard.test.ts`
2. `src/channels/plugins/contracts/plugins-core.contract.test.ts`
3. `src/plugins/install.test.ts` with the retained `openclaw.plugin.json` install-key case
4. `src/plugins/loader.test.ts` with the synthetic plugin that still imports `openclaw/plugin-sdk/core`

Observed result:

- bundled channel manifest/discovery shape passed
- channel registry and catalog contract cases passed
- `openclaw.plugin.json` install identity case passed
- synthetic plugin loading via `openclaw/plugin-sdk/core` passed

## Contract Diff Assessment

| Contract                            | Phase 5 diff                        | Assessment |
| ----------------------------------- | ----------------------------------- | ---------- |
| `openclaw/plugin-sdk/*`             | unchanged                           | keep       |
| `@openclaw/*` package naming        | unchanged                           | keep       |
| `openclaw.plugin.json`              | unchanged                           | keep       |
| plugin manifest ids                 | unchanged                           | keep       |
| install metadata under `openclaw.*` | unchanged                           | keep       |
| loader/discovery semantics          | unchanged by downstream rename work | keep       |

## Conclusion

Phase 5 preserved the intended plugin compatibility posture.
Superhuman-owned runtime code moved to cleaner domain paths, while plugin authors and installed plugins keep seeing the inherited OpenClaw-facing contracts they already depend on.
