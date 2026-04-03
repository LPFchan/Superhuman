# Superhuman UX Research

this repo, superhuman is a fork of openclaw that distilled claude-code and hermes agent's greatness by meticulously going through every line of code, every function, every module, not shallowly copying them verbatim but drawing inspiration from the underlying architecture and why those made each of them so great to begin with, but not stopping there but strived to be surpasses the projects it references from by going further than the source material.

however all of this work is mostly done within the boundaries of internal workings of superhuman, not the user-facing side of it, so that's why i'm assuming it mostly feels similar to the end user from a surface level.

here's the million dollar question however. if we were to radially shift the user-facing and interaction side of superhuman however we wanted to, since we are an independent fork of openclaw and doesn't have to follow their rules, by approaching it the same way; distilling three reference projects and going through the codebase thoroughly, and trying to reach and surpass them... how would you approach this differently?

reference source materials are at ~/Documents (claude-code, hermes-agent-audit, openclaw-audit)

## Claude Code

Based on my read-only scan of the claude-code repository, here are my findings:

### User-Facing Interaction Strengths

1. Permission Mode Cycling with Shift+Tab — Users toggle through trust levels (default → acceptEdits → plan → bypassPermissions → auto) via a single keystroke without modal friction. Visual indicator in PermissionMode.ts shows current mode with symbol + color. The mental model is instant context-switching rather than per-action approval dialogs.

2. Structured, Tool-Specific Permission Dialogs — Each action type (Bash, FileEdit, Notebook, Skill, WebFetch, etc.) has a custom approval component in components/permissions/ that shows exactly what will happen before execution (command preview, file diff, editor changes) with one-tap approve/reject, reducing approval friction while increasing confidence.

3. Queued Commands with Overflow Handling — The input queue in PromptInputQueuedCommands.tsx shows pending actions inline. Task notifications cap at 3 visible items with "+N more" summaries, preventing terminal spam while keeping users informed.

4. Rich Task Lifecycle Visibility — Seven task types (local_bash, remote_agent, in_process_teammate, monitor_mcp, dream, etc.) tracked through Task.ts with terminal states (pending → running → completed/failed/killed). Users can click individual tasks to drill into detail dialogs showing output, progress, and timing — tasks are first-class UI objects, not invisible background noise.

