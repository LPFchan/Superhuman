# Product Migration Plan

## Purpose

This plan migrates the repository from an OpenClaw-shaped fork into a clearly independent Superhuman product without losing legal provenance, without destroying the ability to keep pulling upstream fixes, and without breaking compatibility with the OpenClaw plugin ecosystem that Superhuman intends to keep supporting.

This is not a branding-only pass.
It is a repository identity migration that covers:

- provenance and legal posture
- public product identity
- package, CLI, config, and storage identity
- codebase boundaries and naming
- documentation architecture
- release, compatibility, and upgrade behavior

The sequence is ordered by dependency and acceptance gates, not by calendar theater.
If execution takes two weeks or six months, preserve the order and the gates rather than pretending the work fits neat date buckets.

## Current State

The repo is in an awkward middle state:

- the public product surface still presents OpenClaw in the README, docs site, package metadata, UI shell, and contributor rules
- the repo contains a growing Superhuman-specific implementation layer under `src/superhuman/`
- `architecture/` acts as internal architecture and migration documentation rather than end-user docs
- some Superhuman logic is isolated, but some has already leaked back into shared OpenClaw-shaped core surfaces
- naming policy currently uses explicit `super-*` and `Super*` prefixes for many downstream modules, which makes the dedicated subtree feel redundant and noisy

## End State

At the end of this migration wave, the repo must satisfy all of the following conditions:

1. The public product is unmistakably Superhuman.
2. The repo preserves explicit legal and historical provenance as a fork of OpenClaw.
3. The public docs root is a single canonical Superhuman docs tree under `docs/`.
4. Internal architecture, research, and migration documents live outside the public docs tree.
5. Shared host/core code remains structurally close to upstream where practical.
6. Superhuman-specific behavior is isolated behind a deliberate downstream boundary.
7. OpenClaw plugin ecosystem compatibility is a first-class Superhuman product feature, not a temporary courtesy shim.
8. Compatibility surfaces inherited from OpenClaw are explicit, documented, and minimized.
9. Existing installs can migrate without silent data loss.

## Non-Negotiables

1. Keep the MIT license and copyright notice intact.
2. Keep explicit provenance. Do not pretend the code did not originate from OpenClaw.
3. Do not maintain two canonical public documentation trees.
4. Do not scatter Superhuman-specific logic across shared core if it can live behind a downstream seam.
5. Do not do repo-wide churn just to make names look cleaner.
6. Do not break user data, config, sessions, or upgrade paths without a documented migration flow.
7. Treat OpenClaw plugin ecosystem compatibility as a product feature. Plugin breakage is a regression unless an explicit migration path ships.
8. Do not rename shared core structures unless there is a concrete maintenance or product win.

## Foundational Decisions

These decisions are required before execution starts. Do not begin public-surface renames until every item below has a chosen canonical value.

| Decision                       | Canonical target                 | Rule                                                                                                     |
| ------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Product name                   | `Superhuman`                     | Use in all user-facing surfaces.                                                                         |
| CLI binary                     | `SUPERHUMAN_CLI`                 | Recommended: `superhuman`.                                                                               |
| npm package                    | `SUPERHUMAN_PACKAGE`             | Recommended: the package that can own the canonical CLI.                                                 |
| Repository URL                 | `SUPERHUMAN_REPO_URL`            | Public canonical repo URL.                                                                               |
| Docs domain                    | `SUPERHUMAN_DOCS_DOMAIN`         | Public canonical docs host.                                                                              |
| Website URL                    | `SUPERHUMAN_SITE_URL`            | Public canonical marketing or homepage URL.                                                              |
| State directory                | `~/.superhuman`                  | Canonical runtime state root.                                                                            |
| Config path                    | `~/.superhuman/superhuman.json`  | Canonical config path.                                                                                   |
| Local storage prefix           | `superhuman.control.*`           | Canonical browser storage prefix.                                                                        |
| Web component tag              | `superhuman-app`                 | Canonical control UI custom element tag.                                                                 |
| Internal architecture docs dir | `architecture/`                  | Canonical home for architecture, migration, and planning docs.                                           |
| Public docs root               | `docs/`                          | Single public docs tree.                                                                                 |
| Plugin ecosystem posture       | `OpenClaw-compatible by default` | Plugin-facing contracts stay compatible unless a versioned replacement and migration path ship together. |

If any of these cannot be decided at the start, the migration pauses until the operator picks a value. The plan does not proceed with placeholders in shipped user-facing surfaces.

## Core Strategy

The migration uses five rules.

### Rule 1: Preserve provenance, replace identity confusion

Keep legal lineage.
Replace public-facing OpenClaw branding.

### Rule 2: One public docs root, one internal architecture root

`docs/` is the published product docs tree.
`architecture/` is the internal architecture and migration tree.

### Rule 3: Shared core stays upstream-shaped

`src/` remains the upstream-syncable host and infrastructure layer where practical.
Superhuman-specific behavior should not casually spread into generic folders.

### Rule 4: Downstream ownership by directory, not by filename prefix

`src/superhuman/` is the downstream namespace.
Inside that subtree, use normal domain names instead of redundant `super-*` prefixes.

### Rule 5: Compatibility surfaces are explicit contracts

