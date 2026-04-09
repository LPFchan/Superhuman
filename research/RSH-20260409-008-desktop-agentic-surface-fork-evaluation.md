# RSH-20260409-008: Desktop Agentic Surface Fork Evaluation

Opened: 2026-04-09 20-45-49 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Status: in progress
- Question: Which forkable desktop or desktop-adjacent agentic workspace surface is the best next substrate for Superhuman's desktop-first project cockpit?
- Trigger: operator requested a desktop-first fork evaluation after checkpointing the cross-surface IA and state model
- Related ids: RSH-20260409-006, RSH-20260409-007, RSH-20260409-009, DEC-20260409-007, LOG-20260409-012, LOG-20260409-013
- Scope: desktop GUI / operator cockpit; source/readme/license/health review; light local smoke; API seam and client-shell fit
- Out of scope: choosing the coding harness; final screen IA; mobile fork search; messenger fork search; accepting a fork candidate

## Current Recommendation

Do not accept a desktop fork candidate yet.

Do not run a winner-take-all OpenHands fork spike yet.

Run the smallest **desktop-server boundary spike** first:

1. Draft the minimum Superhuman desktop <-> server contract: portfolio, project, generic chat, project chat, agent/session tree, run, approval, tool stream, file tree, file read, diff, terminal/process, notification, and off-Git transcript events.
2. Check whether current Superhuman gateway/server RPC already exposes that contract, exposes an adjacent contract, or needs a new desktop/mobile sync API.
3. Mock that contract before modifying a candidate.
4. Run a replacement-seam read of `OpenHands/OpenHands`, `different-ai/openwork`, `coollabsio/jean`, `pingdotgg/t3code`, and `anomalyco/opencode`.
5. Then pick one read-only UI spike: one Superhuman project -> chat/session -> run -> stream -> approval -> file -> diff path through a candidate shell.

Current bias:

- Treat `OpenHands/OpenHands` as the known API-seam benchmark from the first pass.
- Treat `different-ai/openwork` as the strongest SPEC-aligned lead from the supplementary pass, pending verification.
- Treat `coollabsio/jean` as the strongest remote/mobile desktop-shell lead from the supplementary pass, pending verification.
- Treat `pingdotgg/t3code` as the minimal external-agent GUI lead from the supplementary pass.
- Treat `anomalyco/opencode` as a fresh active OpenCode lead; do not confuse it with archived `opencode-ai/opencode`.

## Product Boundary

Superhuman's desktop is a client of Superhuman-owned project/runtime state.

The desktop candidate can donate a shell, view hierarchy, app packaging, stream renderer, diff/file/terminal panel, approval UX, local relay trick, or editor/browser/terminal composition. It should not silently become the canonical runtime, chat database, memory store, approval ledger, repo manager, or coding harness.

Layer split:

- RSH-008: desktop/operator GUI, project cockpit, app shell, contextual file/code/diff/terminal/browser evidence, review/merge/status surfaces.
- RSH-009: coding harness/backbone performance, OpenClaw, current Superhuman runtime, Claude Code, Hermes Agent, Letta system, OpenCode harness, ForgeCode, Harbor/Terminal-Bench, Terminus-KIRA, and benchmark mechanics.

## Evaluation Model

Score key: `5` strong fit, `3` usable with surgery, `1` poor fit, `R` reference only, `?` not verified.

Local State Thickness is inverted: `1` is thin/easier to replace, `5` is thick/harder to cut away.

