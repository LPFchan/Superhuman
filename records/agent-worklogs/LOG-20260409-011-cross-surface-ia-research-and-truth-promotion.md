# LOG-20260409-011: Cross-Surface IA Research And Truth Promotion

Opened: 2026-04-09 08-33-50 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Run type: orchestrator
- Goal: promote the settled parts of the workspace-direction research into canonical truth and plans while starting an explicitly in-progress desktop/mobile/messenger IA memo
- Related ids: RSH-20260409-006, RSH-20260409-007

## Task

Apply the approved `SPEC.md` and `PLANS.md` promotions from the workspace-direction research without prematurely freezing detailed desktop IA, then create a new in-progress cross-surface IA research memo.

## Scope

- In scope: `SPEC.md`, `PLANS.md`, and `STATUS.md` updates for approved truths and accepted plan direction
- In scope: a light alignment update to `RSH-20260409-006`
- In scope: a new in-progress `RSH-*` memo for desktop/mobile/messenger IA
- Out of scope: final desktop navigation decisions or detailed screen lock-in

## Entry 2026-04-09 08-33-50 KST

- Action: promoted the settled cross-surface rules into truth and plans, then created an in-progress triple-IA research memo
- Files touched:
  - `SPEC.md`
  - `PLANS.md`
  - `STATUS.md`
  - `research/RSH-20260409-006-project-workspace-ux-direction-and-surface-strategy.md`
  - `research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
- Checks run:
  - `sed -n '1,220p' research/README.md`
  - `sed -n '1,240p' research/RSH-20260409-006-project-workspace-ux-direction-and-surface-strategy.md`
  - `sed -n '1,240p' records/agent-worklogs/README.md`
  - `rg --files research | sort`
- Output:
  - `SPEC.md` now makes orchestrator-owned routing, messenger non-authorship, and mobile cockpit posture more explicit
  - `PLANS.md` now accepts messenger capture/approval/status flows and the mobile cockpit direction without prematurely freezing desktop IA details
  - `STATUS.md` now reflects the new in-progress cross-surface IA research lane
  - `RSH-20260409-006` now points at the managed-repo governance outcome and the new IA research thread
  - `RSH-20260409-007` now holds the working desktop/mobile/messenger IA draft as an explicitly ongoing memo
- Blockers: desktop IA naming and grouping still need more finesse before further promotion
- Next: keep iterating on `RSH-20260409-007` until the desktop structure feels strong enough for selective promotion into plans or spec

## Entry 2026-04-09 18-00-55 KST

- Action: captured the operator's desktop-surface clarifications into the in-progress triple-IA memo
- Files touched:
  - `research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Checks run:
  - `sed -n '1,320p' research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `sed -n '1,240p' records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Output:
  - desktop is now framed as the main agent-operation surface
  - manual code editing is explicitly second-class
  - real editor and file browser capability is retained but contextually revealed
  - the desktop home direction now names prompt box, project picker, and chatroom-style sidebar
  - canonical truth-doc edits remain routed through orchestrator proposals or explicit operator-approved flows
- Blockers: mobile, messenger, shared workspace/state, repo/off-Git, and control/extension boundaries still need the same authority pass
- Next: tackle mobile authority boundaries before promoting detailed IA into `SPEC.md` or `PLANS.md`

## Entry 2026-04-09 18-16-08 KST

- Action: captured the operator's desktop closeout and first mobile authority answers into the in-progress triple-IA memo
- Files touched:
  - `research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Checks run:
  - `sed -n '1,420p' research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
- Output:
  - desktop now names generic chats above project-specific sessions
  - desktop now uses a project -> session or agent -> subagent tree direction
  - right sidebar is recorded as contextual file browser/code viewer
  - repo-template surfaces are recorded as agent-briefed rather than normal navigation
  - mobile is recorded as ingest-first and notification-first
  - mobile is allowed to start new generic chats and new agent runs
- Blockers: mobile approval safety, messenger authority, shared state, repo/off-Git, and extension/agent controls still need decisions
- Next: answer mobile approval detail and mobile-too-risky escalation boundaries

## Entry 2026-04-09 18-22-00 KST

- Action: captured the operator's mobile authority correction in the in-progress IA memo
- Files touched:
  - `research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Checks run: none
- Output:
  - mobile is now recorded as architecturally full-authority rather than desktop-dependent
  - risky mobile actions are recorded as launch-gated by feature flags, trust modes, or explicit unlocks instead of impossible
  - mobile approval UX now requires summary-first, one-tap evidence, and full relevant evidence on mobile
- Blockers: messenger authority, shared state, repo/off-Git, and extension/agent controls still need decisions
- Next: tackle messenger authority boundaries

## Entry 2026-04-09 18-35-00 KST

- Action: captured the mobile closeout and messenger starting stance in the in-progress IA memo
- Files touched:
  - `research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Checks run: none
