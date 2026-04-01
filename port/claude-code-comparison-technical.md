# Claude Code vs OpenClaw vs Hermes Agent

## Introduction

These three projects are solving adjacent but meaningfully different problems.

Claude Code is the most integrated agent runtime of the three. In stock form, it is not just a coding CLI: it already spans local interactive work, background tasks, in-process and out-of-process subagents, scheduled execution, remote and cloud execution, cross-session messaging, team memory, proactive and autonomous loops, and guarded computer use. The clearest evidence is spread across `main.tsx`, `query.ts`, `remote/RemoteSessionManager.ts`, `tools/ScheduleCronTool/prompt.ts`, and `coordinator/coordinatorMode.ts`.

OpenClaw is a gateway-centric personal-agent platform. Its center of gravity is not the local coding loop but the control plane around sessions, channels, memory plugins, and automation around a persistent assistant environment. The strongest code evidence is the `BOOT.md` execution path in `src/gateway/boot.ts`, the pluginized memory entry in `extensions/memory-core/index.ts`, and session-scoped sandbox behavior in `src/agents/sandbox/runtime-status.ts`.

Hermes is the most agent-core-centric of the three. It has a broad tool surface, multiple backends, persistent state, session search, delegation, and a clean event, hook, and toolset model, but its architecture still revolves around a Python agent loop and a local stateful runtime rather than a unified multi-plane agent operating environment. The strongest evidence is in `run_agent.py`, `hermes_state.py`, `toolsets.py`, `tools/memory_tool.py`, and `gateway/hooks.py`.

## Stock Strengths and Weaknesses

### Claude Code

Strengths:

- Strongest runtime integration across local, remote, scheduled, and proactive execution.
- Best context-management stack: autocompact, reactive compact, context collapse, overflow recovery, and session-aware memory extraction.
- Strongest multi-agent orchestration and coordinator model.
- Strongest remote and cloud session model.

Weaknesses:

- Highest complexity and deepest coupling between subsystems.
- Many important capabilities are gated, hidden, or internally fragmented across feature flags.
- More opinionated and less obviously hackable than OpenClaw or Hermes.
- Some strategic features exist as partial or internal surfaces rather than clean public abstractions.

### OpenClaw

Strengths:

- Cleanest gateway and control-plane framing.
- Memory is more modular than Claude Code's current in-repo memory stack because it is a plugin concern, not just a built-in subsystem.
- `BOOT.md` is a good example of workspace boot automation with low ceremony.
- Session-aware sandboxing is explicit and legible.

Weaknesses:

- Less sophisticated context-pressure and long-session management than Claude Code.
- Less evidence of deep integrated remote and cloud execution semantics for coding workflows.
- Strong control-plane posture, but weaker agent-runtime discipline under long autonomous coding loads.
- Memory is modular, but the repo shows less evidence of Claude-style automatic extraction and consolidation pipelines.

### Hermes Agent

Strengths:

- Most legible standalone agent loop and one of the broadest tool, runtime, and backend surfaces.
- Strong local state and search model through SQLite and FTS5.
- Strong memory safety model for prompt-stable snapshots.
- Good hook system and broad extensibility.

Weaknesses:

- The system feels like a very capable agent shell, but less like a unified operating environment than Claude Code.
- Scheduler, hooks, delegation, memory, and gateways exist, but are less fused into one cohesive lifecycle.
- Context management is materially less advanced than Claude Code's layered collapse, compact, and recovery model.
- Collaboration, shared repo memory, and cross-session orchestration are weaker than Claude Code's richer swarm and team-memory machinery.

## Architectural Differences Between OpenClaw and Hermes

The core architectural difference is that OpenClaw is environment-first while Hermes is agent-loop-first.

OpenClaw's architecture assumes a durable assistant environment with session identity, boot behavior, control-plane ownership, and pluginized subsystems. `runBootOnce()` in `src/gateway/boot.ts` snapshots the main session mapping, runs a boot-time agent invocation against `BOOT.md`, and restores session state afterward. That is not a cosmetic feature; it shows OpenClaw thinks in terms of environment lifecycle and session topology. Its sandbox runtime logic in `src/agents/sandbox/runtime-status.ts` also reasons about main versus non-main sessions. Hermes does not appear to model its system that way.

Hermes instead centers the `AIAgent` execution loop as the primary abstraction. The implementation in `run_agent.py` spends significant effort on iteration budgets, parallel tool safety, destructive-command heuristics, tool batch semantics, and provider and model concerns. Its persistence model, in `hermes_state.py`, is a local SQLite session database with FTS5, WAL tuning, and message and session accounting. That says Hermes is optimized around repeated agent runs with strong local recall, not around a gateway-orchestrated long-lived assistant environment.

A second difference is memory architecture. OpenClaw memory is explicitly pluginized through `definePluginEntry()` in `extensions/memory-core/index.ts`. Hermes memory is operationally elegant but centralized: frozen prompt snapshots plus live file-backed mutation in `tools/memory_tool.py`. OpenClaw is more subsystem-modular; Hermes is more agent-local and prompt-stability-oriented.

