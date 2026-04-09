# RSH-20260409-009: Coding Harness And Backbone Evaluation

Opened: 2026-04-09 22-53-46 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Status: in progress
- Question: What coding harness should be the backbone of Superhuman, and what should be preserved, ported, wrapped, measured, or rejected?
- Trigger: operator separated the desktop GUI fork question from the coding-harness/backbone question and attached two benchmark-related tweet JSON exports
- Related ids: RSH-20260409-002, RSH-20260409-008, DEC-20260409-007, LOG-20260409-013
- Scope: OpenClaw, Claude Code, Hermes Agent, current Superhuman, Letta as a system, Terminal-Bench/Harbor/meta-harness ecosystem, Cursor as closed performance reference, and the option list called out from the tweet thread
- Out of scope: accepting a desktop GUI, replacing repo-template, editing runtime code during the research pass

## Research Frame

This memo answers a different question than `RSH-20260409-008`.

`RSH-20260409-008` asks: what desktop/operator GUI should Superhuman fork, reference, or build?

This memo asks: what agentic coding harness should actually do the work under that GUI?

The benchmark concern is legitimate enough to isolate: a beautiful desktop cockpit can still fail if it drives a weak terminal/coding loop. Conversely, a benchmark-strong harness may still be the wrong Superhuman product shell.

## Operator Questions To Answer

1. Is stock OpenClaw good and performant enough as a coding harness to be the backbone of Superhuman?
2. Is Claude Code good and performant enough as a coding harness to be the backbone of Superhuman?
3. Is Hermes Agent good and performant enough as a coding harness to be the backbone of Superhuman?
4. Is current Superhuman, an OpenClaw fork being hardened with Claude Code ideas and Hermes Agent ideas, good and performant enough as a coding harness?
5. What should Superhuman learn from the tweet-mentioned harness set: ForgeCode, Capy, Terminus-KIRA, TongAgents, Junie CLI, Droid, Crux, Mux, Terminus 2, SageAgent, CodeBrain-1, Cursor, and other Terminal-Bench/Harbor entrants?
6. What is the conclusive plan forward: keep, port, wrap, run-as-backend, benchmark-against, or reject?

## Current Non-Conclusion

Do not assume Superhuman's harness path is solved.

Previous architecture synthesis argued that OpenClaw is a good assistant/control-plane host, Claude Code is the most complete integrated runtime, and Hermes contributes hardening and state patterns. That is useful but not enough. It was not a benchmark-backed verdict that Superhuman/OpenClaw is already competitive as an agentic coding harness.

This memo needs an explicit harness bakeoff before Superhuman chooses a backend.

## Attached Tweet Evidence

Treat these tweets as prompts for investigation, not proof.

- Tweet: https://x.com/theo/status/2041392887561335236
  - Date: 2026-04-07 UTC
  - Export: `/Users/yeowool/Downloads/2041392887561335236.json`
  - Claim in export: Claude Code was in last place among Opus 4.6 harnesses on Terminal-Bench; ten separate harnesses used Opus better.
  - Research implication: model quality and harness quality are separable. If Superhuman only shells out to a familiar CLI, it may inherit preventable harness weaknesses.
- Tweet: https://x.com/edwinarbus/status/2033625866350334333
  - Date: 2026-03-16 UTC
  - Export: `/Users/yeowool/Downloads/2033625866350334333.json`
  - Claim in export: Cursor improved model completion on a 100-feature PRD benchmark: Gemini 52 -> 57, GPT-5.4 82 -> 88, Opus 77 -> 93.
  - Research implication: the surrounding product/harness can change task success even with the same frontier model.

## Known Superhuman / OpenClaw Baseline Evidence

Current docs describe the inherited loop this way:

- OpenClaw has an authentic agent loop: intake, context assembly, model inference, tool execution, streaming replies, session persistence, lifecycle events, per-session queueing, compaction/retry, exec/process/background tooling, approvals, sandbox/gateway/node execution, hooks, plugins, session identity, and gateway RPC.
- OpenClaw's center of gravity is the gateway/control plane, channels, plugins, memory, sessions, and assistant environment. It was not originally selected because it was the highest-scoring local coding harness.
- Superhuman currently preserves that spine while adding repo-native memory and project-workspace direction.

Known concerns to test:

- long-horizon terminal-task score
- coding edit success rate
- terminal interaction efficiency
- command-output compaction and observation quality
- native tool-call reliability versus prompt-parsed tool calls
- whether exec/process UX makes the model wait too long or miss background state
- recovery after context overflow
- verification discipline before declaring done
- subagent quality and host-agent grading
- use of repo-template docs as helpful context versus token drag

## Prior OpenClaw / Claude / Hermes Architecture Synthesis

The archived technical comparison is evidence, not canon.

Reusable summary:

- Claude Code was previously assessed as the most integrated runtime: local, remote, scheduled, proactive, memory extraction, multi-agent, coordinator, remote session, and computer-use paths.
- OpenClaw was previously assessed as the cleaner gateway and persistent assistant environment, but weaker in context pressure, remote/cloud coding semantics, and tight coding-loop discipline.
- Hermes was previously assessed as the most legible standalone agent-loop core, with stronger local state/search, memory snapshot discipline, hooks, toolsets, runtime/backend breadth, and self-contained execution discipline.
- The old recommended Hermes port priority was: local state database, agent-loop execution discipline, memory snapshot/threat-scan rules, toolset composition, hook model, provider/backend abstraction.