Anything that keeps an OpenClaw-shaped name for compatibility must be documented as a compatibility surface, not left as an accidental leftover.
This especially includes plugin-facing contracts such as SDK namespaces, package scopes, manifest fields, plugin ids, discovery rules, and install or update flows.

## Target Repository Layout

This migration wave converges on the following top-level mental model:

```text
docs/                 public Superhuman docs
architecture/         internal architecture, migration, UX, and audit docs
src/                  shared host/core kept as upstream-aligned as practical
src/superhuman/       downstream Superhuman product layer
ui/                   public Control UI, branded as Superhuman
apps/                 companion apps, branded as Superhuman
extensions/           plugin tree, compatibility-sensitive and product-critical
```

The final structure inside `src/superhuman/` should be organized by domain, not by product prefix:

```text
src/superhuman/
  automation/
  context/
  orchestration/
  policy/
  remote/
  runtime/
  state/
  transcript/
```

## Naming Policy After Migration

### Public surfaces

- Use `Superhuman` for app name, docs, README, release notes, UI labels, and screenshots.
- Use the canonical Superhuman CLI, package, repo, docs domain, and state paths chosen in the foundational decisions.

### Shared core

- Keep generic domain names in shared core.
- Avoid baking `Superhuman` into generic host code unless the code is intentionally product-specific.

### Downstream layer

- Keep the dedicated downstream namespace directory `src/superhuman/`.
- Stop adding `super-*` and `Super*` prefixes inside that subtree unless a symbol is truly a public cross-boundary contract.

### Compatibility surfaces

- Use `OpenClaw` and `openclaw` only for provenance, compatibility, inherited namespaces, or upstream references.
- Any surviving OpenClaw identifier must be documented as one of these:
  - legal provenance
  - upgrade compatibility
  - external SDK namespace compatibility
  - plugin manifest and discovery contract compatibility
  - retained upstream sync seam

## Compatibility Policy

This migration wave intentionally preserves some compatibility surfaces while changing public identity.
OpenClaw plugin ecosystem compatibility is one of those preserved surfaces by design: Superhuman can rebrand public product touchpoints, but it does not casually strand plugin authors or installed plugins.

### Surfaces that must move to Superhuman now

- README
- repo description and homepage
- docs site name, description, nav, logo, and homepage
- control UI page title and primary app label
- user-facing app bundle names and display names
- onboarding copy and top-level help text
- public docs and UI copy that describe plugin support
- local storage keys used by the branded UI
- config and state path defaults
- release notes and changelog headers

### Surfaces that may remain OpenClaw-shaped for compatibility during this wave

- inherited external SDK namespace such as `openclaw/plugin-sdk/*`
- selected package scopes such as `@openclaw/*` where ecosystem compatibility matters
- selected plugin ids that would otherwise break third-party integrations
- plugin manifest schema, discovery conventions, and install metadata consumed by third-party plugins
- explicit import boundaries designed to stay upstream-compatible

### Compatibility behavior that must exist during the wave

- the old CLI name remains as an alias that prints a deprecation warning and forwards to the new CLI
- the old config and state roots are auto-discovered and migrated into the new root with backup and audit logs
- old environment variable names are still read, but the new names win on conflicts and warnings explain the change
- old browser storage keys are migrated in place on first run
- old docs URLs redirect to the new canonical docs host
- old user-facing brand names in upgrade flows are translated into the new brand with clear migration copy
- representative OpenClaw plugins can still install, load, and run under Superhuman without source changes
- if a plugin-facing contract must move, ship aliases or adapters before deprecation and document when the old contract actually ends
- plugin discovery continues to honor legacy manifest ids, package names, and SDK imports that are classified as compatibility surfaces

## Execution Sequence

The phases below are ordered by dependency.
Do not skip ahead because a later phase looks more exciting.
Advance only when the current phase's acceptance gate is satisfied.

## Phase 1: Ratify the Contract and Freeze Drift

### Objective

Turn the migration into an explicit repo contract before touching public identity.

### Work

- Ratify the foundational decisions table.
- Write a short migration charter in internal docs with the chosen canonical names.
- Create a full inventory of public OpenClaw-facing surfaces.
- Create a full inventory of downstream Superhuman-owned surfaces.
- Inventory plugin-facing contracts separately: SDK namespaces, package scopes, manifest schema, plugin ids, discovery rules, install and update paths, and plugin-owned config or state expectations.
- Classify every major surface into one of four buckets:
  - public identity
  - compatibility namespace
  - shared core
  - downstream product layer
- Define a representative plugin compatibility matrix covering bundled plugins, first-party external-style plugins, and real third-party OpenClaw ecosystem examples where available.
- Freeze new naming drift. No new `super-*` files should be added outside the existing downstream subtree.
- Freeze new public `OpenClaw` additions except where explicitly classified as provenance or compatibility.
- Define who approves legal, product, docs, release, and downstream-boundary decisions.

### Deliverables

- internal migration charter
- current-surface inventory
- compatibility surface inventory
- plugin contract map
- representative plugin compatibility matrix
- approved naming glossary

### Acceptance gate

No file or subsystem remains unclassified at the public-surface level.
Every plugin-facing contract has an owner and a keep, alias, or migrate decision.

## Phase 2: Provenance, Legal Notice, and Identity Guardrails

### Objective

Make provenance explicit so branding changes do not look like an attempt to erase history.

### Work

