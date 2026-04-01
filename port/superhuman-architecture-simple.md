# Superhuman Architecture Draft

## The Big Idea

Superhuman should be built like this:

- OpenClaw is the outer shell.
- Claude Code is the big capability upgrade.
- Hermes is the hardening and stability layer.

In simple terms:

- OpenClaw gives you the assistant world.
- Claude Code gives you the assistant superpowers.
- Hermes makes sure the whole thing stays clean, safe, and durable.

## What Each Project Should Contribute

### From OpenClaw

- Gateway and control-plane structure.
- Sessions and assistant environment model.
- Channel and messaging posture.
- Plugin-based extension model.
- Boot-time workspace behavior.

This is the base because it already feels like an assistant platform.

### From Claude Code

- Better context handling for long sessions.
- Automatic memory extraction and background memory cleanup.
- Proactive and always-on assistant behavior.
- Multi-agent teamwork.
- Scheduling and remote execution.
- Shared team memory.
- Notifications, file delivery, and PR subscriptions.

This is the capability jump.

### From Hermes

- Better local state storage.
- Safer and cleaner agent loop behavior.
- Better memory rules.
- Clean hooks.
- Tool bundles.
- Better backend flexibility.

This is the hardening layer.

## The Architecture In Plain English

## 1. The Shell

This comes mostly from OpenClaw.

What it does:

- Keeps track of sessions.
- Manages channels and plugins.
- Boots the workspace into assistant mode.
- Defines the main environment the assistant lives in.

End goal:

Superhuman feels like a real assistant environment, not just a one-off chat session.

How we know it worked:

- Restarting the system does not confuse its identity.
- Sessions and plugins come back correctly.
- The workspace can start with assistant behavior already wired in.

## 2. The Core Agent Runtime

This should mostly come from Hermes, with Claude Code ideas layered on top.

What it does:

- Runs the agent loop safely.
- Limits runaway loops.
- Controls which tools can run together.
- Prevents obviously dangerous command behavior.

End goal:

The system stays understandable and safe even when it gets more autonomous.

How we know it worked:

- It cannot spin forever without being stopped.
- Unsafe actions are caught early.
- Tool behavior is predictable.

## 3. Context and Memory

This should mostly come from Claude Code, with OpenClaw and Hermes shaping how it works.

What it does:

- Keeps long conversations from degrading.
- Saves important memories automatically.
- Cleans up and organizes memory in the background.
- Shares useful repo memory across collaborators.
- Keeps memory from destabilizing the prompt in the middle of a session.

End goal:

Superhuman keeps getting smarter over time without becoming messy or unstable.

How we know it worked:

- Long sessions still work well.
- Useful memory is saved automatically.
- Team memory sync works safely.
- Prompt behavior stays stable inside active sessions.

## 4. Multi-Agent Coordination

This should mostly come from Claude Code.

What it does:

- Lets one agent act like a coordinator.
- Launches worker agents.
- Routes messages and approvals between them.
- Tracks task status.

End goal:

Superhuman can split work across multiple agents and still feel like one system.

How we know it worked:

- Workers can be launched and continued cleanly.
- You can see what each worker is doing.
- Permissions and follow-up messages route correctly.

## 5. Proactive Automation

This should mostly come from Claude Code, built on top of OpenClaw's assistant shell.

What it does:

- Runs periodic proactive checks.
- Handles scheduled jobs.
- Runs remote scheduled agents.
- Sends notifications.
- Delivers files.
- Watches PRs and other events.

End goal:

Superhuman stops waiting for prompts and starts acting like an operator.

How we know it worked:

- It notices useful work on its own.
- It can explain what it did and why.
- Scheduled work keeps running correctly.

## 6. State and Search

This should mostly come from Hermes.

What it does:

- Stores sessions and messages cleanly.
- Lets you search history.
- Tracks costs and usage.
- Keeps action history inspectable.

End goal:

Superhuman should be easy to inspect and debug.

How we know it worked:

- You can search old sessions.
- You can inspect what happened in background runs.
- Costs and actions are visible.

## Build Order

## Phase 1: Start from OpenClaw

Do this first:

- Keep OpenClaw's gateway and assistant environment as the base.
- Add a simple local state layer inspired by Hermes.

Why first:

You need a stable shell before adding autonomy.

Success looks like:

- The base environment is stable and restart-safe.

## Phase 2: Harden the runtime with Hermes ideas

Do this second:

- Add safer loop behavior.
- Add budgeting.
- Add tool safety rules.
- Add safer transcript handling.

Why second:

You want safety before power.

Success looks like:

- The system behaves predictably even under stress.

## Phase 3: Add Claude Code context and memory systems

Do this third:

- Add compaction.
- Add context collapse.
- Add automatic memory extraction.
- Add memory cleanup and shared team memory.

Why third:

You need long-session quality before full autonomy.

Success looks like:

- Long sessions stay useful.
- Memory becomes a strength, not a mess.

## Phase 4: Add multi-agent coordination

Do this fourth:

- Add coordinator and worker patterns.
- Add inbox and message routing.
- Add task tracking.

Why fourth:

Multi-agent systems are only useful once the base runtime is solid.

Success looks like:

- Agents can cooperate in a way that is easy to see and control.

## Phase 5: Add proactive behavior and scheduling

Do this fifth:

- Add proactive ticks.
- Add local and remote scheduled jobs.
- Add notifications, file delivery, and PR watching.

Why fifth:

This is where the system starts feeling truly Superhuman.

Success looks like:

- The assistant starts useful work on its own and records it clearly.

## Phase 6: Add optional advanced execution surfaces

Do this last:

- Add richer remote execution.
- Add optional computer-use features.

Why last:

These are powerful but more operationally risky.

Success looks like:

- Local and remote behavior feel like one system instead of separate products.

## Final Vision

The finished system should feel like this:

- OpenClaw gives it a home.
- Claude Code gives it advanced intelligence and autonomy.
- Hermes gives it discipline and reliability.

If the build goes well, Superhuman should become a persistent technical assistant that can:

- remember,
- coordinate,
- schedule,
- act proactively,
- use local and remote execution,
- and still remain understandable enough to trust.