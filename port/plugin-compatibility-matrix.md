# Plugin Compatibility Matrix

## Purpose

This matrix defines the representative compatibility set Superhuman must protect during the migration.

It is not a complete plugin catalog test plan.
It is the minimum review set that proves the migration is preserving the intended plugin ecosystem contract across bundled, external-style, and third-party-style cases.

## Matrix

| Cohort                                       | Representative example                                                       | Why it is in the matrix                                                                         | Expected Phase 1 posture                       |
| -------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Bundled channel plugin                       | `extensions/whatsapp`                                                        | exercises `@openclaw/*`, `openclaw.channel.*`, install metadata, docs link, and runtime loading | must keep loading unchanged                    |
| Bundled channel plugin with extra auth/setup | `extensions/discord`                                                         | exercises richer channel metadata, docs, config, and runtime behavior                           | must keep loading unchanged                    |
| Bundled provider plugin                      | `extensions/openai`                                                          | exercises provider plugin contracts without channel-specific assumptions                        | must keep loading unchanged                    |
| Bundled tool/plugin utility                  | `extensions/browser`                                                         | exercises non-channel extension loading and plugin SDK imports                                  | must keep loading unchanged                    |
| Bundled memory/runtime plugin                | `extensions/memory-core`                                                     | exercises nontrivial plugin runtime integration                                                 | must keep loading unchanged                    |
| First-party external-style install case      | local install of a packaged `@openclaw/<id>` plugin                          | exercises install and discovery behavior as a consumer would use it                             | must remain supported                          |
| Third-party OpenClaw ecosystem plugin shape  | plugin importing `openclaw/plugin-sdk/*` and shipping `openclaw.plugin.json` | proves the inherited public contract still works for external authors                           | must remain source-compatible                  |
| Legacy runtime/config user                   | plugin or workflow expecting `~/.openclaw` or `OPENCLAW_*`                   | proves later migration work cannot strand existing installs                                     | must be preserved via compatibility in Phase 4 |

## Required Behaviors Per Cohort

| Cohort                            | Install | Discovery | Load | Runtime | Docs/story                          |
| --------------------------------- | ------- | --------- | ---- | ------- | ----------------------------------- |
| Bundled channel plugins           | pass    | pass      | pass | pass    | explain as OpenClaw-compatible      |
| Bundled provider plugins          | pass    | pass      | pass | pass    | explain as OpenClaw-compatible      |
| Bundled utility plugins           | pass    | pass      | pass | pass    | explain as OpenClaw-compatible      |
| First-party external-style plugin | pass    | pass      | pass | pass    | install path remains documented     |
| Third-party-style plugin          | pass    | pass      | pass | pass    | compatibility surface is explicit   |
| Legacy runtime/config workflows   | n/a     | n/a       | pass | pass    | migration behavior documented later |

## Minimum Regression Checks for Later Phases

1. A bundled channel plugin still installs or loads through the existing manifest/package contract.
2. A plugin importing `openclaw/plugin-sdk/*` still resolves against the host package.
3. Plugin manifests named `openclaw.plugin.json` still validate and load.
4. `@openclaw/*` install identifiers remain discoverable where the ecosystem expects them.
5. Legacy config and state locations remain readable once runtime identity migration begins.

## Review Notes

- Phase 1 is documentation and governance only; it does not run the compatibility suite.
- This matrix exists now so later phases cannot claim compatibility accidentally or vaguely.
- If any later phase proposes changing a plugin-facing contract not represented here, the matrix must expand before the change lands.

## Open Questions for Later Validation

- Which real third-party OpenClaw plugins should be used as pinned canaries?
- Which install path should be treated as the primary external-style plugin workflow after the Superhuman package name is chosen?
- Which contract tests can be reused directly, and which need a Superhuman-specific compatibility lane?