- Add a root-level provenance document such as `FORK.md` or `PROVENANCE.md`.
- State clearly that Superhuman began as a fork of OpenClaw and has diverged.
- Keep the MIT license intact.
- Add a docs page covering provenance and fork lineage.
- Add a docs page covering migration from OpenClaw to Superhuman.
- Update contributor guidance so product naming rules no longer instruct contributors to use OpenClaw as the product identity.
- Add a contributor note on what counts as legal provenance vs public branding.
- Add a repository guardrail script or review checklist that flags newly introduced public OpenClaw branding in disallowed locations.

### Deliverables

- root provenance document
- docs provenance page
- docs migration page
- updated contributor naming guidance
- brand guardrail checklist or lint script

### Acceptance gate

The repo can explain its lineage honestly without using OpenClaw as the public product identity.

## Phase 3: Public Identity Foundation

### Objective

Move the public front door from OpenClaw to Superhuman.

### Work

- Update root package metadata:
  - package name
  - description
  - homepage
  - bugs URL
  - repository URL
  - bin name
- Preserve or alias plugin-facing package scopes, SDK import paths, and install identifiers wherever ecosystem compatibility depends on them, even while public branding changes to Superhuman.
- Update README title, introduction, links, badges, screenshots, and install commands.
- Update the docs site config under `docs/docs.json`:
  - site name
  - description
  - navbar links
  - logo assets
  - favicon
  - canonical URLs
- Update docs homepage and top-level getting-started pages.
- Update UI shell identity:
  - `ui/index.html` title
  - root web component tag
  - main app class name
  - local storage prefixes
  - branded strings in the login, overview, and help surfaces
- Update app display names and bundle-facing labels in macOS, iOS, and Android surfaces.
- Update release metadata, appcast text, and installer copy to the new product identity.

### Deliverables

- public repo metadata uses Superhuman
- README uses Superhuman
- docs front door uses Superhuman
- UI shell uses Superhuman
- app display names use Superhuman
- plugin-facing compatibility namespaces remain stable or explicitly aliased

### Acceptance gate

A new user who lands on the repo, docs homepage, or Control UI cannot mistake the product for OpenClaw.
At the same time, a plugin author can still identify the supported compatibility story without digging through source.

## Phase 4: Runtime Identity and Install Migration

### Objective

Move runtime defaults and user data locations to Superhuman while preserving upgrade paths and installed plugin behavior.

### Work

- Introduce the canonical new CLI entrypoint chosen in the foundational decisions.
- Keep the old CLI name as a compatibility alias with deprecation text.
- Introduce the canonical new state root `~/.superhuman`.
- Introduce the canonical new config path `~/.superhuman/superhuman.json`.
- On startup, detect legacy `~/.openclaw` state and offer one-time migration with backup.
- Ensure plugin discovery still finds plugins installed via OpenClaw-shaped package names, manifests, or prior state roots when those are part of the compatibility contract.
- Migrate the following on first successful run:
  - config
  - sessions
  - credentials
  - cached browser tokens where safe
  - UI storage keys
- Migrate or preserve plugin-owned state and discovery metadata alongside the core state migration.
- Add a migration report file that records what moved, what stayed, and any failures.
- Introduce new environment variable names based on the chosen canonical CLI or product namespace.
- Keep old `OPENCLAW_*` variables readable during this wave with warning messages and documented precedence.
- Update launcher files and runtime messages so failures mention Superhuman first.
- Update service install names, launchd labels, systemd unit naming, and helper script names where they are user-facing.

### Deliverables

- new CLI entrypoint
- legacy CLI alias
- state migration flow
- env var compatibility layer
- storage-key migration flow
- migration report output
- plugin discovery compatibility report

### Acceptance gate

An existing OpenClaw-based local install, including plugin setup, can upgrade into Superhuman without manual data copying.

## Phase 5: Codebase Boundary Cleanup

### Objective

Make upstream sync feasible by concentrating product-specific behavior inside a downstream layer and removing redundant naming noise.

### Work

- Keep `src/` as the shared host/core layer.
- Keep `src/superhuman/` as the downstream product namespace.
- Stop using file-level `super-*` naming inside `src/superhuman/`.
- Rename downstream files by domain instead of product prefix.
- Reorganize the downstream subtree into stable domain folders.
- Move shared-core knowledge of Superhuman behind registries, bootstrap, or typed runtime seams.
- Remove direct hard-coded downstream defaults from generic shared folders wherever practical.
- Keep plugin SDK entrypoints, manifest validation, plugin id handling, and extension loading behavior backwards-compatible unless a versioned replacement plus migration guide ship together.
- Avoid cosmetic renames on plugin-facing config keys, manifest fields, or public SDK barrels that external plugins consume.
- Document the approved dependency direction:
  - shared core may expose hooks, registries, and typed seams
  - downstream code may consume shared core
  - shared core should not directly import downstream modules except through deliberate bridge files

### Target file-family mapping

