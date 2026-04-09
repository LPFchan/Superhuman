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
- Supplementary source queue: ForgeCode Terminal-Bench blog posts; official Terminal-Bench 2.0 leaderboard; official Harbor run artifacts for each candidate

Initial findings:

- Terminal-Bench describes itself as tasks plus an execution harness that connects a language model to a terminal sandbox.
- Harbor is the official framework path for Terminal-Bench 2.0 and can evaluate arbitrary agents such as Claude Code, OpenHands, Codex CLI, and others.
- Terminus-KIRA reports harness-level improvements over Terminus 2: native LLM tool calling instead of ICL JSON/XML parsing, multimodal `image_read`, 30 KB output cap, marker-based command completion, completion double-confirm/checklists, context-overflow summarization/retry, and Anthropic prompt caching.
- Meta-Harness reports that environment bootstrapping snapshots sandbox state before the agent loop, saving early exploration turns, and reports 76.4% on Terminal-Bench 2.0 with Claude Opus 4.6.

Important inference:

- Terminal-benchmark performance may hinge on small execution-loop details: native tool schema, terminal completion detection, output caps, initial environment snapshot, completion criteria, overflow handling, and prompt/cache policy.
- Terminal-benchmark performance can move dramatically while the model is held constant. The supplementary pass reports Opus 4.6 at 81.8% through ForgeCode and alleges much lower stock Claude Code standing; verify official rows, but treat harness quality as a first-order product risk now.
- Superhuman should inspect these as harness mechanics, not UI inspiration.

Supplementary Terminal-Bench 2.0 snapshot, recorded from operator handoff and awaiting primary leaderboard/run-log verification:

| Agent                              | Model         |      Score | Current RSH-009 posture                         |
| ---------------------------------- | ------------- | ---------: | ----------------------------------------------- |
| ForgeCode / `antinomyhq/forgecode` | GPT 5.4       |      81.8% | top harness candidate / primary postmortem read |
| ForgeCode / `antinomyhq/forgecode` | Opus 4.6      |      81.8% | top harness candidate / primary postmortem read |
| Factory Droid                      | GPT-5.3-Codex |      77.3% | closed reference / verify official row          |
| Meta-Harness                       | Opus 4.6      |      76.4% | benchmark-optimization reference                |
| Terminus-KIRA                      | Opus 4.6      |      74.7% | benchmark-optimized harness reference           |
| TongAgents / Bigai                 | Opus 4.6      |      71.9% | source unresolved / leaderboard reference       |
| Terminus 2                         | Opus 4.5      |       ~58% | Harbor baseline / verify exact row              |
| Claude Code stock                  | Opus 4.6      | unverified | tweet claim only until official row is captured |

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
- Status: evaluate as top harness candidate
- Supplementary leaderboard evidence: operator handoff reports Terminal-Bench 2.0 #1 at 81.8% with both GPT 5.4 and Opus 4.6 as of March 2026; verify against official leaderboard/run logs.
- Current evidence: terminal development environment; TUI interactive mode, one-shot mode, zsh `:` integration, conversations, sandbox/worktree option, provider login, semantic workspace search, skills, MCP.
- Important reading: the supplementary pass found two ForgeCode engineering posts about climbing from 25% to 78.4% and then 81.8%. Add exact URLs during verification.
- Important reported mechanics: non-interactive mode, better tool-call naming, planning enforcement, skill routing, reasoning-budget control, JSON-schema robustness, stricter GPT 5.4 schema design, and per-model harness adaptation rather than one universal config.
- Open question: which ForgeCode mechanics are general Superhuman harness requirements, and which are benchmark-specific optimizations?

### Capy (Resolved Out Of Harness Scope)

- Status: resolved to a closed desktop / IDE product per operator supplementary handoff
- RSH-009 posture: remove from harness bakeoff unless an independent Capy harness submission or run artifact appears
- RSH-008 posture: closed desktop reference alongside Conductor / Graft / Factory Desktop

### Terminus-KIRA

- Source found: https://github.com/krafton-ai/KIRA
- Status: evaluate as benchmark-optimized harness
- Current evidence: purpose-built Terminal-Bench harness; supplementary handoff reports 74.7% on Terminal-Bench 2.0 with Opus 4.6; documents concrete harness mechanics listed above.

### TongAgents

