import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../test-helpers/temp-dir.js";
import {
  DEFAULT_GATEWAY_PORT,
  resolveDefaultConfigCandidates,
  resolveConfigPathCandidate,
  resolveConfigPath,
  resolveGatewayPort,
  resolveOAuthDir,
  resolveOAuthPath,
  resolveStateDir,
} from "./paths.js";

function envWith(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return { ...overrides };
}

describe("oauth paths", () => {
  it("prefers SUPERHUMAN_OAUTH_DIR over legacy overrides", () => {
    const env = {
      SUPERHUMAN_OAUTH_DIR: "/custom/superhuman-oauth",
      OPENCLAW_OAUTH_DIR: "/custom/oauth",
      OPENCLAW_STATE_DIR: "/custom/state",
    } as NodeJS.ProcessEnv;

    expect(resolveOAuthDir(env, "/custom/state")).toBe(path.resolve("/custom/superhuman-oauth"));
    expect(resolveOAuthPath(env, "/custom/state")).toBe(
      path.join(path.resolve("/custom/superhuman-oauth"), "oauth.json"),
    );
  });

  it("derives oauth path from SUPERHUMAN_STATE_DIR when unset", () => {
    const env = {
      SUPERHUMAN_STATE_DIR: "/custom/state",
    } as NodeJS.ProcessEnv;

    expect(resolveOAuthDir(env, "/custom/state")).toBe(path.join("/custom/state", "credentials"));
    expect(resolveOAuthPath(env, "/custom/state")).toBe(
      path.join("/custom/state", "credentials", "oauth.json"),
    );
  });
});

describe("gateway port resolution", () => {
  it("prefers SUPERHUMAN_GATEWAY_PORT over config and legacy env", () => {
    expect(
      resolveGatewayPort(
        { gateway: { port: 19002 } },
        envWith({ SUPERHUMAN_GATEWAY_PORT: "19011", OPENCLAW_GATEWAY_PORT: "19001" }),
      ),
    ).toBe(19011);
  });

  it("accepts Compose-style IPv4 host publish values from env", () => {
    expect(
      resolveGatewayPort(
        { gateway: { port: 19002 } },
        envWith({ OPENCLAW_GATEWAY_PORT: "127.0.0.1:18789" }),
      ),
    ).toBe(18789);
  });

  it("accepts Compose-style IPv6 host publish values from env", () => {
    expect(
      resolveGatewayPort(
        { gateway: { port: 19002 } },
        envWith({ OPENCLAW_GATEWAY_PORT: "[::1]:28789" }),
      ),
    ).toBe(28789);
  });

  it("ignores the legacy env name and falls back to config", () => {
    expect(
      resolveGatewayPort(
        { gateway: { port: 19002 } },
        envWith({ CLAWDBOT_GATEWAY_PORT: "127.0.0.1:18789" }),
      ),
    ).toBe(19002);
  });

  it("falls back to config when the Compose-style suffix is invalid", () => {
    expect(
      resolveGatewayPort(
        { gateway: { port: 19003 } },
        envWith({ OPENCLAW_GATEWAY_PORT: "127.0.0.1:not-a-port" }),
      ),
    ).toBe(19003);
  });

  it("falls back when malformed IPv6 inputs do not provide an explicit port", () => {
    expect(
      resolveGatewayPort({ gateway: { port: 19003 } }, envWith({ OPENCLAW_GATEWAY_PORT: "::1" })),
    ).toBe(19003);
    expect(resolveGatewayPort({}, envWith({ OPENCLAW_GATEWAY_PORT: "2001:db8::1" }))).toBe(
      DEFAULT_GATEWAY_PORT,
    );
  });

  it("falls back to the default port when env is invalid and config is unset", () => {
    expect(resolveGatewayPort({}, envWith({ OPENCLAW_GATEWAY_PORT: "127.0.0.1:not-a-port" }))).toBe(
      DEFAULT_GATEWAY_PORT,
    );
  });
});

