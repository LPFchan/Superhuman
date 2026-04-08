# DEC-20260409-006: Repo-Template As Canonical Managed-Repo Model

Opened: 2026-04-09 08-21-17 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Status: accepted
- Deciders: operator, orchestrator
- Related ids: DEC-20260409-002, LOG-20260409-010

## Decision

Superhuman uses the latest `LPFchan/repo-template` as the canonical operating model for any repo it creates, adopts, or manages.

This includes:

- starting brand-new repos from the current repo-template scaffold
- adopting existing repos by merging repo-template into the real project with the smallest viable diff
- preserving repo-specific truth, workflow rules, commands, CI, and stronger local constraints instead of flattening them
- keeping a local `REPO.md` in each managed repo as that repo's canonical contract

## Context

- Superhuman already adopted repo-template for itself at the repository root through `DEC-20260409-002`.
- The broader Superhuman vision depends on one repeatable repo-memory and provenance model across projects, not one custom governance system per repo.
- The current `LPFchan/repo-template` scaffold, `REPO.md`, `AGENTS.md`, and `recreate-prompt.md` now define a clear adoption path for both new repos and existing repos.
- Without an explicit decision, Superhuman could still drift into treating repo-template as something it uses only internally while managing external repos ad hoc.

## Options Considered

### Keep Repo-Template As A Rule Only For The Superhuman Repo

- Upside: avoids additional policy commitments outside this repo
- Downside: leaves Superhuman without one canonical repo-management model for the rest of its portfolio

### Use Repo-Template As Loose Inspiration For Other Repos

- Upside: gives agents flexibility case by case
- Downside: invites drift, bespoke storage rules, and inconsistent provenance across repos

### Make The Latest Repo-Template The Canonical Baseline For Created, Adopted, And Managed Repos

- Upside: gives Superhuman one repeatable repo operating system across its own repo and any repo it manages
- Upside: keeps routing, provenance, and artifact surfaces consistent across projects
- Upside: still allows repo-specific extensions and stronger local rules
- Downside: requires discipline when merging the model into existing repos instead of freeform improvisation

### Vendor Repo-Template Packaging Literally Into Every Repo

- Upside: fastest literal application path
- Downside: would import template packaging where a real project repo should instead keep only the adopted operating model

## Rationale

Superhuman should not have one disciplined repo contract for itself and a different ad hoc posture everywhere else. The latest `LPFchan/repo-template` already provides the right baseline for truth separation, routing, provenance, optional upstream review, and compatibility entrypoints. Making that baseline canonical across managed repos gives Superhuman a coherent portfolio-level operating model while still allowing each real repo to keep its own local truth and workflow constraints.

## Consequences

- New repos created by Superhuman should start from the current repo-template scaffold and seed the canonical surfaces immediately.
- Existing repos adopted by Superhuman should merge repo-template with the smallest viable diff and keep stronger repo-specific workflow rules when they already exist.
- Each managed repo should keep its own `REPO.md` and local instruction entrypoints; Superhuman's root docs do not override another repo's local contract.
- Future Superhuman workflow design should assume repo-template is the default path for repo adoption and creation unless the operator explicitly approves an exception.
- Source material:
  - `https://github.com/LPFchan/repo-template`
  - `/Users/yeowool/Documents/repo-template/README.md`
  - `/Users/yeowool/Documents/repo-template/scaffold/REPO.md`
  - `/Users/yeowool/Documents/repo-template/scaffold/AGENTS.md`
  - `/Users/yeowool/Documents/repo-template/recreate-prompt.md`