Fresh evaluation may override that synthesis.

## Terminal-Bench / Harbor Evidence

- Source: https://github.com/harbor-framework/terminal-bench
- Source: https://github.com/harbor-framework/harbor
- Source: https://github.com/krafton-ai/KIRA
- Source: https://github.com/stanford-iris-lab/meta-harness-tbench2-artifact

Initial findings:

- Terminal-Bench describes itself as tasks plus an execution harness that connects a language model to a terminal sandbox.
- Harbor is the official framework path for Terminal-Bench 2.0 and can evaluate arbitrary agents such as Claude Code, OpenHands, Codex CLI, and others.
- Terminus-KIRA reports harness-level improvements over Terminus 2: native LLM tool calling instead of ICL JSON/XML parsing, multimodal `image_read`, 30 KB output cap, marker-based command completion, completion double-confirm/checklists, context-overflow summarization/retry, and Anthropic prompt caching.
- Meta-Harness reports that environment bootstrapping snapshots sandbox state before the agent loop, saving early exploration turns, and reports 76.4% on Terminal-Bench 2.0 with Claude Opus 4.6.

Important inference:

- Terminal-benchmark performance may hinge on small execution-loop details: native tool schema, terminal completion detection, output caps, initial environment snapshot, completion criteria, overflow handling, and prompt/cache policy.
- Superhuman should inspect these as harness mechanics, not UI inspiration.

## Candidate / Reference Queue

### Stock OpenClaw

- Status: must evaluate
- Known fit: gateway, channels, plugins, memory, session identity, approvals, exec/process tools, queueing, sandbox/gateway/node routing
- Open question: can the current OpenClaw loop solve hard terminal/coding benchmarks without a stronger terminal-task harness layer?

### Current Superhuman

- Status: must evaluate after baseline
- Known fit: OpenClaw-compatible core plus Superhuman repo-template, provenance, project-workspace, orchestrator direction, and emerging state/control contract
- Open question: is repo-managed memory enough of a leverage advantage, or does the terminal/coding loop still need a dedicated harness transplant?

### Claude Code

- Status: must evaluate as stock external harness and as idea-source
- Known fit: integrated coding CLI, multi-agent/context/remote/scheduled/proactive/memory feature set; available as backend behind tools such as Conductor and T3 Code
- Current concern: tweet export alleges weak Opus 4.6 Terminal-Bench standing relative to other harnesses; this must be verified against an official leaderboard/run log before treated as fact.

### Hermes Agent

- Source: https://github.com/NousResearch/hermes-agent
- Status: must evaluate stock
- Current README claim: self-improving agent; TUI plus messaging gateway; persistent memory; skill creation/improvement; FTS5 session search; SQLite-like persistent state lineage from old audit; delegation; cron; multiple terminal backends; OpenClaw migration command; broad toolsets.
- Open question: does its broader 2026 system outperform OpenClaw/Superhuman on real coding tasks, or is its main value still state/memory/runtime discipline?

### Letta System

- Source: https://github.com/letta-ai/letta
- Source: https://github.com/letta-ai/letta-code
- Status: evaluate as stateful-agent system and coding harness
- Current evidence: Letta Code is a memory-first CLI built on Letta API; persisted agent across sessions; model/provider portability; `/init`, `/remember`, `/skill`; remote environments; headless mode; Letta's app/API may be useful state-inspection surfaces, but the exact forkable GUI component still needs a locator.
- Open question: does stateful memory improve long project work without hurting repo-template truth boundaries? Does Letta Code perform well as a terminal/coding harness?

### ForgeCode

- Source found: https://github.com/antinomyhq/forgecode
- Status: evaluate
- Current evidence: terminal development environment; TUI interactive mode, one-shot mode, zsh `:` integration, conversations, sandbox/worktree option, provider login, semantic workspace search, skills, MCP.

### Capy

- Status: unresolved locator
- Candidate source not found in quick GitHub search. Name may be leaderboard display rather than project repo.
- Next: locate official Terminal-Bench submission, run log, website, or artifact before evaluating.

### Terminus-KIRA

- Source found: https://github.com/krafton-ai/KIRA
- Status: evaluate as benchmark-optimized harness
- Current evidence: purpose-built Terminal-Bench harness; reports mid-70s scores on readme; documents concrete harness mechanics listed above.

### TongAgents

- Status: unresolved locator
- Candidate source not found in quick GitHub search. Search results mostly surfaced Tongyi/DeepResearch, not a coding harness called TongAgents.
- Next: locate official Terminal-Bench submission, run log, website, or artifact before evaluating.

### Junie CLI

- Source found: https://github.com/JetBrains/junie
- Status: evaluate as closed/service-bound or partially open CLI product
- Current evidence: JetBrains coding agent for terminal, IDE, and CI; install via curl/npm/homebrew; BYOK/provider support; GitHub action path; license says JetBrains rights/services terms rather than obvious open-source fork posture.

