# Plugin Compatibility Report

## Scope

Superhuman keeps the OpenClaw plugin ecosystem working as an explicit product feature during this migration wave.

## Contracts Preserved

- `openclaw/plugin-sdk/*`
- `@openclaw/<id>` package naming where the ecosystem already depends on it
- `openclaw.plugin.json`
- manifest ids already in circulation
- `openclaw.install.npmSpec`
- `openclaw.channel.id`

## Focused Validation

The following targeted compatibility lane passed after the downstream cleanup:

- `src/channels/plugins/bundled.shape-guard.test.ts`
- `src/channels/plugins/contracts/plugins-core.contract.test.ts`
- `src/plugins/install.test.ts` with the retained `openclaw.plugin.json` install-key case
- `src/plugins/loader.test.ts` with a synthetic plugin still importing `openclaw/plugin-sdk/core`

Observed result:

- 12 targeted tests passed
- retained manifest shape, catalog/discovery behavior, install identity, and SDK import compatibility all remained green

## Conclusion

The migration work reorganized Superhuman-owned runtime code without changing plugin-facing OpenClaw compatibility contracts.
That is the expected and desired result for this wave.
