# Superhuman Status

This document tracks current operational truth for the repo and product.

## Snapshot

| Field                         | Value                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Last updated                  | `2026-04-10`                                                                                                                                                   |
| Overall posture               | `active research and architecture shaping`                                                                                                                     |
| Product maturity              | `not finished`                                                                                                                                                 |
| Deployment posture            | `not ready for deployment`                                                                                                                                     |
| Release posture               | `not ready for release or release-candidate evaluation`                                                                                                        |
| Current focus                 | Branding migration is largely complete; current work is defining and validating what Superhuman becomes beyond an OpenClaw fork                                |
| Highest-priority blocker      | Superhuman's post-fork product shape, operator surfaces, trust boundaries, and validation lanes are still being researched and formalized                      |
| Next operator decision needed | `IBX-20260409-002`, `IBX-20260409-003`, and `IBX-20260409-004`                                                                                                 |
| Related decisions             | `DEC-20260409-001`, `DEC-20260409-002`, `DEC-20260409-003`, `DEC-20260409-004`, `DEC-20260409-005`, `DEC-20260409-006`, `DEC-20260409-007`, `DEC-20260410-001` |

## Read This First

Superhuman should **not** currently be described as a finished product, a deployed platform, or a repo that is merely awaiting polish before release.

What is true:

- The OpenClaw-to-Superhuman branding migration has progressed far enough that the repo is no longer in an early rebrand state.
- The repo has substantial runtime, plugin, channel, app, and repo-memory infrastructure.
- The accepted direction is much larger than "an OpenClaw fork with new branding."
- The current stage is still **research-heavy and pre-release**.

What is not true:

- Superhuman is not ready for deployment.
- Superhuman is not ready for release.
- Superhuman is not at release-candidate readiness.
- The remaining work is not just surface polish; major product-shaping questions are still open.

## Current State Summary

Superhuman has largely completed the foundational branding and repo-governance migration away from "raw OpenClaw fork" status. The package shell, docs shell, canonical CLI/config defaults, repo-native operating surfaces, and downstream `src/superhuman/` boundary are real. The latest `LPFchan/repo-template` is also now the declared baseline for repos Superhuman creates, adopts, or manages beyond this repo itself.

That does **not** mean Superhuman is a finished or deployment-ready product. The current reality is that branding migration and repo-structure normalization have advanced faster than product-definition closure. Public-facing framing still reads primarily as a self-hosted personal AI assistant, while the accepted internal direction is toward a durable project workspace and operator cockpit. Desktop/mobile/messenger state, work surfaces, trust boundaries, memory posture, compatibility validation lanes, and desktop substrate strategy are still active research or decision areas.

The repo should therefore be understood as:

- post-migration enough to stop calling it an early rebrand
- pre-release enough that deployment or launch language is misleading
- actively researching and formalizing what "Superhuman beyond OpenClaw" actually becomes

## What Has Actually Settled

These points are established current truth, not open brainstorming:

- Superhuman is the canonical product identity for the repo.
- OpenClaw lineage is preserved explicitly through provenance and compatibility docs.
- Root repo-managed surfaces are now canonical project memory and operating artifacts.
- The latest `LPFchan/repo-template` is the default managed-repo model for repos Superhuman creates, adopts, or manages.
- A deliberate downstream Superhuman boundary exists under `src/superhuman/`.
- OpenClaw plugin ecosystem compatibility remains an explicit product commitment.
- A cross-surface state and agent-control model has been accepted at the product-truth level.
- A workspace-server deployment model has been accepted at the product-truth level.
- Routine execution history is now committed as commit-backed `LOG-*` records, and the legacy markdown execution surface is being retired.

Those accepted truths define direction and constraints. They do **not** imply that the corresponding full user-facing product has shipped.

## What Remains Unsettled

These are still materially open and keep the repo in research/pre-release posture:

- the public framing ramp from assistant-first toward workspace/operator-cockpit positioning
- the concrete work-first desktop or Control UI information architecture
- the exact desktop substrate or fork strategy
- the workspace-server API boundary in implemented product form
- the named third-party plugin canary set and external install workflow
- the dreaming / memory-writing trust boundary
- the final release and deployment validation standard for this post-fork product stage

## Active Phases Or Tracks

### Post-Fork Product Definition And Research