### Droid

- Status: evaluate as closed/reference if referring to Factory Droid; source locator unresolved
- Candidate ecosystem found: tmux/worktree managers reference Factory Droid; ACP adapter exists.
- Next: locate official Factory Droid CLI/product docs and any benchmark/run artifact.

### Crux

- Status: unresolved locator
- Candidate source not found in quick GitHub search; many unrelated CrUX/Crux projects.
- Next: locate official Terminal-Bench submission, run log, website, or artifact before evaluating.

### Mux

- Status: unresolved locator
- Candidate source not found under exact quick searches; found generic agent-mux dispatch/session managers, not the tweet-listed harness.
- Next: locate official Terminal-Bench submission, run log, website, or artifact before evaluating.

### Terminus 2

- Status: evaluate as benchmark baseline / Harbor agent
- Current evidence: Harbor and Terminus-KIRA reference Terminus 2 as baseline; official Harbor docs should be the locator.

### SageAgent

- Status: unresolved locator
- Candidate source not found in quick search except small unrelated / OpenSage implementations.
- Next: locate official Terminal-Bench submission, run log, website, or artifact before evaluating.

### CodeBrain-1

- Status: unresolved locator
- Candidate source not confirmed. GitHub search surfaced `feelingai-team/CodeBrain`, but not confirmed as the Terminal-Bench harness.
- Next: locate official submission, run log, paper, website, or artifact.

### Cursor

- Status: closed reference; evaluate as performance/UX reference only
- Current evidence: tweet export claims Cursor improved model completion in a 100-feature PRD benchmark.
- Next: find the benchmark author/source and decide whether it is reproducible enough to become a local Superhuman harness benchmark.

## Evaluation Rubric Draft

Harness candidates should be assessed against:

- measured performance on Superhuman's chosen benchmark set
- Terminal-Bench / Harbor support or adapter cost
- SWE-bench / PRD-benchmark / repo-modification benchmark support
- local run reliability
- terminal observation model
- command completion and timeout strategy
- output cap / summarization / transcript compaction
- native tool-call support versus prompt-parsed actions
- file edit / patch strategy
- diff / checkpoint / revert strategy
- approval and permission hooks
- context overflow recovery
- environment bootstrap / repo map / dependency discovery
- verification-before-completion discipline
- multi-agent delegation semantics
- host agent review / grading of subagent output
- persistent memory and whether it is controllable
- state storage / trace / telemetry / replay
- off-Git conversation/raw-memory compatibility
- repo-template truth-doc compatibility
- provider/model portability
- headless/CI/noninteractive mode
- ability to run under a Superhuman desktop/mobile/messenger control plane
- license, source availability, terms, and portability of lessons

## First Proposed Bakeoff

Run a small local benchmark before porting architecture:

1. Choose 5-10 tasks:
   - 2 repo-local Superhuman issues with tests
   - 2 Terminal-Bench sample or 2.0 tasks through Harbor
   - 1 100-feature-PRD-style miniature app task
   - 1 upstream-intake/conflict summarization task
   - 1 repo-template artifact-routing task
2. Run with the same model where practical:
   - current Superhuman/OpenClaw loop
   - Claude Code
   - Hermes Agent
   - Letta Code
   - ForgeCode
   - Terminus-KIRA/Harbor on Terminal-Bench-only tasks
   - one chosen commercial reference where manually observable
3. Collect:
   - success/failure
   - number of tool calls/commands
   - wall time and wait time
   - tokens/cost when available
   - command-output volume
   - number of approvals/escalations
   - number of "declared done but verifier failed" events
   - operator intervention count
   - transcript/replay artifact
   - final diff quality

## Working Plan Forward

- Short term: keep Superhuman's accepted project-workspace and repo-template direction separate from harness choice.
- Short term: add a repeatable Harbor/Terminal-Bench smoke lane before claiming harness quality.
- Short term: run stock external harnesses before porting their internals.
- Medium term: decide whether Superhuman should wrap a top harness as a backend, port a small set of mechanics, or replace its embedded loop.
- Medium term: if porting, prefer small measurable harness mechanics first: environment bootstrap snapshot, native tool schemas, output caps, marker-based command completion, completion double-check, overflow retry, trace/replay, and stronger verification loops.
- Decision point: if a harness becomes accepted as a backbone or required backend, create a new `DEC-*` and promote only the concise consequence to `SPEC.md` / `PLANS.md`.

## Open Questions

- What is the current official Terminal-Bench 2.0 leaderboard row for Claude Code with Opus 4.6, and what agent adapter exactly produced it?
- Which tweet-listed harnesses have source or reproducible run artifacts?
- Which benchmark most resembles the actual Superhuman product-owner workflow: Terminal-Bench, SWE-bench, long PRD implementation, upstream intake, or repo-template-maintained project work?
- Does persistent memory help or hurt isolated coding benchmark success?
- Does repo-template context improve project continuity enough to justify its tokens inside execution prompts?
- Can Superhuman drive several external harnesses through one control plane before choosing one?
