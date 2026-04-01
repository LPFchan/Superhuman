# Phase 2: Harden the runtime core

Objective:

Make all execution modes share one safe runtime contract before adding memory and autonomy.

Depends on:

- [01-establish-the-shell.md](01-establish-the-shell.md)

Repo-local target areas:

- `src/runtime.ts`
- `src/gateway/call.ts`
- `src/gateway/chat-abort.ts`
- `src/gateway/chat-sanitize.ts`
- `src/process/`
- `src/security/`
- `src/sessions/`
- local state tables and adapters introduced in Phase 1

Implementation scope:

1. Replace the ad hoc agent loop contract with an explicit runtime loop API.

- Introduce an `AgentRuntime` service responsible for one turn of model execution.
- Split the loop into explicit stages: prompt assembly, model call, tool planning, tool execution, post-tool continuation, terminal response.
- Emit structured state-store events at each stage boundary.

2. Port Hermes-style iteration budgeting.

- Add an `IterationBudget` object per runtime invocation.
- Track maximum iterations, used iterations, refunded iterations, and exhaustion reason.
- Give tool-driven subagents independent child budgets with configurable caps.
- Treat `execute_code`-style programmatic tool calls as refundable work rather than full model turns.

3. Port tool batch safety classification.

- Add tool metadata flags: `never_parallel`, `parallel_safe`, `path_scoped`, `interactive_only`, `destructive_possible`.
- Implement a `ToolBatchPlanner` that decides between concurrent and sequential execution.
- Allow `path_scoped` concurrency only when target scopes do not overlap.

4. Port command-safety heuristics.

- Add a `CommandRiskClassifier` for shell and process tools.
- Detect destructive deletion patterns, overwrite redirection, dangerous `git reset/clean/checkout` usage, and home-directory secret access patterns.
- Gate risky actions before execution. Do not attempt advanced remediation in this phase.

5. Add transcript hygiene and message sanitization.

- Normalize invalid Unicode and lone surrogate code points before model submission.
- Strip transient runtime warnings from replayed history.
- Separate turn-local annotations from replay-safe transcript content.

6. Unify interrupt and cancellation semantics.

- Introduce an `AbortGraph` or equivalent cancellation tree.
- Derive main runtime, tool execution, worker sessions, and scheduled invocations from that shared abstraction.

Implementation notes:

- Runtime-stage event emission should become the default debugging path for later phases.
- Budget and cancellation state must be inspectable from local state, not only in memory.
- Command-safety gating must fail closed for clearly destructive actions.

Source extraction map:

- Hermes runtime loop discipline:
  - `hermes-agent-audit/run_agent.py:170-205` for `IterationBudget`.
  - `hermes-agent-audit/run_agent.py:270-312` for `_should_parallelize_tool_batch(...)`.
  - `hermes-agent-audit/run_agent.py:443-563` for `class AIAgent` constructor shape and runtime ownership.
- Hermes message and transcript hygiene:
  - `hermes-agent-audit/run_agent.py:335-441` for surrogate sanitization and replay cleanup helpers.
- Claude runtime staging and orchestration:
  - `claude-code/query.ts:295` for `buildQueryConfig()` consumption at query entry.
  - `claude-code/query.ts:1267` for stop-hook integration in the loop tail.
  - `claude-code/query/stopHooks.ts:65-155` for post-turn background lifecycle handling.
- Claude proactive activation boundary:
  - `claude-code/main.tsx:2197-2206` for proactive-mode prompt injection and activation conditions.
  - `claude-code/cli/print.ts:3876-3889` for runtime proactive toggling through control requests.

Deliverables:

- A first-class runtime service with explicit stages.
- Iteration budget enforcement and child-budget propagation.
- A tool batch planner and risk classifier wired into execution.
- Sanitized replayable transcripts and unified cancellation semantics.

Exit criteria:

- Interactive, background, scheduled, and remote executions use the same runtime stages.
- Infinite or runaway tool loops terminate by budget, not by accident.
- Tool batches execute deterministically under declared policy.
- Unsafe shell actions are classified before execution.
- Replayed history is stable and free of turn-local garbage.

Out of scope:

- Context compaction and collapse.
- Memory extraction and consolidation.
- Multi-agent mailbox transport.
- Proactive scheduling behavior.