- Status: leaderboard/reference partially resolved; source locator still unresolved
- Supplementary leaderboard evidence: operator handoff reports Bigai TongAgents at 71.9% on Terminal-Bench 2.0 with Opus 4.6.
- Next: locate Bigai project page, source if any, official Terminal-Bench submission, run log, website, paper, or artifact before allocating bakeoff time.

### Junie CLI

- Source found: https://github.com/JetBrains/junie
- Status: evaluate as closed/service-bound or partially open CLI product
- Current evidence: JetBrains coding agent for terminal, IDE, and CI; install via curl/npm/homebrew; BYOK/provider support; GitHub action path; license says JetBrains rights/services terms rather than obvious open-source fork posture.

### Droid

- Surface reference: https://www.factory.ai/news/factory-desktop
- Status: evaluate as closed Factory reference; not forkable
- Current operator-handoff evidence: Factory Desktop is the macOS/Windows surface for Factory's Droid harness; released 2026-04-08; Factory Droid is reported as #2 on Terminal-Bench 2.0 at 77.3% with GPT-5.3-Codex.
- Important harness reference: Droid Computers make persistent machine state a first-class owned object for the harness: installed packages, cloned repos, credentials, running services, Factory-managed cloud machines, or BYO hardware registered with `droid computer register`.
- Important cross-surface reference: Factory Desktop handoff says Droid can directly control desktop applications, not only a terminal; mobile/tablet reportedly have parity for sessions, settings, skills, new sessions, progress monitoring, and diff review.
- Next: verify product docs, CLI docs, official Terminal-Bench row, adapter/run artifact, Droid Computer lifecycle, BYO computer registration, computer-use permission boundary, and mobile parity claims.

### Goose

- Source: https://github.com/aaif-goose/goose
- Prior source name: `block/goose`
- Status: evaluate targeted harness mechanics; cross-list desktop/API posture in RSH-008 if it becomes a GUI candidate
- Supplementary handoff evidence: Apache 2.0; active Rust general-purpose agent under Linux Foundation AAIF; CLI, desktop app, and API; 15+ providers; Agent Client Protocol support.
- Important reported mechanic: adversary mode runs a silent independent reviewer agent over sensitive tool calls before execution, using task intent to distinguish legitimate network/package operations from exfiltration-like commands.
- Open question: can the adversary-mode pattern become a Superhuman approval/permission layer without making approvals inscrutable or model-dependent?

### Mini SWE Agent

- Source: https://github.com/SWE-agent/mini-swe-agent
- Status: add as bakeoff isolation control
- Supplementary handoff evidence: MIT; Princeton/Stanford lineage; used by Meta, NVIDIA, Essential AI, IBM; ~100-line Python agent class; bash-only actions with stateless shell and `subprocess.run`; Harbor-native; 74%+ on SWE-bench Verified; faster startup than Claude Code.
- Why it matters: this is the minimal bash-only control. Run it with the same model to estimate whether Superhuman/OpenClaw is losing to candidate harnesses because of model choice, benchmark fit, or harness design.
- Open question: can it execute Superhuman's repo-local/project-workspace tasks without custom tools, and if not, what exact task classes require richer harness affordances?

### Plandex

- Source: https://github.com/plandex-ai/plandex
- Status: evaluate for diff sandbox and plan-branch mechanics, not as wholesale replacement
- Supplementary handoff evidence: MIT; active Go project; 15k+ stars; terminal-based agent; 2M-token effective context; tree-sitter maps for 30+ languages; provider context caching; full plan versioning and branching.
- Important reported mechanic: cumulative diff review sandbox keeps AI-generated changes separate from project files until operator approval.
- Open question: can Superhuman represent proposal -> cumulative diff -> review -> apply as a first-class work-item/run state rather than just Git diff after filesystem mutation?

### Active OpenCode

- Source: https://github.com/anomalyco/opencode
- Status: evaluate as active client/server harness and RSH-008 desktop cross-list
- Supplementary handoff evidence: MIT; active SST rewrite of the archived OpenCode; client/server architecture with TUI over local server; desktop app; many providers; LSP; GitHub Copilot auth; MCP; Harbor adapter.
- Important correction: this is not the archived `opencode-ai/opencode` rejected in first-pass RSH-008.
- Open question: can the local server / Harbor adapter be evaluated independently from the OpenCode frontend, and does its state model fit the workspace-server decision?

