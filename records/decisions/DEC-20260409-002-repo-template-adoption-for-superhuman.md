# Repo-Template Adoption For Superhuman

- Decision id: `DEC-20260409-002`
- Opened: `2026-04-09 05-19-05 KST`
- Recorded by agent: `019d6de0-986d-75e2-8d79-d9ee201759ce`
- Status: `accepted`

## Decision

Superhuman adopts the repo-template framework for itself at the repository root.

## Why

- Superhuman’s product direction depends on repo-native truth, plans, research, decisions, worklogs, and upstream review.
- Keeping that operating model as an architecture-side draft would leave the product’s own repo outside the discipline it is supposed to provide.
- Root-managed surfaces make the project’s own memory model real and immediately usable by future orchestrator and worker agents.

## Consequences

- The canonical repo-managed surfaces live at the repository root: `repo-operating-model.md`, `SPEC.md`, `STATUS.md`, `PLANS.md`, `INBOX.md`, `research/`, `records/`, and `upstream-intake/`.
- `architecture/` becomes the internal evidence, migration, research, and historical snapshot tree.
- Superhuman adopts repo-template’s framework, not its packaging. Template-specific `scaffold/`, template `skills/`, and `recreate-prompt.md` do not belong in this repo.

## Source Material

- `architecture/repo-operating-model.md`
- `architecture/repo-templates/README.md`
- `architecture/superhuman-architecture-technical.md`
- `architecture/superhuman-architecture-simple.md`
- `architecture/Superhuman UX Research (revised).md`

## Related Artifacts

- `repo-operating-model.md`
- `SPEC.md`
- `STATUS.md`
- `PLANS.md`
- `records/agent-worklogs/LOG-20260409-003-root-repo-template-adaptation-bootstrap.md`
