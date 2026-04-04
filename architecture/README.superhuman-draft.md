# Superhuman

Superhuman is a long-running assistant for coding and operations that keeps persistent context and memory, coordinates agents across environments, and supports proactive execution across local and remote runtimes.

## What Superhuman Is

Superhuman is an architecture and integration project for building a more persistent system for technical work.

The current direction is to build something that can:

- keep context over time instead of resetting every session
- remember useful things without turning memory into prompt sludge
- coordinate multiple workers instead of acting as a single-threaded assistant
- act across local and remote environments with one operating model
- schedule, monitor, and execute work without requiring every step to be manually prompted
- stay inspectable enough that you can understand what it did and why

## What Makes It Different

Most assistant projects are centered on one request, one response, and one active session.

This project is aimed more at continuous work over time.

That means the important problems are not just model quality or tool calling. The important problems are:

- long-lived context management
- durable memory
- coordination across subagents
- background and scheduled execution
- remote execution
- safety and control under autonomy
- searchable state and action history

The intended result is a system that behaves more like a persistent work environment than a single-session assistant UI.

## Core Capabilities

Superhuman is being designed around these capabilities:

### Persistent context and memory

- long-running session continuity
- automatic memory extraction
- background memory consolidation
- shared team and repo memory

### Agent coordination

- coordinator and worker patterns
- subagent orchestration
- inbox and mailbox style communication
- task lifecycle tracking

### Proactive execution

- scheduled work
- background checks and wakeups
- event-driven follow-up behavior
- notification and delivery surfaces

### Local and remote operation

- local interactive sessions
- remote and cloud execution
- one model for local, scheduled, and remote work

### Inspectability and control

- durable local state
- searchable session history
- action logs and task state
- bounded autonomy and permission controls

## Architecture Direction

Superhuman is currently being shaped from three architectural ideas:

- an environment-first shell for sessions, channels, plugins, and assistant state
- a high-capability runtime for context management, orchestration, scheduling, remote execution, and proactive behavior
- a hardened runtime core for budgeting, local state, memory discipline, hooks, and backend flexibility

The intention is to combine those into a system that can keep state over time, coordinate work, and remain inspectable under higher autonomy.

## Project Status

Superhuman is currently in architecture and integration design.

The immediate focus is defining the core modules, integration order, and success criteria before any large-scale implementation work begins.

## Build Priorities

The planned integration order is:

1. establish the assistant shell and session model
2. harden the runtime core and local state layer
3. add context management and memory intelligence
4. add multi-agent coordination and messaging
5. add proactive and scheduled automation
6. add richer remote execution and optional advanced surfaces

## Docs

- [superhuman-architecture-technical.md](/Users/yeowool/Documents/claude-code/superhuman-architecture-technical.md)
- [superhuman-architecture-simple.md](/Users/yeowool/Documents/claude-code/superhuman-architecture-simple.md)
- [claude-code-comparison-technical.md](/Users/yeowool/Documents/claude-code/claude-code-comparison-technical.md)
- [claude-code-comparison-simple.md](/Users/yeowool/Documents/claude-code/claude-code-comparison-simple.md)

## End Goal

The end goal is a technical assistant that can carry work forward across sessions, environments, and agents while remaining understandable enough to steer, inspect, and trust.
