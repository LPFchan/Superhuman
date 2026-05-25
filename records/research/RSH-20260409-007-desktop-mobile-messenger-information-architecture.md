# RSH-20260409-007: Desktop Mobile Messenger Information Architecture

Opened: 2026-04-09 08-33-50 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Status: in progress
- Question: What concrete desktop, mobile, and messenger information architecture best expresses Superhuman's project-workspace model without prematurely freezing the wrong desktop structure?
- Trigger: extend `RSH-20260409-006` into a more concrete cross-surface IA exploration while keeping the work explicitly provisional
- Related ids: RSH-20260409-006, IBX-20260409-003, DEC-20260409-007
- Latest input: 2026-04-09 shared state and agent-control canonization

## Question

How should Superhuman divide responsibility across desktop, mobile, and messenger so all three feel like entrypoints into the same project workspace instead of three disconnected shells?

## Context

Superhuman's workspace thesis is now accepted, but the product still lacks a concrete surface map. Without an explicit IA exploration, future work risks either freezing an arbitrary desktop navigation too early or building mobile and messenger as shallow bolt-ons.

This research belongs in the repo because it will shape future control-surface recomposition, mobile scope, messenger integrations, and how canonical project memory is made legible to the operator.

This is a provisional surface map. It should guide exploration, not become a frozen tab list.

## Surface Strategy

- Desktop should be the primary high-bandwidth workspace surface.
- Mobile should be a project cockpit first, optimized for capture, approvals, monitoring, summaries, and redirection.
- Messenger should be a lightweight edge surface for capture, approvals, summaries, status, and redirects rather than a canonical truth-authoring surface.
- All three surfaces should resolve into the same underlying project-workspace state, not parallel memory systems.
- There is likely a useful split between cross-project surfaces and inside-a-project surfaces.
- The desktop information architecture should not be frozen yet into final labels or tab groupings; it still needs more finesse and operator-fit thinking.
- Capture packets are mutable off-Git objects until routed.

### Working Desktop IA Draft

Operator-stated direction, closeout state:

- Desktop is the main place where agents are operated.
- Manual code editing is second-class compared to operating agents.
- Desktop contains a real code editor and file browser, but should not expose them as the default front door.
- File and folder views should appear contextually when a file, folder, diff, context ref, or repo object is clicked from chat or related context.
- Capability-wise, desktop can be closer to VS Code; experience-wise, it should feel closer to a GUI Codex-style agentic app than a traditional IDE.
- Desktop is portfolio-wide by default, similar to a messaging app with many chatrooms available from the top level.
- The home surface should center a prompt box, project picker, and chatroom-style sidebar.
- Desktop can view `SPEC.md`, `STATUS.md`, and `PLANS.md`.
- Desktop should not directly edit `SPEC.md`, `STATUS.md`, or `PLANS.md` as ordinary manual documents; canonical edits should happen through orchestrator proposals or explicit operator-approved flows.
- Monitoring an agent should stay familiar: chatbot-like conversation, incremental activity, rich context sheets, file/diff/ref pills, and enough timeline/status texture to understand what the agent is doing.
- The left sidebar has a generic chat sessions section above project-specific sessions.
- Generic chat sessions can be wide or narrow scope: portfolio briefings, weather, device diagnosis, casual assistant queries, or unclassified starts.
- A generic chat can later be triaged and moved into an existing project if it turns out to be specific to one project.
- Project-specific sessions are grouped top-level by project or folder, with chat sessions underneath, similar to the Codex desktop sidebar pattern.
- Agent hierarchy should be tree-style: project -> agent or chat session -> subagents.
- The right sidebar becomes the contextual file browser and code viewer.
- Repo-template surfaces do not normally appear as navigation objects in ordinary use; the operator asks agents to brief them on those surfaces.

Desktop remaining uncertainty:

- exact visual treatment of active agents and subagents inside the project/session tree
- exact moment when a generic chat should be suggested for triage into a project
- exact contextual behavior for the right sidebar when several files, folders, diffs, or context sheets are relevant

