# Current Surface Inventory

## Purpose

This inventory classifies the major migration surfaces that currently shape the product identity, compatibility posture, upstream-sync seam, and downstream Superhuman layer.

It is intentionally organized by subsystem rather than by every individual string occurrence.
Detailed string replacement work belongs to later phases after the canonical values are fully ratified.

## Classification Summary

| Surface                                    | Bucket                   | Current state                                       | Migration note                                                                  |
| ------------------------------------------ | ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| Root package metadata                      | public identity          | Superhuman-first with OpenClaw compatibility alias  | package/repo/bin identity moved; compatibility alias retained.                  |
| README and root repo front door            | public identity          | Partially migrated                                  | Superhuman-first top-level identity exists; deep cleanup still needed.          |
| Mintlify docs config and homepage          | public identity          | Partially migrated                                  | docs shell is Superhuman-first; deeper docs cleanup still needed.               |
| Control UI shell                           | public identity          | Partially migrated                                  | title/tag/storage migration landed; user-facing copy still uneven.              |
| App display names and bundle-facing labels | public identity          | Mixed                                               | visible app branding is moving; bundle/package ids remain sensitive.            |
| CLI binary and runtime messages            | public identity          | Mixed                                               | `superhuman` is canonical; `openclaw` alias remains and some help text lingers. |
| Config paths, state paths, env vars        | public identity          | Superhuman-first with compatibility reads           | canonical defaults moved; legacy reads remain by design.                        |
| `openclaw/plugin-sdk/*`                    | compatibility namespace  | active public contract                              | Keep during this migration wave unless versioned replacement ships.             |
| `@openclaw/*` plugin packages              | compatibility namespace  | active ecosystem contract                           | Keep during this migration wave unless explicit alias/migration ships.          |
| `openclaw.plugin.json` manifests           | compatibility namespace  | active discovery contract                           | Keep during this migration wave.                                                |
| Generic host/core under `src/`             | shared core              | mostly upstream-shaped with some downstream leakage | Preserve upstream-sync shape and reduce downstream imports later.               |
| `src/superhuman/`                          | downstream product layer | present and growing                                 | Keep as the product namespace; normalize later.                                 |

## Public Identity Surfaces

### Repository and package surfaces

| Surface                                       | Representative files                                                                                                     | Current identity                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| package name, homepage, bugs, repository, bin | `package.json`                                                                                                           | `@lpfchan/superhuman`, `superhuman` canonical bin, `openclaw` alias retained |
| root executable entrypoint                    | `openclaw.mjs`, `superhuman.mjs`                                                                                         | Superhuman-first with legacy alias warning                                   |
| release and publish scripts                   | `scripts/openclaw-npm-release-check.ts`, `scripts/openclaw-npm-postpublish-verify.ts`, `scripts/openclaw-npm-publish.sh` | OpenClaw release naming and publish flow                                     |
| contributor and issue front doors             | `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/*`                                                                            | OpenClaw product framing                                                     |

### Documentation surfaces

| Surface            | Representative files | Current identity                                                            |
| ------------------ | -------------------- | --------------------------------------------------------------------------- |
| docs site metadata | `docs/docs.json`     | site name, description, navbar, repo/release links are Superhuman-first     |
| docs homepage      | `docs/index.md`      | Superhuman homepage with some residual copy cleanup remaining               |
| docs body copy     | `docs/**/*.md`       | mixed; many deeper operator and channel docs still need cleanup             |
| root README        | `README.md`          | Superhuman front door with residual deep-link and command cleanup remaining |

### UI and app surfaces

| Surface                          | Representative files                               | Current identity                                                                                   |
| -------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Control UI title and element tag | `ui/index.html`                                    | `Superhuman Control`, `superhuman-app`, `superhuman.control.settings.v1` with legacy fallback keys |
| iOS app display surfaces         | `apps/ios/Sources/Info.plist`                      | mixed; branding direction is Superhuman, low-level identifiers remain legacy                       |
| macOS app display surfaces       | `apps/macos/Sources/OpenClaw/Resources/Info.plist` | mixed; `CFBundleName=Superhuman`, low-level identifiers remain legacy                              |
| Android app identity             | `apps/android/app/build.gradle.kts`                | mixed; app/package ids remain `ai.openclaw.app`, visible branding still being cleaned up           |

