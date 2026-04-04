# Weekly Upstream Intake Template

Use this template during the weekly OpenClaw upstream intake review.
Use the same template when a review item must be escalated to the operator for a critical decision.

This file lives in `architecture/` as the canonical weekly upstream intake template.

## Review Metadata

- Review date:
- Reviewer:
- Upstream window reviewed:
- Upstream refs or PRs reviewed:
- Superhuman branch or working baseline:

## Candidate Change

- Title:
- Upstream area:
- Upstream summary:
- Why it matters:

## Decision

- Decision: `accept` | `adapt` | `decline`
- Decision owner:
- Ship target:
- Related issue, PR, or ADR:

## Escalation

- Escalation required: `yes` | `no`
- Why operator input is required:
- Recommended decision: `accept` | `adapt` | `decline` | `defer`
- What can proceed without approval:
- What is blocked pending approval:
- Re-raise by:

## Decision Rationale

- Reason for the decision:
- Product impact:
- Shared-core impact:
- Downstream `src/superhuman/` impact:
- Plugin ecosystem impact:
- Docs or migration impact:

## Acceptance Checks

Complete this section for every decision type.

- Security implications checked:
- Correctness or bug-fix value checked:
- Maintenance cost checked:
- Plugin compatibility checked:
- Existing Superhuman implementation overlap checked:
- Upstream-sync clarity checked:

## If `accept`

- Merge strategy:
- Local deviations kept:
- Required tests:
- Follow-up cleanup:

## If `adapt`

- Upstream improvement being preserved:
- Local adaptation approach:
- Why direct adoption is wrong for Superhuman:
- Compatibility layer or bridge needed:
- Tests that prove the adaptation:

## If `decline`

- Why Superhuman is declining the change:
- What existing Superhuman behavior already covers this area:
- What would need to change for this to be reconsidered:
- Whether this needs a standing note for future weekly reviews:

## Verification

- Verification status:
- Commands or checks run:
- Risk level:
- Rollback plan if the decision later proves wrong:

## Notes for Next Intake

- Revisit date if needed:
- Related upstream work to watch:
- Follow-up tasks:

## Example One-Line Summary

`Adapt upstream session-routing fix: keep the correctness change, preserve Superhuman's existing workflow, and retain current plugin-loading behavior.`
