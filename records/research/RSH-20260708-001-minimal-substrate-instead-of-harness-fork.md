# RSH-20260708-001: Minimal Substrate Instead Of Harness Fork

Opened: 2026-07-08 03-40-34 KST
Recorded by agent: 659d0047-cd4c-4a5d-bf48-e6f08d5a578e

## Metadata

- Status: in progress (kickoff pass)
- Question: Should Superhuman stop being an OpenClaw fork that is simultaneously a project manager and an agent harness, and instead ship as a minimal substrate — a scaffolding folder structure plus a small database (JSON, JSONL, or SQLite) — that stock harnesses such as OpenClaw, Hermes Agent, Claude Code, or OpenCode operate on top of?
- Trigger: operator idea, 2026-07-08. The project has been effectively abandoned in its current dual-identity shape; the operator proposed minimizing it so existing harnesses do the running and the operator stops maintaining a large fork while still getting most of the intended value.
- Related ids: `RSH-20260409-002`, `RSH-20260409-008`, `RSH-20260409-009`, `DEC-20260409-005`, `DEC-20260409-006`, `DEC-20260409-007`, `DEC-20260410-001`
- Scope: the substrate reframe, its shape options, prior art, and its tension with accepted truth docs
- Out of scope: changing `SPEC.md`, `STATUS.md`, `PLANS.md`, or the fork's compatibility posture in this pass; any runtime code changes

## Research Frame

`RSH-20260409-009` asked which harness should be the backbone under Superhuman and left open whether Superhuman could drive several external harnesses through one control plane. This memo inverts that question: instead of Superhuman owning a control plane and a harness, Superhuman becomes a substrate that any harness reads and writes. No backbone is chosen because no backbone is owned.

The candidate product statement under evaluation:

> Superhuman is a project-workspace substrate: a repo scaffolding plus a small local work-state database, with skills, instructions, and hooks that let any competent agent harness operate a durable project without the operator maintaining that harness.

## Why This Reframe Is Plausible

- **The fork is the expensive part.** The current repo carries a full OpenClaw runtime: gateway, channels, plugins, control UI, paired devices, plus weekly upstream intake and a compatibility commitment. `STATUS.md` records that product-definition closure lags far behind that maintenance surface. The differentiated value in `SPEC.md` — durable memory, routing, provenance, orchestration discipline — does not live in the runtime code; it lives in the operating model.
- **Half the substrate already exists and is already harness-agnostic.** repo-template is the folder-structure scaffolding: `records/` truth surfaces, stable IDs, `skills/`, and commit provenance enforced by `.githooks/` plus CI. Enforcement works regardless of which agent makes the commit — this repo is itself the proof. `DEC-20260409-006` already ratified repo-template as the canonical managed-repo model.
- **Harness quality is a race Superhuman should not run.** `RSH-20260409-009` documented that harness engineering alone moves Terminal-Bench scores dramatically while the model is held constant, and that dedicated teams (ForgeCode, Factory, KIRA) iterate on this full-time. A substrate that survives harness churn lets the operator always use whichever harness is currently best, instead of inheriting a permanently mid-tier fork loop.
- **The ecosystem standardized the consumption mechanisms since the fork began.** `AGENTS.md` was formalized as an open spec (August 2025) and donated to the Linux Foundation's Agentic AI Foundation (December 2025); it is read natively by Claude Code, Codex CLI, Cursor, Gemini CLI, Copilot, and others. The `SKILL.md` Agent Skills format became a cross-harness open standard through Q1 2026 (Claude Code, Codex, Gemini CLI, Cursor, OpenCode, and per one survey OpenClaw itself). MCP covers anything that needs a live tool surface. A substrate can carry the whole operating model into any harness without owning the harness.
- **Harnesses already ship the runtime features the fork was hardening.** Hermes Agent has persistent SQLite-backed state, FTS session search, messaging gateway, cron, and an explicit OpenClaw migration command (`RSH-20260409-009`). Stock OpenClaw remains a capable channel/gateway host. Under the substrate model those become consumers, not competitors.

## What The Fork Provides That The Substrate Must Account For