| Candidate                  | Current Lane              | API Seam | Cockpit Fit | Evidence Views | Approval UX | Mobile / Remote | Local State Thickness | License | Verification       |
| -------------------------- | ------------------------- | -------: | ----------: | -------------: | ----------: | --------------: | --------------------: | ------: | ------------------ |
| `OpenHands/OpenHands`      | API-seam benchmark        |        5 |           3 |              4 |           4 |               3 |                     3 |       4 | first-pass source  |
| `different-ai/openwork`    | server-aligned lead       |        5 |           4 |              3 |           3 |               5 |                     2 |       ? | handoff only       |
| `coollabsio/jean`          | remote/mobile shell lead  |        4 |           4 |              4 |           4 |               5 |                     3 |       5 | handoff only       |
| `pingdotgg/t3code`         | minimal web/desktop GUI   |        4 |           3 |              3 |           3 |               2 |                     3 |       5 | first-pass source  |
| `anomalyco/opencode`       | active client/server lead |        4 |           2 |              4 |           3 |               3 |                     3 |       5 | handoff only       |
| `stablyai/orca`            | worktree-native IDE lead  |        3 |           4 |              5 |           4 |               2 |                     4 |       ? | handoff only       |
| `generalaction/emdash`     | broad operator shell lead |        3 |           4 |              4 |           3 |               3 |                     3 |       ? | handoff only       |
| `alltuner/factoryfloor`    | thin native shell ref     |        3 |           3 |              5 |           3 |               1 |                     1 |       5 | handoff only       |
| Paseo                      | remote-access ref         |        4 |           3 |              2 |           3 |               5 |                     1 |       ? | handoff only       |
| `johannesjo/parallel-code` | mobile-monitor ref        |        3 |           3 |              4 |           4 |               4 |                     2 |       5 | handoff only       |
| `Glass-HQ/Glass`           | unified canvas ref        |        2 |           3 |              5 |           3 |               4 |                     5 |       ? | handoff only       |
| `autohandai/commander`     | simpler desktop candidate |        3 |           3 |              3 |           3 |               1 |                     3 |       ? | handoff only       |
| `ogulcancelik/herdr`       | terminal/socket ref       |        4 |           3 |              4 |           3 |               2 |                     2 |       ? | handoff only       |
| `aofp/yume`                | Claude subprocess ref     |        2 |           3 |              4 |           3 |               1 |                     4 |       ? | handoff only       |
| `dyad-sh/dyad`             | desktop shell reference   |        3 |           3 |              4 |           3 |               1 |                     4 |       3 | first-pass source  |
| `cline/cline`              | task-loop reference       |        3 |           2 |              5 |           5 |               1 |                     4 |       5 | first-pass source  |
| `RooCodeInc/Roo-Code`      | task-loop reference       |        3 |           2 |              5 |           5 |               1 |                     4 |       5 | first-pass source  |
| `charmbracelet/crush`      | API/control reference     |        4 |           3 |              4 |           4 |               3 |                     3 |       1 | CLI smoke + source |
| `opencode-ai/opencode`     | archived reject           |        R |           R |              R |           R |               R |                     R |       5 | archived reject    |

## Shortlist To Verify Next

### OpenHands Local GUI

- Source: https://github.com/OpenHands/OpenHands
- Status: source/readme/package inspected in first pass.
- Why it matters: React SPA plus REST/socket-oriented local GUI; the clearest API replacement seam in the original candidate set.
- Keep: conversation/run view, file/diff/terminal panels, stream rendering, frontend/API separation.
- Replace: OpenHands task/runtime/sandbox as product center, unless RSH-009 later accepts it as a harness.
- Next check: run frontend mock/dev mode, document exact REST/socket state shape, and map it to Superhuman project/chat/run/approval events.

### OpenWork

- Source: https://github.com/different-ai/openwork
- Status: operator handoff only; verify source/license/README.
- Why it matters: reportedly a desktop app + messaging connectors + server mode, with a "client consumes server surfaces" architecture that directly matches Superhuman's SPEC.
- Keep if true: server-client philosophy, desktop/messenger composition, connector/server separation.
- Risk: may be too OpenCode-shaped under the hood.
- Next check: verify license, repo layout, server API, desktop API client, connector model, and whether desktop can be pointed at a non-OpenWork server.

### Jean

- Source: https://github.com/coollabsio/jean
- Status: operator handoff only; verify source/license/README.
- Why it matters: reportedly Tauri/React/Rust desktop with built-in HTTP/WebSocket server, token auth, browser/mobile remote access, worktree sessions, Plan/Build/Yolo modes, diff viewer, and per-prompt backend overrides.
- Keep if true: local HTTP/WebSocket remote path, remote/mobile web access, notification/approval patterns, diff viewer, mode switcher.
- Risk: worktree-session manager may be local-first in a way that fights Superhuman's synced state.
- Next check: run/read server route definitions, state store, auth model, WebSocket events, remote browser UI, and license.

### T3 Code

- Source: https://github.com/pingdotgg/t3code
- Product: https://t3.codes
- Status: source/readme/package/observability docs inspected in first pass; GitHub metadata reported MIT.
- Why it matters: minimal web GUI around external Codex/Claude agents; packaged desktop path; local NDJSON span trace, provider-event files, optional OTLP.
- Keep: thin external-agent shell, trace/event model, stream renderer, desktop packaging clues.
- Risk: early project; may be too narrow for portfolio/project/orchestrator UX.
- Next check: run locally and compare its server/client event model against the Superhuman desktop-server mock.

### Active OpenCode

- Source: https://github.com/anomalyco/opencode
- Status: operator handoff only; verify source/license/current README/API/desktop app/Harbor adapter.
- Why it matters: reportedly active SST rewrite with client/server architecture, TUI over local server, desktop app, LSP, MCP, many providers, Copilot auth, Harbor adapter.
- Keep if true: client/server protocol ideas, LSP/diagnostic surfaces, desktop/TUI separation, Harbor compatibility.
- Risk: huge ecosystem gravity; cross-listed with RSH-009 harness evaluation.
- Next check: verify it fresh. Do not inherit the archived `opencode-ai/opencode` rejection.

