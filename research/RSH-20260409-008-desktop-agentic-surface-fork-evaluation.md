# RSH-20260409-008: Desktop Agentic Surface Fork Evaluation

Opened: 2026-04-09 20-45-49 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Status: in progress
- Question: Which forkable desktop or desktop-adjacent agentic coding/workspace surface is the best next substrate for Superhuman's desktop-first project cockpit?
- Trigger: operator requested a desktop-first fork evaluation after checkpointing the cross-surface IA and state model
- Related ids: RSH-20260409-006, RSH-20260409-007, DEC-20260409-007, LOG-20260409-012
- Scope: first-wave rubric, source/readme/license/health review, light local smoke where feasible
- Out of scope: final screen IA, mobile fork search, messenger fork search, committing to a fork candidate

## Recommendation

Do not fork a full IDE yet.

Run the smallest viable next spike against **OpenHands Local GUI as an agent-run workspace reference/fork candidate**, with a parallel **Dyad desktop-shell feasibility read** if packaged desktop matters more than agent-run architecture.

The recommended next spike is:

1. Fork or clone `OpenHands/OpenHands` into a throwaway branch and run `frontend` in `dev:mock`.
2. Map one Superhuman project -> chat -> run -> approval -> file/diff/terminal path onto the OpenHands frontend/API shape.
3. Stop after a written replacement map: what UI/state/API would be preserved, what must be deleted, and whether Superhuman would package it as a desktop shell or only borrow the architecture.

Why: Superhuman's desktop is supposed to be an agent-operation cockpit with contextual code/file surfaces. Among the reviewed candidates, OpenHands is the closest active, permissively licensed, local agent GUI + API product. It is not a perfect fit: the backend/runtime may be too heavy and the product model is agent-task-centric rather than Superhuman's portfolio-wide chat workspace. But it tests the highest-risk question first: can an existing open agent workspace become Superhuman's chat-first cockpit without inheriting a full IDE frame?

If that spike fails, the fallback should not be "panic-fork VS Code." The fallback should be a small Superhuman-native desktop shell that preserves the `RSH-20260409-007` IA contract and borrows narrow patterns from Cline/Roo, Crush, OpenHands, and Dyad.

## Ranked Shortlist

- Best fork candidate to spike first: `OpenHands/OpenHands` Local GUI frontend/API shape.
- Best packaged desktop-shell donor to inspect next: `dyad-sh/dyad`, excluding `src/pro`, with the expectation that its app-builder domain must be replaced.
- Best open approval/diff/terminal reference: `cline/cline` and `RooCodeInc/Roo-Code`; excellent agent-task loops, but VS Code extensions rather than Superhuman desktop.
- Best session/permission/API reference: `charmbracelet/crush`; very interesting workspace/session/agent HTTP API, but current license is not an immediate open-source fork fit.
- Best closed/reference UX: Codex desktop for chat-first portfolio sidebar and home prompt; Cursor only as an IDE-side contrast/reference.
- Best fallback if desktop fork fails: Superhuman-native desktop shell around Superhuman's own project/workspace/agent runtime; embed contextual file/code/diff/terminal views instead of forking an IDE.

## Evidence Level

- Current GitHub metadata checked on 2026-04-09 KST.
- README, license, package/source excerpts checked for finalists and references.
- Local CLI smoke run for Crush and Continue.
- Source/persistence/API seams inspected for OpenHands frontend, Dyad database, Crush server API, Cline task core, and Void pause notice.
- GUI apps were not dependency-installed or launched in this pass.

## Score Matrix

Legend: `5` strong fit, `3` usable with surgery, `1` poor fit or high risk, `R` reference only.