| Current family                                           | Target family                                       |
| -------------------------------------------------------- | --------------------------------------------------- |
| `src/superhuman/super-agent-runtime.ts`                  | `src/superhuman/runtime/agent.ts`                   |
| `src/superhuman/super-gateway-runtime.ts`                | `src/superhuman/runtime/gateway.ts`                 |
| `src/superhuman/super-runtime-seams.ts`                  | `src/superhuman/runtime/seams.ts`                   |
| `src/superhuman/super-runtime-verification.ts`           | `src/superhuman/runtime/verification.ts`            |
| `src/superhuman/super-automation-runtime.ts`             | `src/superhuman/automation/runtime.ts`              |
| `src/superhuman/super-automation-policy.ts`              | `src/superhuman/automation/policy.ts`               |
| `src/superhuman/super-notification-center.ts`            | `src/superhuman/automation/notification-center.ts`  |
| `src/superhuman/super-subscription-manager.ts`           | `src/superhuman/automation/subscription-manager.ts` |
| `src/superhuman/super-proactive-loop.ts`                 | `src/superhuman/automation/proactive-loop.ts`       |
| `src/superhuman/super-remote-schedule-runtime.ts`        | `src/superhuman/automation/remote-schedule.ts`      |
| `src/superhuman/super-orchestration-runtime.ts`          | `src/superhuman/orchestration/runtime.ts`           |
| `src/superhuman/super-orchestration-store.ts`            | `src/superhuman/orchestration/store.ts`             |
| `src/superhuman/super-remote-session-manager.ts`         | `src/superhuman/remote/session-manager.ts`          |
| `src/superhuman/super-execution-surfaces.ts`             | `src/superhuman/remote/execution-surfaces.ts`       |
| `src/superhuman/super-compaction-manager.ts`             | `src/superhuman/context/compaction-manager.ts`      |
| `src/superhuman/super-context-pressure.ts`               | `src/superhuman/context/pressure.ts`                |
| `src/superhuman/super-command-risk-classifier.ts`        | `src/superhuman/policy/command-risk-classifier.ts`  |
| `src/superhuman/super-tool-runtime-policy.ts`            | `src/superhuman/policy/tool-runtime.ts`             |
| `src/superhuman/super-tool-batch-planner.ts`             | `src/superhuman/policy/tool-batch-planner.ts`       |
| `src/superhuman/super-frozen-memory-prompt.ts`           | `src/superhuman/context/frozen-memory-prompt.ts`    |
| `src/superhuman/super-transcript-hygiene.ts`             | `src/superhuman/transcript/hygiene.ts`              |
| `src/superhuman/super-replay-annotations.ts`             | `src/superhuman/transcript/replay-annotations.ts`   |
| `src/superhuman/state/super-state-db.ts`                 | `src/superhuman/state/db.ts`                        |
| `src/superhuman/state/super-state-schema.ts`             | `src/superhuman/state/schema.ts`                    |
| `src/superhuman/state/super-state-sessions.ts`           | `src/superhuman/state/sessions.ts`                  |
| `src/superhuman/state/super-state-runtime.ts`            | `src/superhuman/state/runtime.ts`                   |
| `src/superhuman/state/super-state-automation.ts`         | `src/superhuman/state/automation.ts`                |
| `src/superhuman/state/super-state-shared.ts`             | `src/superhuman/state/shared.ts`                    |
| `src/superhuman/state/super-state-statements.ts`         | `src/superhuman/state/statements.ts`                |
| `src/superhuman/runtime/super-shell-runtime.ts`          | `src/superhuman/runtime/shell.ts`                   |
| `src/superhuman/runtime/super-shell-contracts.ts`        | `src/superhuman/runtime/shell-contracts.ts`         |
| `src/superhuman/runtime/super-context-services.ts`       | `src/superhuman/runtime/context-services.ts`        |
| `src/superhuman/runtime/super-automation-services.ts`    | `src/superhuman/runtime/automation-services.ts`     |
| `src/superhuman/runtime/super-orchestration-services.ts` | `src/superhuman/runtime/orchestration-services.ts`  |

### Shared-core leak fixes that must land in this window

- remove product-specific defaults from generic slot selection where practical
- move product-specific context-engine registration out of generic initialization if shared-core fallback registration can remain generic
- replace direct downstream runtime imports from shared core with typed runtime access or registry lookups
- document and reduce the number of bridge files where shared core is allowed to know about the downstream layer

### Deliverables

- normalized downstream subtree
- reduced direct shared-core to downstream coupling
- boundary documentation
- import-graph report before and after cleanup
- plugin contract diff and compatibility report

### Acceptance gate

Shared core is again mostly upstream-shaped, Superhuman-specific logic is visibly concentrated in its own namespace, and representative OpenClaw plugins still load without source edits.

## Phase 6: Documentation Architecture Migration

### Objective

Make `docs/` the canonical public Superhuman docs tree and move internal planning out of the way.

### Work

- Keep `docs/` as the only public docs root.
- Keep `architecture/` as the canonical internal docs root.
- Update internal links so architecture, UX research, audits, and phase plans all point to `architecture/`.
- Create `architecture/README.md` as the internal docs index.
- Rewrite `docs/index.md` as the Superhuman product homepage.
- Rewrite the main onboarding and getting-started flows so they speak in Superhuman terms.
- Add dedicated docs pages for:
  - provenance
  - migration from OpenClaw
  - compatibility namespaces and inherited SDK surfaces
  - config and state migration behavior
- Add plugin-author documentation that explains which OpenClaw-shaped SDK imports, package scopes, manifests, and plugin ids remain canonical compatibility contracts in Superhuman during this wave.
- Audit the entire docs tree and classify every page as one of:
  - keep and rebrand
  - keep mostly upstream-shaped but update framing
  - retire
  - move to internal architecture docs