## Secondary Fork Candidates / References

- `stablyai/orca`: verify. Handoff says cross-platform worktree-native IDE for Claude Code/Codex/OpenCode, with file editor, diff review, PR/CI, notifications, split terminals, and `orca-cli` skill that agents can use to control the IDE.
- `generalaction/emdash`: verify. Handoff says cross-platform desktop operator shell for 23 CLI agents including Hermes Agent, SSH/SFTP remote dev, ticket intake, local SQLite, no code sent to Emdash servers.
- `alltuner/factoryfloor`: verify. Handoff says MIT macOS Swift app using Ghostty's GPU terminal engine, lifecycle scripts, tmux-persisted Claude sessions, embedded browser auto-port detection, PR/CI per worktree.
- `Glass-HQ/Glass`: verify license carefully. Handoff says open browser/editor/terminal unified on GPUI/Metal canvas, with ACP agents as background daemons and a forked `Glass-HQ/gpui`.
- Paseo / `@getpaseo/cli`: locate source/license. Handoff says self-hosted daemon for Claude Code/Codex/OpenCode, CLI/web/mobile access, optional E2E relay, local-network or own tunnel, voice local-first, zero server-side state.
- `johannesjo/parallel-code`: verify. Handoff says MIT desktop app for Claude/Codex/Gemini in worktrees, diff viewer, merge button, QR-code mobile monitoring over Wi-Fi/Tailscale.
- `autohandai/commander`: verify. Handoff says Tauri v2 Rust + React/Vite app, Claude/Codex/Gemini CLI support, `.commander/` worktrees, persistent project chats, slash commands.
- `ogulcancelik/herdr`: verify. Handoff says Rust terminal-native agent multiplexer with socket API that agents can use to spawn panes/agents and read output.
- `aofp/yume`: verify license. Handoff says Tauri/React Claude Code GUI that spawns real Claude CLI, with built-in agent roles, background worktree agents, and task routing.
- `penso/arbor`: unverified queue. Handoff says native desktop app for git worktrees and agentic coding.
- `celia/finite`: unverified queue. Handoff says spatial terminal multiplexer for macOS.
- `jakemor/kanna`: unverified queue. Handoff says web UI for Claude Code and Codex.

## First-Pass References

- Conductor: https://www.conductor.build/ ; https://docs.conductor.build/ ; closed Mac reference for teams of Codex/Claude agents, isolated workspaces/worktrees, diff/scripts/tests/todos/MCP/slash/checkpoint/review/merge flows.
- Letta GUI / state inspector: https://docs.letta.com/ ; https://github.com/letta-ai/letta ; https://github.com/letta-ai/letta-code ; reference for stateful agent/memory inspection. Full Letta system belongs in RSH-009.
- Dyad: https://github.com/dyad-sh/dyad ; Electron/React desktop app-builder shell; useful packaging/state/code-surface donor; keep away from `src/pro` unless the operator accepts that license island.
- Cline: https://github.com/cline/cline ; VS Code extension reference for approval/diff/terminal/browser/MCP/checkpoint/task-loop UX.
- Roo Code: https://github.com/RooCodeInc/Roo-Code ; VS Code extension reference for modes, auto-approval, checkpoints, codebase indexing, task hierarchy.
- Crush: https://github.com/charmbracelet/crush ; CLI/TUI/API reference; smoke returned `crush version v0.56.0`; FSL posture makes it reference-only for now.
- Continue: https://github.com/continuedev/continue ; CLI/extension reference; smoke returned `1.5.45`; useful for readonly/auto, allow/ask, resume/fork, checks/review vocabulary.
- Bolt.diy: https://github.com/stackblitz-labs/bolt.diy ; app-builder reference, not a first desktop candidate.
- Aider: https://github.com/Aider-AI/aider ; repo-map / patch / commit loop reference, not a GUI surface.

## Closed / Non-Fork References

Use these as mechanic/product references only.

