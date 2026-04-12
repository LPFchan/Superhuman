# Agent Instructions

This repo uses repo-template.

Treat `AGENTS.md` as the canonical editable agent-instructions file for the repo.
It should enforce repo behavior while deferring canonical policy details to `REPO.md`.

## Read First

- `REPO.md`
- `SPEC.md`
- `STATUS.md`
- `PLANS.md`
- `INBOX.md`
- `skills/README.md`

Before running a repeatable repo workflow, read the relevant `skills/<name>/SKILL.md`. Treat skills as repo-native procedures even when the agent runtime does not auto-load them.

When writing into an artifact directory, read that directory's `README.md` first. If it includes a prescriptive shape, follow it. If it is intentionally lightweight, keep the output lightweight too.

## Operating Rules

- Keep durable truth in repo files, not only in external tools.
- Route work using the routing ladder in `REPO.md`.
- Preserve the boundary between `SPEC.md`, `STATUS.md`, `PLANS.md`, `INBOX.md`, `research/`, `records/decisions/`, commit-backed execution history, and `upstream-intake/`.
- Worker agents should prefer evidence, proposals, and compliant commit-backed execution records. The orchestrator or operator owns truth-doc updates unless the operator explicitly allows a different flow.
- Treat `INBOX.md` as pressure, not a backlog. During inbox review, cluster capture and promote only survived triage.
- Promote sparsely. Do not mirror one evolving thought into research, decisions, plans, spec, status, upstream records, and execution records.
- If the repo tracks upstream on a cadence, use `upstream-intake/` instead of inventing a parallel workflow.
- When creating artifacts or commits, follow the stable-ID and provenance rules in `REPO.md`.
- Prefer the local `README.md` shape over ad hoc formatting when it defines one.
- Your commit message must satisfy the local repo provenance check before the commit is allowed.
- Your pushed commits must satisfy the same provenance rules remotely in CI.
- Treat each committed change as a canonical execution record through `commit: LOG-*`.
- Normal commits must use the structured body keys `timestamp:`, `changes:`, `rationale:`, and `checks:` with `notes:` optional.
- When migrating legacy `LOG-*` history, rewrite the real unpublished commits or preserve the legacy exception record; do not add standalone backfill-only commits to the visible history.

## Enforcement

When you write or update repo artifacts, adherence to the repo's ruleset is required.

- Do not invent a new document shape when the repo already provides a canonical surface, directory `README.md`, or explicit template.
- Do not collapse truth, plans, decisions, research, inbox capture, and execution history into one mixed artifact.
- Do not promote exploratory debate into `SPEC.md`, `STATUS.md`, `PLANS.md`, or `records/decisions/` until there is a concise accepted outcome for that layer.
- Do not turn an inbox review into a giant digest of every low-confidence idea. Report counts or clusters when full detail does not protect focus.
- Do not write chatty transcripts where the repo expects normalized records.
- If an artifact guide is intentionally lightweight, do not over-structure the document just to make it look uniform.
- If the repo guidance and the requested output appear to conflict, follow the repo rules and explain the tension in the artifact or handoff.
- Do not bypass commit provenance checks by omitting required trailers unless the commit is an explicit bootstrap or migration exception.
- Do not put `LOG-*` ids inside `artifacts:`.

## Skills

`skills/<name>/SKILL.md` files are reusable procedures for bounded workflows.

- Keep them procedural.
- Do not duplicate canonical repo policy inside them.
- Use them to standardize repeatable tasks, escalation triggers, and output shape.

## Local Divergence

This repository is Superhuman, a repo-template-managed fork that still preserves explicit OpenClaw lineage and compatibility commitments.

- Current public reality: Superhuman ships as a self-hosted personal AI assistant across channels, the web, and paired devices.
- Accepted direction: Superhuman is becoming a durable project workspace and operator cockpit with repo-native memory and orchestrated agents.
- Managed-repo posture: new repos should start from repo-template, and existing repos should adopt it with the smallest viable diff rather than inventing bespoke governance.
- Keep both truths visible. Do not write public-facing copy as if the workspace thesis is already fully shipped, and do not hide the accepted direction in internal artifacts.
- Preserve OpenClaw lineage and plugin compatibility as explicit product commitments, not as embarrassing leftovers.
- `README.md` is public-facing. Internal project truth belongs in the root repo surfaces, not in marketing copy.
- `PROVENANCE.md` stays separate because lineage is a permanent concern, not a subsection to hide inside another file.
- Superhuman keeps the root `skills/` tree as both the product skill catalog and the repo-template procedure layer; preserve existing local skills beside the required repo-template skills.
- Prefer adding Superhuman-specific behavior in `src/superhuman/` or behind explicit seams instead of scattering fork policy across generic shared core.
- Preserve plugin and SDK compatibility by default. Extensions should cross package boundaries through `openclaw/plugin-sdk/*`, manifests, and local barrels such as `api.ts` or `runtime-api.ts`, not by deep-importing `src/**` or other extensions' internals.
- Runtime baseline: Node 22+.
- Install dependencies with `pnpm install`.
- Default local gate: `pnpm check`.
- Run targeted tests for the touched logic. Run `pnpm test` before pushing when you changed behavior or runtime logic.
- Run `pnpm build` before pushing if the change can affect build output, packaging, lazy-loading boundaries, or published/public surfaces.
- Run `pnpm ui:build` when touching Control UI assets or packaging paths that depend on the built UI.
- Commit provenance is enforced locally through `.githooks/commit-msg` and remotely through `.github/workflows/commit-standards.yml`.
- Do not edit `node_modules`.
- Do not patch dependencies or update pinned patched dependencies without explicit approval.
- Never update the Carbon dependency.
