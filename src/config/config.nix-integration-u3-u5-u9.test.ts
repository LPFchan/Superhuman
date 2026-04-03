import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createConfigIO,
  DEFAULT_GATEWAY_PORT,
  resolveConfigPathCandidate,
  resolveGatewayPort,
  resolveIsNixMode,
  resolveStateDir,
} from "./config.js";
import { withTempHome, withTempHomeConfig } from "./test-helpers.js";

vi.unmock("../version.js");

function envWith(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  // Hermetic env: don't inherit process.env because other tests may mutate it.
  return { ...overrides };
}

function loadConfigForHome(home: string) {
  return createConfigIO({
    env: envWith({ OPENCLAW_HOME: home }),
    homedir: () => home,
  }).loadConfig();
}

async function withLoadedConfigForHome(
  config: unknown,
  run: (cfg: ReturnType<typeof loadConfigForHome>) => Promise<void> | void,
) {
  await withTempHomeConfig(config, async ({ home }) => {
    const cfg = loadConfigForHome(home);
    await run(cfg);
  });
}

describe("Nix integration (U3, U5, U9)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("U3: isNixMode env var detection", () => {
    it("isNixMode is false when SUPERHUMAN_NIX_MODE is not set", () => {
      expect(resolveIsNixMode(envWith({ SUPERHUMAN_NIX_MODE: undefined }))).toBe(false);
    });

    it("isNixMode is false when SUPERHUMAN_NIX_MODE is empty", () => {
      expect(resolveIsNixMode(envWith({ SUPERHUMAN_NIX_MODE: "" }))).toBe(false);
    });

    it("isNixMode is false when SUPERHUMAN_NIX_MODE is not '1'", () => {
      expect(resolveIsNixMode(envWith({ SUPERHUMAN_NIX_MODE: "true" }))).toBe(false);
    });

    it("isNixMode is true when SUPERHUMAN_NIX_MODE=1", () => {
      expect(resolveIsNixMode(envWith({ SUPERHUMAN_NIX_MODE: "1" }))).toBe(true);
    });
  });

  describe("U5: CONFIG_PATH and STATE_DIR env var overrides", () => {
    it("STATE_DIR defaults to ~/.superhuman when env not set", () => {
      expect(resolveStateDir(envWith({ SUPERHUMAN_STATE_DIR: undefined }))).toMatch(
        /\.superhuman$/,
      );
    });

    it("STATE_DIR respects SUPERHUMAN_STATE_DIR override", () => {
      expect(resolveStateDir(envWith({ SUPERHUMAN_STATE_DIR: "/custom/state/dir" }))).toBe(
        path.resolve("/custom/state/dir"),
      );
    });

    it("STATE_DIR respects SUPERHUMAN_HOME when state override is unset", () => {
      const customHome = path.join(path.sep, "custom", "home");
      expect(
        resolveStateDir(envWith({ SUPERHUMAN_HOME: customHome, SUPERHUMAN_STATE_DIR: undefined })),
      ).toBe(path.join(path.resolve(customHome), ".superhuman"));
    });

    it("CONFIG_PATH defaults to SUPERHUMAN_HOME/.superhuman/superhuman.json", () => {
      const customHome = path.join(path.sep, "custom", "home");
      expect(
        resolveConfigPathCandidate(
          envWith({
            SUPERHUMAN_HOME: customHome,
            SUPERHUMAN_CONFIG_PATH: undefined,
            SUPERHUMAN_STATE_DIR: undefined,
          }),
        ),
      ).toBe(path.join(path.resolve(customHome), ".superhuman", "superhuman.json"));
    });

    it("CONFIG_PATH defaults to ~/.superhuman/superhuman.json when env not set", () => {
      expect(
        resolveConfigPathCandidate(
          envWith({ SUPERHUMAN_CONFIG_PATH: undefined, SUPERHUMAN_STATE_DIR: undefined }),
        ),
      ).toMatch(/\.superhuman[\\/]superhuman\.json$/);
    });

    it("CONFIG_PATH respects SUPERHUMAN_CONFIG_PATH override", () => {
      expect(
        resolveConfigPathCandidate(
          envWith({ SUPERHUMAN_CONFIG_PATH: "/nix/store/abc/superhuman.json" }),
        ),
      ).toBe(path.resolve("/nix/store/abc/superhuman.json"));
    });

    it("CONFIG_PATH expands ~ in SUPERHUMAN_CONFIG_PATH override", async () => {
      await withTempHome(async (home) => {
        expect(
          resolveConfigPathCandidate(
            envWith({
              SUPERHUMAN_HOME: home,
              SUPERHUMAN_CONFIG_PATH: "~/.superhuman/custom.json",
            }),
            () => home,
          ),
        ).toBe(path.join(home, ".superhuman", "custom.json"));
      });
    });

    it("CONFIG_PATH uses STATE_DIR when only state dir is overridden", () => {
      expect(
        resolveConfigPathCandidate(
          envWith({ SUPERHUMAN_STATE_DIR: "/custom/state", OPENCLAW_TEST_FAST: "1" }),
          () => path.join(path.sep, "tmp", "openclaw-config-home"),
        ),
      ).toBe(path.join(path.resolve("/custom/state"), "superhuman.json"));
    });
  });

  describe("U5b: tilde expansion for config paths", () => {
    it("expands ~ in common path-ish config fields", async () => {
      await withTempHome(async (home) => {
        const configDir = path.join(home, ".openclaw");
        await fs.mkdir(configDir, { recursive: true });
        const pluginDir = path.join(home, "plugins", "demo-plugin");
        await fs.mkdir(pluginDir, { recursive: true });
        await fs.writeFile(
          path.join(pluginDir, "index.js"),
          'export default { id: "demo-plugin", register() {} };',
          "utf-8",
        );
        await fs.writeFile(
          path.join(pluginDir, "openclaw.plugin.json"),
          JSON.stringify(
            {
              id: "demo-plugin",
              configSchema: { type: "object", additionalProperties: false, properties: {} },
            },
            null,
            2,
          ),
          "utf-8",
        );
        await fs.writeFile(
          path.join(configDir, "openclaw.json"),
          JSON.stringify(
            {
              plugins: {
                load: {
                  paths: ["~/plugins/demo-plugin"],
                },
              },
              agents: {
                defaults: { workspace: "~/ws-default" },
                list: [
                  {
                    id: "main",
                    workspace: "~/ws-agent",
                    agentDir: "~/.openclaw/agents/main",
                    sandbox: { workspaceRoot: "~/sandbox-root" },
                  },
                ],
              },
              channels: {
                whatsapp: {
                  accounts: {
                    personal: {
                      authDir: "~/.openclaw/credentials/wa-personal",
                    },
                  },
                },
              },
            },
            null,
            2,
          ),
          "utf-8",
        );

        const cfg = loadConfigForHome(home);

        expect(cfg.plugins?.load?.paths?.[0]).toBe(path.join(home, "plugins", "demo-plugin"));
        expect(cfg.agents?.defaults?.workspace).toBe(path.join(home, "ws-default"));
        expect(cfg.agents?.list?.[0]?.workspace).toBe(path.join(home, "ws-agent"));
        expect(cfg.agents?.list?.[0]?.agentDir).toBe(
          path.join(home, ".openclaw", "agents", "main"),
        );
        expect(cfg.agents?.list?.[0]?.sandbox?.workspaceRoot).toBe(path.join(home, "sandbox-root"));
        expect(cfg.channels?.whatsapp?.accounts?.personal?.authDir).toBe(
          path.join(home, ".openclaw", "credentials", "wa-personal"),
        );
      });
    });
  });

  describe("U6: gateway port resolution", () => {
    it("uses default when env and config are unset", () => {
      expect(resolveGatewayPort({}, envWith({ OPENCLAW_GATEWAY_PORT: undefined }))).toBe(
        DEFAULT_GATEWAY_PORT,
      );
    });

    it("prefers OPENCLAW_GATEWAY_PORT over config", () => {
      expect(
        resolveGatewayPort(
          { gateway: { port: 19002 } },
          envWith({ OPENCLAW_GATEWAY_PORT: "19001" }),
        ),
      ).toBe(19001);
    });

    it("falls back to config when env is invalid", () => {
      expect(
        resolveGatewayPort(
          { gateway: { port: 19003 } },
          envWith({ OPENCLAW_GATEWAY_PORT: "nope" }),
        ),
      ).toBe(19003);
    });
  });

  describe("U9: telegram.tokenFile schema validation", () => {
    it("accepts config with only botToken", async () => {
      await withLoadedConfigForHome(
        {
          channels: { telegram: { botToken: "123:ABC" } },
        },
        async (cfg) => {
          expect(cfg.channels?.telegram?.botToken).toBe("123:ABC");
          expect(cfg.channels?.telegram?.tokenFile).toBeUndefined();
        },
      );
    });

    it("accepts config with only tokenFile", async () => {
      await withLoadedConfigForHome(
        {
          channels: { telegram: { tokenFile: "/run/agenix/telegram-token" } },
        },
        async (cfg) => {
          expect(cfg.channels?.telegram?.tokenFile).toBe("/run/agenix/telegram-token");
          expect(cfg.channels?.telegram?.botToken).toBeUndefined();
        },
      );
    });

    it("accepts config with both botToken and tokenFile", async () => {
      await withLoadedConfigForHome(
        {
          channels: {
            telegram: {
              botToken: "fallback:token",
              tokenFile: "/run/agenix/telegram-token",
            },
          },
        },
        async (cfg) => {
          expect(cfg.channels?.telegram?.botToken).toBe("fallback:token");
          expect(cfg.channels?.telegram?.tokenFile).toBe("/run/agenix/telegram-token");
        },
      );
    });
  });
});
