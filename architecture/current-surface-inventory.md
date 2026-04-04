# Current Surface Inventory

## Purpose

This inventory classifies the major migration surfaces that currently shape the product identity, compatibility posture, upstream-sync seam, and downstream Superhuman layer.

It is intentionally organized by subsystem rather than by every individual string occurrence.
Detailed string replacement work belongs to later phases after the canonical values are fully ratified.

## Classification Summary

| Surface                                    | Bucket                   | Current state                                       | Migration note                                                         |
| ------------------------------------------ | ------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------- |
| Root package metadata                      | public identity          | OpenClaw-branded                                    | Must move once CLI/package/repo URLs are chosen.                       |
| README and root repo front door            | public identity          | OpenClaw-branded                                    | Must move in Phase 3.                                                  |
| Mintlify docs config and homepage          | public identity          | OpenClaw-branded                                    | Must move in Phase 3 after docs domain is chosen.                      |
| Control UI shell                           | public identity          | OpenClaw-branded                                    | Must move in Phase 3 with storage-key migration in Phase 4.            |
| App display names and bundle-facing labels | public identity          | OpenClaw-branded                                    | Must move in Phase 3 with app/runtime migration planning.              |
| CLI binary and runtime messages            | public identity          | OpenClaw-branded                                    | Must move in Phase 4 after canonical CLI is chosen.                    |
| Config paths, state paths, env vars        | public identity          | OpenClaw defaults active                            | Must migrate in Phase 4 with compatibility behavior.                   |
| `openclaw/plugin-sdk/*`                    | compatibility namespace  | active public contract                              | Keep during this migration wave unless versioned replacement ships.    |
| `@openclaw/*` plugin packages              | compatibility namespace  | active ecosystem contract                           | Keep during this migration wave unless explicit alias/migration ships. |
| `openclaw.plugin.json` manifests           | compatibility namespace  | active discovery contract                           | Keep during this migration wave.                                       |
| Generic host/core under `src/`             | shared core              | mostly upstream-shaped with some downstream leakage | Preserve upstream-sync shape and reduce downstream imports later.      |
| `src/superhuman/`                          | downstream product layer | present and growing                                 | Keep as the product namespace; normalize later.                        |

## Public Identity Surfaces

### Repository and package surfaces

| Surface                                       | Representative files                                                                                                     | Current identity                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| package name, homepage, bugs, repository, bin | `package.json`                                                                                                           | `openclaw`, `openclaw` binary, OpenClaw GitHub URLs |
| root executable entrypoint                    | `openclaw.mjs`                                                                                                           | OpenClaw command/help/error text                    |
| release and publish scripts                   | `scripts/openclaw-npm-release-check.ts`, `scripts/openclaw-npm-postpublish-verify.ts`, `scripts/openclaw-npm-publish.sh` | OpenClaw release naming and publish flow            |
| contributor and issue front doors             | `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/*`                                                                            | OpenClaw product framing                            |

### Documentation surfaces

| Surface            | Representative files | Current identity                                                     |
| ------------------ | -------------------- | -------------------------------------------------------------------- |
| docs site metadata | `docs/docs.json`     | site name, description, navbar, repo/release links point to OpenClaw |
| docs homepage      | `docs/index.md`      | OpenClaw title, onboarding copy, config path, screenshots            |
| docs body copy     | `docs/**/*.md`       | product-facing OpenClaw references widespread                        |
| root README        | `README.md`          | OpenClaw product identity, install commands, docs URLs               |

### UI and app surfaces

| Surface                          | Representative files                               | Current identity                                                                                             |
| -------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Control UI title and element tag | `ui/index.html`                                    | `OpenClaw Control`, `openclaw-app`, `openclaw.control.settings.v1`                                           |
| iOS app display surfaces         | `apps/ios/Sources/Info.plist`                      | `CFBundleDisplayName=OpenClaw`, `openclaw` URL scheme, `_openclaw-gw._tcp` Bonjour service                   |
| macOS app display surfaces       | `apps/macos/Sources/OpenClaw/Resources/Info.plist` | `CFBundleExecutable=OpenClaw`, `CFBundleName=OpenClaw`, `openclaw` URL scheme, `ai.openclaw.mac` identifiers |
| Android app identity             | `apps/android/app/build.gradle.kts`                | `applicationId=ai.openclaw.app`, `openclaw-*.apk` output names, `OPENCLAW_*` signing properties              |

### Runtime and operator surfaces

| Surface                    | Representative files                                                   | Current identity                                             |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| default state/config roots | `src/config/paths.ts`                                                  | `~/.openclaw/openclaw.json` with legacy `.clawdbot` fallback |
| env var namespace          | `src/config/paths.ts`, `render.yaml`, `test/test-env.ts`, many scripts | `OPENCLAW_*`                                                 |
| operator/runtime messaging | `openclaw.mjs`, scripts, docs                                          | OpenClaw-first command/help/install text                     |

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