- Goal: define what Superhuman becomes beyond "OpenClaw fork with completed branding migration"
- Status: `in progress`
- Why this matters now: the repo has accepted direction and substantial infrastructure, but the product identity, operator UX, and trust model are still being shaped
- Current work: desktop/mobile/messenger IA research, workspace-server direction, coding harness evaluation, desktop substrate evaluation, memory/trust boundary framing
- Exit criteria: operator-facing product shape is explicit enough that the repo can be evaluated as a real build target rather than as a moving research target
- Dependencies: `RSH-20260409-001`, `RSH-20260409-002`, `RSH-20260409-006`, `RSH-20260409-007`, `RSH-20260409-008`, `RSH-20260409-009`, `DEC-20260409-007`, `DEC-20260410-001`
- Risks: agents or readers mistake completed migration work for completed product work
- Related ids: `RSH-20260409-001`, `RSH-20260409-002`, `RSH-20260409-006`, `RSH-20260409-007`, `RSH-20260409-008`, `RSH-20260409-009`, `DEC-20260409-007`, `DEC-20260410-001`

### Work-First Product Recomposition

- Goal: shift Superhuman from admin-first and chat-first composition toward a work-first project workspace
- Status: `not started as shipped product work`
- Why this matters now: the accepted direction is clear, but the current public and UI-facing composition still under-expresses it
- Current work: direction is accepted in research and planning; concrete desktop/mobile/messenger IA exploration is in progress; the first cross-surface state and agent-control contract is accepted
- Exit criteria: work, approvals, queue, runs, outcomes, and project memory become first-class user-facing surfaces
- Dependencies: `RSH-20260409-001`, `RSH-20260409-002`, `RSH-20260409-007`, `DEC-20260409-007`, `PLANS.md`
- Risks: current public framing remains narrower than the intended product and gets mistaken for the final product
- Related ids: `RSH-20260409-001`, `RSH-20260409-002`, `RSH-20260409-007`, `DEC-20260409-007`, `IBX-20260409-003`

### Branding Migration Closeout

- Goal: finish the remaining public-surface cleanup from OpenClaw-first identity to Superhuman-first identity
- Status: `in progress but no longer the main story`
- Why this matters now: migration residue still exists in docs, app-display surfaces, and some public/control UI copy
- Current work: docs cleanup, UI/app-facing cleanup, upgrade/compatibility verification, residual naming cleanup
- Exit criteria: remaining public cleanup resolved and migration residue is clearly compatibility-only rather than mixed public identity
- Dependencies: `LOG-20260409-001`, `IBX-20260409-001`, `IBX-20260409-002`
- Risks: readers confuse "late migration cleanup" with "late-stage release polish"
- Related ids: `DEC-20260409-001`, `LOG-20260409-001`

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

- Date: `2026-04-10`
  - Change: routine execution history moved to commit-backed `LOG-*` commits instead of legacy markdown `LOG-*` files
  - Why it matters: execution history now lives in git commit metadata and commit bodies, which keeps lineage recoverable without maintaining a parallel legacy markdown `LOG-*` surface
  - Related ids: `REPO.md`, `AGENTS.md`, `scripts/committer`, `scripts/check-commit-standards.sh`
- Date: `2026-04-10`
  - Change: the workspace-server deployment model was accepted as product direction
  - Why it matters: desktop is now defined as a client shell that can auto-launch a local workspace server and connect to remote workspace servers through the same state/API model, rather than being remote-server-only or split into incompatible local/remote modes
  - Related ids: `DEC-20260410-001`, `RSH-20260409-008`, `LOG-20260410-001`
- Date: `2026-04-09`
  - Change: cross-surface state and agent-control policy was accepted into canonical truth
  - Why it matters: desktop/mobile generic chat, project chat, runs, subagents, capture packets, approvals, messenger input, and repo artifacts now have a shared identity/provenance model before fork selection or UI buildout
  - Related ids: `DEC-20260409-007`, `RSH-20260409-007`, `LOG-20260409-011`
- Date: `2026-04-09`
  - Change: cross-surface desktop/mobile/messenger IA research was started as an explicit in-progress research lane
  - Why it matters: the workspace thesis now has a dedicated surface-planning thread without prematurely freezing the desktop information architecture
  - Related ids: `RSH-20260409-007`, `LOG-20260409-011`