### Working Mobile IA Draft

Operator-stated direction:

- Mobile is ingest-first and notification-first.
- In under 15 seconds, mobile should let the operator start a new generic chat, monitor what agents are doing, and respond to escalations with accept, decline, choose, or ask.
- Mobile can start new agent runs. Quick inbox ingestion is a key feature, not a desktop-only flow.
- Mobile starts can be as wide or narrow in scope as the operator wants.
- Always-online is acceptable for a first model because the experience is closer to chatbots and messengers than to an offline IDE.
- An offline "send when online" queue would still be valuable later.
- Mobile should retain the same generic-chat-to-project-triage flexibility as desktop where practical.
- Mobile should not be architecturally dependent on desktop to function.
- Mobile should be architected to support the full approval and agent-control authority set from the beginning, including risky actions.
- Initial deployment may keep risky mobile actions behind feature flags, trust modes, or explicit operator unlocks while the product tests the safety envelope.
- Mobile approval UX should be summary-first, with evidence one tap away and full relevant evidence available on mobile.
- Push immediately when an agent is blocked or needs escalation; routine completion should become quiet summary by default.
- Use a shared desktop/mobile three-tier trust slider:
  - read-only ask mode
  - full access but consult the operator in written language before acting, equivalent to plan mode
  - actual full access
- Mobile monitoring should support the same streaming transcript and tool-call visibility as desktop.
- Mobile can talk to the orchestrator agent as a first-class capability.
- Mobile can triage chats into existing projects and can start creation of new projects.
- If an offline or delayed mobile message sends much later, Superhuman should monitor relevant project-state changes across that delay. It may proceed when there is no collision and should escalate when there is meaningful state collision.
- Policy-wise, mobile is not for ordinary manual code editing. Capability-wise, tiny edits and text input should not be architecturally impossible.

Working candidates, not final names:

- a generic new-chat or capture entrypoint
- an agent activity or monitoring view
- an escalation inbox for accept, decline, choose, and ask interactions
- notification-driven return paths into relevant chats, runs, approvals, or summaries
- lightweight project/session switching after a chat is known to belong to a project
- approval detail views that can expand from summary into affected files, diffs, command text, test output, risk, provenance, and agent rationale

### Working Messenger IA Draft

Operator-stated direction:

- Messenger is for quick inbox ingest, read operations, agent-status monitoring, and generic chat sessions.
- Messenger can use the same triage path for discovering which project a random message belongs to.
- Messenger should feel conversational.
- Messenger chat history lives off-Git and is not canonical memory.
- Messenger creates `IBX-*` or generic-chat intake summaries, not raw transcript dumps.
- Messenger can request and confirm triage conversationally, but the orchestrator performs the actual routing.
- Messenger itself does not directly mutate truth docs or organize the repo.
- The orchestrator periodically reflects useful outcomes into repo surfaces; messenger can then link or summarize the routed result.
- Messenger chats do not automatically appear as desktop generic-chat sessions.
- Messenger should remain in its original channel as a channel-native conversation surface; orchestrator-visible input is recorded into the off-Git chat and tool-history database.

Messenger interruption policy:

- Interrupt now when an agent is blocked and cannot continue usefully.
- Interrupt now when an operator decision, high-risk approval, upstream/product-direction conflict, meaningful run failure, explicit notify-me completion, or budget/time/permission limit needs attention.
- Keep routine run starts, routine completions, low-risk edits, passed checks, successful inbox routing, and periodic changed-work digests as quiet summaries by default.
- Daily `IBX-*` digest is desirable, but unconditional digest of every random inbox item is dangerous. Digest policy needs triage, grouping, decay, or relevance filtering so a project does not become a daily list of every possible pivot.

Working interaction shapes, not full screens:

- quick conversational capture into generic chat, inbox, or a named project when the project is obvious
- read operations such as "brief me on project X" or "what is agent Y doing?"
- monitor updates for blocked, started, completed, or escalated runs
- concise project, run, agent, decision, status, or plan summaries
- generic assistant chat that is not necessarily project-bound
- triage prompts when the orchestrator suspects a conversation should move into an existing project or become a new project

### Working Shared Workspace / State Draft

Operator-stated direction:

- Off-Git state includes chat logs and tool-calling history.
- An append-only off-Git event log is not yet accepted as a separate product object; define it only if chat/tool-call storage does not cover the need.
- `agent-id` maps 1:1 to conversations.
- The conversation mapped to an `agent-id` is the lookup key for subagents, commits, approvals, worklogs, and related provenance.
- Every desktop/mobile generic assistant chat receives an `agent-id`, even when it never touches a repo.
- One chat/agent conversation can contain multiple bounded runs over time.
- `run-id` identifies one bounded execution attempt inside the conversation.
- Subagents should not silently commit by default; host agents should monitor, grade, and integrate subagent output.
- Important approvals, commits, decisions, routed capture packets, subagent results, host grades, and worklog links should appear as compact timeline events in the relevant parent conversation.
- Desktop and mobile should have commercial-chatbot-like live sync of state.
- Messenger lives its own channel-native life rather than becoming one of the desktop/mobile generic chat sessions.
- Approval lives off-Git first; durable consequences are reflected into Git only when meaningful.
- Raw execution history is retained indefinitely by default as operational memory, not canonical truth.
- Raw execution retention must allow per-project export, redaction, compaction, hard delete, and periodic secret or API-token redaction.

Working state graph, not final schema:

- `project workspace`: repo-backed project and primary long-lived product context
- `generic chat session`: off-Git conversation that can remain generic or later be triaged into a project
- `project chat session`: off-Git conversation already bound under a project
- `agent conversation`: one off-Git user-facing conversation with one `agent-id`
- `subagent conversation`: child agent conversation with its own `agent-id`
- `raw input event`: immutable off-Git message, mobile prompt, desktop message, messenger event, voice transcript, upload, approval click, notification interaction, or tool-call result
- `capture packet`: mutable off-Git capture bundle around one or more raw events until handed to a project orchestrator, routed, discarded, or absorbed into a conversation
- `approval`: operator-facing choice point attached to an agent conversation, command, diff, plan, routing proposal, trust escalation, or product decision
- `raw execution memory`: off-Git transcript, terminal stream, command output, tool output, notification, approval interaction, screenshot, upload, fetch result, and runtime event history retained for operational lookup
- `repo artifact`: durable Git artifact such as `SPEC.md`, `STATUS.md`, `PLANS.md`, `IBX-*`, `RSH-*`, `DEC-*`, `LOG-*`, or `UPS-*`

### Working Agent Controls Draft

Product-level controls:

- `steer`: add operator guidance so the agent can incorporate it at the next safe gap, between tool calls, before the next command, before commit, or when the agent checks for messages
- `interrupt`: stop the current trajectory as soon as safely possible and deliver a new operator message the agent should listen to before continuing
- `stop`: end the active run while preserving transcript, tool output, provenance, and workspace state
- `resume`: continue from a stopped, blocked, waiting, or completed conversation
- `revert`: explicitly undo agent-made workspace changes where possible; distinct from stop
- `fork`: branch another agent/conversation from existing context
- `handoff`: transfer responsibility to another agent, model, device, or surface while preserving lineage

Product vocabulary to avoid for now:

- `pause` because operator does not see a strong use case distinct from steer or stop
- `redirect` because it overlaps with steer
- `cancel` and `kill` because they are too granular for product-level controls; runtime may still need lower-level termination mechanics internally

State modeling questions still open:

- whether there is a dedicated append-only off-Git event log beyond chat, transcript, approval, tool-call, and notification tables
- what live-sync object powers "agent is currently doing X" across desktop and mobile
- exact approval storage shape: table, event, chat message, or hybrid
- the precise state machine and safe-point semantics behind steer, interrupt, stop, resume, revert, fork, and handoff