| Candidate                  | Posture                         | Agent Chat | Portfolio / Session | File / Diff / Terminal | Approvals / Control | State Fit | Repo-Template Fit | Extension Seams | Desktop Burden | Mobile / Sync Path | License | Health | Surgery Risk |
| -------------------------- | ------------------------------- | ---------: | ------------------: | ---------------------: | ------------------: | --------: | ----------------: | --------------: | -------------: | -----------------: | ------: | -----: | -----------: |
| `OpenHands/OpenHands`      | Spike first                     |          4 |                   3 |                      4 |                   4 |         3 |                 3 |               3 |              2 |                  3 |       4 |      5 |            3 |
| `dyad-sh/dyad`             | Runner-up desktop shell         |          3 |                   3 |                      4 |                   3 |         4 |                 2 |               3 |              4 |                  1 |       3 |      4 |            3 |
| `cline/cline`              | Reference / possible extraction |          5 |                   2 |                      5 |                   5 |         3 |                 3 |               5 |              2 |                  1 |       5 |      5 |            2 |
| `RooCodeInc/Roo-Code`      | Reference / possible extraction |          4 |                   2 |                      5 |                   5 |         3 |                 3 |               5 |              2 |                  1 |       5 |      5 |            2 |
| `charmbracelet/crush`      | Reference; do not fork yet      |          4 |                   3 |                      4 |                   4 |         4 |                 3 |               4 |              2 |                  3 |       1 |      5 |            3 |
| `voideditor/void`          | Defer / avoid start             |          4 |                   2 |                      5 |                   3 |         2 |                 2 |               4 |              1 |                  1 |       4 |      1 |            1 |
| `continuedev/continue`     | CLI / extension reference       |          3 |                   2 |                      3 |                   3 |         3 |                 3 |               4 |              1 |                  2 |       5 |      5 |            2 |
| `stackblitz-labs/bolt.diy` | App-builder reference           |          3 |                   2 |                      4 |                   3 |         2 |                 1 |               2 |              3 |                  1 |       5 |      3 |            2 |
| `Aider-AI/aider`           | Agent engine reference          |          4 |                   1 |                      3 |                   2 |         2 |                 3 |               2 |              1 |                  1 |       5 |      5 |            2 |
| `zed-industries/zed`       | Editor reference only           |          2 |                   2 |                      5 |                   2 |         2 |                 1 |               4 |              1 |                  1 |       2 |      5 |            1 |
| `microsoft/vscode`         | Editor foundation only          |          1 |                   2 |                      5 |                   1 |         1 |                 1 |               5 |              1 |                  1 |       5 |      5 |            1 |
| `opencode-ai/opencode`     | Reject archived project         |          R |                   R |                      R |                   R |         R |                 R |               R |              R |                  R |       5 |      1 |            R |

## Candidate Cards

### OpenHands Local GUI

- Source: https://github.com/OpenHands/OpenHands
- Product: https://openhands.dev
- Checked health: ~70k stars, ~8.9k forks, pushed 2026-04-09.
- License note: README states MIT for work outside `enterprise/`; `enterprise/` is separately source-available.
- Relevant shape: Local GUI for running agents on a laptop; REST API and single-page React application; frontend package has React 19, React Router, socket.io client, Monaco, xterm, mock-dev script.
- Superhuman fit: closest active open candidate for an agent-run GUI with a real API behind it.
- Main risk: the core OpenHands runtime, sandbox, and task model could become the product center of gravity. Superhuman needs a portfolio-wide chat workspace with repo-native memory, not a Devin/Jules clone.
- Fork posture: spike the frontend/API shape first; do not import the runtime wholesale unless it wins a separate runtime evaluation.

### Dyad

- Source: https://github.com/dyad-sh/dyad
- Product: https://dyad.sh
- Checked health: ~20k stars, ~2.3k forks, pushed 2026-04-09.
- License note: README says code outside `src/pro` is Apache 2.0; `src/pro` is Functional Source License 1.1 Apache 2.0. Keep the pro folder out of any fork plan unless legal/product explicitly accepts it.
- Relevant shape: Electron/Vite/React desktop app; Monaco, node-pty, ripgrep, git libraries, MCP SDK, provider adapters, better-sqlite3/Drizzle persistence.
- Inspected persistence seam: SQLite tables include apps, chats, messages, approval state, commit hash, request id, and JSON-preserved AI messages/tool results.
- Superhuman fit: good desktop packaging/state/code-surface donor; wrong domain center.
- Main risk: app-builder assumptions are everywhere. Superhuman wants existing repo/project operation, agent hierarchy, off-Git raw memory, repo-template truth, orchestrator proposals, and portfolio navigation.
- Fork posture: runner-up packaged desktop-shell candidate; run after OpenHands if desktop packaging becomes the dominant risk.

