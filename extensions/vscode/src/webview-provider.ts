import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { WEBVIEW_TYPE, SETTINGS, MSG, type Tab } from "./constants";
import type { StatusBarManager } from "./status-bar";

export class ControlUIWebviewProvider implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private statusBar: StatusBarManager,
  ) {}

  openOrReveal() {
    console.log("[OpenClaw] openOrReveal called");
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const controlUiUri = this.resolveControlUiUri();
    console.log("[OpenClaw] Control UI path:", controlUiUri.fsPath);

    this.panel = vscode.window.createWebviewPanel(
      WEBVIEW_TYPE,
      "OpenClaw Control",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [controlUiUri],
      },
    );

    this.panel.webview.html = this.buildHtml(this.panel.webview, controlUiUri);
    this.setupMessageHandler();

    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
        this.statusBar.setDisconnected();
      },
      null,
      this.disposables,
    );
  }

  syncSettingsToWebview() {
    if (!this.panel) return;
    const config = vscode.workspace.getConfiguration();
    this.panel.webview.postMessage({
      type: MSG.SYNC_SETTINGS,
      settings: {
        gatewayUrl: config.get<string>(SETTINGS.GATEWAY_URL, "ws://127.0.0.1:18789"),
        token: config.get<string>(SETTINGS.TOKEN, ""),
        sessionKey: config.get<string>(SETTINGS.SESSION_KEY, "main"),
        theme: config.get<string>(SETTINGS.THEME, "system"),
      },
      reconnect: true,
    });
  }

  navigateToTab(tab: Tab) {
    this.openOrReveal();
    this.panel?.webview.postMessage({
      type: MSG.NAVIGATE_TAB,
      tab,
    });
  }

  dispose() {
    this.panel?.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private resolveControlUiUri(): vscode.Uri {
    // Priority 1: User-configured path
    const configPath = vscode.workspace
      .getConfiguration()
      .get<string>(SETTINGS.CONTROL_UI_PATH);
    if (configPath && fs.existsSync(path.join(configPath, "index.html"))) {
      return vscode.Uri.file(configPath);
    }

    // Priority 2: Workspace root dist/control-ui/
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      for (const folder of workspaceFolders) {
        const candidate = path.join(folder.uri.fsPath, "dist", "control-ui");
        if (fs.existsSync(path.join(candidate, "index.html"))) {
          return vscode.Uri.file(candidate);
        }
      }
    }

    // Priority 3: Bundled assets inside the extension
    const bundled = path.join(this.context.extensionPath, "control-ui");
    if (fs.existsSync(path.join(bundled, "index.html"))) {
      return vscode.Uri.file(bundled);
    }

    vscode.window.showErrorMessage(
      "OpenClaw Control UI assets not found. Build them with `pnpm ui:build` or set openclaw.controlUiPath.",
    );
    return vscode.Uri.file(this.context.extensionPath);
  }

  private buildHtml(webview: vscode.Webview, controlUiUri: vscode.Uri): string {
    console.log("[OpenClaw] buildHtml called, controlUiUri:", controlUiUri.fsPath);
    const indexPath = path.join(controlUiUri.fsPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      console.log("[OpenClaw] index.html not found at:", indexPath);
      return `<!DOCTYPE html><html><body>
        <h2>Control UI assets not found</h2>
        <p>Run <code>pnpm ui:build</code> in the OpenClaw repo, then reload this panel.</p>
      </body></html>`;
    }

    let html = fs.readFileSync(indexPath, "utf-8");
    console.log("[OpenClaw] Read index.html, length:", html.length);
    const nonce = getNonce();

    // Rewrite relative asset paths (Vite builds with base: "./")
    // Create proper webview URIs for each asset
    html = html.replace(
      /(href|src)="\.\/([^"]+)"/g,
      (_match: string, attr: string, relPath: string) => {
        const assetUri = vscode.Uri.joinPath(controlUiUri, relPath);
        const webviewUri = webview.asWebviewUri(assetUri);
        return `${attr}="${webviewUri.toString()}"`;
      },
    );

    // Add nonce to all existing script tags
    html = html.replace(/<script /g, `<script nonce="${nonce}" `);

    // Build CSP
    // Note: ES modules need webview.cspSource to allow module imports and resource loading
    const csp = [
      `default-src 'none'`,
      `script-src 'nonce-${nonce}' ${webview.cspSource}`,
      `script-src-elem 'nonce-${nonce}' ${webview.cspSource}`,
      `style-src 'unsafe-inline' ${webview.cspSource} https://fonts.googleapis.com`,
      `style-src-elem 'unsafe-inline' ${webview.cspSource} https://fonts.googleapis.com`,
      `font-src ${webview.cspSource} https://fonts.gstatic.com data:`,
      `img-src ${webview.cspSource} data: https:`,
      `connect-src ${webview.cspSource} ws: wss: http: https:`,
    ].join("; ");

    // Settings to inject into localStorage before the app boots
    const config = vscode.workspace.getConfiguration();
    const settings = {
      gatewayUrl: config.get<string>(SETTINGS.GATEWAY_URL, "ws://127.0.0.1:18789"),
      token: config.get<string>(SETTINGS.TOKEN, ""),
      sessionKey: config.get<string>(SETTINGS.SESSION_KEY, "main"),
      theme: config.get<string>(SETTINGS.THEME, "system"),
    };

    // Inject CSP meta before </head> (using minimal globals to test)
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;

    // Simple window globals injection (no IIFE, no complex logic)
    const simpleGlobals = `<script nonce="${nonce}">
      window.__OPENCLAW_CONTROL_UI_BASE_PATH__ = "";
      window.__OPENCLAW_ASSISTANT_NAME__ = "OpenClaw";
      window.__OPENCLAW_ASSISTANT_AVATAR__ = null;

      localStorage.setItem("openclaw.control.settings.v1", JSON.stringify({
        gatewayUrl: ${JSON.stringify(settings.gatewayUrl)},
        token: ${JSON.stringify(settings.token)},
        sessionKey: ${JSON.stringify(settings.sessionKey || "main")},
        lastActiveSessionKey: ${JSON.stringify(settings.sessionKey || "main")},
        theme: ${JSON.stringify(settings.theme)}
      }));
    </script>`;

    const headClose = html.indexOf("</head>");
    if (headClose !== -1) {
      html =
        html.slice(0, headClose) +
        cspMeta +
        "\n" +
        simpleGlobals +
        "\n" +
        html.slice(headClose);
      console.log("[OpenClaw] Injected CSP and simple globals into HTML");
    } else {
      console.log("[OpenClaw] WARNING: </head> not found in HTML!");
    }

    console.log("[OpenClaw] Final HTML length:", html.length);

    // Debug: Save generated HTML to temp file for inspection
    try {
      const tmpPath = path.join(require("os").tmpdir(), "openclaw-webview-debug.html");
      fs.writeFileSync(tmpPath, html, "utf-8");
      console.log("[OpenClaw] Saved generated HTML to:", tmpPath);
    } catch (err) {
      console.log("[OpenClaw] Failed to save debug HTML:", err);
    }

    return html;
  }

  private setupMessageHandler() {
    if (!this.panel) return;
    this.panel.webview.onDidReceiveMessage(
      (msg: { type: string; connected?: boolean; gatewayUrl?: string; tab?: string }) => {
        switch (msg.type) {
          case MSG.CONNECTION_STATUS:
            if (msg.connected) {
              this.statusBar.setConnected(msg.gatewayUrl);
            } else {
              this.statusBar.setDisconnected();
            }
            break;
          case MSG.CURRENT_TAB:
            if (msg.tab) {
              this.statusBar.setCurrentTab(msg.tab);
            }
            break;
          case MSG.READY:
            this.syncSettingsToWebview();
            break;
        }
      },
      null,
      this.disposables,
    );
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