| Fork capability                                                           | Substrate answer under minimization                                                                                                                |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coding/terminal agent loop                                                | Delegated entirely to the host harness                                                                                                             |
| Gateway, messenger channels, capture-from-anywhere                        | Delegated: a stock OpenClaw or Hermes instance with a capture skill writes capture packets into the substrate                                      |
| Approvals, permissions, trust modes                                       | Delegated to each harness's native permission system; substrate keeps only durable approval consequences (already the `DEC-20260409-007` boundary) |
| Cross-surface live state, steer/interrupt/fork verbs (`DEC-20260409-007`) | Mostly lost as live runtime; survives as schema vocabulary (agent-id, run-id, capture packet, work item) recorded in the state layer               |
| Workspace server API (`DEC-20260410-001`)                                 | Deferred or dropped; a thin read-only viewer over the state layer could return later                                                               |
| Orchestrator routing                                                      | Survives unchanged as procedure: the routing ladder is already a skill plus `records/REPO.md`, executable by any harness                           |
| Plugin ecosystem compatibility commitment                                 | Ends or transfers to whichever stock harness the operator runs; `PROVENANCE.md` remains as lineage                                                 |

The honest loss is live cross-device runtime: mobile cockpit, synced run state, messenger approvals as a first-class product. Under minimization those are re-scoped from "product Superhuman ships" to "features of whatever harness the operator runs, fed by and feeding the substrate."

## Substrate Shape Under Evaluation

Three layers, matching the Git/off-Git boundary already accepted in `DEC-20260409-007`:

1. **Git layer — already exists.** repo-template as-is: `records/` truth docs, `research/`, `decisions/`, stable IDs, `skills/`, commit-backed `LOG-*`, hooks and CI enforcement. No new invention needed.
2. **State layer — the actual gap.** A small local database for the work that is too live or too raw for truth docs: capture packets, pre-triage inbox pressure, work items with lifecycle state (`captured -> ... -> completed`), run/approval consequences, cross-session handoff summaries. Storage options:
   - plain JSON/JSONL files in a dot-directory (git-diffable, human-readable, weak queries, merge pain)
   - SQLite (queries, FTS, concurrency via file locking, opaque to git — acceptable because this layer is off-Git by accepted policy)
   - beads-style hybrid: SQLite as working cache, JSONL export committed to git (queries plus versioning plus a merge story)
3. **Access layer.** A small CLI as the primary agent interface (invoked via bash by any harness, the way `scripts/new-commit-message.sh` already works), `AGENTS.md` as the entry point, `SKILL.md` procedures for routing/triage/commit discipline, and optionally a thin MCP server wrapping the same CLI for harnesses that prefer tools over shell.

## Prior Art

- **Beads (Steve Yegge, 2025–2026)** is the closest existing artifact to the substrate's state layer: a local-first, agent-native issue tracker using SQLite as cache with JSONL in git as the distributed source of truth, modeling work as a dependency DAG with ready-work detection, no central server. Its "work item" is close to the `SPEC.md` work-item object. It has significant adoption and community ports. Evaluate adopting or wrapping it before building a bespoke work-item store.
  - https://steve-yegge.medium.com/introducing-beads-a-coding-agent-memory-system-637d7d92514a
  - https://github.com/gastownhall/beads (current home; originally `steveyegge/beads`)
- **AGENTS.md open specification** — cross-harness instruction entry point, Linux Foundation AAIF governance since December 2025.
  - https://agents.md/
- **Agent Skills / SKILL.md open standard** — portable procedures across Claude Code, Codex CLI, Gemini CLI, Cursor, OpenCode, and others; Superhuman's `skills/` tree becomes a portable payload rather than fork-internal docs.
  - https://agentskills.io/
- **Hermes Agent** — evidence that harnesses will consume external state and migrate from OpenClaw natively (`RSH-20260409-009`).
  - https://github.com/NousResearch/hermes-agent
- **This repo** — evidence that provenance discipline holds without owning the harness: commit standards are enforced on any agent through `.githooks/` and CI, not through runtime code.

## Key Findings So Far

