# Plugin Contract Map

## Purpose

This map isolates the plugin-facing contracts that Superhuman inherits from OpenClaw and must treat as explicit compatibility surfaces during the migration.

The default policy for this wave is conservative:
keep contracts stable unless a versioned replacement, alias, and migration path all ship together.

## Contract Table

| Contract surface                                              | Representative location                                               | Current role                        | Decision                   | Owner role                            | Notes                                                                             |
| ------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------- | -------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| `openclaw/plugin-sdk/*` imports                               | `package.json` exports, `src/plugin-sdk/**`, extension imports        | public SDK namespace for plugins    | keep                       | plugin platform owner                 | This is the most important external plugin compatibility seam.                    |
| root `openclaw` package as host peer/dev dependency           | root `package.json`, `extensions/*/package.json`                      | host package consumed by plugins    | keep                       | plugin platform owner                 | A future alias may exist, but removal is not allowed in this wave.                |
| `@openclaw/<id>` package names                                | `extensions/*/package.json`                                           | install and ecosystem identity      | keep                       | plugin platform owner                 | Third-party plugin installation depends on this naming family.                    |
| `openclaw.plugin.json` manifest filename                      | `extensions/*/openclaw.plugin.json`                                   | plugin discovery artifact           | keep                       | plugin platform owner                 | Filename churn would break packaged and local plugin discovery.                   |
| manifest `id` values                                          | `extensions/*/openclaw.plugin.json`                                   | plugin identity and loader contract | keep                       | plugin platform owner                 | Renames require aliases and migration logic; not allowed now.                     |
| `openclaw.install.npmSpec`                                    | plugin package metadata and invariant tests                           | install contract                    | keep                       | plugin platform owner                 | Often points to `@openclaw/*` and must remain valid.                              |
| `openclaw.channel.id`                                         | plugin package metadata                                               | channel routing/discovery contract  | keep                       | plugin platform owner                 | Treat as a stable compatibility identifier.                                       |
| plugin channel docs paths                                     | plugin package metadata, docs pages                                   | install/help contract               | keep                       | docs owner + plugin platform owner    | Docs branding can change around the contract, not the contract itself.            |
| plugin loader and registry semantics                          | `src/plugins/**`                                                      | runtime discovery contract          | keep                       | plugin platform owner                 | Behavior changes require compatibility review.                                    |
| bundled plugin directory layout                               | `extensions/*` and dist packaging                                     | install/runtime lookup contract     | keep                       | plugin platform owner                 | Internal layout is compatibility-sensitive because tooling assumes it.            |
| plugin release invariants                                     | `test/release-check.test.ts`, `test/official-channel-catalog.test.ts` | regression guardrail                | keep                       | release owner + plugin platform owner | Must stay green through migration work.                                           |
| plugin-facing config/state expectations tied to `~/.openclaw` | docs, runtime path logic, tests                                       | inherited runtime contract          | migrate with compatibility | runtime migration owner               | Must be read and migrated in Phase 4, not broken silently.                        |
| plugin-facing env var namespace `OPENCLAW_*`                  | runtime/config/tests/docs                                             | inherited runtime contract          | alias then migrate         | runtime migration owner               | New names may be added later, but old names must remain readable during the wave. |

## Keep Decisions

These contracts are explicitly retained during this migration wave.

1. `openclaw/plugin-sdk/*`
2. `@openclaw/*`
3. `openclaw.plugin.json`
4. plugin manifest ids
5. plugin install metadata under `openclaw.*`
6. plugin channel metadata under `openclaw.*`
7. plugin discovery and loader behavior expected by current ecosystem packages

## Alias Decisions

These contracts are expected to gain Superhuman-facing aliases later, but aliases must not replace the inherited contract until migration support exists.

1. CLI binary name
2. root package install surface if a new package name is chosen
3. env var namespace for runtime configuration
4. state/config roots consumed by plugin runtime behavior and operator workflows

## Migrate Decisions

These surfaces must ultimately move to Superhuman naming, but only with compatibility behavior.

1. user-facing docs and UI copy that describe plugin support
2. user-facing config and state defaults
3. install and upgrade documentation that currently assumes OpenClaw-only identity
4. browser storage and UI surface names that expose product branding

## Explicit Non-Decisions for Phase 1

Phase 1 does not authorize:

- changing plugin manifest filenames
- renaming plugin ids
- changing `@openclaw/*` package names in-place
- removing `openclaw/plugin-sdk/*`
- breaking third-party plugin installation or runtime discovery

## Representative Evidence

- Bundled plugins ship `openclaw.plugin.json` across the `extensions/` tree.
- Bundled channel packages use `@openclaw/<id>` and publish `openclaw.install.npmSpec` metadata.
- The root package exports a large `openclaw/plugin-sdk/*` surface consumed by plugins and tests.
- Contract tests assert manifest validity, package naming, install metadata, and plugin SDK artifacts.

## Phase 1 Conclusion

Every major plugin-facing contract now has an owner role and a keep, alias, or migrate decision.
The unresolved questions are product naming questions, not plugin contract ambiguity.