- Update nav structure so the docs do not expose internal architecture materials as product docs.
- Freeze non-English docs regeneration until English docs stabilize under the new taxonomy.
- Once English docs stabilize, rerun the translation pipeline from the new canonical source tree.

### Deliverables

- `docs/` is canonical public docs
- `architecture/` is canonical internal docs
- docs taxonomy audit
- migration and provenance pages
- updated docs nav and homepage
- plugin compatibility docs for ecosystem users

### Acceptance gate

There is only one public docs system and it reads as a coherent Superhuman product.

## Phase 7: Release, Stabilization, and Upstream-Sync Operating Model

### Objective

Ship the new identity cleanly and define the maintenance model that keeps upstream intake viable.

### Work

- Cut a release candidate after the public identity, runtime migration, code boundary, and docs work all land.
- Run upgrade tests from a representative OpenClaw-derived install into the new Superhuman identity.
- Run a plugin compatibility suite against representative bundled, first-party external-style, and third-party OpenClaw plugins.
- Verify the following user journeys:
  - fresh install
  - upgrade install
  - docs navigation
  - control UI login and storage migration
  - CLI alias forwarding
  - config and state migration
  - plugin install, discovery, and runtime loading
  - app startup and update behavior
- Add deprecation warnings for old names that still exist as compatibility surfaces.
- Publish the migration guide in docs and link it from the README.
- Update contributor docs so new work follows the new boundary and naming rules.
- Define the ongoing upstream-sync model:
  - Superhuman maintains a weekly upstream intake cadence for OpenClaw
  - upstream changes are reviewed continuously, but they are not adopted automatically
  - security fixes, correctness fixes, bug fixes, and low-risk maintenance changes should usually be accepted
  - product-shaping changes, major UX or workflow shifts, and upstream implementations that conflict with Superhuman's direction or duplicate an existing Superhuman-owned solution must be accepted, adapted, or declined as an explicit product decision
  - shared core is rebased or merged from upstream selectively rather than wholesale
  - downstream Superhuman subtree is maintained locally
  - compatibility namespaces are audited each release
  - plugin-facing contract changes require compatibility review and regression coverage before merge
  - new shared-core changes may not import downstream logic without explicit bridge approval
- Write and maintain an explicit accept, adapt, or decline rubric for weekly upstream intake decisions.
- Use `architecture/weekly-upstream-intake-template.md` to record each weekly upstream intake decision.
- Define the autonomous maintenance boundary: what the agent may do without asking, what requires operator approval, what every escalation must include, and how blocked decisions are re-raised.
- Create a post-migration audit checklist that runs before each release.

### Deliverables

- release candidate
- upgrade validation report
- plugin compatibility report
- deprecation messages
- updated contributor rules
- release audit checklist
- ongoing upstream intake policy, decision rubric, and escalation protocol

### Acceptance gate

The product ships as Superhuman, upgrades cleanly, keeps the OpenClaw plugin ecosystem working as an intentional feature, and the team has an explicit operating model for continuing to absorb upstream OpenClaw patches with bounded agent autonomy and operator escalation for critical decisions.

## Concrete Patch Set

The repo is past pure planning, but it is not at the end-state gate yet.
The most useful next step is not another abstract status note.
It is a small number of concrete patch sets, landed in dependency order, each with a narrow acceptance bar.

These patch sets intentionally separate public identity cleanup from compatibility-sensitive runtime and plugin work.
Do not collapse them into one giant rename PR.

### Patch Set 1: Public Front Door Cleanup

#### Objective

Make the repo landing surfaces read as Superhuman without touching compatibility namespaces.

#### Primary files

- `README.md`
- `docs/docs.json`
- `docs/index.md`
- `docs/start/**`
- `src/terminal/links.ts`

#### Required changes

- Replace public docs links that still point at `docs.openclaw.ai` with the canonical Superhuman docs domain.
- Replace user-facing `openclaw` CLI examples with `superhuman` except where the old name is explicitly documented as a compatibility alias.
- Replace public default path examples that still present `~/.openclaw/openclaw.json` as the primary path.
- Replace OpenClaw-first wording in the README and docs homepage.
- Replace stale OpenClaw-branded logo asset references on the docs homepage.

#### Must not change

- `openclaw/plugin-sdk/*`
- `@openclaw/*` package names kept for ecosystem compatibility
- plugin manifest filenames or ids unless a separate compatibility patch ships with it

#### Acceptance bar

- A new user landing on the repo root or docs homepage sees Superhuman first.
- Public docs helpers and top-level links resolve to the canonical Superhuman docs host.
- No compatibility contract is renamed as part of this patch.

### Patch Set 2: Control UI and Browser Surface Cleanup

#### Objective

Remove OpenClaw-first copy from the shipped browser control surfaces while keeping legacy storage migration behavior.

#### Primary files

- `ui/index.html`
- `ui/src/ui/views/overview.ts`
- `ui/src/ui/views/login-gate.ts`
- `ui/src/i18n/locales/*.ts`
- `ui/src/i18n/lib/translate.ts`
- `ui/src/ui/storage.ts`

#### Required changes

