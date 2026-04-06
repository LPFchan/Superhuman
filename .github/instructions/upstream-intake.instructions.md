---
description: "Use when reviewing upstream OpenClaw releases, commit windows, sync candidates, merge decisions, or weekly intake reports. Defines how to analyze meaning, user impact, compatibility, autonomy, and operator escalations."
---

# Weekly Upstream Intake Instructions

Use this instruction when the task is to review, summarize, triage, or merge upstream OpenClaw work into Superhuman.

## Core Goal

Do not treat upstream review as a changelog paraphrase.
Translate upstream work into concrete Superhuman decisions.

The agent is allowed and encouraged to use internet sources to resolve ambiguity.
When the question depends on vendor policy, billing, pricing, legal terms, official product positioning, or external release behavior, look up the relevant official sources instead of guessing.
Prefer official vendor docs, terms, pricing pages, release notes, or upstream PR context.

When the template or report asks what a change "actually means" or means "in practice," do not answer with a restatement of the upstream note.
Drill down until the behavioral consequence is explicit.

Use this pattern:

- What concrete behavior changes if this lands?
- Who notices first: operator, plugin author, end user, maintainer, or nobody?
- Where does the change show up first: onboarding, config, runtime behavior, error handling, UI, docs, tests, or upgrade flow?
- What problem disappears, and what new cost or constraint appears?
- What would a user or operator literally experience differently next week?
- If nothing user-visible changes, what maintenance or architectural pressure changes instead?

Then force the explanation through these ambiguity checks:

- Name the concrete referent for any phrase like `vendor-specific`, `some cases`, `this path`, `that surface`, or `this behavior`.
- State the exact upstream feature, provider, vendor, contract, or runtime path being discussed.
- State the exact local Superhuman surface affected.
- State what is changing and what is not changing.
- State whether the change is about policy, implementation, or both.
- State at least one literal user or operator scenario.
- State the evidence source category behind the claim: upstream release notes, upstream PR/commit, official vendor docs/terms, local code, or local policy docs.

If a sentence still works without naming the concrete product, vendor, feature, or path, it is too vague and must be rewritten.

Good examples:

- Bad: "Removes legacy config aliases."
- Better: "New configs stop advertising old names, doctor rewrites stale keys automatically, and internal config handling becomes simpler because only the normalization layer still knows the aliases exist."

- Bad: "Adds route scope hardening."
- Better: "Plugin HTTP handlers stop receiving overly broad fallback scopes when headers are missing, which reduces privilege leakage risk but may expose hidden assumptions in plugins that were accidentally relying on admin-like scope."

- Bad: "Moves reply dispatch into a plugin hook."
- Better: "Core stops owning a special-case reply path for one plugin family, and plugin authors must rely on a stable shared dispatcher contract instead of hidden core behavior."

- Bad: "Upstream is backing away from some vendor-specific cases."
- Better: "Upstream is backing away from treating Anthropic Claude CLI subscription reuse as a normal bundled onboarding and provider path, while not necessarily rejecting generic local CLI backends overall."

For each meaningful upstream change or grouped change set, answer all of the following before recommending `accept`, `adapt`, or `decline`:

- What does this change actually mean in practice?
- What effect does it have on the end-user or operator experience?
- Does it introduce breaking behavior, migration work, or compatibility drift?
- How relevant is it to Superhuman's current stage of development?
- If it overlaps or duplicates local work, whose implementation should win and why?
- What are the main upsides of introducing it?
- What are the downsides, risks, or maintenance costs?
- Does any security or hardening work collide with, duplicate, or weaken an existing Superhuman implementation?
- What should be escalated to the operator, and what can be decided autonomously under existing policy?
- If operator input is needed, what exact product decision must the operator make?
- What minute compatibility details matter if the change lands?

## Required Workflow

1. Define the exact upstream window being reviewed.
2. Gather evidence from release notes and, when needed, the underlying commits, PRs, docs, and code paths.
3. Group related changes into candidate decisions instead of treating every commit as equally important.
4. For each candidate change, fill or mirror the fields in [architecture/upstream-intake/weekly-upstream-intake-template.md](../../architecture/upstream-intake/weekly-upstream-intake-template.md).
   - Do not leave referents implicit.
   - If needed, use internet lookup to resolve vendor, product, pricing, legal, or policy ambiguity before filling the record.
5. Classify the result as `accept`, `adapt`, or `decline`.
6. Apply the autonomy boundary from repo policy before taking action.
7. Produce an operator-facing weekly brief that separates:
   - decisions made autonomously
   - decisions requiring operator input

By default, store the full internal record and the lighter operator brief as separate artifacts.

## Operator Brief Requirements

When reporting the intake review, present two sections.

### Decisions Made Autonomously

For each item, explain:

- what it actually means
- why the agent could decide it without operator input
- what action will be taken or has been taken

### Decisions Requiring Operator Input

For each item, explain in simple terms:

- what decision the operator is actually being asked to make
- what the change means
- how it affects architecture or user experience
- what is not changing
- the realistic options
- the recommended option
- what work is blocked pending the answer

The internal record should contain the exhaustive field coverage and detailed reasoning.
The operator brief should be a translation layer for humans.
Do not mirror every internal-record field as a labeled bullet list unless the user explicitly wants that style.
Prefer a short, conversational mini-brief for each operator-facing item, optionally followed by compact bullets for options, recommendation, or blocked work.

## Decision Rules

- If the fix belongs to shared core, prefer the upstream-shaped implementation.
- If the local fix is tied into Superhuman-only surfaces, keep the local version and adapt upstream ideas into it.
- If the upstream patch changes policy, decide the policy first by escalating to the operator, then choose the implementation that matches that decision.
- Do not silently override a security-relevant upstream change. If the right move is to localize, defer, or decline it, escalate.
- Treat plugin-facing contracts, migration-sensitive surfaces, onboarding, user workflow changes, and public product direction as escalation-sensitive.

## Output Standard

A complete weekly upstream review should leave behind:

- a decision record that matches [architecture/upstream-intake/weekly-upstream-intake-template.md](../../architecture/upstream-intake/weekly-upstream-intake-template.md)
- a separate brief operator-facing summary using [architecture/upstream-intake/operator-weekly-brief-template.md](../../architecture/upstream-intake/operator-weekly-brief-template.md)
- explicit notes on verification, compatibility details, and follow-up work

The operator-facing brief must be understandable without prior chat context.
Do not rely on shorthand like `vendor-specific path` unless the vendor and path are named in the same item.