- Output:
  - mobile now has explicit interruption, trust-mode, live-monitoring, orchestrator-chat, triage, project-creation, delayed-send, and manual-editing policy
  - messenger is now framed as conversational quick ingest, read operation, monitor, and generic chat
- Blockers: messenger interruption, messenger inbox authority, transcript-swamp prevention, shared state, repo/off-Git, and extension/agent controls still need decisions
- Next: answer the three messenger policy questions before moving to shared workspace/state

## Entry 2026-04-09 18-42-00 KST

- Action: captured messenger policy closeout in the in-progress IA memo
- Files touched:
  - `research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Checks run: none
- Output:
  - messenger now has explicit interrupt-now and quiet-summary criteria
  - messenger can conversationally request/confirm triage but orchestrator performs routing
  - messenger is explicitly off-Git chat history and non-canonical memory
  - messenger creates `IBX-*` or generic-chat intake summaries rather than transcript dumps
  - orchestrator reflects useful messenger-originated outcomes into repo surfaces
- Blockers: shared state, repo/off-Git, and extension/agent controls still need decisions
- Next: move to shared workspace and state modeling

## Entry 2026-04-09 18-52-00 KST

- Action: captured inbox-digest focus risk and messenger-sessionization concerns in the in-progress IA memo
- Files touched:
  - `research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Checks run: none
- Output:
  - daily `IBX-*` digest is recorded as desirable but dangerous if unconditional
  - messenger chats are recorded as channel-native rather than desktop generic-chat sessions
  - orchestrator-visible messenger input is recorded into off-Git chat/event DB
  - useful messenger spans can become `IBX-*` or generic intake without importing entire messenger history into desktop
- Blockers: shared state must define inbox digest policy, messenger span/session model, and repo/off-Git boundary
- Next: define shared workspace/state primary objects and lifecycle

## Entry 2026-04-09 18-54-48 KST

- Action: recorded intake/capture bundle as a settled off-Git mutable object direction in the in-progress IA/state memo
- Files touched:
  - `research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Checks run: none
- Output:
  - intake/capture bundles are now recorded as mutable off-Git objects until routed
  - raw events and capture packets are explicitly separate in the working state model
- Blockers: full shared workspace/state model still needs decisions
- Next: define primary state object, work lifecycle, event log, live sync state, and run control semantics

## Entry 2026-04-09 18-54-48 KST

- Action: added the operator's shared workspace/state answers to the in-progress IA/state memo
- Files touched:
  - `research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Checks run:
  - `TZ=Asia/Seoul date '+%Y-%m-%d %H-%M-%S KST'`
- Output:
  - recorded off-Git chat and tool-call history without prematurely creating a separate event-log product object
  - recorded `agent-id` as 1:1 with conversations, with conversations linking to subagents, commits, approvals, and logs
  - recorded desktop/mobile live sync and messenger channel-native behavior
  - added a working state graph to separate projects, chats, agent conversations, raw events, capture packets, approvals, and repo artifacts
- Blockers: run-control verbs and exact chat/session/run object boundaries still need decisions
- Next: explain primary state object, repo-template lifecycle versus Superhuman runtime lifecycle, and agent-control semantics

## Entry 2026-04-09 19-46-15 KST

- Action: renamed the working mutable intake object to capture packet and captured the simplified product-level agent controls
- Files touched:
  - `research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Checks run:
  - `rg -n "intake span|Intake span|raw input event|pause|resume|redirect|cancel|kill|steer|Agent Controls|Working Shared" research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Output:
  - state model now uses `capture packet` instead of semantically loaded `intake span`
  - first responder is framed as capture/handoff rather than project-level router
  - product-level controls now include steer, interrupt, stop, resume, revert, fork, and handoff
  - pause, redirect, cancel, and kill are marked as avoided product vocabulary for now
- Blockers: exact run/session boundaries and safe-point semantics still need design
- Next: continue shared workspace/state decisions

## Entry 2026-04-09 19-54-56 KST

