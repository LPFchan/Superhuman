# LOG-20260409-012: Desktop Fork Evaluation

Opened: 2026-04-09 20-45-49 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Run type: orchestrator
- Goal: research and smoke plausible forkable desktop or desktop-adjacent agentic surfaces for Superhuman
- Related ids: RSH-20260409-008, RSH-20260409-007, DEC-20260409-007

## Task

Produce a desktop-first fork evaluation without freezing the final desktop IA and without turning closed reference products into fork targets.

## Scope

- In scope: current GitHub/repo research, source/readme/license/health notes, light local smoke, ranking, recommendation, next spike
- In scope: desktop and desktop-adjacent web/local GUI candidates
- Out of scope: accepting a fork decision, mobile fork search, messenger fork search, final screen IA, product-truth promotion

## Entry 2026-04-09 20-45-49 KST

- Action: started the fork-evaluation workstream after the cross-surface-state checkpoint commit
- Files touched: none
- Checks run: `date`, artifact guide reads, `git status --short`, `git log -1`
- Output: confirmed checkpoint commit `ff6579d492079d6f81b0dfedf7fc0fc3c6e9fdb0` with the expected provenance trailers
- Blockers: the Superhuman working tree still has unrelated repo-template/skills/staged-doc changes; keep this work scoped to RSH-008 and LOG-012
- Next: write the research memo and avoid staging unrelated files

## Entry 2026-04-09 20-55-00 KST

- Action: completed first-wave metadata, readme, license, package, and source/API inspection for desktop fork candidates
- Files touched: research/RSH-20260409-008-desktop-agentic-surface-fork-evaluation.md; records/agent-worklogs/LOG-20260409-012-desktop-fork-evaluation.md
- Checks run: `gh repo view ...`, blobless/sparse `git show HEAD:<path>` inspections in the temporary candidate clones, targeted `rg` over candidate readmes/source excerpts
- Output: identified OpenHands as the first spike candidate; kept Dyad as the runner-up desktop-shell read; marked Cline/Roo/Crush as strong references rather than primary desktop forks
- Blockers: GUI candidates were not dependency-installed or launched in this pass
- Next: run local repo checks for the new artifacts, inspect the Superhuman diff, and report the recommendation

## Entry 2026-04-09 21-00-00 KST

- Action: ran light local CLI runtime smokes for two desktop-adjacent agent candidates
- Files touched: research/RSH-20260409-008-desktop-agentic-surface-fork-evaluation.md; records/agent-worklogs/LOG-20260409-012-desktop-fork-evaluation.md
- Checks run: `npx --yes @charmland/crush --version`; `npx --yes @continuedev/cli --version`
- Output: Crush smoke returned `crush version v0.56.0`; Continue CLI smoke returned `1.5.45`
- Blockers: Crush is reference-only for now because current license posture is FSL; Continue is useful reference/CLI, not the desktop cockpit candidate
- Next: run markdown/diff sanity checks

## Entry 2026-04-09 21-08-00 KST

- Action: completed artifact sanity pass after drafting the recommendation
- Files touched: research/RSH-20260409-008-desktop-agentic-surface-fork-evaluation.md; records/agent-worklogs/LOG-20260409-012-desktop-fork-evaluation.md
- Checks run: `git diff --check`; `git status --short`; targeted `rg` for stale terms and accidental duplicated artifact names
- Output: `git diff --check` passed; corrected a duplicate `PLANS.md` mention in the research memo; confirmed the fork-evaluation diff is limited to the two new artifacts
- Blockers: full GUI/runtime smoke remains intentionally deferred to the next spike
- Next: share the ranked recommendation and keep RSH-007 unchanged

## Entry 2026-04-09 21-12-00 KST

- Action: cleared a checkpoint-related index artifact after verifying the worktree version matched `HEAD`
- Files touched: records/agent-worklogs/LOG-20260409-012-desktop-fork-evaluation.md
- Checks run: `git diff --quiet HEAD -- SPEC.md STATUS.md`; `git add -- SPEC.md STATUS.md`
- Output: removed phantom staged table-width diffs from the index without changing `SPEC.md` or `STATUS.md`
- Blockers: none
- Next: run final status and diff checks

## Entry 2026-04-09 21-15-00 KST

- Action: ran final validation for this research pass
- Files touched: records/agent-worklogs/LOG-20260409-012-desktop-fork-evaluation.md
- Checks run: `git diff --check`; `git diff --cached --stat`; `git status --short`
- Output: whitespace check passed; index is empty; only RSH-008 and LOG-012 are new for this fork-evaluation workstream
- Blockers: unrelated existing modified/untracked repo-template adoption files remain outside this scope
- Next: wait for operator review before accepting a fork candidate or writing a `DEC-*`

## Entry 2026-04-09 21-25-00 KST