### Cline

- Source: https://github.com/cline/cline
- Product: https://cline.bot / marketplace extension
- Checked health: ~60k stars, ~6.1k forks, pushed 2026-04-09.
- License note: GitHub metadata reports Apache 2.0.
- Relevant shape: VS Code extension with rich task loop; file edits, diff provider, terminal manager, browser session, MCP hub, checkpoint manager, command permission controller, state manager, webview UI.
- Superhuman fit: excellent reference for per-task approval, terminal cooldown, checkpoints, diff review, and webview-to-agent plumbing.
- Main risk: extension-first and IDE-first. Extracting the useful loop into a portfolio desktop is probably harder than copying lessons.
- Fork posture: reference or narrow extraction; not the primary desktop fork.

### Roo Code

- Source: https://github.com/RooCodeInc/Roo-Code
- Product: https://roocode.com
- Checked health: ~23k stars, ~3k forks, pushed 2026-04-08.
- License note: GitHub metadata reports Apache 2.0.
- Relevant shape: VS Code extension; modes, MCP, checkpoints, codebase indexing, task/parent/root-task concepts, auto-approval/terminal/checkpoint machinery.
- Superhuman fit: strong reference for multi-mode agent task UX and approval wiring.
- Main risk: same as Cline; it is an editor extension, not Superhuman's top-level synchronized workspace.
- Fork posture: reference; compare with Cline only if deciding to extract a VS Code-extension agent core.

### Crush

- Source: https://github.com/charmbracelet/crush
- Product: CLI/TUI coding agent
- Checked health: ~23k stars, ~1.5k forks, pushed 2026-04-09.
- License note: repo license is FSL-1.1-MIT. Treat as reference-only for now.
- Runtime smoke: `npx --yes @charmland/crush --version` -> `v0.56.0`; `npx --yes @charmland/crush --help` worked in a prior smoke; `dirs` points at user config/data dirs.
- Inspected API seam: server routes expose `/v1/workspaces`, session history/messages, filetracker, LSP diagnostics/start/stop, permissions grant/skip, agent init/update, session cancel, queued prompts, summarize, MCP refresh/read/prompt/resource routes.
- Superhuman fit: very interesting under-the-hood model for a synced workspace/agent control API.
- Main risk: product is terminal-first; license is not an immediate fork fit.
- Fork posture: reference API/control model; do not fork in this first wave.

### Void

- Source: https://github.com/voideditor/void
- Product: https://voideditor.com
- Checked health: ~29k stars, ~2.4k forks, repo updated 2026-04-09, but README says work on the Void IDE is paused.
- License note: Void additions are Apache 2.0; inherited VS Code portions remain under VS Code's license; verify file-by-file if forking.
- Relevant shape: open-source Cursor alternative; VS Code-derived desktop IDE with dedicated `workbench/contrib/void` layer.
- Superhuman fit: closest "open Cursor-ish IDE" shape.
- Main risk: paused maintenance, enormous VS Code fork, IDE/root-frame bias, hard mobile/sync story, and too much editor gravity for a chat-first operator cockpit.
- Fork posture: avoid as starting fork unless the accepted product direction flips toward IDE-first.

### Continue

- Source: https://github.com/continuedev/continue
- Docs: https://docs.continue.dev
- Checked health: ~32k stars, ~4.4k forks, pushed 2026-04-09.
- License note: GitHub metadata reports Apache 2.0.
- Runtime smoke: `npx --yes @continuedev/cli --version` -> `1.5.45`; CLI help showed readonly/auto/allow/ask, resume, fork, checks/review commands.
- Relevant shape: CLI, checks/review, IDE-extension lineage and tooling around agents.
- Superhuman fit: possible reference for CLI policy, checks, review, resume/fork vocabulary.
- Main risk: not a desktop app and current product direction is not the same as Superhuman's operator cockpit.
- Fork posture: reference only in this wave.

### Bolt.diy

