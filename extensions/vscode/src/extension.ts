import * as vscode from "vscode";
import { COMMANDS, TABS, type Tab } from "./constants";
import { ControlUIWebviewProvider } from "./webview-provider";
import { StatusBarManager } from "./status-bar";

let provider: ControlUIWebviewProvider | undefined;
let statusBar: StatusBarManager | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("[OpenClaw] Extension activating...");
  statusBar = new StatusBarManager();
  provider = new ControlUIWebviewProvider(context, statusBar);
  console.log("[OpenClaw] Extension activated successfully");

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.OPEN_CONTROL_UI, () => {
      provider!.openOrReveal();
    }),

    vscode.commands.registerCommand(COMMANDS.CONNECT, () => {
      provider!.openOrReveal();
      provider!.syncSettingsToWebview();
    }),

    vscode.commands.registerCommand(COMMANDS.DISCONNECT, () => {
      provider!.dispose();
    }),

    vscode.commands.registerCommand(COMMANDS.NAVIGATE_TAB, async () => {
      const items = TABS.map((t) => ({
        label: t.charAt(0).toUpperCase() + t.slice(1),
        description: t,
        tab: t,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a tab",
      });
      if (picked) {
        provider!.openOrReveal();
        provider!.navigateToTab(picked.tab as Tab);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.SHOW_CHAT, () => {
      provider!.openOrReveal();
      provider!.navigateToTab("chat");
    }),

    vscode.commands.registerCommand(COMMANDS.SHOW_OVERVIEW, () => {
      provider!.openOrReveal();
      provider!.navigateToTab("overview");
    }),

    vscode.commands.registerCommand(COMMANDS.SHOW_LOGS, () => {
      provider!.openOrReveal();
      provider!.navigateToTab("logs");
    }),
  );

  // Watch for settings changes and sync to WebView
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration("openclaw.gatewayUrl") ||
        e.affectsConfiguration("openclaw.token") ||
        e.affectsConfiguration("openclaw.sessionKey") ||
        e.affectsConfiguration("openclaw.theme")
      ) {
        provider?.syncSettingsToWebview();
      }
    }),
  );

  context.subscriptions.push(statusBar);
}

export function deactivate() {
  provider?.dispose();
  statusBar?.dispose();
}
