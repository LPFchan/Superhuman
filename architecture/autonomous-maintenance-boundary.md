# Autonomous Maintenance Boundary

## Agent May Do Without Asking

- fix repo-local code and docs inside the approved migration plan
- add or update focused tests and internal reports
- run scoped verification commands
- reorganize internal architecture docs
- preserve compatibility contracts where policy is already explicit

## Agent Must Ask Before Proceeding

- version bumps
- release publishing or npm publication
- changing external package names, manifest ids, or SDK namespaces
- deleting compatibility aliases or migration behavior
- broad scope expansion into unrelated failures

## Required Escalation Content

Every escalation should include:

- the exact blocker
- the concrete decision options
- the tradeoff between them
- the recommended option
- the smallest next action after the decision

## Re-raise Rule

If a blocking decision is deferred, re-raise it only when the work cannot continue safely without it.
Do not repeatedly escalate the same non-blocking uncertainty.