- Source: https://github.com/stackblitz-labs/bolt.diy
- Product/docs: https://stackblitz-labs.github.io/bolt.diy/
- Checked health: ~19k stars, ~10k forks, pushed 2026-02.
- License note: GitHub metadata reports MIT.
- Relevant shape: open browser-based app builder with terminal, file editing, provider selection, Electron option, deploy/import/app-generation flows.
- Superhuman fit: reference for generated-app workspace and browser terminal/file composition.
- Main risk: app-builder/browser-sandbox center; weak fit for arbitrary existing repos, repo-template truth, portfolio agent operations.
- Fork posture: reference; not a first desktop candidate.

### Aider

- Source: https://github.com/Aider-AI/aider
- Product: https://aider.chat/
- Checked health: ~43k stars, ~4.2k forks, pushed 2026-04-09.
- License note: GitHub metadata reports Apache 2.0.
- Relevant shape: terminal pair-programming agent, repo map, git-integrated flow.
- Superhuman fit: useful reference for repo map and patch/commit loop.
- Main risk: not a GUI surface; opinionated terminal pair-programmer rather than project cockpit.
- Fork posture: runtime/behavior reference only.

### Zed

- Source: https://github.com/zed-industries/zed
- Product: https://zed.dev
- Checked health: ~79k stars, ~7.8k forks, pushed 2026-04-09.
- License note: mixed license files observed: AGPL, GPL, Apache. Requires careful license review before any reuse.
- Relevant shape: high-performance native collaborative editor.
- Superhuman fit: excellent editor craft reference; poor root-frame fit.
- Main risk: massive Rust editor, license complexity, editor-first posture, not an agent cockpit.
- Fork posture: editor/reference only.

### VS Code

- Source: https://github.com/microsoft/vscode
- Checked health: ~184k stars, pushed 2026-04-09.
- License note: MIT for Code-OSS source; product distribution and marketplace branding have separate constraints.
- Relevant shape: deepest editor/extension foundation.
- Superhuman fit: too low-level and editor-first for the accepted IA.
- Fork posture: do not fork raw VS Code for this purpose; only consider if deliberately building an IDE.

### Archived Opencode

- Source: https://github.com/opencode-ai/opencode
- Checked note: README says project moved to Charmbracelet Crush.
- Fork posture: reject; evaluate Crush instead.

## Smoke-Test Notes

### Crush CLI

- Ran: `npx --yes @charmland/crush --help`
- Ran: `npx --yes @charmland/crush --version`
- Result: CLI installed through `npx`; version smoke returned `crush version v0.56.0`.
- Useful observed commands: `login`, `logs`, `models`, `projects`, `run`, `server`, `session`, `stats`, `update-providers`.
- Useful flags observed earlier: `--continue`, `--cwd`, `--data-dir`, `--host`, `--session`, `--yolo`.
- Blocker: license posture makes this a reference API/control inspection, not an immediate fork.

### Continue CLI

- Ran: `npx --yes @continuedev/cli --help`
- Ran: `npx --yes @continuedev/cli --version`
- Result: CLI installed through `npx`; version smoke returned `1.5.45`.
- Useful observed controls: readonly/auto modes, allow/ask permissions, resume, fork, review/checks commands.
- Blocker: CLI/extension/reference, not a desktop cockpit candidate.

### OpenHands Source / Package Smoke

- Inspected: README, root Python project, `frontend/package.json`.
- Result: confirmed explicit Local GUI story, REST API + React SPA statement, frontend mock-dev path, socket.io client, Monaco, xterm, React Router.
- Not run: GUI/backend. Dependency install and sandbox/backend setup should be a separate spike.
- Blocker: unknown cost of replacing OpenHands' task/backend assumptions with Superhuman's project workspace.

### Dyad Source / Package Smoke

- Inspected: README, root `package.json`, database schema.
- Result: confirmed Electron Forge desktop app; main process packaging; local SQLite-backed chats/messages/apps/versions; message-level approval state, commit hash, request id, AI-message JSON storage.
- Not run: Electron app. Dependency install and providers/app scaffolding should be a separate spike.
- Blocker: app-builder orientation plus `src/pro` license island.