- Replace OpenClaw-first commands in help text with Superhuman-first commands.
- Replace public references to `openclaw dashboard --no-open` and `openclaw doctor` with Superhuman-first guidance, while still documenting the old name as an alias only where needed.
- Keep legacy storage keys readable, but make `superhuman.control.*` and `superhuman.i18n.*` the only names presented in user-facing copy.
- Ensure Control UI overview/login/help strings no longer describe `openclaw.json` as the primary config file.

#### Must not change

- legacy storage fallback reads
- compatibility migration logic for `openclaw.control.*` and `openclaw.i18n.*`

#### Acceptance bar

- A Control UI user cannot mistake the product identity for OpenClaw.
- Legacy browser storage migration still exists, but the public UI no longer teaches the legacy names as canonical.

### Patch Set 3: Runtime and Operator Docs Alignment

#### Objective

Bring the operator docs into line with the already-landed Superhuman-first path resolver and alias policy.

#### Primary files

- `docs/gateway/configuration.md`
- `docs/gateway/index.md`
- `docs/gateway/doctor.md`
- `docs/install/superhuman-migration.md`
- `docs/install/config-state-migration.md`
- `docs/reference/compatibility-namespaces.md`
- `docs/cli/**`
- `src/wizard/setup.finalize.ts`

#### Required changes

- Present `~/.superhuman/superhuman.json` as canonical.
- Present `SUPERHUMAN_*` names first wherever new names already exist.
- Reframe `OPENCLAW_*`, `~/.openclaw`, and `openclaw` CLI strings as compatibility behavior rather than primary operator guidance.
- Make the migration docs consistent with each other: no page should say both “runtime migration is already complete” and “runtime migration is still pending.”
- Update wizard/help output so post-onboarding guidance is Superhuman-first.

#### Must not change

- compatibility reads for legacy state/config/env names
- explicit provenance references

#### Acceptance bar

- Operator docs have one coherent story: Superhuman is canonical, OpenClaw is compatibility.
- The docs no longer contradict the runtime path resolver.

### Patch Set 4: Canvas and Branded Web Surface Cleanup

#### Objective

Remove obvious OpenClaw branding from shipped web-facing surfaces that are neither provenance nor plugin compatibility contracts.

#### Primary files

- `src/canvas-host/server.ts`
- `src/canvas-host/a2ui/index.html`
- `apps/shared/OpenClawKit/Tools/CanvasA2UI/bootstrap.js`
- `apps/shared/OpenClawKit/Sources/OpenClawKit/Resources/CanvasScaffold/scaffold.html`

#### Required changes

- Replace `OpenClaw Canvas` user-facing titles with Superhuman branding.
- Decide whether `openclaw-a2ui-host` remains a compatibility surface or should migrate now.
- If the custom element name remains legacy for compatibility, document that choice explicitly and avoid presenting it as public product branding.

#### Escalation note

This patch set crosses from branding into possible runtime or app-bridge compatibility.
If renaming the custom element risks client breakage, keep the legacy tag temporarily and document it as a compatibility namespace instead of renaming it casually.

#### Acceptance bar

- Canvas titles and visible UI labels are Superhuman-first.
- Any retained OpenClaw-shaped browser/runtime identifier is explicitly classified as compatibility.

### Patch Set 5: App Bundle and Display Identity Cleanup

#### Objective

Move app-facing names and bundle-facing labels toward Superhuman without breaking package identifiers that still need a separate compatibility decision.

#### Primary files

- `apps/android/settings.gradle.kts`
- `apps/android/app/build.gradle.kts`
- `apps/android/README.md`
- `apps/ios/**/Info.plist`
- `apps/ios/LocalSigning.xcconfig.example`
- `apps/macos/README.md`
- `apps/macos/**/Info.plist`
- `apps/macos/Sources/**`

#### Required changes

- Replace public display names, README copy, build artifact labels, and app-facing strings that still present OpenClaw as the product.
- Separate display-name cleanup from package-id and bundle-id cleanup.
- Do not rename `ai.openclaw.*` or other bundle identifiers unless there is an explicit compatibility and upgrade decision for that platform.

#### Escalation note

Bundle ids, URL schemes, Bonjour service types, and app package ids are migration-contract changes, not simple brand copy edits.
Do not rename them in the same patch as display strings unless operator approval is explicit.

#### Acceptance bar

- User-facing app names and docs are Superhuman-first.
- Platform identifiers that remain OpenClaw-shaped are either deferred deliberately or shipped with a migration plan.

### Patch Set 6: Migration Status and Governance Doc Reconciliation

#### Objective

Make the migration tracking docs describe the repo as it actually exists now.

#### Primary files

- `architecture/current-surface-inventory.md`
- `architecture/release-candidate-readiness.md`
- `architecture/upgrade-validation-report.md`
- `architecture/plugin-compatibility-report.md`
- `architecture/docs-taxonomy-audit.md`

#### Required changes

- Remove stale statements that still describe already-migrated surfaces as OpenClaw-branded.
- Remove overstatements that imply the repo is release-candidate ready before earlier acceptance gates are met.
- Distinguish clearly between:
  - done
  - partially done
  - intentionally retained for compatibility
  - still blocked

#### Acceptance bar

- Internal migration docs can be trusted as current-state artifacts.
- Release-readiness claims do not outrun the actual repo state.

### Patch Set 7: Verification and Release Gate

#### Objective

Only after the earlier patch sets land, run the migration completion checks the plan already requires.

#### Required verification

