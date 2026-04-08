# Upstream Intake

This directory is the canonical root-level home for Superhuman's recurring upstream OpenClaw intake workflow.

Use this package when reviewing upstream releases, compare windows, or candidate sync work.

## What Lives Here

1. [weekly-upstream-intake-template.md](weekly-upstream-intake-template.md)
   - Full decision log for weekly intake and per-change analysis.
2. [operator-weekly-brief-template.md](operator-weekly-brief-template.md)
   - Lightweight operator-facing summary format.
3. [intake-method.md](intake-method.md)
   - The working method: candidate decisions, duplicate detection, drill-down prompts, urgency scoring, evidence ladder, and recommendation shapes.
4. [compatibility-watchlist.md](compatibility-watchlist.md)
   - The standing list of compatibility-sensitive surfaces that always need extra scrutiny.
5. [known-local-overrides.md](known-local-overrides.md)
   - Intentional Superhuman divergences that should not be rediscovered from scratch every week.
6. [decision-carry-forward.md](decision-carry-forward.md)
   - Previous `accept` / `adapt` / `decline` outcomes that should carry into later reviews unless a revisit trigger fires.
7. [reports/README.md](reports/README.md)
   - How to store completed weekly intake artifacts.

## Working Model

The weekly intake process should produce two separate artifacts by default:

- a full internal decision record using [weekly-upstream-intake-template.md](weekly-upstream-intake-template.md)
- a separate lighter operator brief using [operator-weekly-brief-template.md](operator-weekly-brief-template.md)

Both artifacts from the same intake cycle should share the same `UPS-*` review id.

The agent should use [intake-method.md](intake-method.md) to keep reviews consistent across weeks.

## Canonical Rule

If a file outside this directory references an older architecture-local intake path, treat this directory as the source of truth.
`architecture/weekly-upstream-intake-template.md` remains only as a compatibility entry point.