### Cline Source Smoke

- Inspected: package manifest and `src/core/task/index.ts`.
- Result: confirmed VS Code extension root, webview build, task core importing permission, terminal, browser, MCP, checkpoints, diff, session, state manager; source has explicit standalone/background terminal seams.
- Not run: extension host.
- Blocker: highly useful task loop, but not a top-level desktop app.

### Void Source / README Smoke

- Inspected: README notice and package root.
- Result: confirmed project presents as an open Cursor alternative, but README states IDE work is paused and issue/PR review is not active.
- Not run: VS Code fork.
- Blocker: maintenance pause plus VS Code-fork weight.

## Integration-Risk Notes

- The right fork target is probably not the candidate with the most editor capability. Superhuman's desktop root is project/chat/agent/session, with file/code appearing contextually.
- VS Code-extension candidates have excellent permission/diff/terminal lessons, but their navigation, persistence, and authority models assume the operator already lives inside an IDE workspace.
- App-builder candidates have inviting desktop/web shells but tend to assume the goal is generating one app. Superhuman needs durable operation of many arbitrary repos and projects.
- Terminal/CLI candidates have strong agent loops but poor portfolio GUI, mobile sync, approval evidence, and contextual code browsing unless wrapped by a new surface.
- License islands matter. Mixed fair-source/pro/enterprise folders can be compatible with research and reference, but a Superhuman fork plan must explicitly mark excluded paths.
- Repo-template compatibility is mostly absent across the field. Any candidate needs a Superhuman orchestrator/memory layer rather than direct writes to `SPEC.md`, `STATUS.md`, `PLANS.md`, decisions, research, worklogs, or upstream-intake.
- Off-Git raw memory, `agent-id`, `run-id`, approvals, capture packets, mobile live sync, and messenger channel-native history are Superhuman primitives. Do not let the fork candidate's session table silently become the canonical state model.

## What Superhuman Would Need To Replace Vs Preserve

Preserve from the chosen candidate only if it earns the privilege:

- agent conversation rendering and streaming run activity
- terminal/tool stream visualization
- file, folder, code, diff, terminal, diagnostics, browser, or artifact panels
- provider/model configuration seams
- permission/approval interaction patterns
- durable local app shell, updater, tray/menu/deep-link mechanics
- backend API boundary if it cleanly supports desktop/mobile live sync

Replace with Superhuman-native primitives:

- project portfolio model
- generic chat vs project chat triage
- project -> agent/chat session -> subagent tree
- `agent-id` and `run-id` provenance
- off-Git raw execution memory and approval runtime
- capture packet creation/routing/reflection
- repo-template-aware orchestrator briefs and proposals
- policy that ordinary agents do not directly mutate `SPEC.md`, `STATUS.md`, or `PLANS.md`
- mobile cockpit sync and approval return paths
- messenger capture/status/read-operation integration
- repo-template adoption, upstream-intake, worklog, decision, research, and status/spec/plan reflection flows

## Do-Not-Fork Rejects For Now

- `opencode-ai/opencode`: archived/moved; evaluate Crush instead.
- `voideditor/void`: do not start here while README says the IDE is paused; reconsider only if Superhuman explicitly chooses VS Code IDE-root.
- `microsoft/vscode`: do not start from raw editor foundation unless the product direction becomes IDE-first.
- `zed-industries/zed`: do not start from a massive native editor with mixed/copyleft licensing for a chat-first agent cockpit.
- `charmbracelet/crush`: do not fork in this wave because of FSL license posture; keep as API/session/permission reference.

## Open Questions

- Can OpenHands frontend run in mock mode quickly enough to support a one-day UI/state spike?
- Does OpenHands expose approval/tool/terminal/file state in a way that can be mapped to Superhuman `run-id` events without taking the whole runtime?
- Can Dyad's Electron/SQLite shell be cleanly reduced to "project cockpit" or is the app-builder assumption too deep?
- Should Superhuman's desktop be packaged web shell, Electron, Tauri, native, or inherited from a candidate?
- Which candidate has the least painful path to live-syncing the same conversation/run/approval state with mobile?