- The minimization is mostly subtraction, not new construction. repo-template plus a small work-state tool plus portable skills approximately equals the operator's described target. The genuinely new build is the state layer CLI/schema, and even that may be adoptable (beads) rather than buildable.
- JSON versus SQLite is a false binary. The beads hybrid (SQLite working cache, JSONL in git) matches repo-template's provenance instincts better than either pure option, though a pure off-Git SQLite file is also consistent with the accepted off-Git boundary if the exported/durable slice still lands in `records/` as markdown.
- The substrate's design criterion is harness churn survival: nothing in the substrate may depend on one harness's internals. Instructions via `AGENTS.md`, procedures via `SKILL.md`, state via CLI-over-bash, enforcement via git hooks and CI. Anything requiring a fork-level integration point is out.
- The harness bakeoff in `RSH-20260409-009` stops being existential under this model. It downgrades from "choose Superhuman's backbone" to "operator picks a daily driver, revisable monthly."
- The orchestrator role survives intact. Routing ladder, promotion discipline, and triage are procedures plus schema, not runtime; any competent harness can execute them, which this repo already demonstrates.

## Tension With Accepted Truth

This memo proposes no truth-doc changes, but if the direction is accepted the following would need operator-level revision:

- `SPEC.md` product thesis and the workspace-server deployment model (`DEC-20260410-001`) assume Superhuman owns live runtime state. The substrate model demotes the workspace server to an optional future viewer layer or drops it.
- The cross-surface state and agent-control model (`DEC-20260409-007`) survives only as schema vocabulary, not as shipped runtime behavior.
- The OpenClaw plugin-compatibility commitment (`DEC-20260409-005`) and weekly upstream intake stop making sense if the fork goes dormant; lineage stays in `PROVENANCE.md` regardless.
- Repo-template's position strengthens: it moves from "the operating model Superhuman uses" to "the majority of what Superhuman is."

Per the escalation triggers in `skills/repo-orchestrator/SKILL.md`, changing durable product truth and compatibility posture is an operator call. This memo is the evidence stage before any `DEC-*`.

## Options

- **Option A — full minimization now.** Archive or freeze the fork, extract the substrate (repo-template + state layer + skills) into a small repo, redefine Superhuman as that substrate.
- **Option B — substrate-first, fork-dormant.** Build and dogfood the substrate as its own deliverable; stop investing in fork runtime beyond security-relevant upstream intake; run stock harnesses on top; the fork becomes one consumer among several. Reversible, and produces the evidence Option A needs.
- **Option C — status quo.** Continue the fork plus workspace-server path accepted in 2026-04. Given the project's abandoned state, this is the option the operator is implicitly rejecting.

Current working recommendation: Option B, because it converts the idea into cheap evidence without forcing the irreversible fork-posture decision first.

## Open Questions

- Can beads be adopted or wrapped as the work-item store, or does the `DEC-20260409-007` vocabulary (capture packets, run consequences, approval consequences) require a bespoke schema beside or instead of it?
- Where does capture-from-anywhere land without an owned gateway — a stock OpenClaw/Hermes instance with a capture skill, a tiny inbox endpoint, or plain OS-level share targets writing files?
- Does any target harness fail to uphold routing and provenance discipline given only `AGENTS.md` + skills + CLI + hooks? Which one fails first, and on what?
- What happens to the existing `src/` tree, the plugin canary lane (`IBX-20260409-002`), and the upstream-intake cadence under fork dormancy?
- Does "Superhuman" name the substrate, or does the substrate get a new name while Superhuman remains the (dormant) assistant?
- How much of the state layer must sync across machines, and is git-carried JSONL (beads-style) sufficient versus needing any live sync at all?

## Next Steps

1. Dogfood probe: on one scratch repo-template repo, run one stock harness (Claude Code or Hermes Agent) with beads or a minimal SQLite work-item store plus the existing routing/commit skills for one to two weeks of real work; record where discipline or continuity breaks without the fork.
2. Evaluate beads directly against the `DEC-20260409-007` vocabulary and decide adopt / wrap / build.
3. Draft the substrate state schema (work item, capture packet, run consequence, handoff summary) as a short design note inside this memo's next pass.
4. If the probe survives, prepare an operator decision packet: fork posture (dormant/archived), workspace-server disposition, compatibility-commitment wind-down, and naming — each as explicit `DEC-*` candidates with `SPEC.md`/`PLANS.md` consequence drafts.

## Routing Outcome

- This pass creates research only. No truth docs were modified.
- Promotion beyond research is blocked on the operator decisions listed above.
