# Claude Code vs OpenClaw vs Hermes Agent

## What These Three Projects Basically Are

Claude Code is the most complete overall system. It is not just a chat tool for coding. It has background tasks, multiple agents, scheduling, remote and cloud sessions, shared memory, hidden proactive features, and even guarded computer-use support.

OpenClaw is more like an assistant control center. It is built around a gateway, sessions, channels, plugins, memory, and automation. It feels like the best base for a long-running AI assistant that lives around you.

Hermes is more like a powerful agent engine. It has lots of tools, memory, search, hooks, delegation, and backends, but it is centered more on the agent loop itself than on a full assistant operating environment.

## Strengths and Weaknesses

### Claude Code

- Best overall integration.
- Best hidden advanced features.
- Best at long coding sessions and multi-agent workflows.
- Weakness: very complex and a lot is gated or internal.

### OpenClaw

- Best control-plane mindset.
- Best fit for a persistent personal assistant.
- Clean memory plugin architecture.
- Weakness: weaker than Claude Code on context handling and deep coding-agent runtime behavior.

### Hermes

- Best raw agent engine feel.
- Very strong local state, tools, and flexibility.
- Easier to understand as an agent runtime.
- Weakness: less unified and less advanced as a full assistant system.

## OpenClaw vs Hermes In Plain English

The deepest difference is this:

- OpenClaw is built around the environment the agent lives in.
- Hermes is built around the agent loop itself.

OpenClaw thinks about things like booting a workspace, session roles, channels, and control-plane behavior.

Hermes thinks about things like tool execution, model calls, local state, and running lots of different kinds of agent work.

So OpenClaw feels more like assistant platform.

Hermes feels more like agent runtime.

## What Claude Code Features I Would Add

### For OpenClaw

- Claude's advanced context management.
- Claude's automatic memory extraction and memory consolidation.
- Claude's hidden proactive and KAIROS-style always-on loop.
- Claude's shared team and repo memory.
- Claude's multi-agent coordinator model.

### For Hermes

- Claude's advanced context management.
- Claude's automatic memory extraction.
- Claude's richer scheduler and background task behavior.
- Claude's cross-session and multi-agent messaging.
- Claude's shared team and repo memory.
- Claude's more productized remote and cloud agent execution.

## Which Enriched Version Would Be Better?

If both got Claude Code's best features:

OpenClaw would probably be better as a true always-on assistant.

It already has the right shape for that: gateway, channels, sessions, plugins, and automation.

Hermes would probably be better as a powerful agent workbench for technical users.

It already has the right shape for that: strong agent loop, flexible toolsets, strong local state, and lots of runtime options.

So there is no single winner for every use case.

If you want the closest thing to an AI teammate that is always around and acts on its own, pick enriched OpenClaw.

If you want the strongest builder's agent runtime with Claude-grade upgrades, pick enriched Hermes.

## If Superhuman Is Based On Claude-Code-Enriched OpenClaw, What Should It Borrow From Hermes?

If you build Superhuman on top of Claude-code-enriched OpenClaw, Hermes is still very useful.

The main idea is this:

- Claude Code gives you ambition and advanced behavior.
- OpenClaw gives you the assistant platform and control plane.
- Hermes gives you runtime discipline and sturdiness.

So I would not use Hermes as the main base. I would use it to make the OpenClaw plus Claude stack more robust.

### Best Hermes Features To Borrow

1. Better local state storage.

Hermes has a strong SQLite-based local state system with search. That would help Superhuman keep better track of sessions, messages, costs, and history.

2. A cleaner agent loop.

Hermes is very disciplined about things like iteration limits, safe tool batching, and command safety. That would make an always-on assistant safer and easier to maintain.

3. Better memory rules.

Hermes keeps memory durable on disk while keeping the prompt snapshot stable during a session. That is a very good rule for a long-running assistant.

4. A simpler hook system.

Hermes has a clean event-hook model. That would help Superhuman add automation without hardcoding every behavior into the core product.

5. Toolset bundles.

Hermes groups tools into capability bundles. That would help Superhuman switch cleanly between modes like coding, research, support, ops, or autonomous maintenance.

6. Better backend flexibility.

Hermes is good at handling different environments and runtimes. That would make Superhuman more portable and less brittle over time.

## Best Way To Think About It

For Superhuman:

- OpenClaw should be the shell.
- Claude Code should be the brain upgrade.
- Hermes should be the stabilizer.

Claude Code helps OpenClaw become much more capable.

Hermes helps that more capable system stay clean, safe, and durable.

## Priority Order

If I were building it, I would borrow Hermes features in this order:

1. Local state database.
2. Safer and cleaner agent loop.
3. Better memory rules.
4. Toolset bundles.
5. Hook system.
6. Backend flexibility.

## Bottom Line

If Superhuman is based on Claude-code-enriched OpenClaw, the Hermes features you want are not the flashy ones.

They are the features that make the whole system more stable, inspectable, and maintainable.

Claude Code should contribute most of the advanced assistant behavior.

Hermes should contribute a lot of the runtime hardening.