5. History with Pasted Content Metadata — history.ts tracks paste references (e.g., [Pasted text #1 +10 lines] and [Image #2]) with content stored externally or inline. History search and context awareness make re-running past patterns frictionless.

6. Word-Level Diff Highlighting — Fallback StructuredDiff component shows changes at word granularity, not just by line, making code reviews/diffs more confident and precise.

7. Voice Stream + Auth-Aware Gating — voiceModeEnabled.ts provides voice input when Anthropic OAuth is present; GrowthBook kill-switch allows safe rollout. Voice is treated as a first-class input mode, not a bolted-on feature.

8. Command Introspection & Contextual Prompting — The /commit command in commit.ts runs allowed git tools to fetch recent commits and suggest style, HEREDOC escaping for safety, and whitelists allowed actions so the AI model stays in guardrails. Commands are "smart templates" that adapt to repo context.

### Underlying Interaction Philosophy

Claude Code treats approval and trust as a spectrum, not a binary. Users choose their mode once (permission cycling) and the UI adapts: auto-approve tools that match the mode, queue actions that need override, show targeted dialogs for edge cases. This avoids modal fatigue while maintaining safety. The codebase optimizes for speed and clarity — permission decisions are instant (one keystroke), queued messages show what's next without forcing scrollback, and diffs highlight exactly what changed. Feedback is granular and always visible: tasks are rendered as UI objects, not logs; history preserves paste metadata; commits show diff context before creation.

### 3 Things Superhuman Should Borrow

1. Permission Mode Cycling — Replicate Shift+Tab cycling through approval levels (auto-approve composables / approve-per-category / simulate + log only / simulate only) with inline status-bar indicator. Let users switch modes mid-session without disrupting the task.

2. Queued Actions Panel — Show next N pending events (emails to send, calendar blocks to create, drafts to compose) in a resizable sidebar that updates as new decisions flow in. Cap visible items at 3 with "+N more pending" to avoid cognitive overload, and make each item clickable for detail/edit.

3. Action-Specific Detail Cards — For each dangerous operation (send email, book meeting, create task), render a small card with the exact details (recipients, subject, time, duration) and a single approve/reject button, replacing generic "do you want to proceed?" dialogs with confidence-building specificity.

## Hermes Agent

I've completed a medium-depth scan of the hermes-agent. Here are my findings:

### Product/UX Strengths (grounded in specific files)

1. Single-source-of-truth command registry — hermes_cli/commands.py defines all slash commands once; every consumer (CLI help, Telegram BotCommands, Slack subcommand routing, autocomplete, gateway dispatch) derives automatically. No duplication or drift between interfaces.

2. Layered dangerous-command approval system — tools/approval.py implements pattern detection (31 regex patterns covering rm, chown, SQL DROP, fork bombs, ANSI/Unicode obfuscation), per-session approval state with thread-safe locking, and permanent allowlist persistence in config.yaml. Supports YOLO mode to bypass for trusted contexts.

3. Unified interface across Telegram + Discord + Slack + CLI — hermes_cli/commands.py uses cli_only, gateway_only, and gateway_config_gate flags to conditionally expose commands. The same /model, /compress, /skills, /retry work everywhere, lowering cognitive load for users moving between platforms.

4. Interactive TUI callbacks for approval/secrets/clarification — hermes_cli/callbacks.py integrates blocking prompts (clarify, sudo, secret input) into the prompt_toolkit event loop with timeouts and visual feedback. No hard-coded dialogs; all callbacks are optional and pluggable.

5. Curses multi-select checklists with automatic text fallback — hermes_cli/checklist.py renders interactive ↑↓ navigate SPACE toggle ENTER confirm ESC cancel UI for tool/skill selection; automatically falls back to numbered text UI on Windows or piped stdin. Status callback allows live token estimates.

6. Full message history + FTS5 search + parent session chains — hermes_state.py stores every message (including reasoning) in SQLite with WAL mode and messages_fts virtual table. Compression-triggered session splitting via parent_session_id chains; users can /resume <name> any past session.

7. Skill-as-procedural-memory with agent-managed creation + security scanning — tools/skill_manager_tool.py lets the agent create SKILL.md files with templates/references/scripts. All new skills (bundled, hub-installed, or agent-created) pass the same security scanner; violations block install or log warnings.

8. Background process buffering + polling with crash recovery — tools/process_registry.py spawns tasks via /background, buffers 200KB rolling output, polls via /stop, and persists process state in processes.json for gateway recovery. No orphaned processes on crash.

### Underlying Interaction Philosophy

Hermes treats the agent as an autonomous yet auditable system operating under a publish-once, consume-everywhere model: a single command registry, skill manifest, and approval policy are the source of truth, automatically propagated to CLI, Telegram, Discord, Slack, and web—never hand-rolled or duplicated. Autonomy is gated by layered controls (dangerous-command patterns, per-session approval state, YOLO bypass, allowlist persistence) and underpinned by full auditability (FTS5 session search, trajectory logging, cost tracking with source/status metadata). The system expects to run everywhere (localhost VPS to serverless with Modal hibernation) without changing config, abstracts the terminal backend, and treats skills and memory not as afterthoughts but as the core operational model: the agent learns by creating/improving reusable procedures rather than by fine-tuning.

### 3 Things Superhuman Should Borrow

1. Central CommandDef registry fed to all consumers — Instead of hand-rolling /approve in gateway callbacks, /model in separate CLI/gateway paths, and duplicating aliases across interfaces, define slashes once in a schema, auto-generate help, autocomplete, Telegram menus, and route handlers. Drift and missed features disappear. See commands.py pattern.

2. Dangerous-command approval with Unicode/ANSI normalization + session state machine — Current approval is binary; Hermes normalizes obfuscation vectors (ANSI escapes, fullwidth Latin, null bytes), keeps per-session approval sets (not just allowlist), and supports both async gateway prompts and sync CLI interactive flows. See approval.py pattern and callbacks.py.

3. Skill-as-procedural-memory created by the agent, not humans — Rather than curating a massive prompt or asking users to author skills manually, let the agent create SKILL.md files after complex tasks, then reuse them. Pair with security scanning (block dangerous patterns) and cross-session FTS5 search so the agent can find its own past solutions. See skill_manager_tool.py and hermes_state.py patterns.

### Files referenced:

hermes_cli/commands.py — command registry
tools/approval.py — dangerous-command detection
hermes_cli/callbacks.py — TUI callbacks
hermes_cli/checklist.py — curses UI
hermes_state.py — session storage
tools/skill_manager_tool.py — skill creation
tools/process_registry.py — background task management

## OpenClaw

Based on my scan of the OpenClaw codebase, herea re the key findings:

### Five Strongest User-Facing Interaction Patterns

1. Omnichanneling with deterministic routing — Users message the assistant from their choice of 20+ apps (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, etc.), and replies always route back to the same channel/app they came from. No manual channel switching required. See docs/channels/channel-routing.md.

2. "Quickstart" guided onboarding (CLI + macOS app) — One-liner install + openclaw onboard with smart defaults for gateway/auth/workspace, plus a parallel visual onboarding flow in the macOS app. Bridges terminal and UI-driven setup seamlessly. docs/start/onboarding.md + src/wizard/setup.ts.

3. Explicit pairing for access control — DMs from unknown senders trigger 8-char approval codes with 1-hour expiry; operator must approve via CLI. Clear audit trail, no silent access. docs/channels/pairing.md.

4. Multi-agent isolation with clear bindings — Multiple isolated agents (separate workspaces, auth profiles, session stores) routed by bindings rules (peer match → guild → channel → default). Users see exactly which agent handles which conversation. docs/concepts/multi-agent.md.

5. Proactive automation (heartbeats, cron, webhooks, sub-agents) — Agents can spawn background sub-agent runs that report completion back to the requester chat; scheduled tasks run independently via cron/heartbeats. Background work surfaces results to the user rather than silent execution. docs/tools/subagents.md, docs/automation/tasks.md.

6. Native mobile + macOS companion apps — macOS app (menu bar + gateway broker) and iOS/Android apps connect as lightweight "nodes" to the gateway, exposing system permissions, camera, canvas rendering, and persistent foreground notifications. Not treated as primary—they're extensions to the always-on gateway. docs/platforms/macos.md, docs/platforms/android.md.

7. Browser Control UI (WebChat) — Native Vite+Lit SPA served by the gateway (not a reverse proxy), speaks directly to Gateway WebSocket, supports token/password auth, Tailscale Serve, and remote tunnels. Minimal friction for browser-based chat + system config. docs/web/control-ui.md, docs/web/webchat.md.

8. Device pairing flow — Same approval model as DM pairing but for iOS/Android/macOS nodes connecting to the gateway. Can pair entirely from Telegram (/pair command in device-pair plugin) or via native app setup codes. docs/channels/pairing.md.

### Underlying Interaction Philosophy

OpenClaw operates around a locally-controlled personal OS mental model: one operator, many isolated agents, explicit trust boundaries (pairing codes before any message processes), deterministic routing (replies follow inbound channels automatically), and persistent context that survives across devices and sessions. The philosophy inverts traditional hosted-AI SaaS—infrastructure you control, data stays local, extensible via community skills, and accessible through habits users already have (messaging apps). UX prioritizes operator control (pairing gates), locality (run on your hardware), transparency (explicit agent routing), and autonomy (agents proactively message back with results). Security and setup reliability are design-first, not add-ons.

### Three Things Superhuman Should Borrow

1. Deterministic outbound routing — When a user replies to an email or SMS, automatically route the response back through the same input channel (email → email, SMS → SMS, Telegram → Telegram) without requiring manual surface selection. Preserve the mode the sender used to contact you; don't force unification.

2. Explicit approval model for new contacts — Mimic DM pairing: when an unknown sender reaches the inbox, generate a short approval code, require explicit operator confirmation (CLI or app), set a time limit on the code, and log approved entries. Make access control visible and auditable in a list command.

3. Native mobile companion with persistent quick-actions — Build a lightweight iOS/Android app (analogous to macOS menu bar) that mirrors key Superhuman surfaces (inbox count, queue status, VIP flagging) and exposes haptic-friendly gesture shortcuts (swipe to defer, tap to snooze, voice to quick-reply). Sync state bidirectionally so triage on mobile reflects in desktop inbox immediately.
