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
  - seed `REPO.md`, `SPEC.md`, `STATUS.md`, `PLANS.md`, `INBOX.md`, `skills/README.md`, and the required repo-template procedure skills
  - keep `upstream-intake/` active, dormant, or omitted based on the repo's real needs
  - include `skills/upstream-intake/SKILL.md` when `upstream-intake/` is active
- Existing repo adopted or managed by Superhuman:
  - merge repo-template into the real repo with the smallest viable diff
  - preserve stronger local rules and explicit product constraints
  - keep repo-template procedure skills at repo-root `skills/`, merging with the repo's existing skill tree when it has one
  - record intentional divergences in that repo's `REPO.md` or decision history

## Relationship To Other Root Docs

The root docs have different jobs on purpose:

| Surface              | Role                                                  |
| -------------------- | ----------------------------------------------------- |
| `README.md`          | Public product front door                             |
| `PROVENANCE.md`      | Legal and historical lineage                          |
| `REPO.md`            | Canonical repo contract                               |
| `SPEC.md`            | Durable truth about what Superhuman is supposed to be |
| `STATUS.md`          | Current operational reality                           |
| `PLANS.md`           | Accepted future direction                             |
| `INBOX.md`           | Ephemeral intake waiting for routing                  |
| `research/`          | Curated research worth future retrieval               |
| `records/decisions/` | Durable decisions with rationale                      |
| `git commit history` | Commit-backed execution history through `LOG-*` ids   |
| `skills/`            | Required procedures for repeatable repo workflows     |
| `upstream-intake/`   | Canonical upstream review and maintenance surface     |

`README.md` stays public and product-facing.
`PROVENANCE.md` stays separate because lineage is a permanent concern, not a subsection to hide inside another file.

## Core Surfaces

Superhuman uses these root surfaces as its canonical project backbone:

| Surface              | Role                                                              | Mutability                |
| -------------------- | ----------------------------------------------------------------- | ------------------------- |
| `SPEC.md`            | Durable statement of what Superhuman is supposed to be            | rewritten                 |
| `STATUS.md`          | What is true right now operationally                              | rewritten                 |
| `PLANS.md`           | Accepted future direction that is not current truth yet           | rewritten                 |
| `INBOX.md`           | Ephemeral intake and unresolved routing items                     | append then purge         |
| `research/`          | Curated research memos                                            | append by new file        |
| `records/decisions/` | Durable decision records                                          | append-only by new file   |
| `git commit history` | Canonical execution history through commit-backed `LOG-*` records | append-only by new commit |
| `skills/`            | Required procedure skills for repeatable repo workflows           | edit by skill             |
| `upstream-intake/`   | Canonical upstream intake, review, and escalation system          | append by cadence         |

## Procedure Skills

`skills/` is a required repo-native procedure layer.

In Superhuman, root `skills/` is also the existing skill catalog for assistant capabilities. Preserve that catalog. Add repo-template procedure skills beside it; do not move the tree under `scaffold/` and do not replace local skill packages with the template baseline.

Before running a repeatable repo workflow, read the relevant `skills/<name>/SKILL.md`, even if the current agent runtime does not auto-load repo skills.

Required repo-template procedure skills:

- `skills/repo-orchestrator/SKILL.md` for routing work into truth, status, plans, inbox, research, decisions, commit-backed execution history, upstream review, and commit provenance
- `skills/daily-inbox-pressure-review/SKILL.md` for focus-protecting `INBOX.md`, `IBX-*`, and capture-packet triage

Conditional procedure skills active in this repo:

- `skills/upstream-intake/SKILL.md` because Superhuman keeps root `upstream-intake/` active

`SKILL.md` files define bounded reusable procedures. Repo-wide policy stays in `REPO.md`; durable product truth stays in `SPEC.md`.

## Separation Rules

These boundaries are mandatory:

- `SPEC.md` is not a changelog.
- `STATUS.md` is not a transcript.
- `PLANS.md` is not a brainstorm dump.
- `INBOX.md` is not durable truth.
- `research/` is not raw execution history.
- `records/decisions/` is not the same as commit-backed execution history.
- `README.md` is not the internal source of truth.
- Off-Git memory is not a substitute for repo-local canonical docs.

This separation exists so future operators and future agents can answer different questions quickly:

- What is Superhuman supposed to be? -> `SPEC.md`
- What is true right now? -> `STATUS.md`
- What future work is accepted? -> `PLANS.md`
- What did we learn from exploration? -> `research/`
- What did we decide and why? -> `records/decisions/`
- What actually happened during execution? -> git commit history via `commit: LOG-*`

## Roles

### Operator

The operator is the final authority for product direction, escalation outcomes, and acceptance of truth changes.

### Orchestrator Agent

The orchestrator owns synthesis and routing.

It may:

- triage inbox items
- run daily inbox pressure reviews
- classify work into the right artifact layer
- update `SPEC.md`, `STATUS.md`, and `PLANS.md`
- create research memos
- create decision records
- create compliant commit-backed execution records
- translate messenger intake into repo artifacts
- escalate non-obvious product, architecture, workflow, or policy calls

### Worker Agents

Worker agents execute bounded tasks.

They may:

- create compliant commit-backed execution records when granted commit authority
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
   - Route to a compliant commit-backed `LOG-*` record.

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
- Routine execution history lives in git commit history through commit-backed `LOG-*` records.
- Do not invent a parallel execution-history file layer.
- If work produces no durable repo change, route only the durable outcome that belongs elsewhere or keep the raw trace Off-Git.
- `upstream-intake/` keeps paired internal-record and operator-brief artifacts under a shared `UPS-*` review id.
- Truth docs reflect the latest accepted state, not every intermediate thought.

## Execution Record Reuse Policy

Do not create a new `LOG-*` just because a new commit exists.

Prefer reusing the current primary `LOG-*` when:

- the same workstream is continuing
- the same execution thread is still in scope
- `--amend` or `rebase` preserves clearer provenance

Create a new primary `LOG-*` only when:

- the work is materially distinct from the current record's scope
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
- `UPS-YYYYMMDD-NNN`
- `LOG-YYYYMMDD-HHMMSS-<agent-suffix>`

File-backed artifact numbering is per day and per artifact type. Any agent may claim the next file-backed `NNN` by checking the least available value.

File-backed stable-ID-bearing artifacts should open with:

- `Opened: YYYY-MM-DD HH-mm-ss KST`
- `Recorded by agent: <agent-id>`

Commit-backed `LOG-*` ids use this format:

- `LOG-YYYYMMDD-HHMMSS-<agent-suffix>`
- `<agent-suffix>` is the last up to 6 lowercase alphanumeric characters of the normalized `agent:` value
- normalize `agent:` by lowercasing it and removing non-alphanumeric characters

When claiming a new `LOG-*` id:

- start from the current KST timestamp plus the derived agent suffix
- scan the current branch and the default branch for existing `commit:` values
- if the candidate id already exists, bump the timestamp forward by one second until it is unique

When provenance includes external source material:

- prefer canonical source URLs for public web content, posts, issues, docs, or releases
- do not use local download/export/cache paths as the primary provenance link when the original source URL is known
- local files may be mentioned as supporting evidence only when needed for reproducibility or when no stable public URL exists

## Commit-Backed Execution Records

After a repo adopts this system, every commit should include these trailers:

- `project: <project-id>`
- `agent: <agent-id>`
- `role: orchestrator|worker|subagent|operator`
- `commit: LOG-...[, LOG-...]`

Optional trailer:

- `artifacts: <artifact-id>[, <artifact-id>...]`

Rules:

- `commit:` must include one or more `LOG-*` ids, comma-separated.
- The first `LOG-*` in `commit:` is the commit's primary execution id.
- Additional `LOG-*` ids mean the landed commit canonically absorbs earlier execution records whose separate commits will not remain separate landed history.
- Every merge commit must mint its own primary `LOG-*`.
- When child commits remain visible as landed history, mention child `LOG-*` ids in `notes:` instead of reusing them in `commit:`.
- `--amend` and `rebase` should preserve existing `LOG-*` ids.
- If cherry-pick relocates work and the original commit will not also land, keep the same primary `LOG-*`.
- If both original and cherry-picked commits could land, the later commit must mint a new primary `LOG-*`; source `LOG-*` ids may be mentioned only in `notes:`.
- If a collision is discovered before landing, the later branch renumbers before merge.
- `artifacts:` is optional.
- `artifacts:` may list more than one stable ID, comma-separated.
- `artifacts:` must not include any `LOG-*`.
- The commit side and the repo-artifact side should reinforce the same provenance graph.

Commit bodies must use this lowercase structure:

```text
<subject line>

timestamp: YYYY-MM-DD HH-mm-ss KST
changes:
- ...
rationale:
- ...
checks:
- ...
notes:
- ...

project: <project-id>
agent: <agent-id>
role: orchestrator|worker|subagent|operator
commit: LOG-...
artifacts: DEC-..., RSH-...
```

Body rules:

- the subject line must be non-empty
- `timestamp:` is required and must be one line in KST
- `changes:`, `rationale:`, and `checks:` are required
- each required section must contain at least one `- ...` item
- `checks:` may be `- none`
- `notes:` is optional

## Commit-Time Enforcement

If the repo enables commit hooks, every attempted commit should be checked against these provenance rules.

Recommended minimum enforcement:

- reject commits that do not include `project:`, `agent:`, `role:`, and `commit:`
- reject roles outside `orchestrator|worker|subagent|operator`
- reject malformed `commit:` values
- reject malformed or empty `artifacts:` values when present
- reject any `artifacts:` value that includes `LOG-*`
- reject commits that do not include the required body keys and list items
- reject duplicate `LOG-*` ids on the current branch or default branch

The goal is not perfect policy automation. The goal is to stop obviously non-compliant commits before they land.

## Superhuman-Specific Notes

- Superhuman is single-operator-first.
- Repo-local canonical truth lives in versioned docs.
- Off-Git operational memory keeps chat history, messenger traffic, and transient context.
- For repos Superhuman creates, adopts, or manages, the latest `LPFchan/repo-template` baseline is canonical unless the operator explicitly approves a different local contract.
- The current public product is still a personal AI assistant across channels, devices, and control surfaces.
- The deeper Superhuman direction is a durable project workspace with repo-native memory, orchestrated agent work, and synchronized access across desktop and mobile.
- That deeper direction belongs in `SPEC.md` and `PLANS.md`, not only in chat.
