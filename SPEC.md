# Superhuman Spec

This document is the canonical statement of what Superhuman is supposed to be.

## Identity

| Field             | Value                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Project           | `Superhuman`                                                                                                           |
| Canonical repo    | `https://github.com/LPFchan/Superhuman`                                                                                |
| Project id        | `superhuman`                                                                                                           |
| Operator          | single-operator-first                                                                                                  |
| Last updated      | `2026-04-09`                                                                                                           |
| Related decisions | `DEC-20260409-001`, `DEC-20260409-002`, `DEC-20260409-003`, `DEC-20260409-004`, `DEC-20260409-005`, `DEC-20260409-006` |

## Product Thesis

Superhuman is a framework for running ambitious projects without losing coherence. Today it ships as a personal AI assistant you run on your own devices, with a gateway that spans chat apps, the web dashboard, and paired devices. Its deeper product direction is to become a durable project workspace with a canonical home for memory, direction, research, and execution, so operators can prompt, summon, monitor, and steer agentic work across devices without scattering truth across chat transcripts and admin panels.

## Current Public Reality And Directional Truth

| Layer                  | What is true                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Current public reality | Superhuman is a self-hosted personal AI assistant with multi-channel messaging, multi-device access, plugin-backed extensibility, and a gateway/control-plane model.                             |
| Directional truth      | Superhuman is evolving into a unified project workspace where work, plans, repo memory, approvals, agent runs, and upstream maintenance are treated as first-class operating surfaces.           |
| Managed repo baseline  | The latest `LPFchan/repo-template` is the default operating model for repos Superhuman creates or manages; local repo contracts may extend it but should not casually replace its core surfaces. |
| Compatibility posture  | OpenClaw lineage and plugin ecosystem compatibility remain explicit product commitments, not temporary migration leftovers.                                                                      |
| Safety posture         | Strong defaults, visible approvals, explicit trust boundaries, and operator-controlled autonomy remain non-negotiable.                                                                           |

## Primary User And Context

| Field                        | Value                                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| Primary operator             | A single ambitious builder running long-lived software and agent-driven projects                          |
| Primary environment          | Desktop-first, but expected to expand into synchronized desktop and mobile access                         |
| Primary problem being solved | Keeping real project work coherent across messages, sessions, agents, tools, devices, and upstream change |
| Why this matters             | Project entropy destroys leverage when ideas, decisions, and execution history drift apart                |

## Primary Workspace Object

The primary workspace object is the `project workspace`.

Inside a project workspace, the operator should be able to:

- capture ideas or requests from anywhere
- route them into the right project memory surface
- run or delegate work through agents
- inspect what happened and why
- keep project truth, plans, and history coherent over time

`work items`, `agent runs`, and `messages` are supporting objects inside the workspace, not the top-level product identity.

## Canonical Interaction Model

1. Capture work from desktop, mobile, messenger, or a direct operator prompt.
2. Route the work through the orchestrator into the right project surface: truth, status, plans, research, decisions, execution, or upstream review.
3. Review proposed actions, trust posture, and approval requirements.
4. Run or delegate the work through orchestrated agents.
5. Observe outputs, blockers, provenance, and final state from a durable project record.
6. Re-enter the same workspace later from desktop or mobile without losing context.

## Core Capabilities

| Capability                      | Why it exists                                                                          | What must remain true                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Cross-surface assistant runtime | Superhuman must be reachable from the tools and devices the operator already uses      | One assistant identity should persist across channels, sessions, and paired devices          |
| Project workspace memory        | The operator needs a canonical place for truth, status, plans, research, and execution | Repo-native truth must not dissolve into chat logs                                           |
| Managed repo standardization    | Superhuman needs one repeatable repo operating model across projects                   | New and adopted repos should default to latest `LPFchan/repo-template` plus local extensions |
| Multi-agent orchestration       | Ambitious work needs delegation, monitoring, and synthesis                             | One orchestrator should keep agent work attributable and understandable                      |
| Explicit provenance             | Decisions and execution need durable attribution                                       | Artifacts, agents, and commits must stay connected over time                                 |
| Upstream-compatible evolution   | Superhuman still benefits from upstream OpenClaw fixes and ecosystem continuity        | Provenance and plugin compatibility must stay explicit                                       |
| Safety and operator control     | Higher autonomy only works if risk boundaries remain legible                           | Trust mode, approvals, and escalation rules must remain visible and deliberate               |

## Invariants

- `README.md` is the public front door; `SPEC.md` is the canonical internal truth surface.
- `PROVENANCE.md` remains a separate permanent lineage document.
- OpenClaw provenance is preserved rather than hidden.
- OpenClaw-compatible plugin contracts remain stable by default unless a migration path ships together with any change.
- The latest `LPFchan/repo-template` is the canonical baseline for repos Superhuman creates, adopts, or manages; repo-local contracts may extend it but should not reinvent the core surfaces without explicit operator approval.
- The orchestrator owns default routing from intake into repo memory surfaces.
- Messenger surfaces are for capture, notification, approvals, summaries, and redirection; they are not canonical truth-authoring surfaces.
- The repo keeps truth, status, plans, research, decisions, and execution history in separate surfaces.
- Single-operator-first ownership is the default product posture for now.
- Mobile should mature as a project cockpit before it tries to become a full mobile IDE.

## Non-Goals

- Becoming a chat transcript archive with no durable project memory.
- Rebranding away OpenClaw lineage as if the codebase were written from scratch.
- Treating plugin compatibility as an accidental leftover instead of a product contract.
- Making admin or topology views the primary user-facing identity of the product.
- Turning mobile into a full coding IDE before the workspace and cockpit model is strong.

## Main Surfaces

| Surface                         | Purpose                                                    | Notes                                                         |
| ------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| `README.md`                     | Public product front door                                  | Personal-assistant-first today                                |
| Gateway and channels            | Persistent runtime shell                                   | Current shipping assistant surface                            |
| Control UI                      | Visual operations and oversight surface                    | Needs to evolve from admin-first toward work-first            |
| Mobile clients                  | Project cockpit surface                                    | Prioritize capture, approvals, monitoring, and redirection    |
| Messenger surfaces              | Capture and control channels                               | Not canonical truth-authoring surfaces                        |
| Repo-managed workspace surfaces | Truth, status, plans, inbox, research, decisions, worklogs | Canonical internal project memory                             |
| `upstream-intake/`              | Upstream review and operator escalation                    | Active because Superhuman remains downstream of OpenClaw      |
| `src/superhuman/`               | Deliberate downstream product boundary                     | Keeps Superhuman-specific behavior out of generic shared core |

## Success Criteria

- The operator can explain what Superhuman is, what is true now, what comes next, and what already happened without reconstructing it from chat.
- Repo-native truth, plans, decisions, and worklogs are usable as the canonical memory for the project.
- A new or adopted repo can be brought under Superhuman using the same repo-template-based memory and provenance model without inventing bespoke governance from scratch.
- The current assistant product remains usable while the workspace-first direction is built.
- Upstream fixes and plugin ecosystem compatibility remain manageable rather than turning into a breakaway trap.
- The product can gradually shift from chat-first/admin-first surfaces toward workspace-first/operator-cockpit surfaces without losing safety or coherence.

## Related Artifacts

- Current operational reality: `STATUS.md`
- Accepted future direction: `PLANS.md`
- Untriaged intake: `INBOX.md`
- Provenance and lineage: `PROVENANCE.md`
- Decision history: `records/decisions/`
- Execution history: `records/agent-worklogs/`
- Research: `research/`
- Upstream review: `upstream-intake/`