## Promising Directions

- Treat desktop as the place where the operator understands and steers the whole workspace.
- Keep desktop chat/prompt-first at rest, with code/file tools appearing contextually rather than as the root product frame.
- Treat mobile as the place where the operator ingests new work, gets notified, monitors agents, and answers escalations when away from desktop.
- Treat messenger as the lowest-friction intake and response surface.
- Keep the same project-memory backbone visible across all three, even if each surface reveals different slices of it.
- Delay final desktop labels and grouping decisions until the operator flow feels more intentional and less admin-derived.

## Dead Ends Or Rejected Paths

- Freezing the desktop IA too early around arbitrary labels that might simply mirror current control-plane internals.
- Treating messenger as a place where canonical truth is directly authored.
- Making mobile chase full coding-IDE parity before the cockpit model proves itself.
- Designing each surface independently instead of as views into the same project workspace.

## Recommended Routing

- Keep the settled cross-surface truths in `SPEC.md`.
- Keep accepted but still high-level sequencing in `PLANS.md`.
- Use this memo as the ongoing research home for desktop/mobile/messenger IA thinking until the desktop structure is mature enough to promote further.
- Do not yet lock detailed desktop navigation or final screen naming into `PLANS.md`.

## Running Notes

### Entry 2026-04-09 18-00-55 KST

- Input: operator clarified the desktop authority model and compared the desired home shape to a GUI Codex-style app with project/thread sidebar, project picker, and central prompt box.
- Interpretation: desktop is not "a VS Code replacement with agents." It is an agent-operation surface that may reveal VS Code-like editing/file-browsing capability when context calls for it.
- Routing: keep these desktop specifics in this in-progress memo for now; promote only after the remaining mobile, messenger, state, repo/off-Git, and control questions are answered.

### Entry 2026-04-09 18-16-08 KST

- Input: operator closed the desktop structure around a Codex-like sidebar, generic chat above project-specific sessions, project/session/subagent tree hierarchy, right-sidebar file/code viewer, and repo-template surfaces accessed by agent brief rather than normal navigation.
- Input: operator clarified mobile as ingest-first and notification-first: start generic chats quickly, start runs, monitor agents, and answer escalations via accept, decline, choose, or ask.
- Interpretation: Superhuman should preserve low-friction "new chat" everywhere. Project binding can happen later through triage instead of forcing the operator to classify intent up front.
- Routing: detailed desktop and mobile answers remain in this memo until the full cross-surface IA and shared state model are complete.

### Entry 2026-04-09 18-22-00 KST

- Input: operator clarified that mobile should be architecturally able to do all risky behaviors from the beginning, while initial deployment can hide risky capabilities behind feature flags.
- Input: operator accepted summary-first and one-tap evidence, but rejected making mobile reliant on desktop.
- Interpretation: mobile is a first-class control surface with staged exposure, not a permanently crippled companion app.
- Routing: keep mobile authority broad in architecture; handle safety through trust modes, feature flags, risk labels, evidence, and unlock paths.

### Entry 2026-04-09 18-35-00 KST

- Input: operator closed mobile around immediate push for blocked/escalated work, quiet completion summaries, a shared three-tier trust slider, desktop-equivalent streaming transcript/tool-call monitoring, first-class orchestrator chat, chat-to-project triage, project creation, delayed-send collision detection, and no ordinary mobile manual-editing policy.
- Input: operator opened messenger around quick inbox ingest, read operations, agent-status monitoring, generic chat sessions, orchestrator triage, and conversational feel.
- Interpretation: mobile is now functionally first-class; messenger remains narrower, conversational, and edge-oriented.
- Routing: keep messenger authority unresolved until interruption policy, inbox triage authority, and transcript-swamp prevention are answered.

### Entry 2026-04-09 18-42-00 KST

