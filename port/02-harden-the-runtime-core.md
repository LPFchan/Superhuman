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

Primary module ownership after shell modularization:

- Own `src/superhuman/state/super-state-runtime.ts` as the durable store surface for runtime invocations, stage events, iteration budgets, and abort state.
- Own the Superhuman runtime-core modules that project into that store, including `src/superhuman/super-agent-runtime.ts`, `src/superhuman/super-tool-batch-planner.ts`, `src/superhuman/super-command-risk-classifier.ts`, `src/superhuman/super-runtime-verification.ts`, and `src/superhuman/super-transcript-hygiene.ts`.
- Extend Phase 1 composition seams additively; do not move runtime-core behavior back into `src/superhuman/super-state-store.ts` or `src/superhuman/super-gateway-runtime.ts`.
- If Phase 2 needs more durable state, add it to `src/superhuman/state/super-state-runtime.ts` or a new Phase 2-owned sibling module first. Do not widen `src/superhuman/state/super-state-db.ts` back into a mixed schema-plus-runtime file.

Implementation scope:

1. Replace the ad hoc agent loop contract with an explicit runtime loop API.

- Introduce an `AgentRuntime` service responsible for one turn of model execution.
- Split the loop into explicit stages: prompt assembly, model call, tool planning, tool execution, verification planning, verification execution, post-tool continuation, terminal response.
- Emit structured state-store events at each stage boundary.
- Require terminal success to record a verification outcome of `verified`, `not_verifiable`, or `verification_failed` when code-editing tools ran.

2. Port Hermes-style iteration budgeting.

- Add an `IterationBudget` object per runtime invocation.
- Track maximum iterations, used iterations, refunded iterations, and exhaustion reason.
- Give tool-driven subagents independent child budgets with configurable caps.
- Persist child-budget inheritance, spawn count, concurrency slot, and queue delay for spawned workers.
- Treat `execute_code`-style programmatic tool calls as refundable work rather than full model turns.

3. Port tool batch safety classification.

- Add tool metadata flags: `never_parallel`, `parallel_safe`, `path_scoped`, `interactive_only`, `destructive_possible`.
- Implement a `ToolBatchPlanner` that decides between concurrent and sequential execution.
- Allow `path_scoped` concurrency only when target scopes do not overlap.
- Distinguish `text_search`, `symbol_reference`, `symbol_rename`, `workspace_navigation`, `partial_reading`, and `persisted_preview` capability classes so the planner can make semantics-aware decisions instead of treating all search or read tools as equivalent.

4. Port command-safety heuristics.

- Add a `CommandRiskClassifier` for shell and process tools.
- Detect destructive deletion patterns, overwrite redirection, dangerous `git reset/clean/checkout` usage, and home-directory secret access patterns.
- Gate risky actions before execution. Do not attempt advanced remediation in this phase.

5. Add transcript hygiene and message sanitization.

- Normalize invalid Unicode and lone surrogate code points before model submission.
- Strip transient runtime warnings from replayed history.
- Separate turn-local annotations from replay-safe transcript content.
- Preserve verification status, partial-read metadata, preview/full-output provenance, and imported-history provenance as structured replay-safe annotations rather than flattening them into plain text.

6. Unify interrupt and cancellation semantics.

- Introduce an `AbortGraph` or equivalent cancellation tree.
- Derive main runtime, tool execution, worker sessions, and scheduled invocations from that shared abstraction.

Implementation notes:

- Runtime-stage event emission should become the default debugging path for later phases.
- Budget and cancellation state must be inspectable from local state, not only in memory.
- Command-safety gating must fail closed for clearly destructive actions.
- Completion reporting is part of the runtime contract, not a style preference. If the runtime cannot verify edited code, that fact must be persisted and exposed in the terminal state.
- Partial tool evidence must never be silently upgraded into complete evidence for summaries, verification, or final completion reports.
- Compatibility caveat: when runtime behavior is missing, add it as a typed capability or documented core seam instead of bypassing plugin runtime, registry ownership, or channel/provider boundaries with private reach-ins.
- Nomenclature policy: runtime-core code that is Superhuman-specific should use explicit `super-*` / `Super*` naming for files and local APIs. Preserve generic names only where the surface is intentionally shared with OpenClaw or exposed as a stable public contract.
- Slot policy caveat: runtime evolution should assume `super-context` is the default engine and `legacy` remains an explicit compatibility fallback, not a removed pathway.

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
- Structured verification outcomes and structured partial-result metadata carried through the runtime.

Exit criteria:

- Interactive, background, scheduled, and remote executions use the same runtime stages.
- Infinite or runaway tool loops terminate by budget, not by accident.
- Tool batches execute deterministically under declared policy.
- Unsafe shell actions are classified before execution.
- Replayed history is stable and free of turn-local garbage.
- Successful code-editing runs cannot be reported without a recorded verification outcome.
- Rename and refactor planning can tell when only text-search capability is available.

Out of scope:

- Context compaction and collapse.
- Memory extraction and consolidation.
- Multi-agent mailbox transport.
- Proactive scheduling behavior.
