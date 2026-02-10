# OpenClaw Chrome Extension (Browser Relay + Canvas Node)

This extension serves dual purposes:

1. **Browser Relay**: Attach OpenClaw to an existing Chrome tab so the Gateway can automate it (via the local CDP relay server on port 18792)
2. **Canvas Node**: Pair Chrome with your OpenClaw Gateway as a canvas-capable display node (port 18789)

## Dev / load unpacked

1. Build/run OpenClaw Gateway with browser control enabled.
2. Ensure the relay server is reachable at `http://127.0.0.1:18792/` (default).
3. Install the extension to a stable path:

   ```bash
   openclaw browser extension install
   openclaw browser extension path
   ```

4. Chrome → `chrome://extensions` → enable “Developer mode”.
5. “Load unpacked” → select the path printed above.
6. Pin the extension. Click the icon on a tab to attach/detach.

## Quick Start (Development Mode)

For local development, enable auto-approval of node connections:

```bash
./enable-dev-mode.sh
```

This configures the Gateway to accept canvas node connections from localhost without requiring authentication. **⚠️ Development only!**

After enabling dev mode, restart the Gateway and load the extension.

## Options

- **Relay port**: defaults to `18792` (for browser automation)
- **Canvas Node**:
  - Enable/disable canvas node functionality
  - Gateway port: defaults to `18789`
  - Gateway token: optional authentication token (not required in dev mode)

## Canvas Node Features

The extension now acts as a canvas-capable node that can:
- Display images and web content
- Render A2UI content
- Execute JavaScript
- Capture screenshots
- Navigate to URLs

See [README-CANVAS.md](./README-CANVAS.md) for detailed canvas node documentation.

## Usage

### Browser Relay (CDP Automation)
Click the extension icon on any tab to attach/detach the debugger for browser automation.

### Canvas Node (Visual Display)
Configure in extension options, then use from OpenClaw:
```bash
# List nodes to find your Chrome canvas node
openclaw nodes list

# Display content on canvas
openclaw nodes canvas present --node chrome-canvas-<id> --target https://example.com

# Take a snapshot
openclaw nodes canvas snapshot --node chrome-canvas-<id>
```