- Input: operator accepted the messenger interruption and quiet-summary split.
- Input: operator accepted conversational triage request/confirmation with orchestrator-owned routing.
- Input: operator accepted the transcript-swamp boundary: messenger history lives off-Git, messenger creates `IBX-*` or generic-chat intake summaries, and orchestrator reflects useful outcomes into repo surfaces.
- Interpretation: messenger authority is narrow and clear enough for this research stage; it is an edge chat/read/notify/intake pipe, not a repo organizer or truth writer.
- Routing: move next into shared workspace and state modeling.

### Entry 2026-04-09 18-52-00 KST

- Input: operator wants a daily `IBX-*` digest, but called out that digesting every random inbox thought would quickly turn projects into unfocused "100 possible pivots" lists.
- Input: operator clarified that messenger chats do not appear in the desktop generic-chat list.
- Input: operator raised the sessioning problem: messenger conversations can be one long stream with unclear session dividers, so whole-history triage is too coarse and per-message triage is too granular.
- Working direction: keep messenger conversations in their source channel; record orchestrator-visible messenger input into the off-Git chat and tool-history database; carve useful spans, summaries, or operator-marked moments into `IBX-*` / generic intake rather than importing the whole messenger chat as a desktop session.
- Routing: treat inbox digest pressure and messenger sessionization as shared workspace/state questions plus repo-template operating-policy questions, not only messenger UI questions.

### Entry 2026-04-09 18-54-48 KST

- Input: operator confirmed the model where an intake/capture bundle is mutable and off-Git until routed.
- Interpretation: raw input events and editable capture packets are separate objects. Raw messenger/chat/input events stay immutable in off-Git history; a capture packet is a first-responder-maintained bundle that can absorb follow-up, carry a lightweight summary, then get handed to a project orchestrator or routed elsewhere.
- Routing: use this as a core shared workspace/state primitive in the next modeling pass.

### Entry 2026-04-09 18-54-48 KST

- Input: operator confirmed off-Git storage for chat logs and tool-calling history, but did not yet accept a separate append-only event-log product object.
- Input: operator confirmed `agent-id` maps 1:1 to conversations; that conversation maps to subagents, commits, approvals, and logs.
- Input: operator wants commercial-chatbot-style live sync across desktop and mobile, with messenger retaining its own channel-native life.
- Interpretation: the state model should be a graph around projects, generic/project chats, agent conversations, child agent conversations, capture packets, approvals, repo artifacts, raw input events, and provenance links rather than one overloaded `work item`.
- Routing: keep `project workspace` as the top-level product object while clarifying the executable/conversational state objects underneath it.

### Entry 2026-04-09 19-46-15 KST

- Input: operator accepted `capture packet` as the lighter replacement term for `intake span`.
- Input: operator questioned whether granular pause/resume/redirect/cancel/kill product controls are needed.
- Input: operator proposed `steer` for safe-gap guidance and then landed on `interrupt` as the direct "stop what you were doing and listen to me" operation.
- Interpretation: first responder captures and hands off; project orchestrator routes and decides. Agent controls should use operator-natural verbs first, with lower-level process mechanics kept beneath product vocabulary.
- Routing: use `steer`, `interrupt`, `stop`, `resume`, `revert`, `fork`, and `handoff` as the working product-level agent control set.

### Entry 2026-04-09 19-54-56 KST

- Input: operator confirmed every generic assistant chat should receive an `agent-id`.
- Input: operator accepted one chat/session can contain multiple runs and asked whether those should use separate run IDs.
- Input: operator accepted compact parent-chat timeline events, but corrected that subagents should not silently commit; host agents should monitor and grade subagent output.
- Interpretation: `agent-id` is the user-facing conversation identity; `run-id` is a bounded execution episode inside it; subagents are child agent conversations with their own `agent-id`; commits normally belong to authorized host/worker/orchestrator/operator flows after subagent outputs are reviewed.
- Routing: promoted the settled state/control contract into `SPEC.md`, `PLANS.md`, and `DEC-20260409-007`; keep UI/screen details in this memo.
