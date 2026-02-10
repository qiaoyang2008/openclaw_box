import type { Tab } from "./navigation.ts";
import { connectGateway } from "./app-gateway.ts";
import {
  startLogsPolling,
  startNodesPolling,
  stopLogsPolling,
  stopNodesPolling,
  startDebugPolling,
  stopDebugPolling,
} from "./app-polling.ts";
import { observeTopbar, scheduleChatScroll, scheduleLogsScroll } from "./app-scroll.ts";
import {
  applySettingsFromUrl,
  attachThemeListener,
  detachThemeListener,
  inferBasePath,
  syncTabWithLocation,
  syncThemeWithSettings,
} from "./app-settings.ts";
import { saveSettings, type UiSettings } from "./storage.ts";

type LifecycleHost = {
  basePath: string;
  tab: Tab;
  chatHasAutoScrolled: boolean;
  chatManualRefreshInFlight: boolean;
  chatLoading: boolean;
  chatMessages: unknown[];
  chatToolMessages: unknown[];
  chatStream: string;
  logsAutoFollow: boolean;
  logsAtBottom: boolean;
  logsEntries: unknown[];
  popStateHandler: () => void;
  topbarObserver: ResizeObserver | null;
  settings: UiSettings;
  client: { stop: () => void } | null;
  vscodeMessageHandler?: (event: MessageEvent) => void;
};

export function handleConnected(host: LifecycleHost) {
  host.basePath = inferBasePath();
  applySettingsFromUrl(host as unknown as Parameters<typeof applySettingsFromUrl>[0]);
  syncTabWithLocation(host as unknown as Parameters<typeof syncTabWithLocation>[0], true);
  syncThemeWithSettings(host as unknown as Parameters<typeof syncThemeWithSettings>[0]);
  attachThemeListener(host as unknown as Parameters<typeof attachThemeListener>[0]);
  window.addEventListener("popstate", host.popStateHandler);

  // Listen for settings sync messages from VSCode extension
  host.vscodeMessageHandler = (event: MessageEvent) => {
    const msg = event.data;
    if (msg?.type === "openclaw:syncSettings" && msg.settings) {
      console.log("[OpenClaw] Received settings sync from VSCode:", msg.settings);

      // Check if critical settings changed (token or gatewayUrl)
      const oldToken = host.settings.token;
      const oldGatewayUrl = host.settings.gatewayUrl;
      const newToken = msg.settings.token || host.settings.token;
      const newGatewayUrl = msg.settings.gatewayUrl || host.settings.gatewayUrl;

      const tokenChanged = oldToken !== newToken;
      const urlChanged = oldGatewayUrl !== newGatewayUrl;

      // Update settings with new values
      host.settings = {
        ...host.settings,
        gatewayUrl: newGatewayUrl,
        token: newToken,
        sessionKey: msg.settings.sessionKey || host.settings.sessionKey,
        theme: msg.settings.theme || host.settings.theme,
      };

      // Persist to localStorage
      saveSettings(host.settings);

      // Only reconnect if token or URL changed and reconnect was requested
      if (msg.reconnect && (tokenChanged || urlChanged)) {
        console.log("[OpenClaw] Settings changed, reconnecting...", {
          tokenChanged,
          urlChanged
        });
        host.client?.stop();
        connectGateway(host as unknown as Parameters<typeof connectGateway>[0]);
      } else {
        console.log("[OpenClaw] Settings synced (no reconnect needed)");
      }
    } else if (msg?.type === "openclaw:navigateTab" && msg.tab) {
      // Handle tab navigation from VSCode
      (host as unknown as { tab: Tab }).tab = msg.tab;
    }
  };

  window.addEventListener("message", host.vscodeMessageHandler);

  // Notify VSCode that we're ready to receive messages
  window.parent?.postMessage({ type: "openclaw:ready" }, "*");

  connectGateway(host as unknown as Parameters<typeof connectGateway>[0]);
  startNodesPolling(host as unknown as Parameters<typeof startNodesPolling>[0]);
  if (host.tab === "logs") {
    startLogsPolling(host as unknown as Parameters<typeof startLogsPolling>[0]);
  }
  if (host.tab === "debug") {
    startDebugPolling(host as unknown as Parameters<typeof startDebugPolling>[0]);
  }
}

export function handleFirstUpdated(host: LifecycleHost) {
  observeTopbar(host as unknown as Parameters<typeof observeTopbar>[0]);
}

export function handleDisconnected(host: LifecycleHost) {
  window.removeEventListener("popstate", host.popStateHandler);
  if (host.vscodeMessageHandler) {
    window.removeEventListener("message", host.vscodeMessageHandler);
    host.vscodeMessageHandler = undefined;
  }
  stopNodesPolling(host as unknown as Parameters<typeof stopNodesPolling>[0]);
  stopLogsPolling(host as unknown as Parameters<typeof stopLogsPolling>[0]);
  stopDebugPolling(host as unknown as Parameters<typeof stopDebugPolling>[0]);
  detachThemeListener(host as unknown as Parameters<typeof detachThemeListener>[0]);
  host.topbarObserver?.disconnect();
  host.topbarObserver = null;
}

export function handleUpdated(host: LifecycleHost, changed: Map<PropertyKey, unknown>) {
  if (host.tab === "chat" && host.chatManualRefreshInFlight) {
    return;
  }
  if (
    host.tab === "chat" &&
    (changed.has("chatMessages") ||
      changed.has("chatToolMessages") ||
      changed.has("chatStream") ||
      changed.has("chatLoading") ||
      changed.has("tab"))
  ) {
    const forcedByTab = changed.has("tab");
    const forcedByLoad =
      changed.has("chatLoading") && changed.get("chatLoading") === true && !host.chatLoading;
    scheduleChatScroll(
      host as unknown as Parameters<typeof scheduleChatScroll>[0],
      forcedByTab || forcedByLoad || !host.chatHasAutoScrolled,
    );
  }
  if (
    host.tab === "logs" &&
    (changed.has("logsEntries") || changed.has("logsAutoFollow") || changed.has("tab"))
  ) {
    if (host.logsAutoFollow && host.logsAtBottom) {
      scheduleLogsScroll(
        host as unknown as Parameters<typeof scheduleLogsScroll>[0],
        changed.has("tab") || changed.has("logsAutoFollow"),
      );
    }
  }
}