- Date: `2026-04-09`
  - Change: the latest `LPFchan/repo-template` was ratified as the canonical repo-management baseline for repos Superhuman creates, adopts, or manages
  - Why it matters: Superhuman now has one explicit operating model for external repo work instead of treating repo-template as something it uses only for itself
  - Related ids: `DEC-20260409-006`, `LOG-20260409-010`
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
  - Why it matters: the migration wave moved out of early naming ambiguity before this status period
  - Related ids: `LOG-20260409-001`, `DEC-20260409-001`

## Active Blockers And Risks

- Blocker or risk: the repo can be mistaken for a finished or deployable product because branding progress is more advanced than product-definition progress
  - Effect: agents, operators, or readers may infer release maturity that does not exist
  - Owner: operator plus orchestrator
  - Mitigation: keep `STATUS.md`, `PLANS.md`, and public/internal framing explicit about research-stage posture
  - Related ids: `RSH-20260409-001`, `RSH-20260409-002`, `IBX-20260409-003`
- Blocker or risk: the public product front door still reads narrower than the accepted workspace direction
  - Effect: product framing lags behind the intended project-workspace model
  - Owner: operator
  - Mitigation: choose and execute the public framing ramp
  - Related ids: `IBX-20260409-003`, `RSH-20260409-001`
- Blocker or risk: unresolved third-party plugin canary and install-workflow validation choices
  - Effect: compatibility posture is principled but not yet backed by named canaries
  - Owner: operator
  - Mitigation: route canary selection and install-path choice through the inbox and into plans/decisions
  - Related ids: `IBX-20260409-002`, `RSH-20260409-004`
- Blocker or risk: dreaming and automatic memory-writing posture remains unresolved
  - Effect: trust boundary for memory behavior is still open
  - Owner: operator
  - Mitigation: resolve the memory-trust escalation before stronger memory claims or implementation expansion
  - Related ids: `IBX-20260409-004`, `UPS-20260407-001`
- Blocker or risk: remaining public-surface cleanup across docs, Control UI copy, and app display surfaces
  - Effect: even the migration-closeout layer is not fully complete
  - Owner: operator plus implementation agents
  - Mitigation: keep the migration cleanup track explicit and verify against readiness docs
  - Related ids: `IBX-20260409-001`, `LOG-20260409-001`

## Immediate Next Steps

- Next: keep the repo truth explicit that Superhuman is not ready for deployment or release
  - Owner: operator plus orchestrator
  - Trigger: any status, docs, or agent-facing artifact that might imply launch readiness
  - Related ids: `STATUS.md`, `PLANS.md`
- Next: lock the compatibility lane by choosing canaries and the external install workflow
  - Owner: operator
  - Trigger: resolve Roadmap 2
  - Related ids: `IBX-20260409-002`, `RSH-20260409-004`, `LOG-20260409-004`
- Next: choose the public framing ramp and the dreaming trust boundary
  - Owner: operator
  - Trigger: resolve Roadmap 3 and Roadmap 4
  - Related ids: `IBX-20260409-003`, `IBX-20260409-004`, `UPS-20260407-001`, `LOG-20260409-004`
- Next: continue desktop/workspace-server/harness research before any desktop substrate commitment
  - Owner: operator plus research agents
  - Trigger: current RSH desktop and harness evaluation lanes remain in progress
  - Related ids: `RSH-20260409-008`, `RSH-20260409-009`, `DEC-20260410-001`

## Explicit Non-Claims

To avoid future misreadings, this status document does **not** imply any of the following:

- that Superhuman is currently deployed as a finished product
- that the repo is in release polishing only
- that "late migration stage" means "nearly launch-ready"
- that accepted architecture direction has already become a shipped product surface

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
- Track: canonical managed-repo baseline ratification
  - State: `done`
  - Why: the latest repo-template is now the declared default for repos Superhuman creates, adopts, or manages beyond this repo itself
  - Revisit trigger: if the upstream repo-template baseline or Superhuman's exception policy changes materially
  - Related ids: `DEC-20260409-006`, `LOG-20260409-010`
- Track: early fork-identity ambiguity
  - State: `done`
  - Why: the repo should no longer be described as being in raw or early branding migration
  - Revisit trigger: only if identity or provenance posture changes again
  - Related ids: `DEC-20260409-001`, `LOG-20260409-001`
