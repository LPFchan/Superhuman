# LOG-20260409-005: Root Instruction And Commit Provenance Normalization

Opened: 2026-04-09 07-16-13 KST
Recorded by agent: 019d6de0-986d-75e2-8d79-d9ee201759ce

## Metadata

- Run type: orchestrator
- Goal: align the repo's root instruction surfaces and commit-provenance enforcement with the adopted repo-template operating model without overwriting repo-specific truth
- Related ids: LOG-20260409-003

## Task

Normalize the root instruction entrypoints, the artifact-directory writing guides, and the commit provenance enforcement layer so Superhuman follows repo-template more consistently.

## Scope

- In scope: root `AGENTS.md` and `CLAUDE.md`
- In scope: local guide normalization for `research/`, `records/`, and `upstream-intake/reports/`
- In scope: local hook and CI enforcement for commit provenance
- Out of scope: rewriting the already-dirty root truth docs or disturbing pre-existing staged changes

## Entry 2026-04-09 06-59-00 KST

- Action: normalized the touched artifact-directory guides toward repo-template default shapes and canonical examples
- Files touched: `research/README.md`, `records/decisions/README.md`, `records/agent-worklogs/README.md`, `upstream-intake/reports/README.md`, `upstream-intake/reports/internal-records/README.md`, `upstream-intake/reports/operator-briefs/README.md`
- Checks run: visual doc review against the repo-template scaffold guides
- Output: the local writing guides now tell agents what belongs in each surface and show a concrete example to mirror
- Blockers: none
- Next: wire commit provenance enforcement into local hooks, CI, and the commit helper

## Entry 2026-04-09 07-02-00 KST

- Action: added local and remote commit-provenance enforcement plus helper support
- Files touched: `git-hooks/commit-msg`, `scripts/check-commit-standards.sh`, `scripts/check-commit-range.sh`, `scripts/install-hooks.sh`, `.github/workflows/commit-standards.yml`, `scripts/committer`, `AGENTS.md`
- Checks run: `scripts/check-commit-standards.sh` on compliant and exception commit messages; `scripts/check-commit-range.sh HEAD^ HEAD`; `git config --get core.hooksPath`
- Output: commit provenance is now validated locally and in CI, while preserving the repo's existing `git-hooks` path and scoped `scripts/committer` workflow
- Blockers: existing pre-staged edits in root truth docs mean commits must stay scoped and avoid disturbing another in-progress index state
- Next: rewrite the root instruction surface so it reflects Superhuman instead of the upstream policy dump

## Entry 2026-04-09 07-15-00 KST

- Action: replaced the root instruction dump with a thin Superhuman-specific contract and converted `CLAUDE.md` into a compatibility shim
- Files touched: `AGENTS.md`, `CLAUDE.md`
- Checks run: `git status --short AGENTS.md CLAUDE.md`, `ls -l AGENTS.md CLAUDE.md`, direct content review
- Output: root instructions now point agents at the repo-template operating model, Superhuman's actual product posture, the canonical repo surfaces, and the provenance rules without carrying forward unrelated OpenClaw maintainer process notes
- Blockers: none
- Next: commit and push only the normalization/enforcement files, leaving the unrelated staged truth-doc edits untouched
