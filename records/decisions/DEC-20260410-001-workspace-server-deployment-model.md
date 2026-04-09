# DEC-20260410-001: Workspace Server Deployment Model

Opened: 2026-04-10 00-27-30 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Status: accepted
- Deciders: operator, orchestrator
- Related ids: RSH-20260409-007, RSH-20260409-008, RSH-20260409-009, LOG-20260410-001

## Decision

Superhuman surfaces connect to a workspace server API.

Desktop must be able to launch and use a local workspace server automatically. The same desktop surface may connect to remote workspace servers. Local and remote are deployment locations for the same workspace-server contract, not separate product modes.

Mobile and messenger connect to workspace servers or relay/sync paths through the same product state model. Future mobile clients may gain a local workspace-server deployment where the platform can support it, especially Android, but mobile-local execution is not the first mobile requirement.

## Context

The desktop fork evaluation reframed desktop as a client shell for Superhuman-owned runtime state. That raised a product-level question: is the desktop app unusable unless a remote server is already running, or does it have a separate local mode for local repos?

The operator accepted a third framing: use one workspace-server API. Desktop should auto-start a local server for local repos and can also connect to remote servers.

## Options Considered

### Remote-Server-Required Desktop

- Upside: simplest state topology for cross-device sync
- Upside: desktop is a very thin client
- Downside: desktop coding experience breaks when the remote server is unavailable
- Downside: local repo work feels artificially remote

### Separate Local Mode And Remote Mode

- Upside: desktop can work locally without remote dependency
- Upside: remote servers remain possible
- Downside: risks two runtime contracts, two state models, two approval paths, and two sets of edge cases

### One Workspace Server API With Local And Remote Deployments

- Upside: desktop works locally by auto-launching the local workspace server
- Upside: the same UI can connect to remote workspace servers
- Upside: mobile, messenger, desktop, relays, and future clients can target one product contract
- Upside: forked desktop shells are evaluated by whether they can be rewired to one Superhuman API
- Downside: Superhuman must explicitly design and preserve that API boundary

## Rationale

The accepted workspace thesis requires synchronized surfaces, but the operator's coding cockpit should not become useless when a remote server, relay, or cloud box is offline.

Treating local and remote as deployments of the same workspace-server contract preserves local-first coding ergonomics while keeping Superhuman's cross-surface state model coherent.

## Consequences

- Desktop is a client shell, but not a remote-only thin client.
- Desktop should auto-start and pair with a local workspace server by default when operating local repos.
- Desktop should be able to connect to operator-approved remote workspace servers.
- The desktop fork evaluation must prefer candidates with replaceable client/server seams or thin local shells.
- The runtime state contract must distinguish workspace-server location from project identity, agent identity, run identity, and repo location.
- Relay/sync infrastructure is optional connectivity, not canonical project truth.
- Mobile-local execution remains allowed as a future platform-specific deployment, not a separate mobile product mode.