A third difference is extensibility style. Hermes exposes hooks, toolsets, and a broad runtime and backend layer in a way that makes the agent loop configurable from the inside. OpenClaw exposes plugins, channels, gateway actions, and environment-level boot and operations flows in a way that makes the surrounding system configurable from the outside. Both are extensible, but in different directions.

## What To Port From Claude Code Into Each

### For OpenClaw

1. Context management stack.

Claude Code's autocompact, reactive compact, and context collapse machinery would directly address OpenClaw's likely weakness under long-running coding sessions. OpenClaw already has the control plane; it lacks Claude's depth in context lifecycle management.

2. Automatic memory extraction and background consolidation.

Claude Code's end-of-turn extraction and `autoDream` fit OpenClaw well because OpenClaw already has pluginized memory and boot automation. This would give it a much stronger assistant-that-learns-over-time loop.

3. KAIROS-style proactive control loop.

OpenClaw is the best natural host for Claude Code's hidden proactive and assistant model: periodic ticks, channels, file delivery, PR subscription, and append-only daily logs. OpenClaw already has the right outer control-plane model.

4. Team memory sync.

Claude Code's shared repo memory sync would make OpenClaw much stronger for collaborative engineering use.

5. Multi-agent coordinator model.

OpenClaw would benefit from Claude Code's coordinator-worker pattern, especially because it already treats agents as part of a broader system rather than isolated runs.

### For Hermes

1. Context collapse plus overflow recovery.

This is the single most important missing runtime capability for Hermes. Hermes already has local persistence and strong session storage, but Claude's context runtime is more advanced than anything visible in Hermes.

2. Automatic memory extraction.

Hermes' frozen snapshot memory model is good, but it still relies too much on explicit memory operations compared to Claude's background extraction. Porting this would preserve Hermes' clean memory design while increasing autonomy.

3. Richer scheduler integration.

Hermes has cron and hooks, but Claude's scheduled task substrate is more lifecycle-aware, with durable local tasks, idle-aware firing, jitter, missed-task recovery, and assistant-mode integration.

4. Cross-session and multi-agent messaging.

Hermes has delegation, but Claude's inbox, mailbox, and cross-session messaging would make Hermes much more capable as a collaborative agent fabric.

5. Shared repo memory.

Claude's team-memory model would fill a real gap in Hermes for multi-person coding environments.

6. Remote and cloud agent execution semantics.

Hermes has multiple execution backends, but Claude Code's cloud remote session plus scheduled remote agent model is a more productized form of remote execution.

## Enriched-State Comparison

If both projects were Claude-code-enriched, OpenClaw would probably become the stronger persistent assistant platform, while Hermes would probably remain the stronger general-purpose agent workbench.

Enriched OpenClaw would likely be better when:

- The goal is an always-on assistant spanning channels, sessions, memory, notifications, and automation.
- The product wants a control plane around the agent, not just a powerful agent loop.
- KAIROS-style proactive behavior is a primary goal.

Enriched OpenClaw risks:

- It could become architecturally sprawling if Claude-style runtime complexity is added without Claude's internal integration discipline.
- The plugin and control-plane orientation may still leave the core coding loop less tight than Hermes for purely local developer workflows.

Enriched Hermes would likely be better when:

- The goal is a highly capable, transparent, hackable agent runtime.
- Users care about tool and runtime flexibility, provider flexibility, and local operability.
- The system is used by builders who want to compose and modify the agent stack directly.

Enriched Hermes risks:

- Even with Claude features ported in, it may still feel like a set of advanced capabilities around an agent loop rather than a unified assistant operating environment.
- KAIROS-style always-on behavior would require more architectural refactoring because Hermes is less environment-first than OpenClaw.

If forced to choose a winner in enriched form, OpenClaw gets a narrow edge for the post-prompting, persistent assistant future, and Hermes gets a narrow edge for the best power-user agent shell and programmable agent runtime future.

There is no universal clear winner because they optimize for different centers of gravity:

- OpenClaw enriched: better assistant system.
- Hermes enriched: better agent engine.
- Claude Code remains the most complete integrated runtime today because it already fuses both sides better than either.

## Bottom Line

If the target is build the closest thing to KAIROS outside Claude Code, OpenClaw is the better host.

If the target is build the most capable and hackable coding agent runtime with Claude-grade internals, Hermes is the better host.

If the target is which stock repo looks most strategically complete right now, Claude Code is ahead of both.

## If Superhuman Is Based On Claude-Code-Enriched OpenClaw, What Should It Import From Hermes?

If the base is Claude-code-enriched OpenClaw, the goal is no longer to copy Hermes wholesale. The goal is to use Hermes to harden the runtime core so the resulting system is not just ambitious, but also operationally robust.

The Hermes features worth porting are the ones that strengthen agent execution discipline, local persistence, and extensibility without fighting OpenClaw's gateway-first architecture.

### 1. A cleaner agent-loop core

