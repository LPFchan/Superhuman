import { resolveSessionAgentId } from "../../agents/agent-scope.js";
import {
  formatSandboxToolPolicyBlockedMessage,
  resolveSandboxRuntimeStatus,
} from "../../agents/sandbox/runtime-status.js";
import {
  classifyToolAgainstSandboxToolPolicy,
  resolveSandboxToolPolicyForAgent,
} from "../../agents/sandbox/tool-policy.js";
import type { OpenClawConfig } from "../../config/config.js";
import { inspectBundleLspRuntimeSupport } from "../../plugins/bundle-lsp.js";
import type { PluginRegistry as OpenClawPluginRegistry } from "../../plugins/registry.js";
import type {
  SuperPluginShellContract,
  SuperSandboxRuntimeSnapshot,
  SuperSandboxToolDecision,
  SuperShellCapabilitySnapshot,
} from "./seams.js";

function hasUnsafeControlChars(value: string): boolean {
  return Array.from(value).some((char) => {
    const codePoint = char.codePointAt(0) ?? 0;
    return codePoint < 0x20 || codePoint === 0x7f;
  });
}

function shellEscapeSingleArg(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export function resolveSemanticToolProviderIds(registry?: OpenClawPluginRegistry): string[] {
  if (!registry) {
    return [];
  }
  const providerIds = new Set<string>();
  for (const plugin of registry.plugins) {
    if (
      plugin.format === "bundle" &&
      plugin.bundleFormat &&
      plugin.rootDir &&
      (plugin.bundleCapabilities ?? []).includes("lspServers")
    ) {
      const support = inspectBundleLspRuntimeSupport({
        pluginId: plugin.id,
        rootDir: plugin.rootDir,
        bundleFormat: plugin.bundleFormat,
      });
      if (support.hasStdioServer) {
        providerIds.add(plugin.id);
      }
    }
    if (
      plugin.toolNames.some((toolName) => {
        const normalized = toolName.trim().toLowerCase();
        return normalized.startsWith("lsp_references_");
      })
    ) {
      providerIds.add(plugin.id);
    }
  }
  return [...providerIds].toSorted();
}

export function resolveSupportsSemanticRename(registry?: OpenClawPluginRegistry): boolean {
  if (!registry) {
    return false;
  }
  return registry.plugins.some((plugin) =>
    plugin.toolNames.some((toolName) => {
      const normalized = toolName.trim().toLowerCase();
      return normalized === "symbol_rename" || normalized === "vscode_renamesymbol";
    }),
  );
}

export function resolveSuperPluginShellContracts(
  registry?: OpenClawPluginRegistry,
): SuperPluginShellContract[] {
  if (!registry?.plugins) {
    return [];
  }
  return registry.plugins.map((plugin) => {
    const semanticToolProviderIds = resolveSemanticToolProviderIds({
      plugins: [plugin],
    } as OpenClawPluginRegistry);
    const providesSymbolReferences = semanticToolProviderIds.length > 0;
    const providesSemanticRename = plugin.toolNames.some((toolName) => {
      const normalized = toolName.trim().toLowerCase();
      return normalized === "symbol_rename" || normalized === "vscode_renamesymbol";
    });
    return {
      id: plugin.id,
      name: plugin.name,
      providesWorkspaceSearchFallback: true,
      providesSymbolReferences,
      providesSemanticRename,
      semanticToolProviderIds,
      toolNames: [...plugin.toolNames],
      bundleCapabilities: [...(plugin.bundleCapabilities ?? [])],
      hasConfigSchema: Boolean(plugin.configSchema),
    };
  });
}

export function resolveSuperShellCapabilitySnapshot(params: {
  cfg: OpenClawConfig;
  sessionKey: string;
  pluginRegistry?: OpenClawPluginRegistry;
}): SuperShellCapabilitySnapshot {
  const sessionKey = params.sessionKey.trim();
  const agentId = resolveSessionAgentId({ sessionKey, config: params.cfg });
  const mainSessionKey = resolveSandboxRuntimeStatus({
    cfg: params.cfg,
    sessionKey,
  }).mainSessionKey;
  const semanticToolProviderIds = resolveSemanticToolProviderIds(params.pluginRegistry);
  const supportsSymbolReferences = semanticToolProviderIds.length > 0;
  const supportsSemanticRename = resolveSupportsSemanticRename(params.pluginRegistry);
  const mode = supportsSemanticRename
    ? "semantic_rename"
    : supportsSymbolReferences
      ? "symbol_references"
      : "workspace_search_only";
  return {
    sessionKey,
    agentId,
    mainSessionKey,
    createdAt: Date.now(),
    mode,
    supportsSymbolReferences,
    supportsSemanticRename,
    supportsWorkspaceSearchOnly: mode === "workspace_search_only",
    semanticToolProviderIds,
    workspaceSearchFallbackToolKinds: ["read", "exec"],
  };
}

export function resolveSuperSandboxRuntimeSnapshot(params: {
  cfg: OpenClawConfig;
  sessionKey: string;
}): SuperSandboxRuntimeSnapshot {
  const runtime = resolveSandboxRuntimeStatus({
    cfg: params.cfg,
    sessionKey: params.sessionKey,
  });
  const explainCommand = runtime.sessionKey
    ? hasUnsafeControlChars(runtime.sessionKey)
      ? `openclaw sandbox explain --agent ${runtime.agentId}`
      : `openclaw sandbox explain --session ${shellEscapeSingleArg(runtime.sessionKey)}`
    : "openclaw sandbox explain";
  return {
    sessionKey: runtime.sessionKey,
    agentId: runtime.agentId,
    mainSessionKey: runtime.mainSessionKey,
    createdAt: Date.now(),
    mode: runtime.mode,
    sandboxed: runtime.sandboxed,
    toolPolicy: {
      allow: [...runtime.toolPolicy.allow],
      deny: [...runtime.toolPolicy.deny],
      sourceKeys: {
        allow: runtime.toolPolicy.sources.allow.key,
        deny: runtime.toolPolicy.sources.deny.key,
      },
    },
    remediation: {
      explainCommand,
      disableSandboxConfigKey: "agents.defaults.sandbox.mode=off",
      suggestMainSession: runtime.mode === "non-main",
    },
  };
}

export function evaluateSuperSandboxToolDecision(params: {
  cfg: OpenClawConfig;
  sessionKey?: string;
  toolName: string;
}): SuperSandboxToolDecision {
  const snapshot = resolveSuperSandboxRuntimeSnapshot({
    cfg: params.cfg,
    sessionKey: params.sessionKey?.trim() || "main",
  });
  if (!snapshot.sandboxed) {
    return {
      sessionKey: snapshot.sessionKey,
      agentId: snapshot.agentId,
      mainSessionKey: snapshot.mainSessionKey,
      toolName: params.toolName,
      sandboxed: false,
      allowed: true,
      reason: "sandbox_disabled",
      remediation: snapshot.remediation,
    };
  }
  const policy = resolveSandboxToolPolicyForAgent(params.cfg, snapshot.agentId);
  const { blockedByDeny, blockedByAllow } = classifyToolAgainstSandboxToolPolicy(
    params.toolName,
    policy,
  );
  if (blockedByDeny) {
    return {
      sessionKey: snapshot.sessionKey,
      agentId: snapshot.agentId,
      mainSessionKey: snapshot.mainSessionKey,
      toolName: params.toolName,
      sandboxed: true,
      allowed: false,
      reason: "blocked_by_deny",
      blockedBy: "deny",
      policySourceKey: policy.sources.deny.key,
      remediation: snapshot.remediation,
    };
  }
  if (blockedByAllow) {
    return {
      sessionKey: snapshot.sessionKey,
      agentId: snapshot.agentId,
      mainSessionKey: snapshot.mainSessionKey,
      toolName: params.toolName,
      sandboxed: true,
      allowed: false,
      reason: "blocked_by_allow",
      blockedBy: "allow",
      policySourceKey: policy.sources.allow.key,
      remediation: snapshot.remediation,
    };
  }
  return {
    sessionKey: snapshot.sessionKey,
    agentId: snapshot.agentId,
    mainSessionKey: snapshot.mainSessionKey,
    toolName: params.toolName,
    sandboxed: true,
    allowed: true,
    reason: "allowed",
    remediation: snapshot.remediation,
  };
}

export function formatSuperSandboxDecisionMessage(params: {
  cfg: OpenClawConfig;
  sessionKey?: string;
  toolName: string;
}): string | undefined {
  return formatSandboxToolPolicyBlockedMessage(params);
}
