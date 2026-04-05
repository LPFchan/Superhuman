// These identifiers stay openclaw-shaped on purpose. They anchor external
// compatibility contracts that plugins, manifests, and upgrade code still
// depend on even after the product/runtime defaults moved to Superhuman.
export const PROJECT_NAME = "openclaw" as const;

export const LEGACY_PROJECT_NAMES = [] as const;

// Plugin manifests and manifest-owned config still serialize under the
// openclaw namespace so existing packages keep loading without a manifest rename.
export const MANIFEST_KEY = PROJECT_NAME;

export const LEGACY_MANIFEST_KEYS = LEGACY_PROJECT_NAMES;

export const LEGACY_PLUGIN_MANIFEST_FILENAMES = [] as const;

export const LEGACY_CANVAS_HANDLER_NAMES = [] as const;

// Native app target/source paths still mirror the shipped OpenClaw app layout
// until the platform rename finishes end to end.
export const MACOS_APP_SOURCES_DIR = "apps/macos/Sources/OpenClaw" as const;

export const LEGACY_MACOS_APP_SOURCES_DIRS = [] as const;
