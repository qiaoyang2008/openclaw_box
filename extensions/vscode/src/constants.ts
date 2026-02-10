export const WEBVIEW_TYPE = "openclaw.controlUI";

export const COMMANDS = {
  OPEN_CONTROL_UI: "openclaw.openControlUI",
  CONNECT: "openclaw.connect",
  DISCONNECT: "openclaw.disconnect",
  NAVIGATE_TAB: "openclaw.navigateTab",
  SHOW_CHAT: "openclaw.showChat",
  SHOW_OVERVIEW: "openclaw.showOverview",
  SHOW_LOGS: "openclaw.showLogs",
} as const;

export const SETTINGS = {
  GATEWAY_URL: "openclaw.gatewayUrl",
  TOKEN: "openclaw.token",
  SESSION_KEY: "openclaw.sessionKey",
  THEME: "openclaw.theme",
  CONTROL_UI_PATH: "openclaw.controlUiPath",
  AUTO_CONNECT: "openclaw.autoConnect",
} as const;

export const TABS = [
  "chat",
  "overview",
  "channels",
  "instances",
  "sessions",
  "usage",
  "cron",
  "agents",
  "skills",
  "nodes",
  "config",
  "debug",
  "logs",
] as const;

export type Tab = (typeof TABS)[number];

/** PostMessage types for the bridge protocol between extension host and WebView. */
export const MSG = {
  // Extension host -> WebView
  SYNC_SETTINGS: "openclaw:syncSettings",
  NAVIGATE_TAB: "openclaw:navigateTab",
  // WebView -> Extension host
  CONNECTION_STATUS: "openclaw:connectionStatus",
  CURRENT_TAB: "openclaw:currentTab",
  READY: "openclaw:ready",
} as const;
