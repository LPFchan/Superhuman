# Superhuman Agent Instructions

This repository is Superhuman, a repo-template-managed fork that still preserves explicit OpenClaw lineage and compatibility commitments.

`REPO.md` is the canonical repo contract. Root `CLAUDE.md` is a thin compatibility shim that points back to this file through `AGENTS.md`.

## Read First

Read these before substantial work:

- `REPO.md`
- `SPEC.md`
- `STATUS.md`
- `PLANS.md`
- `INBOX.md`
- `PROVENANCE.md` when lineage, compatibility, or historical posture matters

If a touched subtree has its own `AGENTS.md`, read that too and treat it as binding for that path.

## Product Truth

- Current public reality: Superhuman ships as a self-hosted personal AI assistant across channels, the web, and paired devices.
- Accepted direction: Superhuman is becoming a durable project workspace and operator cockpit with repo-native memory and orchestrated agents.
- Keep both truths visible. Do not write public-facing copy as if the workspace thesis is already fully shipped, and do not hide the accepted direction in internal artifacts.
- Preserve OpenClaw lineage and plugin compatibility as explicit product commitments, not as embarrassing leftovers.

## Canonical Repo Surfaces

- `README.md`: public product front door
- `SPEC.md`: durable product and system truth
- `STATUS.md`: current operational reality
- `PLANS.md`: accepted future direction
- `INBOX.md`: ephemeral routed intake
- `research/`: curated research memos
- `records/decisions/`: durable decision records
- `records/agent-worklogs/`: execution history
- `upstream-intake/`: canonical upstream review and escalation surface
- `architecture/`: evidence, migration material, and archive context, not the canonical operating layer

Use the correct surface for the job. Do not collapse truth, plans, research, decisions, worklogs, inbox items, and upstream review into one mixed document.

Before editing a repo artifact, read the matching local guide first. These are binding by default when they define section order, required provenance, or canonical examples:

- `research/README.md`
- `records/decisions/README.md`
- `records/agent-worklogs/README.md`
- `upstream-intake/reports/README.md`
- `upstream-intake/reports/internal-records/README.md`
- `upstream-intake/reports/operator-briefs/README.md`

When a repo artifact has the right substance but the wrong shape, normalize it toward the local guide with the smallest meaningful diff. Preserve repo-specific truth, IDs, dates, decisions, and historical facts.

## Repo Map

- `src/`: shared runtime, CLI, gateway, plugin SDK, and channel internals
- `src/superhuman/`: deliberate downstream Superhuman boundary for fork-specific behavior
- `extensions/`: bundled plugins and extension surfaces
- `apps/`: macOS, iOS, and Android clients
- `docs/`: public documentation
- `skills/`: reusable repo workflows and helpers

High-value subtree guides live at:

- `src/plugin-sdk/AGENTS.md`
- `src/plugins/AGENTS.md`
- `src/channels/AGENTS.md`
- `src/gateway/protocol/AGENTS.md`
- `extensions/AGENTS.md`

## Boundary Rules

- Prefer adding Superhuman-specific behavior in `src/superhuman/` or behind explicit seams instead of scattering fork policy across generic shared core.
- Preserve plugin and SDK compatibility by default. Extensions should cross package boundaries through `openclaw/plugin-sdk/*`, manifests, and local barrels such as `api.ts` or `runtime-api.ts`, not by deep-importing `src/**` or other extensions' internals.
- Treat protocol and public SDK changes as contract changes. Favor additive evolution and document any compatibility-sensitive seam.
- If you change shared routing, onboarding, or message flow, consider all built-in and bundled-plugin channel surfaces rather than fixing only one path.
- Use `plugin` / `plugins` in docs and UI copy. Keep legacy `openclaw` identifiers only where compatibility, package names, CLI aliases, or SDK contracts require them.

## Docs And Writing Rules

- `README.md` is public-facing. Internal project truth belongs in the root repo surfaces, not in marketing copy.
- Mintlify doc links inside `docs/**/*.md` should be root-relative and omit `.md` or `.mdx`.
- In chat replies, use repo-root-relative file references only.
- When the user asks for docs links, give full public URLs.
- `docs/zh-CN/**` is generated; do not edit it unless explicitly asked.
- Keep docs generic: no personal device names, hostnames, or local paths in examples.

## Verification

- Runtime baseline: Node 22+.
- Install dependencies with `pnpm install`.
- Default local gate: `pnpm check`.
- Run targeted tests for the touched logic. Run `pnpm test` before pushing when you changed behavior or runtime logic.
- Run `pnpm build` before pushing if the change can affect build output, packaging, lazy-loading boundaries, or published/public surfaces.
- Run `pnpm ui:build` when touching Control UI assets or packaging paths that depend on the built UI.
- Do not land changes with failing related checks.

## Commits And Provenance

- Use `scripts/committer` so staging stays scoped.
- Normal commits must include the required provenance trailers:
  - `project: <project-id>`
  - `agent: <agent-id>`
  - `role: orchestrator|worker|subagent|operator`
  - `artifacts: <artifact-id>[, <artifact-id>...]`
- Prefer `scripts/committer --artifacts <ID[, ID...]> "Subject" <file...>` with `CODEX_THREAD_ID` available so the helper can append compliant trailers automatically.
- Use `--role` when the default `orchestrator` role is wrong.
- Use `--exception bootstrap|migration` only for explicit bootstrap or migration commits.
- Commit provenance is enforced locally through `git-hooks/commit-msg` and remotely through `.github/workflows/commit-standards.yml`.
- Do not create merge commits on `main`; rebase onto the latest `origin/main` instead.

## Safety And Repo Hygiene

- Do not edit files covered by security-focused `CODEOWNERS` rules unless a listed owner explicitly asked for the change or is already reviewing it with you.
- Never edit `node_modules`.
- Do not patch dependencies or update pinned patched dependencies without explicit approval.
- Never update the Carbon dependency.
- If you add a new `AGENTS.md` in a subtree, also add a sibling `CLAUDE.md` shim or symlink that points back to it.