### Pi Mono

- Source: https://github.com/badlogic/pi-mono
- Status: watch; lower-priority until the reported refactor stabilizes
- Supplementary handoff evidence: OSS; active but mid-refactor in April 2026; coding agent CLI, unified LLM API, TUI, web UI libraries, Slack bot, vLLM pods as separate packages; maintainer publishes real OSS coding sessions to HuggingFace as training data.
- Open question: are its composable packages useful as Superhuman harness decomposition references after the refactor lands?

### Crux

- Status: unresolved locator
- Candidate source not found after quick local search and operator supplementary search; many unrelated CrUX/Crux projects.
- Next: treat as leaderboard display name only unless official source, submission, run log, website, paper, or artifact appears.

### Mux

- Status: unresolved locator
- Candidate source not found under exact quick searches or operator supplementary search; found generic agent-mux dispatch/session managers, not the tweet-listed harness.
- Next: treat as leaderboard display name only unless official source, submission, run log, website, paper, or artifact appears.

### Terminus 2

- Status: evaluate as benchmark baseline / Harbor agent
- Current evidence: Harbor and Terminus-KIRA reference Terminus 2 as baseline; official Harbor docs should be the locator.

### SageAgent

- Status: unresolved locator
- Candidate source not found in quick search or operator supplementary search except small unrelated / OpenSage implementations.
- Next: treat as leaderboard display name only unless official source, submission, run log, website, paper, or artifact appears.

### CodeBrain-1

- Status: unresolved locator
- Candidate source not confirmed. GitHub search surfaced `feelingai-team/CodeBrain`, but not confirmed as the Terminal-Bench harness; operator supplementary search did not resolve it.
- Next: treat as leaderboard display name only unless official source, submission, run log, paper, website, or artifact appears.

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
   - mini-swe-agent baseline / isolation control
   - current Superhuman/OpenClaw loop
   - Claude Code
   - Hermes Agent
   - Letta Code
   - ForgeCode
   - active OpenCode
   - Goose / adversary-mode targeted tasks
   - Plandex / diff-sandbox targeted tasks
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
4. Compare against the isolation control:
   - Run mini-swe-agent on every task where the same model is available.
   - Record candidate-minus-mini-swe-agent deltas.
   - Treat a candidate that does not beat mini-swe-agent on most comparable tasks as an idea-source, not a backbone candidate.

## Working Plan Forward

- Short term: keep Superhuman's accepted project-workspace and repo-template direction separate from harness choice.
- Short term: add a repeatable Harbor/Terminal-Bench smoke lane before claiming harness quality.
- Short term: read and summarize ForgeCode's Terminal-Bench engineering posts before porting any harness mechanics.
- Short term: run stock external harnesses before porting their internals.
- Medium term: decide whether Superhuman should wrap a top harness as a backend, port a small set of mechanics, or replace its embedded loop.
- Medium term: if porting, prefer small measurable harness mechanics first: environment bootstrap snapshot, native tool schemas, output caps, marker-based command completion, completion double-check, overflow retry, trace/replay, and stronger verification loops.
- Decision point: if a harness becomes accepted as a backbone or required backend, create a new `DEC-*` and promote only the concise consequence to `SPEC.md` / `PLANS.md`.

## Open Questions

- What is the current official Terminal-Bench 2.0 leaderboard row for Claude Code with Opus 4.6, and what agent adapter exactly produced it?
- What are the exact URLs for the two ForgeCode Terminal-Bench engineering posts, and which changes were product-harness generalizations versus benchmark-specific tuning?
- Which tweet-listed harnesses have source or reproducible run artifacts? Current unresolved-after-supplementary-search names: Crux, Mux, SageAgent, CodeBrain-1.
- What official artifact confirms Factory Droid's reported 77.3% Terminal-Bench 2.0 result and TongAgents' reported 71.9% result?
- Which benchmark most resembles the actual Superhuman product-owner workflow: Terminal-Bench, SWE-bench, long PRD implementation, upstream intake, or repo-template-maintained project work?
- Does persistent memory help or hurt isolated coding benchmark success?
- Where is the cutoff between persistent machine state as a powerful harness affordance and persistent machine state as unreproducible task contamination?
- Does repo-template context improve project continuity enough to justify its tokens inside execution prompts?
- Can Superhuman drive several external harnesses through one control plane before choosing one?
