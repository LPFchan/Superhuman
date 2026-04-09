# LOG-20260409-010: Canonical Managed-Repo Model

Opened: 2026-04-09 08-21-17 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Run type: orchestrator
- Goal: make the latest `LPFchan/repo-template` the canonical repo-management model for repos Superhuman creates, adopts, or manages
- Related ids: DEC-20260409-006

## Task

Broaden Superhuman's repo-template posture from "used by this repo" to "the default operating model for any repo Superhuman works with under its own management model."

## Scope

- In scope: canonical contract updates, root instruction updates, product-truth and planning updates, and one durable decision record
- In scope: aligning Superhuman with the latest repo-template scaffold and recreate prompt
- Out of scope: implementing automated repo-adoption tooling or changing public-facing product copy

## Entry 2026-04-09 08-21-17 KST

- Action: verified the current upstream and local repo-template baseline, then updated Superhuman's canonical docs to treat it as the default managed-repo model
- Files touched:
  - `REPO.md`
  - `AGENTS.md`
  - `SPEC.md`
  - `PLANS.md`
  - `STATUS.md`
  - `records/decisions/DEC-20260409-006-repo-template-as-canonical-managed-repo-model.md`
- Checks run:
  - `sed -n '1,260p' ~/Documents/repo-template/scaffold/REPO.md`
  - `sed -n '1,260p' ~/Documents/repo-template/scaffold/AGENTS.md`
  - `sed -n '1,260p' ~/Documents/repo-template/recreate-prompt.md`
  - `sed -n '1,220p' ~/Documents/repo-template/README.md`
  - repo-wide `rg` audit for current repo-template framing in root docs
- Output:
  - `REPO.md` now states that the latest `LPFchan/repo-template` is the canonical baseline for repos Superhuman creates, adopts, or manages
  - `AGENTS.md` now tells future agents how to apply that baseline to new repos and existing repos
  - `SPEC.md`, `PLANS.md`, and `STATUS.md` now reflect the broader managed-repo posture rather than treating repo-template as a self-only discipline
  - a new `DEC-*` records the policy so future repos can retrieve the rationale instead of inferring it from chat
- Blockers: none
- Next: if desired, add a dedicated procedural skill or workflow for repo-template-based repo creation and adoption

## Entry 2026-04-09 20-35-08 KST

- Action: merged the new mandatory repo-template skills layer into Superhuman's existing root `skills/` tree
- Files touched:
  - `AGENTS.md`
  - `REPO.md`
  - `skills/README.md`
  - `skills/repo-orchestrator/SKILL.md`
  - `skills/daily-inbox-pressure-review/SKILL.md`
  - `skills/upstream-intake/SKILL.md`
  - `records/agent-worklogs/LOG-20260409-010-canonical-managed-repo-model.md`
- Checks run:
  - `sed -n '1,260p' ~/Documents/repo-template/scaffold/skills/README.md`
  - `sed -n '1,360p' ~/Documents/repo-template/scaffold/skills/repo-orchestrator/SKILL.md`
  - `sed -n '1,320p' ~/Documents/repo-template/scaffold/skills/daily-inbox-pressure-review/SKILL.md`
  - `sed -n '1,360p' ~/Documents/repo-template/scaffold/skills/upstream-intake/SKILL.md`
  - `cmp -s` against the three repo-template baseline `SKILL.md` files
  - repo-relative `SKILL.md` Markdown link resolver
  - stale optional/scaffold wording search across the touched instruction and skill surfaces
  - `git diff --check`
- Output:
  - root `skills/README.md` now explains that Superhuman's existing skill catalog also carries required repo-template procedure skills
  - added `repo-orchestrator`, `daily-inbox-pressure-review`, and `upstream-intake` procedure skills at root `skills/`
  - `AGENTS.md` now makes `skills/README.md` a read-first file and points agents at the relevant `SKILL.md` before repeatable repo workflows
  - `REPO.md` now treats `skills/` as a required procedure layer without moving or replacing Superhuman's existing skill catalog
- Blockers: none for the skills baseline; separate cross-surface IA/state edits were already dirty and intentionally left intact
- Next: use `skills/repo-orchestrator/SKILL.md` as the first procedural target for repo-artifact routing work
