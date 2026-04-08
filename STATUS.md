# Superhuman Status

This document tracks current operational truth for the repo and product.

## Snapshot

| Field                         | Value                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Last updated                  | `2026-04-09`                                                                                                          |
| Overall posture               | `active`                                                                                                              |
| Current focus                 | Close the release gate and resolve the three operator decisions that define Superhuman's next chapter                 |
| Highest-priority blocker      | Remaining public-surface cleanup and final verification keep this migration wave short of release-candidate readiness |
| Next operator decision needed | `IBX-20260409-002`, `IBX-20260409-003`, and `IBX-20260409-004`                                                        |
| Related decisions             | `DEC-20260409-001`, `DEC-20260409-002`, `DEC-20260409-003`, `DEC-20260409-004`, `DEC-20260409-005`                    |

## Current State Summary

Superhuman is no longer at the raw rebrand stage. The repo is already Superhuman-first across the package shell, docs shell, canonical CLI and config defaults, and a growing downstream layer under `src/superhuman/`. The root repo-managed surfaces are now the canonical internal operating layer. The current reality is a late migration-cleanup phase: the public product still reads primarily as a personal AI assistant, the deeper project-workspace direction is accepted but not yet the dominant front-door experience, and the repo is not yet release-candidate ready because remaining public-surface cleanup and verification work is still open.

## Active Phases Or Tracks

### Migration Cleanup And Release Gate

- Goal: finish the remaining public-surface cleanup and verification required for release-candidate readiness
- Status: `in progress`
- Why this matters now: the repo is still explicitly pre-release for this migration wave
- Current work: docs cleanup, UI/app-facing cleanup, upgrade/compatibility verification, root repo-template adoption
- Exit criteria: remaining public cleanup resolved, verification gate complete, release posture no longer blocked by migration cleanup
- Dependencies: `LOG-20260409-001`, `IBX-20260409-001`, `IBX-20260409-002`
- Risks: hidden residual OpenClaw-first copy, missed compatibility regressions, release posture drift
- Related ids: `DEC-20260409-001`, `DEC-20260409-002`, `LOG-20260409-001`

### Work-First Product Recomposition

- Goal: shift Superhuman from admin-first and chat-first composition toward a work-first project workspace
- Status: `not started`
- Why this matters now: the repo has strong internal primitives, but the UX framing still under-expresses the product direction
- Current work: direction is accepted in research and planning, but not yet the dominant shipped composition
- Exit criteria: work, approvals, queue, runs, and outcomes become first-class user-facing surfaces
- Dependencies: `RSH-20260409-001`, `RSH-20260409-002`, `PLANS.md`
- Risks: current public framing remains narrower than the intended product
- Related ids: `RSH-20260409-001`, `RSH-20260409-002`, `IBX-20260409-003`

### Upstream Compatibility And Maintenance Discipline

- Goal: keep pulling value from OpenClaw without losing Superhuman product direction or compatibility clarity
- Status: `in progress`
- Why this matters now: Superhuman is still downstream of OpenClaw and upstream intake is an active operational need
- Current work: weekly intake, carry-forward decisions, compatibility watchlists, downstream boundary discipline
- Exit criteria: root upstream-intake is canonical and the operator boundary stays explicit
- Dependencies: `DEC-20260409-001`, `DEC-20260409-003`, `DEC-20260409-004`, `DEC-20260409-005`
- Risks: policy drift, upstream churn, compatibility regressions, unresolved operator calls lingering invisibly
- Related ids: `UPS-20260407-001`, `DEC-20260409-003`, `DEC-20260409-004`, `DEC-20260409-005`

## Recent Changes To Project Reality

- Date: `2026-04-09`
  - Change: root repo-managed surfaces became the canonical internal operating layer, and the routed `IBX-*` items were turned into a concrete execution roadmap
  - Why it matters: project memory and governance moved from architecture-side drafts to actual root operating surfaces, and the next chapter now has an explicit execution ladder
  - Related ids: `DEC-20260409-002`, `DEC-20260409-003`, `LOG-20260409-003`, `LOG-20260409-004`
- Date: `2026-04-07`
  - Change: a weekly upstream intake cycle produced explicit operator-facing escalations and carry-forward decisions
  - Why it matters: upstream maintenance is no longer implicit or ad hoc
  - Related ids: `UPS-20260407-001`
- Date: `2026-04-01`
  - Change: the package shell, docs shell, canonical CLI, and downstream `src/superhuman/` layer were already predominantly Superhuman-first
  - Why it matters: the migration wave is in late cleanup, not early naming ambiguity
  - Related ids: `LOG-20260409-001`, `DEC-20260409-001`

## Active Blockers And Risks

- Blocker or risk: remaining public-surface cleanup across docs, Control UI copy, and app display surfaces
  - Effect: prevents release-candidate posture
  - Owner: operator plus implementation agents
  - Mitigation: keep the migration cleanup track explicit and verify against release/readiness docs
  - Related ids: `IBX-20260409-001`, `LOG-20260409-001`
- Blocker or risk: unresolved third-party plugin canary and install-workflow validation choices
  - Effect: compatibility posture is principled but not yet backed by named canaries
  - Owner: operator
  - Mitigation: route canary selection and install-path choice through the inbox and into plans/decisions
  - Related ids: `IBX-20260409-002`, `RSH-20260409-004`
- Blocker or risk: the public product front door still reads narrower than the accepted workspace direction
  - Effect: product framing lags behind the intended project-workspace model
  - Owner: operator
  - Mitigation: keep the workspace-first shift explicit in `PLANS.md` and route UI recomposition through future execution phases
  - Related ids: `IBX-20260409-003`, `RSH-20260409-001`

## Immediate Next Steps

- Next: execute Roadmap 1 and clear the remaining release-gate blockers
  - Owner: operator plus implementation agents
  - Trigger: the release-closeout packet already exists in `PLANS.md`
  - Related ids: `IBX-20260409-001`, `LOG-20260409-001`, `LOG-20260409-004`
- Next: lock the compatibility lane by choosing canaries and the external install workflow
  - Owner: operator
  - Trigger: resolve Roadmap 2
  - Related ids: `IBX-20260409-002`, `RSH-20260409-004`, `LOG-20260409-004`
- Next: choose the public framing ramp and the dreaming trust boundary
  - Owner: operator
  - Trigger: resolve Roadmap 3 and Roadmap 4
  - Related ids: `IBX-20260409-003`, `IBX-20260409-004`, `UPS-20260407-001`, `LOG-20260409-004`

## Paused Or Completed Tracks

- Track: foundational naming ratification and migration charter
  - State: `done`
  - Why: canonical public identity values are already ratified for this migration wave
  - Revisit trigger: only if a foundational public identifier changes again
  - Related ids: `DEC-20260409-001`
- Track: downstream namespace establishment under `src/superhuman/`
  - State: `done`
  - Why: the downstream product boundary is already real and growing
  - Revisit trigger: boundary drift or a new shared-core/downstream rule
  - Related ids: `DEC-20260409-005`
- Track: root repo-managed workspace adoption
  - State: `done`
  - Why: the root operating surfaces now exist, are canonical, and the old architecture-local mirrors have been retired into pointers
  - Revisit trigger: only if the root operating model or artifact set changes again
  - Related ids: `DEC-20260409-002`, `DEC-20260409-003`, `LOG-20260409-003`, `LOG-20260409-004`