Hermes' `AIAgent` implementation is still one of the clearest standalone agent-loop designs among the three projects. It has explicit iteration budgets, batch safety checks, destructive-command heuristics, surrogate sanitization, and clear handling for tool concurrency in `run_agent.py`.

For Superhuman, this matters because Claude Code plus OpenClaw together can produce a very broad assistant platform, but they benefit from a more explicit and self-contained core execution contract. Importing Hermes-like iteration budgeting and tool-batch safety logic would make the OpenClaw plus Claude stack easier to reason about and safer under autonomous execution.

Recommended ports:

- Iteration budget accounting and refund semantics.
- Centralized batch parallelization policy for tools.
- Stronger destructive-command heuristics at the loop boundary.
- Message sanitization and replay hygiene as first-class loop concerns.

### 2. Hermes-style local state database

Hermes' `hermes_state.py` provides a pragmatic local persistence substrate: SQLite, WAL mode, FTS5 search, schema migration discipline, session metadata, message storage, token accounting, and write-contention handling.

For Superhuman, this would complement OpenClaw's control plane and Claude's runtime features by giving the system a durable, queryable local state core rather than relying too heavily on file scatter or ad hoc stores. Claude Code already has strong session and task machinery, but Hermes shows a very clean way to make the local runtime observable and searchable.

Recommended ports:

- SQLite-backed local session and message index.
- FTS search over transcripts, notes, and decisions.
- Better write-contention handling and WAL discipline.
- Unified cost and token accounting store.

### 3. Hermes memory snapshot discipline

Hermes' memory tool has an important property that is easy to underestimate: memory is durable on disk, but the system prompt snapshot stays stable for the whole session. That avoids prompt churn and preserves cache behavior.

Claude Code already has strong extraction and consolidation logic, and OpenClaw has modular memory plugins, but Hermes contributes a crisp operational rule: writes can be live while prompt injection remains frozen until the next session. Superhuman would benefit from importing this rule as a guardrail, especially once proactive and always-on behavior are involved.

Recommended ports:

- Frozen prompt snapshot semantics for memory.
- Explicit separation between live memory state and injected prompt state.
- Built-in memory-content threat scanning for injection and exfiltration patterns.

### 4. Hermes hook system as a stable extension seam

Hermes' hook system in `gateway/hooks.py` is simple and strong: event-driven lifecycle points, filesystem discovery, manifest-plus-handler structure, wildcard events, and non-blocking error handling.

OpenClaw already has plugin infrastructure and Claude Code already has stop hooks and lifecycle automation, but Hermes contributes a very understandable extension seam. For Superhuman, this would reduce the need to encode every automation as a hardwired product feature.

Recommended ports:

- Manifested lifecycle hooks.
- Stable event names for startup, agent start, agent step, agent end, and command execution.
- Clear “hooks never block the main pipeline” policy.

### 5. Hermes toolset composition model

Hermes' `toolsets.py` is a useful pattern because it treats tool exposure as composable capability bundles. That is different from merely having many tools.

OpenClaw plus Claude Code will already have a large tool surface. A Hermes-style toolset layer would make it easier to define constrained operating modes for different Superhuman personas: coding assistant, research agent, ops monitor, customer support agent, and autonomous maintainer.

Recommended ports:

- Named capability bundles instead of a flat tool universe.
- Composition of toolsets into higher-level operating modes.
- Policy-aware toolset loading for different assistant modes.

### 6. Backend and provider abstraction discipline

Hermes is unusually broad in execution backends and provider handling. Even where not every backend is directly relevant to Superhuman, the design pressure is useful: the agent core is written to tolerate multiple environments, providers, and deployment modes.

For Superhuman, this matters because a serious always-on assistant should not be too tightly coupled to a single model provider or single runtime surface. Claude Code has strong remote and cloud paths, but Hermes contributes useful abstraction discipline.

Recommended ports:

- Cleaner provider abstraction at the agent loop boundary.
- Stronger environment portability for local, remote, and scheduled runs.
- More explicit backend contracts for browser, shell, remote container, and delegated execution.

## Recommended Hermes Port Priority For Superhuman

If I were sequencing the work, I would port Hermes features into Claude-code-enriched OpenClaw in this order:

1. Hermes local state database.
2. Hermes agent-loop execution discipline.
3. Hermes memory snapshot rules and threat scanning.
4. Hermes toolset composition layer.
5. Hermes hook model.
6. Hermes backend and provider abstraction improvements.

That ordering preserves the main thesis: Claude Code plus OpenClaw gives Superhuman the broad assistant architecture, while Hermes makes that architecture more durable, inspectable, and robust.

## Net Effect On Superhuman

With Claude Code ports, OpenClaw becomes more autonomous, more collaborative, and better at long-running agent work.

With Hermes ports layered on top, it becomes more disciplined internally:

- Easier to reason about.
- Safer under autonomous operation.
- Better at local persistence and recall.
- More modular in capability exposure.
- Less likely to collapse under runtime complexity as the project grows.

In short, Claude Code should provide most of the ambition, and Hermes should provide a meaningful share of the runtime hardening.