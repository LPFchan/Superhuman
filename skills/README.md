# Skills

This directory is Superhuman's root skill tree.

It contains both:

- Superhuman / OpenClaw skills that the assistant product can expose to users
- required repo-template procedural skills that agents should read when operating this repo

Use the repo-template procedure skills as repo-native procedural documentation.
Agents should read the relevant workflow even when their runtime does not auto-load skills.

Each reusable workflow should live at `skills/<name>/SKILL.md`.

## Required Repo-Template Baseline Skills

- `repo-orchestrator/`
  - Generic routing workflow for truth, status, plans, research, decisions, commit-backed execution, and inbox capture.
- `daily-inbox-pressure-review/`
  - Focus-protecting daily triage for `IBX-*` capture and capture packets.

## Conditional Repo-Template Skills

- `upstream-intake/`
  - Companion workflow for the upstream-review module.
  - Included in Superhuman because this repo keeps root `upstream-intake/` active.

## Existing Superhuman Skills

Preserve existing local skill packages in this directory.

Do not move this repo's root `skills/` under `scaffold/`.
Do not treat the required repo-template procedures as permission to erase or flatten product/runtime skills.

## Skill Writing

Keep skills procedural.
Do not duplicate the canonical repo rules from `REPO.md` inside them.

Use `SKILL.md` for:

- step-by-step procedures
- required inputs and expected outputs
- escalation triggers
- links to supporting templates or reference docs

Do not use `SKILL.md` for:

- repo-wide policy
- general project truth
- local or personal preferences that belong in tool-specific memory files