- Action: prepared a scoped research checkpoint after operator requested commit
- Files touched: research/RSH-20260409-008-desktop-agentic-surface-fork-evaluation.md; records/agent-worklogs/LOG-20260409-012-desktop-fork-evaluation.md
- Checks run: `git status --short`; `git diff --cached --stat`; `git diff --check`
- Output: confirmed index was empty before the scoped commit and whitespace check passed
- Blockers: none for this commit; unrelated dirty repo-management files remain intentionally out of scope
- Next: commit exactly RSH-008 and LOG-012 with provenance trailers

## Entry 2026-04-10 00-12-22 KST

- Action: incorporated operator supplementary handoff into the ongoing desktop GUI / operator-surface research lane
- Files touched: research/RSH-20260409-008-desktop-agentic-surface-fork-evaluation.md; records/agent-worklogs/LOG-20260409-012-desktop-fork-evaluation.md
- Checks run: `git status --short`; `git log -1 --oneline`; targeted `SPEC.md` `rg`; targeted reads of RSH-008/LOG-012/LOG-013; `git diff --check`; targeted `rg` for stale matrix column names, OpenCode correction, HTTP/WebSocket dependency, Helmor/watch entry, closed-reference section, and added candidate headings
- Output:
  - reframed desktop candidate selection around Superhuman server/runtime API replacement rather than inheriting a candidate backend
  - renamed score-matrix intent from state/backend ownership to API seam clarity and local state thickness
  - changed the recommendation from "OpenHands-first fork spike" to "design/verify desktop-server API boundary, then do a replacement-seam spike"
  - added handoff-seeded cards for OpenWork, Jean, Orca, Emdash, FactoryFloor, Glass, Paseo, Parallel Code, Commander, Herdr, Yume, and active OpenCode
  - added closed/non-fork references, Helmor watch entry, supplementary stubs, archived OpenCode correction, and the desktop-server HTTP/WebSocket open question
- Blockers: new operator-handoff candidates still need primary-source README/license/source verification before an accepted fork decision
- Next: run final status/diff sanity and ask whether to checkpoint this updated RSH-008 pass or continue into targeted candidate verification

## Entry 2026-04-10 00-16-46 KST

- Action: rewrote RSH-008 as one curated in-progress research memo instead of an amendment stack
- Files touched: research/RSH-20260409-008-desktop-agentic-surface-fork-evaluation.md; records/agent-worklogs/LOG-20260409-012-desktop-fork-evaluation.md
- Checks run: full read of current RSH-008 before rewrite; `date`; `git status --short`; `git diff --stat`
- Output: collapsed historical amendments into current recommendation, product boundary, matrix, shortlist, verification status, reference lists, preserve/replace policy, next work, and open questions
- Blockers: handoff-only candidates remain unverified; a desktop-server API contract is still the prerequisite for a meaningful fork spike
- Next: run markdown/diff sanity and ask operator whether to keep the clean rewrite

## Entry 2026-04-10 00-19-00 KST

- Action: removed the remaining "stub" phrasing from the cleaned research memo
- Files touched: research/RSH-20260409-008-desktop-agentic-surface-fork-evaluation.md; records/agent-worklogs/LOG-20260409-012-desktop-fork-evaluation.md
- Checks run: targeted skim of rewritten RSH-008
- Output: kept low-information handoff-only names as an unverified queue rather than placeholder cards
- Next: run final whitespace/status sanity

## Entry 2026-04-10 00-19-52 KST

- Action: ran final sanity on the clean RSH-008 rewrite
- Files touched: records/agent-worklogs/LOG-20260409-012-desktop-fork-evaluation.md
- Checks run: `rg` over RSH-008 for amendment/stub/old-matrix headings; `git diff --check`; `git status --short`; `git diff --stat`
- Output: RSH-008 has no amendment sections, no candidate-card heading, no score-matrix heading, no "stub only" phrasing, and no old State Fit / Backend Burden / Desktop Burden labels; whitespace check passed; diff is limited to RSH-008 and LOG-012
- Next: operator review of the cleaned RSH-008

## Entry 2026-04-10 00-40-20 KST

- Action: accepted operator addendum for Factory Desktop as a closed desktop/cockpit reference
- Files touched: research/RSH-20260409-008-desktop-agentic-surface-fork-evaluation.md; research/RSH-20260409-009-coding-harness-and-backbone-evaluation.md; records/agent-worklogs/LOG-20260409-012-desktop-fork-evaluation.md; records/agent-worklogs/LOG-20260409-013-coding-harness-backbone-evaluation.md
- Checks run: targeted `rg` for Factory/Droid references; targeted reads of RSH-008 closed references and RSH-009 Droid section; `date`; `git status --short`
- Output: added Factory Desktop to the closed/non-fork reference section and cross-listed its harness implications in RSH-009
- Blockers: Factory Desktop / Droid details are operator-handoff evidence in this pass; product docs, benchmark row, CLI docs, and run artifact still need verification
- Next: run final sanity after harness worklog append