- upgrade validation from an OpenClaw-shaped install
- Control UI storage migration validation
- plugin compatibility validation for representative OpenClaw plugins
- docs navigation validation on the canonical docs host
- app startup validation for renamed display surfaces

#### Acceptance bar

- This patch set is complete only when the repo can honestly satisfy the Phase 7 release gate and the Final Release Criteria.

## Recommended Landing Order

1. Patch Set 1: Public Front Door Cleanup
2. Patch Set 2: Control UI and Browser Surface Cleanup
3. Patch Set 3: Runtime and Operator Docs Alignment
4. Patch Set 4: Canvas and Branded Web Surface Cleanup
5. Patch Set 5: App Bundle and Display Identity Cleanup
6. Patch Set 6: Migration Status and Governance Doc Reconciliation
7. Patch Set 7: Verification and Release Gate

## Immediate Next-Step Recommendation

If only one patch set is started next from the current repo state, start with Patch Set 3.

Reason:

- Patch Sets 1, 2, 4, and 6 are already mostly landed or reconciled in the current tree
- the main remaining operator-facing contradiction is that deeper CLI and channel docs still teach `openclaw` as canonical
- finishing the operator-doc sweep is lower risk than the remaining platform bundle-id decision in Patch Set 5

After Patch Set 3, the next explicit operator decision is Patch Set 5: whether platform bundle ids, URL schemes, Bonjour service types, and package ids stay on the OpenClaw compatibility track for this migration wave or ship with a platform-specific upgrade plan.

## Public Surface Checklist

Every item below must be reviewed and either migrated or explicitly classified as compatibility.

### Repository and package surfaces

- repository name and description
- README title, intro, badges, links, screenshots
- package metadata
- package bin names
- release note templates
- changelog headers

### Documentation surfaces

- docs site config
- docs homepage
- getting-started and onboarding flows
- control UI docs
- install and update docs
- migration and provenance docs

### UI and app surfaces

- browser page title
- custom element tag
- app class names if exposed in diagnostics or devtools
- local storage keys
- login and help text
- app display names and bundle names
- macOS appcast text and updater copy

### Runtime and operator surfaces

- CLI binary names
- package install commands
- service names and human-readable labels
- config and state paths
- environment variable names
- log prefixes that are user-facing

### Plugin ecosystem surfaces

- SDK import namespaces
- package scopes and install specs consumed by plugins
- plugin ids and manifest schema
- plugin discovery and registration rules
- plugin-owned config and state migration behavior
- plugin compatibility docs for ecosystem users

## Code Structure Checklist

Every item below must be satisfied before calling the codebase migration complete.

1. `src/superhuman/` remains the downstream namespace.
2. Redundant `super-*` file prefixes inside that subtree are removed.
3. Shared core uses generic names where possible.
4. Direct imports from shared core into downstream code are concentrated in deliberate bridge points.
5. Product-specific defaults are not hard-coded in generic shared infrastructure unless the shared infrastructure is intentionally product-owned.
6. Public SDK and plugin-manifest compatibility namespaces are explicitly documented.
7. Plugin-facing contract changes ship with compatibility tests or an explicit migration path.
8. New downstream work follows domain folders instead of prefix-based filenames.

## Documentation Policy After Migration

### `docs/`

Use for published product documentation only, including compatibility guidance for plugin ecosystem users.

### `architecture/`

Use for:

- architecture drafts
- migration plans
- UX research
- reference-project audits
- ADRs
- implementation phase plans

### What not to do

- do not create a second public docs root under `superhuman/`
- do not leave internal planning material mixed into product docs
- do not keep `docs/` publicly branded as OpenClaw while the product is branded as Superhuman

## Upstream Sync Operating Rules After Migration

Superhuman maintains a weekly upstream intake cadence for OpenClaw. Upstream changes are reviewed continuously, but they are not adopted automatically. Security fixes, correctness fixes, bug fixes, and low-risk maintenance changes should usually be accepted. Product-shaping changes, major UX or workflow shifts, and upstream implementations that conflict with Superhuman's direction or duplicate an existing Superhuman-owned solution must be accepted, adapted, or declined as an explicit product decision.

1. Shared core folders are treated as upstream-syncable territory, but not as auto-merge territory.
2. Downstream product behavior belongs under `src/superhuman/` and companion product surfaces.
3. Public docs are allowed to diverge because they represent the product, not the fork source.
4. Compatibility namespaces inherited from OpenClaw are reviewed at every release and are removed only with an explicit migration path.
5. Changes to plugin-facing SDK, manifest, package, or discovery contracts require explicit compatibility review and regression coverage.
6. Any new feature proposal must declare whether it belongs in shared core, downstream product, or compatibility.
7. Any upstream change that is adapted or declined is recorded with a short rationale so the same decision does not get re-litigated every week.

### Autonomous Maintenance and Escalation Policy

Superhuman should be maintained with bounded agent autonomy, not blind automation.
The agent handles recurring repo stewardship, but it must escalate whenever the decision would change the product's commitments, public contracts, or risk posture.

#### The agent may proceed without asking when

- the work is an `accept` decision that fits the weekly intake rubric and does not alter public product direction
- the change is a security fix, correctness fix, bug fix, or low-risk maintenance change that preserves existing compatibility commitments
- the work stays within already approved naming, boundary, docs, and migration policy
- the agent is updating internal logs, inventories, compatibility matrices, decision records, or other planning artifacts
- the agent is preparing an `adapt` implementation that stays inside existing policy and does not change public contracts without approval

