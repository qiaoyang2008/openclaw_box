# Chrome Extension Canvas Node

This Chrome extension now includes **Canvas Node** functionality, allowing it to pair with your OpenClaw Gateway and act as a visual display device.

## Features

- **Automatic Gateway Pairing**: Connects to your local OpenClaw Gateway (default port 18789)
- **Canvas Display**: Shows images, web content, and A2UI renders in a dedicated browser window
- **Full Canvas Commands Support**:
  - `canvas.present` - Open/show the canvas with optional URL and window placement
  - `canvas.hide` - Close the canvas window
  - `canvas.navigate` - Navigate to a URL
  - `canvas.eval` - Execute JavaScript in the canvas
  - `canvas.snapshot` - Capture a screenshot of the canvas
  - `canvas.a2ui.pushJSONL` - Render A2UI content
  - `canvas.a2ui.reset` - Reset A2UI state

## Setup

1. **Install the Extension**: Load the unpacked extension in Chrome
2. **Open Options**: Click the extension icon and go to options
3. **Configure Canvas Node**:
   - Enable/disable canvas node functionality
   - Set Gateway port (default: 18789)
   - Add authentication token if required (optional)
4. **Save Settings**: Click "Save Canvas Settings"

## Usage with OpenClaw

Once configured, your Chrome browser will appear as a canvas-capable node in your OpenClaw Gateway. You can use it from:

### CLI

```bash
# List nodes
openclaw nodes list

# Show canvas on the Chrome node
openclaw nodes canvas present --node chrome-canvas-<id>

# Navigate to a URL
openclaw nodes canvas navigate https://example.com --node chrome-canvas-<id>

# Take a snapshot
openclaw nodes canvas snapshot --node chrome-canvas-<id> --format jpg
```

### Agent Tools

The AI agent can use the canvas tool to display content:

```
Agent: I'll display that image on your canvas
[Uses canvas tool with action=present, url=https://example.com/image.png]
```

## Architecture

- **canvas-node.js**: WebSocket client that connects to Gateway and handles canvas commands
- **canvas.html + canvas-renderer.js**: The visual canvas window that displays content
- **background.js**: Loads and initializes the canvas node
- **options.html/js**: Configuration UI

## Browser Relay vs Canvas Node

This extension now serves **dual purposes**:

1. **Browser Relay** (port 18792): Relays CDP commands for browser automation
2. **Canvas Node** (port 18789): Acts as a visual display node for images and content

Both can run simultaneously and serve different purposes in your OpenClaw setup.

## Troubleshooting

- **Canvas not connecting**: Check that OpenClaw Gateway is running on port 18789
- **Authentication errors**: Verify your gateway token in options
- **Canvas not showing**: Check browser console (F12) in the extension service worker
- **Commands failing**: Ensure canvas node is enabled in extension options

## Implementation Notes

The canvas node implements the OpenClaw Gateway bridge protocol:
- Sends `connect` frame with node capabilities
- Responds to `invoke` requests for canvas commands
- Uses Chrome tabs API to create/manage canvas windows
- Supports both iframe-based content and A2UI rendering