- Action: promoted the settled shared state and agent-control model into canonical truth, planning, and decision history while keeping detailed IA research open
- Files touched:
  - `SPEC.md`
  - `PLANS.md`
  - `records/decisions/DEC-20260409-007-cross-surface-state-and-agent-control-model.md`
  - `research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Checks run:
  - `sed -n '1,280p' SPEC.md`
  - `sed -n '1,280p' PLANS.md`
- Output:
  - canonical truth now separates `agent-id` conversation identity from `run-id` execution identity
  - every desktop/mobile generic chat now receives an `agent-id` by policy
  - one agent conversation may contain multiple runs
  - subagents now require host monitoring/grading and do not silently commit by default
  - capture packet, off-Git raw history, desktop/mobile live sync, and messenger channel-native behavior are now canonicalized
  - product-level agent controls are now canonicalized as steer, interrupt, stop, resume, revert, fork, and handoff
- Blockers: detailed IA remains in-progress; DB schema, live-sync transport, event-log implementation, and safe-point mechanics remain later design work
- Next: move to repo-native vs off-Git surface policy

## Entry 2026-04-09 19-57-46 KST

- Action: normalized the promoted state/control research wording and reflected the accepted model into current operational status
- Files touched:
  - `STATUS.md`
  - `research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Checks run:
  - `sed -n '1,380p' SPEC.md`
  - `sed -n '1,360p' PLANS.md`
  - `sed -n '1,320p' records/decisions/DEC-20260409-007-cross-surface-state-and-agent-control-model.md`
  - `sed -n '1,420p' research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `sed -n '1,360p' STATUS.md`
- Output:
  - `STATUS.md` now references `DEC-20260409-007`
  - operational status now records that cross-surface state and agent-control policy is accepted canonical truth
  - research wording no longer implies a separate event-log product object or one-run-per-agent-conversation model
  - research wording uses `interrupt` instead of the transitional "stop and send" phrase
- Blockers: detailed IA remains in-progress; repo-native vs off-Git policy and extension/control requirements remain the next unclosed criteria
- Next: close the shared workspace/state section, then decide repo-native/off-Git boundaries and extension points

## Entry 2026-04-09 20-05-00 KST

- Action: clarified repo-contract promotion discipline and aligned `REPO.md` stable-ID vocabulary with the accepted agent/run identity model
- Files touched:
  - `REPO.md`
  - `records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Checks run:
  - `rg -n "research|decision|SPEC|PLANS|STATUS|INBOX|promot|truth|explor|ratif|upstream|artifact|surface|reflect|accepted|messy|evidence|argument|law" REPO.md research/README.md records/decisions/README.md records/agent-worklogs/README.md upstream-intake/reports/README.md SPEC.md PLANS.md AGENTS.md`
  - `sed -n '1,320p' REPO.md`
  - `sed -n '1,260p' research/README.md`
  - `sed -n '1,260p' records/decisions/README.md`
- Output:
  - added the explicit promotion-refinery rule: raw shaping -> inbox/capture -> research -> decision -> plans/spec/status/upstream only when each layer has a distinct job
  - recorded that promotion should be sparse and that truth/planning/status docs should receive outcomes instead of copied debate
  - updated `REPO.md` so `agent-id` is conversation identity and `run-id` is bounded execution identity
- Blockers: none for the artifact-layering rule
- Next: continue the UX/state research using sparse promotion rather than automatically cloning each discussion into research, decision, truth, and plans

## Entry 2026-04-09 20-14-05 KST

- Action: promoted settled off-Git approval and raw execution retention boundaries into the cross-surface state model
- Files touched:
  - `SPEC.md`
  - `records/decisions/DEC-20260409-007-cross-surface-state-and-agent-control-model.md`
  - `research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md`
  - `records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Checks run:
  - `rg -n "Raw chat|approval|approvals|raw execution|terminal|tool-call|off-Git|Off-Git|redaction|export|hard delete|Cross-Surface State|Operational|Retention|Approval|run-id|agent-id" SPEC.md PLANS.md STATUS.md records/decisions/DEC-20260409-007-cross-surface-state-and-agent-control-model.md research/RSH-20260409-007-desktop-mobile-messenger-information-architecture.md records/agent-worklogs/LOG-20260409-011-cross-surface-ia-research-and-truth-promotion.md`
- Output:
  - approval state now lives off-Git first; Git receives only meaningful approval consequences
  - raw execution history is now retained indefinitely by default as off-Git operational memory rather than canonical truth
  - raw operational memory must support per-project export, redaction, compaction, hard delete, and secret/API-token redaction
- Blockers: exact approval table/event/chat-message implementation remains later schema work
- Next: finish repo-native vs off-Git boundary and move to extension-point / agent-control requirements
