# Agent Instructions

`AGENTS.md` is the canonical editable agent-instructions file. It enforces repo behavior while deferring canonical policy to `records/REPO.md`.

## Read First

- `records/REPO.md`
- `records/SPEC.md`
- `records/STATUS.md`
- `records/PLANS.md`
- `records/INBOX.md`
- `skills/README.md`

Before writing into an artifact directory, read its `README.md` and follow its prescriptive shape when it defines one.

## Skills

Load the skill before the trigger condition fires. Each skill defines the procedure; follow it.

| Trigger                                                              | Skill                                         |
| -------------------------------------------------------------------- | --------------------------------------------- |
| Before creating a normal commit                                      | `skills/commit-generator/SKILL.md`            |
| Before replacing, deleting, or rewriting content that already exists | `skills/clean-correction/SKILL.md`            |
| When routing work or creating repo artifacts                         | `skills/repo-orchestrator/SKILL.md`           |
| When reviewing inbox pressure                                        | `skills/daily-inbox-pressure-review/SKILL.md` |
| When reviewing upstream changes                                      | `skills/upstream-intake/SKILL.md`             |

Repo-agnostic skills (`sharpen-the-tip`, `prototype-mode`, `housekeeping`, `proactive-docs`) are **global**, not vendored per repo — they live in `~/.agents/skills/` via the `agents` module of LPFchan/setup, and your runtime surfaces them automatically.

## Rules

- Keep durable truth in repo files, not only in external tools.
- Route work using the routing ladder in `records/REPO.md`.
- Preserve the boundary between `records/SPEC.md`, `records/STATUS.md`, `records/PLANS.md`, `records/INBOX.md`, `records/research/`, `records/decisions/`, commit-backed `LOG-*`, and `records/upstream-intake/`.
- Worker agents produce evidence, proposals, and compliant `LOG-*` commits. The orchestrator or operator owns truth-doc updates unless the operator explicitly allows otherwise.
- Treat `records/INBOX.md` as pressure, not a backlog. Cluster capture; promote only survived triage.
- Promote sparsely. Do not mirror one thought into research, decisions, plans, spec, status, upstream, and execution records.
- Every normal commit must be created from a skeleton registered by `scripts/new-commit-message.sh` and must pass local and remote provenance checks.
- Follow the stable-ID and provenance rules in `records/REPO.md`.
- Do not put `LOG-*` ids inside `artifacts:`.
- Do not invent a document shape when the repo already provides a canonical surface, directory `README.md`, or template.
- Do not promote exploratory debate into truth docs or decisions until there is a concise accepted outcome.
- Do not turn an inbox review into a digest of every low-confidence idea. Report counts or clusters.
- Do not write chatty transcripts where the repo expects normalized records.
- Do not bypass commit provenance checks unless the commit is an explicit bootstrap or migration exception.

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

## Code Review Rules

- Before reporting a commit as missing required provenance fields, verify against the exact commit messages as they exist on GitHub. If the fields are present, do not claim they are missing.
- The provenance contract is defined in `records/REPO.md` and enforced by `scripts/new-commit-message.sh`. Cite the specific field that is missing and the rule it violates; do not review commits against an assumed format.
