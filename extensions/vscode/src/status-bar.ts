import * as vscode from "vscode";
import { COMMANDS } from "./constants";

export class StatusBarManager implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private currentTab: string | null = null;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = COMMANDS.OPEN_CONTROL_UI;
    this.setDisconnected();
    this.item.show();
  }

  setConnected(gatewayUrl?: string) {
    this.item.text = "$(plug) OpenClaw";
    this.item.tooltip = gatewayUrl
      ? `Connected to ${gatewayUrl}${this.currentTab ? ` | ${this.currentTab}` : ""}`
      : "Connected to OpenClaw gateway";
    this.item.backgroundColor = undefined;
  }

  setDisconnected() {
    this.item.text = "$(debug-disconnect) OpenClaw";
    this.item.tooltip = "Click to open Control UI";
    this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
  }

  setCurrentTab(tab: string) {
    this.currentTab = tab;
    if (this.item.text.includes("plug")) {
      this.item.tooltip = `Connected | ${tab}`;
    }
  }

  dispose() {
    this.item.dispose();
  }
}