### Runtime and operator surfaces

| Surface                    | Representative files                                                   | Current identity                                                               |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| default state/config roots | `src/config/paths.ts`                                                  | `~/.superhuman/superhuman.json` with legacy `.openclaw` / `.clawdbot` fallback |
| env var namespace          | `src/config/paths.ts`, `render.yaml`, `test/test-env.ts`, many scripts | mixed; `SUPERHUMAN_*` exists for path roots, many legacy env names remain      |
| operator/runtime messaging | `openclaw.mjs`, scripts, docs                                          | mixed; canonical CLI is Superhuman but many docs/messages still need cleanup   |

## Compatibility Namespace Surfaces

These surfaces stay OpenClaw-shaped by default during this wave unless an explicit alias or migration path lands first.

| Surface                              | Representative files                                                                             | Default decision |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------- |
| root plugin SDK namespace            | `package.json` exports, `src/plugin-sdk/*.ts`                                                    | keep             |
| plugin runtime types                 | `src/plugin-sdk/core.ts`, `src/plugin-sdk/plugin-entry.ts`, `src/plugins/types.ts`               | keep             |
| plugin package scope                 | `extensions/*/package.json`                                                                      | keep             |
| plugin manifest filename and schema  | `extensions/*/openclaw.plugin.json`, manifest validation tests                                   | keep             |
| plugin install metadata              | `extensions/*/package.json` under `openclaw.install.*`                                           | keep             |
| plugin channel metadata              | `extensions/*/package.json` under `openclaw.channel.*`                                           | keep             |
| discovery and release contract tests | `test/official-channel-catalog.test.ts`, `test/release-check.test.ts`, `test/helpers/channels/*` | keep             |

## Shared Core Surfaces

These areas should remain as upstream-aligned as practical.

| Area                           | Representative files                                   | Current note                                                 |
| ------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------ |
| gateway boot and runtime       | `src/gateway/**`, `src/bootstrap/**`                   | shared host territory                                        |
| routing, sessions, channels    | `src/routing/**`, `src/sessions/**`, `src/channels/**` | shared host territory with plugin compatibility implications |
| plugin loader and registry     | `src/plugins/**`                                       | shared core, compatibility-sensitive                         |
| public SDK surface             | `src/plugin-sdk/**`                                    | shared core public contract                                  |
| CLI wiring                     | `src/cli/**`, `src/commands/**`                        | shared host/public-surface hybrid                            |
| config/runtime path resolution | `src/config/**`                                        | shared core now, migration-sensitive later                   |

## Downstream Product Layer Surfaces

These are already Superhuman-owned and should remain clearly downstream.

| Area                                  | Representative files                                                                                                                                    | Current note                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| downstream namespace root             | `src/superhuman/`                                                                                                                                       | primary downstream ownership boundary                      |
| runtime services                      | `src/superhuman/super-agent-runtime.ts`, `src/superhuman/super-gateway-runtime.ts`, `src/superhuman/super-runtime-seams.ts`, `src/superhuman/runtime/*` | active downstream runtime layer                            |
| automation/policy/context logic       | `src/superhuman/super-automation-runtime.ts`, `src/superhuman/super-tool-runtime-policy.ts`, `src/superhuman/super-compaction-manager.ts`               | downstream product behavior                                |
| remote/orchestration/transcript logic | `src/superhuman/super-remote-session-manager.ts`, `src/superhuman/super-orchestration-runtime.ts`, `src/superhuman/super-transcript-hygiene.ts`         | downstream product behavior                                |
| downstream state substrate            | `src/superhuman/state/*`, `src/superhuman/super-state-store.ts`                                                                                         | downstream data layer                                      |
| internal architecture planning        | `architecture/*`                                                                                                                                        | canonical internal architecture and migration docs surface |

## Resolved Public Renames Enabled by Foundational Decisions

These surfaces are now unblocked for later phases because the foundational naming set is complete.

- package name and install commands can move to `@lpfchan/superhuman`
- release and publish naming can be updated to the Superhuman package identity

## Phase 1 Conclusion

Every major migration surface is now classifiable at subsystem level.
No foundational naming ambiguity remains at the Phase 1 level.