- Cursor: closed IDE-side reference; also a performance/harness reference for RSH-009.
- Codex desktop: closed chat-first portfolio-sidebar / home-prompt reference.
- Conductor: closed reference, not fork target unless source/license appears.
- Graft: https://graftapp.io ; closed Mac reference for parallel worktree agents, multi-model choice, and PR-comment review UI.
- Polyscope: https://getpolyscope.com ; closed Mac reference for copy-on-write clone isolation, E2E mobile relay, and autopilot.
- Capy: closed "IDE for the parallel age" per handoff; reference only.
- Admiral: https://admiralai.dev ; closed native Swift/AppKit Mac reference.
- GlassCode: closed native Mac multi-agent Claude Code app; separate from `Glass-HQ/Glass`.
- Aizen: closed early-access Mac reference; handoff flags libghostty GPU terminal and ACP / Aizen Communication Protocol registry.
- CommanderAI: https://commanderai.app ; closed SwiftUI Mac reference; separate from `autohandai/commander`.
- Solo: https://soloterm.com ; closed/freemium reference for MCP-exposed process state/logs and committed `solo.yml` shared stack.
- Lody: https://lody.ai ; closed PWA/mobile reference for in-context response diffs, sharing, PR/CI sync.
- roro: https://tryroro.com ; closed/free Mac reference for agent calendar, night-scheduled Claude Code work, hooks, personas, and return-to-results timeline.
- Zodex: https://zodex.dev ; closed Tauri/Rust reference for checkpoint/rollback of whole workspace per turn, loop detection, structured outputs.
- Superset: https://github.com/superset-sh/superset ; source-available under Elastic License 2.0 per handoff; not Apache / not true OSS.

## Do Not Start Here

- `opencode-ai/opencode`: archived/moved; this rejection applies only to the archived repo.
- `voideditor/void`: paused IDE work and VS Code-fork weight.
- `microsoft/vscode`: too low-level / editor-first unless the whole product direction changes.
- `zed-industries/zed`: too much editor substrate and mixed/copyleft-license risk for a chat-first cockpit.
- `charmbracelet/crush`: useful reference, but do not fork in this wave because of FSL license posture.

## Watch

- Helmor: announced 2026-04-08 by @caspian_1016 / GitHub `dohooo` per handoff. Claimed upcoming open-source agent orchestration IDE and one-click migration from Conductor. No source released as of the 2026-04-10 supplementary handoff.

## Verified In This Research Lane

- Read first-pass source/readme/package/license/health context for OpenHands, Dyad, Cline, Roo, Crush, Continue, Bolt.diy, Aider, Zed, VS Code, archived `opencode-ai/opencode`, Conductor, T3 Code, Letta.
- Smoked Crush CLI through `npx --yes @charmland/crush --version`.
- Smoked Continue CLI through `npx --yes @continuedev/cli --version`.
- Inspected OpenHands frontend/package and confirmed mock-dev / React / REST+SPA positioning.
- Inspected Dyad package/database shape and confirmed Electron plus local SQLite-backed app/chat/message schema.
- Inspected Crush route/API shape at a high level: workspaces, sessions, messages, filetracker, diagnostics, permissions, agents, queued prompts, summarize, MCP.
- Inspected Cline task-core imports at a high level: permission, terminal, browser, MCP, checkpoints, diff, session, state manager.

## Preserve Vs Replace

Preserve from a candidate only if it earns the privilege:

- desktop app shell, updater, menu/tray/deep-link behavior
- chat/run stream rendering
- terminal/tool stream visualization
- contextual file, folder, code, diff, terminal, browser, preview, diagnostic, PR, CI, or artifact panels
- permission / approval / checkpoint / rollback interaction patterns
- browser/mobile/relay access tricks
- agent-to-shell control API patterns
- thin frontend/server boundary

Replace with Superhuman-native primitives:

- project portfolio model
- generic chat vs project chat triage
- project -> agent/chat session -> subagent tree
- `agent-id` / `run-id` provenance
- off-Git raw transcript, execution trace, approval runtime, and notification state
- capture packet routing and reflection
- repo-template-aware orchestrator briefs and proposals
- policy that ordinary agents do not directly mutate `SPEC.md`, `STATUS.md`, or `PLANS.md`
- mobile cockpit sync and approval return path
- messenger capture/status/read integration
- repo-template adoption, research, decisions, worklogs, upstream-intake, truth/status/plans reflection

## Next Work

1. Define or discover Superhuman's desktop/mobile server API.
2. Verify source/license/API/readme for OpenWork, Jean, Orca, Emdash, FactoryFloor, Glass, Paseo, Parallel Code, Commander, Herdr, Yume, active OpenCode, Arbor, Finite, and Kanna.
3. Re-score only after verification; keep handoff-only rows marked as handoff-only until then.
4. Run the desktop-server mock spike against one or two candidates.
5. Create a `DEC-*` only after accepting a desktop substrate, reference mechanic, or explicit "build native" strategy.

## Open Questions

- Does Superhuman's server already expose a clean HTTP/WebSocket API that a forked desktop shell can wire to?
- Is the first desktop artifact a packaged web shell, Electron app, Tauri app, native Mac app, or candidate-derived client?
- Does mobile sync happen through Superhuman cloud/gateway, a self-hosted relay, local-network pairing, or several modes?
- Which candidate has the cleanest replaceable client after source verification: OpenHands, OpenWork, Jean, T3 Code, active OpenCode, or a smaller shell?
- Which candidate has the best mechanic to steal, even if it is not the fork substrate?