describe("state + config path candidates", () => {
  function expectSuperhumanHomeDefaults(env: NodeJS.ProcessEnv): void {
    const configuredHome = env.SUPERHUMAN_HOME ?? env.OPENCLAW_HOME;
    if (!configuredHome) {
      throw new Error("SUPERHUMAN_HOME or OPENCLAW_HOME must be set for this assertion helper");
    }
    const resolvedHome = path.resolve(configuredHome);
    expect(resolveStateDir(env)).toBe(path.join(resolvedHome, ".superhuman"));

    const candidates = resolveDefaultConfigCandidates(env);
    expect(candidates[0]).toBe(path.join(resolvedHome, ".superhuman", "superhuman.json"));
  }

  it("uses SUPERHUMAN_STATE_DIR when set", () => {
    const env = {
      SUPERHUMAN_STATE_DIR: "/new/state",
    } as NodeJS.ProcessEnv;

    expect(resolveStateDir(env, () => "/home/test")).toBe(path.resolve("/new/state"));
  });

  it("uses SUPERHUMAN_HOME for default state/config locations", () => {
    const env = {
      SUPERHUMAN_HOME: "/srv/superhuman-home",
    } as NodeJS.ProcessEnv;
    expectSuperhumanHomeDefaults(env);
  });

  it("falls back to OPENCLAW_HOME when SUPERHUMAN_HOME is unset", () => {
    const env = {
      OPENCLAW_HOME: "/srv/openclaw-home",
      HOME: "/home/other",
    } as NodeJS.ProcessEnv;
    expectSuperhumanHomeDefaults(env);
  });

  it("orders default config candidates in a stable order", () => {
    const home = "/home/test";
    const resolvedHome = path.resolve(home);
    const candidates = resolveDefaultConfigCandidates({} as NodeJS.ProcessEnv, () => home);
    const expected = [
      path.join(resolvedHome, ".superhuman", "superhuman.json"),
      path.join(resolvedHome, ".superhuman", "openclaw.json"),
      path.join(resolvedHome, ".superhuman", "clawdbot.json"),
      path.join(resolvedHome, ".openclaw", "superhuman.json"),
      path.join(resolvedHome, ".openclaw", "openclaw.json"),
      path.join(resolvedHome, ".openclaw", "clawdbot.json"),
      path.join(resolvedHome, ".clawdbot", "superhuman.json"),
      path.join(resolvedHome, ".clawdbot", "openclaw.json"),
      path.join(resolvedHome, ".clawdbot", "clawdbot.json"),
    ];
    expect(candidates).toEqual(expected);
  });

  it("prefers ~/.superhuman when it exists and legacy dirs are missing", async () => {
    await withTempDir({ prefix: "openclaw-state-" }, async (root) => {
      const newDir = path.join(root, ".superhuman");
      await fs.mkdir(newDir, { recursive: true });
      const resolved = resolveStateDir({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(newDir);
    });
  });

  it("falls back to existing legacy state dir when ~/.superhuman is missing", async () => {
    await withTempDir({ prefix: "openclaw-state-legacy-" }, async (root) => {
      const legacyDir = path.join(root, ".openclaw");
      await fs.mkdir(legacyDir, { recursive: true });
      const resolved = resolveStateDir({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(legacyDir);
    });
  });

  it("CONFIG_PATH prefers existing legacy config in the canonical state dir when present", async () => {
    await withTempDir({ prefix: "openclaw-config-" }, async (root) => {
      const canonicalDir = path.join(root, ".superhuman");
      await fs.mkdir(canonicalDir, { recursive: true });
      const legacyPath = path.join(canonicalDir, "openclaw.json");
      await fs.writeFile(legacyPath, "{}", "utf-8");

      const resolved = resolveConfigPathCandidate({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(legacyPath);
    });
  });

  it("respects state dir overrides when config is missing", async () => {
    await withTempDir({ prefix: "openclaw-config-override-" }, async (root) => {
      const legacyDir = path.join(root, ".superhuman");
      await fs.mkdir(legacyDir, { recursive: true });
      const legacyConfig = path.join(legacyDir, "openclaw.json");
      await fs.writeFile(legacyConfig, "{}", "utf-8");

      const overrideDir = path.join(root, "override");
      const env = { SUPERHUMAN_STATE_DIR: overrideDir } as NodeJS.ProcessEnv;
      const resolved = resolveConfigPath(env, overrideDir, () => root);
      expect(resolved).toBe(path.join(overrideDir, "superhuman.json"));
    });
  });
});
