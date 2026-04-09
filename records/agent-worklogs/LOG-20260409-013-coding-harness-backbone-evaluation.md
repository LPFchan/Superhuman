# LOG-20260409-013: Coding Harness Backbone Evaluation

Opened: 2026-04-09 22-53-46 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Run type: orchestrator
- Goal: split desktop GUI fork evaluation from coding-harness/backbone evaluation and seed the harness research track
- Related ids: RSH-20260409-008, RSH-20260409-009, DEC-20260409-007

## Task

Update the ongoing research so desktop GUI selection and coding harness selection are evaluated as separate layers.

## Scope

- In scope: late desktop candidates Conductor, T3 Code, Letta GUI/app
- In scope: new RSH-009 for OpenClaw/Claude/Hermes/Superhuman/Letta/harness performance questions
- In scope: initial discovery of Terminal-Bench/Harbor/KIRA/meta-harness and the tweet-mentioned option list
- Out of scope: final harness verdict, accepted desktop candidate, SPEC/STATUS/PLANS promotion

## Entry 2026-04-09 22-53-46 KST

- Action: opened the harness/backbone research lane after operator clarified layers 0+1 versus 2
- Files touched: research/RSH-20260409-008-desktop-agentic-surface-fork-evaluation.md; research/RSH-20260409-009-coding-harness-and-backbone-evaluation.md; records/agent-worklogs/LOG-20260409-013-coding-harness-backbone-evaluation.md
- Checks run: `git status --short`; tweet JSON summary via `jq`; targeted web/GitHub discovery
- Output: established that RSH-008 is the GUI/operator-surface lane and RSH-009 is the coding-harness/backbone lane
- Blockers: many tweet-listed candidates still need authoritative locator/run-artifact discovery
- Next: amend RSH-008 with Conductor/T3/Letta GUI cards and seed RSH-009 with the operator questions, candidate queue, and benchmark bakeoff plan

## Entry 2026-04-09 23-01-00 KST

- Action: gathered primary-source seed evidence for the harness lane and late GUI candidates
- Files touched: research/RSH-20260409-008-desktop-agentic-surface-fork-evaluation.md; research/RSH-20260409-009-coding-harness-and-backbone-evaluation.md; records/agent-worklogs/LOG-20260409-013-coding-harness-backbone-evaluation.md
- Checks run:
  - `gh repo view pingdotgg/t3code ...`
  - `gh repo view letta-ai/letta ...`
  - `gh repo view letta-ai/letta-code ...`
  - README/package/doc reads for T3 Code, Letta Code, Hermes Agent, ForgeCode, Harbor, Terminus-KIRA, Junie
  - Conductor public homepage and docs text fetch
  - Terminal-Bench public page and Harbor/Terminal-Bench README reads
  - quick GitHub searches for ForgeCode, Capy, KIRA, TongAgents, Junie, Droid, Crux, Mux, SageAgent, CodeBrain, Hermes Agent
- Output:
  - identified `pingdotgg/t3code`, `letta-ai/letta`, `letta-ai/letta-code`, `antinomyhq/forgecode`, `NousResearch/hermes-agent`, `harbor-framework/harbor`, `harbor-framework/terminal-bench`, `krafton-ai/KIRA`, `JetBrains/junie`, and `stanford-iris-lab/meta-harness-tbench2-artifact` as primary source starts
  - confirmed Conductor is a closed Mac reference for teams of Codex/Claude agents in isolated/worktree workspaces
  - confirmed Terminus-KIRA documents concrete harness mechanics worth testing, not merely prompt text
- Blockers: official current Terminal-Bench 2 leaderboard data was not extracted; several tweet-list names remain unresolved
- Next: run doc sanity checks and keep the next actual evaluation pass focused on measured harness behavior

## Entry 2026-04-09 23-02-36 KST

- Action: sanity-checked the research split and removed stale Letta ADE/Desktop wording from the GUI lane
- Files touched: research/RSH-20260409-008-desktop-agentic-surface-fork-evaluation.md; research/RSH-20260409-009-coding-harness-and-backbone-evaluation.md; records/agent-worklogs/LOG-20260409-013-coding-harness-backbone-evaluation.md
- Checks run: `rg` for stale Letta/capture wording; `git diff --check`; `git status --short`; `git diff --stat`
- Output: kept Letta GUI/app as an RSH-008 surface concern and Letta system/code/memory runtime as an RSH-009 backbone concern
- Next: decide whether to commit this seed split now or continue into a measured harness bakeoff
