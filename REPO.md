# Superhuman Repo Contract

This document is the canonical repo contract for Superhuman.

## Purpose

Superhuman uses the latest [`LPFchan/repo-template`](https://github.com/LPFchan/repo-template) as its canonical repo operating model.

That means this repository is no longer using `architecture/` as an architecture-side draft of repo operating surfaces. The canonical repo-native surfaces now live at the repository root.

That same baseline is also the default way Superhuman should create, adopt, and manage other repos unless the operator explicitly approves a different local contract.

The goal is to let Superhuman run as a long-lived project without losing coherence across:

- public product identity
- durable project truth
- accepted future direction
- exploratory research
- explicit decisions
- execution history
- upstream intake

## Canonical Managed-Repo Baseline

For repos beyond Superhuman itself, the default rule is:

- use the latest `LPFchan/repo-template` scaffold and operating rules as the baseline
- keep a local `REPO.md` in each managed repo as that repo's canonical contract
- preserve stronger repo-specific workflow rules, CI, commands, and product truth when merging the model into an existing repo
- do not vendor template packaging blindly when the target repo already has real project structure
- do not invent a bespoke repo-memory system when repo-template already fits the need

Practical defaults:

- New repo created by Superhuman:
  - instantiate the current repo-template scaffold from the start
  - seed `REPO.md`, `SPEC.md`, `STATUS.md`, `PLANS.md`, and `INBOX.md`
  - keep `upstream-intake/` active, dormant, or omitted based on the repo's real needs
- Existing repo adopted or managed by Superhuman:
  - merge repo-template into the real repo with the smallest viable diff
  - preserve stronger local rules and explicit product constraints
  - record intentional divergences in that repo's `REPO.md` or decision history

## Relationship To Other Root Docs

The root docs have different jobs on purpose:

| Surface                   | Role                                                  |
| ------------------------- | ----------------------------------------------------- |
| `README.md`               | Public product front door                             |
| `PROVENANCE.md`           | Legal and historical lineage                          |
| `REPO.md`                 | Canonical repo contract                               |
| `SPEC.md`                 | Durable truth about what Superhuman is supposed to be |
| `STATUS.md`               | Current operational reality                           |
| `PLANS.md`                | Accepted future direction                             |
| `INBOX.md`                | Ephemeral intake waiting for routing                  |
| `research/`               | Curated research worth future retrieval               |
| `records/decisions/`      | Durable decisions with rationale                      |
| `records/agent-worklogs/` | Execution history                                     |
| `upstream-intake/`        | Canonical upstream review and maintenance surface     |

`README.md` stays public and product-facing.
`PROVENANCE.md` stays separate because lineage is a permanent concern, not a subsection to hide inside another file.

## Core Surfaces

Superhuman uses these root surfaces as its canonical project backbone:

| Surface                   | Role                                                     | Mutability              |
| ------------------------- | -------------------------------------------------------- | ----------------------- |
| `SPEC.md`                 | Durable statement of what Superhuman is supposed to be   | rewritten               |
| `STATUS.md`               | What is true right now operationally                     | rewritten               |
| `PLANS.md`                | Accepted future direction that is not current truth yet  | rewritten               |
| `INBOX.md`                | Ephemeral intake and unresolved routing items            | append then purge       |
| `research/`               | Curated research memos                                   | append by new file      |
| `records/decisions/`      | Durable decision records                                 | append-only by new file |
| `records/agent-worklogs/` | Execution history for agents and runs                    | append-only             |
| `upstream-intake/`        | Canonical upstream intake, review, and escalation system | append by cadence       |

## Separation Rules

These boundaries are mandatory:

- `SPEC.md` is not a changelog.
- `STATUS.md` is not a transcript.
- `PLANS.md` is not a brainstorm dump.
- `INBOX.md` is not durable truth.
- `research/` is not raw execution history.
- `records/decisions/` is not the same as `records/agent-worklogs/`.
- `README.md` is not the internal source of truth.
- Off-Git memory is not a substitute for repo-local canonical docs.

This separation exists so future operators and future agents can answer different questions quickly:

- What is Superhuman supposed to be? -> `SPEC.md`
- What is true right now? -> `STATUS.md`
- What future work is accepted? -> `PLANS.md`
- What did we learn from exploration? -> `research/`
- What did we decide and why? -> `records/decisions/`
- What actually happened during execution? -> `records/agent-worklogs/`

## Roles

### Operator

The operator is the final authority for product direction, escalation outcomes, and acceptance of truth changes.

### Orchestrator Agent

The orchestrator owns synthesis and routing.

It may:

- triage inbox items
- classify work into the right artifact layer
- update `SPEC.md`, `STATUS.md`, and `PLANS.md`
- create research memos
- create decision records
- append to worklogs and create a new log only when clarity requires it
- translate messenger intake into repo artifacts
- escalate non-obvious product, architecture, workflow, or policy calls

### Worker Agents

Worker agents execute bounded tasks.

They may:

- append to worklogs
- propose truth changes through the orchestrator
- create evidence, summaries, and implementation outputs

They should not update `SPEC.md`, `STATUS.md`, or `PLANS.md` directly unless the operator explicitly allows that flow.

### Messenger Surfaces

Messenger surfaces are intake and control channels.

They may:

- create or append inbox intake
- request approvals
- deliver summaries
- surface blocked states

They must not write truth docs directly.

## Routing Ladder

When new work arrives, the orchestrator should classify it in this order:

1. Is this untriaged intake?
   - Route to `INBOX.md`.
2. Is this recurring upstream review?
   - Route to `upstream-intake/`.
3. Is this durable truth about what Superhuman is?
   - Route to `SPEC.md`.
4. Is this current operational reality?
   - Route to `STATUS.md`.
5. Is this accepted future direction?
   - Route to `PLANS.md`.
6. Is this reusable exploration or horizon-expansion work?
   - Route to `research/`.
7. Is this a meaningful decision with rationale?
   - Route to `records/decisions/`.
8. Is this execution history?
   - Route to `records/agent-worklogs/`.

One task may legitimately touch multiple layers.

Examples:

- a research session can create `RSH-*` plus `LOG-*`
- a product choice can create `DEC-*` and update `PLANS.md`
- implementation progress can append `LOG-*` and update `STATUS.md`

## Promotion Discipline

Do not mirror the same messy thought into every durable surface.

Prefer this refinery:

1. conversation, messenger, generic chat, or capture packet for raw shaping
2. `INBOX.md` for ephemeral routed intake waiting for triage
3. `research/` for reusable exploration, evidence, framing, rejected paths, and open questions
4. `records/decisions/` for a meaningful accepted choice and why that choice won
5. `PLANS.md` for accepted future work that survived triage
6. `SPEC.md` for concise durable system or product truth after the argument is settled
7. `STATUS.md` for current operational reality
8. `upstream-intake/` only for recurring upstream review, carry-forward, upstream conflict, and operator escalation

Promotion should be sparse. A research memo may stay as research forever. A decision record should exist only when a real product, architecture, workflow, trust, upstream, or repo-operating choice is made. `SPEC.md`, `STATUS.md`, and `PLANS.md` should receive concise outcomes, not copied debate.

## Write Rules

- `SPEC.md`, `STATUS.md`, and `PLANS.md` should be updated only by the operator or orchestrator.
- `INBOX.md` is an aggressive scratch disk. Purge entries once they are reflected elsewhere.
- `research/` keeps curated findings only.
- `records/decisions/` is append-only by new decision file.
- `records/agent-worklogs/` is append-only and should prefer appended entries on the current relevant `LOG-*`.
- `upstream-intake/` keeps paired internal-record and operator-brief artifacts under a shared `UPS-*` review id.
- Truth docs reflect the latest accepted state, not every intermediate thought.

### Worklog Reuse Policy

Do not create a new `LOG-*` just to satisfy provenance.

Append to the latest relevant `LOG-*` when:

- the same workstream, goal, or blocker is still in scope
- the same execution thread is continuing
- a new timestamped entry preserves clarity

Create a new `LOG-*` only when:

- the work is materially distinct from the current log's scope
- a separate agent or subagent owns a clearly separate execution thread
- reuse would make provenance harder to follow
- a separate execution record would improve future retrieval

## Stable IDs

This model assumes:

- `project-id` identifies the repo or workspace
- `agent-id` identifies one user-facing agent conversation
- `run-id` identifies one bounded execution episode inside an agent conversation
- one agent conversation may contain multiple runs
- subagents receive their own `agent-id`
- Off-Git systems resolve parent-child lineage, messages, events, and commit history from `agent-id`

For Superhuman, the project id is:

- `superhuman`

Recommended prefixes:

- `IBX-YYYYMMDD-NNN`
- `RSH-YYYYMMDD-NNN`
- `DEC-YYYYMMDD-NNN`
- `LOG-YYYYMMDD-NNN`
- `UPS-YYYYMMDD-NNN`

Numbering is per day and per artifact type. Any agent may claim the next ID by checking the least available `NNN`.

Every stable-ID-bearing artifact should open with:

- `Opened: YYYY-MM-DD HH-mm-ss KST`
- `Recorded by agent: <agent-id>`

## Commit Provenance

Commit provenance is documented here as the canonical policy and is enforced locally plus in CI.

After a commit is made under this operating model, it should include these lowercase trailers:

- `project: <project-id>`
- `agent: <agent-id>`
- `role: orchestrator|worker|subagent|operator`
- `artifacts: <artifact-id>[, <artifact-id>...]`

Rules:

- `artifacts:` may list more than one stable ID, comma-separated.
- A normal commit should always reference at least one relevant artifact, whether newly created or updated.
- Artifact-less commits should be treated as bootstrap or migration exceptions only.
- Normal commits do not require a brand-new `LOG-*`.
- Prefer appending to an existing relevant `LOG-*` when the same workstream is continuing.
- Commits may reference `LOG-*`, `DEC-*`, `RSH-*`, `UPS-*`, or another relevant artifact type as appropriate.

## Superhuman-Specific Notes

- Superhuman is single-operator-first.
- Repo-local canonical truth lives in versioned docs.
- Off-Git operational memory keeps chat history, messenger traffic, and transient context.
- For repos Superhuman creates, adopts, or manages, the latest `LPFchan/repo-template` baseline is canonical unless the operator explicitly approves a different local contract.
- The current public product is still a personal AI assistant across channels, devices, and control surfaces.
- The deeper Superhuman direction is a durable project workspace with repo-native memory, orchestrated agent work, and synchronized access across desktop and mobile.
- That deeper direction belongs in `SPEC.md` and `PLANS.md`, not only in chat.