#### The agent must escalate to the operator before proceeding when

- the change affects plugin-facing SDK, manifest, package, discovery, install, or migration contracts
- the change alters user-facing workflow, interaction model, onboarding, or product positioning
- the change touches legal provenance, license posture, brand identity, canonical naming, docs domain, package name, CLI name, config path, state path, or storage contract
- the change would publish a release, ship an irreversible migration, or remove a compatibility layer
- the correct decision is to decline, defer, or locally override a security-relevant upstream change
- two core principles conflict, especially security vs compatibility, compatibility vs product direction, or upstream parity vs an existing Superhuman-owned implementation
- the agent cannot produce a high-confidence recommendation from existing policy and prior logged decisions

#### Every escalation must include

- the upstream reference, commit, PR, or change window under review
- the recommended decision: `accept`, `adapt`, `decline`, or `defer`
- the shortest explanation of why the decision is blocked on operator judgment
- the affected surfaces: shared core, downstream product, plugin ecosystem, docs, runtime migration, or release
- the risk of proceeding without approval
- what work can continue safely without the decision
- what work is blocked until the operator answers
- the tests or checks already run and the checks still pending
- the date when the decision should be re-raised if it remains unresolved

#### When an escalation is unresolved

- the blocked change does not land silently
- unrelated low-risk weekly intake work may continue
- the unresolved item remains in the intake log with an explicit revisit date
- the agent re-raises the decision in the next weekly intake until it is resolved or explicitly retired
- the agent does not guess the answer just to keep the queue moving

### Weekly Upstream Intake Decision Rubric

Use this rubric during the weekly intake review.
Record each review in `architecture/weekly-upstream-intake-template.md`.

#### Accept

Adopt the upstream change with minimal local modification.

Choose `accept` when the change improves security, correctness, stability, or maintenance cost without materially shifting Superhuman's product direction, plugin compatibility story, or downstream architecture.

Examples:

- a security patch in shared core or dependency handling
- a bug fix in generic routing, session handling, or state migration logic that does not alter Superhuman's user workflows
- a low-risk maintenance refactor that reduces breakage and keeps plugin-facing contracts stable
- a correctness fix in shared infrastructure that Superhuman already uses as-is

#### Adapt

Take the underlying improvement, but translate it into Superhuman's own architecture, UX, or compatibility model instead of merging the upstream implementation verbatim.

Choose `adapt` when the upstream change is directionally useful but its exact implementation would leak OpenClaw-specific product assumptions, duplicate an existing Superhuman subsystem, or weaken established downstream boundaries.

Examples:

- a correctness fix arrives inside an upstream workflow that Superhuman has already reimplemented differently
- a shared-core refactor is valuable, but it needs different bridge points to preserve the `src/superhuman/` boundary
- an upstream UX improvement contains useful logic, but the interaction model needs to fit Superhuman's existing product surfaces
- a plugin-loading improvement is worth keeping, but the implementation must preserve Superhuman's compatibility promises and migration behavior

#### Decline

Do not merge the upstream change. Record why it was declined and revisit only if the product assumptions change.

Choose `decline` when the change conflicts with Superhuman's product direction, duplicates an existing Superhuman-owned implementation, introduces plugin-facing churn without a migration path, or creates architectural noise with little maintenance value.

Examples:

- a major UX or workflow shift that pushes the product toward an OpenClaw interaction model Superhuman does not want
- an upstream implementation that overlaps with an existing Superhuman-owned subsystem and would create two competing versions of the same behavior
- SDK, manifest, package, or plugin-id churn that would break the OpenClaw plugin ecosystem without a versioned compatibility story
- large structural renames or architecture churn that reduce upstream sync clarity without a concrete bug-fix, maintenance, or product win

## Final Release Criteria

The migration wave is complete only when all of the following are true:

1. README, docs homepage, UI shell, and package metadata present Superhuman as the product.
2. Legal provenance is preserved and easy to find.
3. `docs/` is the single public docs root.
4. `architecture/` is the internal architecture and migration root.
5. Runtime state and config defaults use Superhuman names and paths.
6. Legacy OpenClaw names still needed for compatibility are documented and intentionally scoped.
7. Representative OpenClaw plugins can still install, load, and run under Superhuman or have an explicit documented migration path.
8. Shared core remains reasonably close to upstream shape.
9. Downstream Superhuman logic is isolated in its own layer.
10. Redundant `super-*` filename prefixes inside the downstream layer are gone.
11. Upgrade tests from OpenClaw-shaped installs, including plugin setups, pass.
12. The autonomous maintenance boundary is documented, and critical decisions escalate with a complete decision packet instead of being guessed.

## Summary

The migration succeeds by doing four things at once:

- preserving provenance
- replacing public identity confusion
- keeping the OpenClaw plugin ecosystem as a deliberate product contract
- isolating the downstream product layer so upstream sync remains viable

The repo should not end this wave as a disguised OpenClaw fork or as a giant renamed copy of upstream.
It should end this wave as Superhuman with honest lineage, one product story, one public docs tree, a code structure that still lets you absorb upstream OpenClaw work, and a plugin story that stays compatible on purpose rather than by accident.
