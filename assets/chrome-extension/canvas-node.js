// Canvas Node - connects Chrome extension to OpenClaw Gateway as a canvas-capable node

const DEFAULT_GATEWAY_PORT = 18789
const PROTOCOL_VERSION = 3

/** @type {WebSocket|null} */
let gatewayWs = null
/** @type {Promise<void>|null} */
let gatewayConnectPromise = null
let canvasNodeId = null
let reconnectTimer = null
let isCanvasVisible = false
let currentCanvasUrl = null

// Generate a unique node ID for this browser instance
async function getOrCreateNodeId() {
  if (canvasNodeId) return canvasNodeId

  // Use chrome.storage.local instead of localStorage (service workers don't have localStorage)
  const stored = await chrome.storage.local.get(['openclaw_canvas_node_id'])
  if (stored.openclaw_canvas_node_id) {
    canvasNodeId = stored.openclaw_canvas_node_id
    return canvasNodeId
  }

  canvasNodeId = `chrome-canvas-${crypto.randomUUID()}`
  await chrome.storage.local.set({ openclaw_canvas_node_id: canvasNodeId })
  return canvasNodeId
}

async function getGatewayPort() {
  const stored = await chrome.storage.local.get(['gatewayPort'])
  const raw = stored.gatewayPort
  const n = Number.parseInt(String(raw || ''), 10)
  if (!Number.isFinite(n) || n <= 0 || n > 65535) return DEFAULT_GATEWAY_PORT
  return n
}

async function getGatewayToken() {
  const stored = await chrome.storage.local.get(['gatewayToken'])
  return stored.gatewayToken || null
}

async function isCanvasNodeEnabled() {
  const stored = await chrome.storage.local.get(['canvasNodeEnabled'])
  return stored.canvasNodeEnabled !== false // enabled by default
}

function sendToGateway(frame) {
  const ws = gatewayWs
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('Gateway not connected')
  }
  ws.send(JSON.stringify(frame))
}

async function ensureGatewayConnection() {
  const enabled = await isCanvasNodeEnabled()
  if (!enabled) {
    console.log('[Canvas Node] Disabled in settings')
    return
  }

  if (gatewayWs && gatewayWs.readyState === WebSocket.OPEN) return
  if (gatewayConnectPromise) return await gatewayConnectPromise

  gatewayConnectPromise = (async () => {
    const port = await getGatewayPort()
    const token = await getGatewayToken()
    const wsUrl = `ws://127.0.0.1:${port}`

    console.log(`[Canvas Node] Connecting to Gateway at ${wsUrl}`)

    const ws = new WebSocket(wsUrl)
    gatewayWs = ws

    // Generate unique ID for connect request
    const connectId = crypto.randomUUID()

    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Gateway WebSocket connect timeout')), 10000)

      let connectMessageSent = false

      // Listen for messages to catch hello-ok response
      const messageHandler = (event) => {
        try {
          const frame = JSON.parse(String(event.data || ''))

          // Look for response to our connect request
          if (frame.type === 'res' && frame.id === connectId) {
            clearTimeout(t)
            if (frame.ok) {
              console.log('[Canvas Node] Received hello-ok from Gateway')
              resolve()
            } else {
              const errorMsg = frame.error?.message || 'Connection rejected'
              console.error('[Canvas Node] Connection rejected:', errorMsg)
              reject(new Error(errorMsg))
            }
          }
        } catch (err) {
          // Ignore parse errors during handshake
        }
      }

      ws.addEventListener('message', messageHandler)

      ws.onopen = async () => {
        console.log('[Canvas Node] WebSocket opened, sending connect frame')

        try {
          // Send connect frame
          const nodeId = await getOrCreateNodeId()
          const connectFrame = {
            type: 'req',
            id: connectId,
            method: 'connect',
            params: {
              minProtocol: PROTOCOL_VERSION,
              maxProtocol: PROTOCOL_VERSION,
              client: {
                id: 'openclaw-browser-relay',
                instanceId: nodeId,
                displayName: `Chrome Canvas (${navigator.userAgent.split(/[()]/)[1]?.split(';')[0] || 'Browser'})`,
                version: chrome.runtime.getManifest().version,
                platform: 'chrome-extension',
                deviceFamily: 'browser',
                mode: 'node',
              },
              caps: ['canvas'],
              commands: [
                'canvas.present',
                'canvas.hide',
                'canvas.navigate',
                'canvas.eval',
                'canvas.snapshot',
                'canvas.a2ui.pushJSONL',
                'canvas.a2ui.reset',
              ],
              role: 'node',
              scopes: [],
              ...(token ? { auth: { token } } : {}),
            },
          }
          sendToGateway(connectFrame)
          connectMessageSent = true
        } catch (err) {
          clearTimeout(t)
          reject(err)
        }
      }

      ws.onerror = () => {
        clearTimeout(t)
        reject(new Error('Gateway WebSocket connect failed'))
      }

      ws.onclose = (ev) => {
        if (!connectMessageSent) {
          clearTimeout(t)
          reject(new Error(`Gateway WebSocket closed before connect (${ev.code} ${ev.reason || 'no reason'})`))
        }
      }
    })

    ws.onmessage = (event) => void onGatewayMessage(String(event.data || ''))
    ws.onclose = () => onGatewayClosed('closed')
    ws.onerror = () => onGatewayClosed('error')
  })()

  try {
    await gatewayConnectPromise
    console.log('[Canvas Node] Connected to Gateway successfully')
  } catch (err) {
    console.error('[Canvas Node] Failed to connect:', err)
    scheduleReconnect()
  } finally {
    gatewayConnectPromise = null
  }
}

function onGatewayClosed(reason) {
  console.log(`[Canvas Node] Gateway disconnected (${reason})`)
  gatewayWs = null
  scheduleReconnect()
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    void ensureGatewayConnection()
  }, 5000)
}

async function onGatewayMessage(text) {
  /** @type {any} */
  let frame
  try {
    frame = JSON.parse(text)
  } catch {
    return
  }

  // Handle response to connect
  if (frame.type === 'res' && frame.ok) {
    console.log('[Canvas Node] Received hello-ok from Gateway')
    return
  }

  // Handle invoke requests
  if (frame.type === 'req' && frame.method === 'invoke') {
    try {
      const result = await handleInvokeCommand(frame.params)
      sendToGateway({
        type: 'res',
        id: frame.id,
        ok: true,
        payload: result,
      })
    } catch (err) {
      console.error('[Canvas Node] Invoke error:', err)
      sendToGateway({
        type: 'res',
        id: frame.id,
        ok: false,
        error: {
          code: 'invoke_failed',
          message: err instanceof Error ? err.message : String(err),
        },
      })
    }
    return
  }

  // Handle events
  if (frame.type === 'event') {
    console.log('[Canvas Node] Gateway event:', frame.event)

    // connect.challenge is informational only - no response needed
    // The extension doesn't use device identity, so this event can be ignored

    return
  }
}

async function handleInvokeCommand(params) {
  const command = params?.command || ''
  const cmdParams = params?.params || {}

  console.log(`[Canvas Node] Handling command: ${command}`, cmdParams)

  switch (command) {
    case 'canvas.present':
      return await handleCanvasPresent(cmdParams)

    case 'canvas.hide':
      return await handleCanvasHide(cmdParams)

    case 'canvas.navigate':
      return await handleCanvasNavigate(cmdParams)

    case 'canvas.eval':
      return await handleCanvasEval(cmdParams)

    case 'canvas.snapshot':
      return await handleCanvasSnapshot(cmdParams)

    case 'canvas.a2ui.pushJSONL':
      return await handleCanvasA2UIPush(cmdParams)

    case 'canvas.a2ui.reset':
      return await handleCanvasA2UIReset(cmdParams)

    default:
      throw new Error(`Unknown canvas command: ${command}`)
  }
}

async function handleCanvasPresent(params) {
  const url = params.url || 'about:blank'
  const placement = params.placement || {}

  // Create or focus a dedicated canvas tab
  const tabs = await chrome.tabs.query({ url: 'chrome-extension://*/canvas.html' })

  if (tabs.length > 0) {
    // Update existing canvas tab
    const tab = tabs[0]
    await chrome.tabs.update(tab.id, { active: true, url: `canvas.html?url=${encodeURIComponent(url)}` })
    if (tab.windowId) {
      await chrome.windows.update(tab.windowId, { focused: true })
    }
  } else {
    // Create new canvas tab
    const windowOpts = {
      url: `canvas.html?url=${encodeURIComponent(url)}`,
      type: 'popup',
    }

    if (Number.isFinite(placement.width)) windowOpts.width = Math.round(placement.width)
    if (Number.isFinite(placement.height)) windowOpts.height = Math.round(placement.height)
    if (Number.isFinite(placement.x)) windowOpts.left = Math.round(placement.x)
    if (Number.isFinite(placement.y)) windowOpts.top = Math.round(placement.y)

    await chrome.windows.create(windowOpts)
  }

  isCanvasVisible = true
  currentCanvasUrl = url
  return { ok: true }
}

async function handleCanvasHide(params) {
  const tabs = await chrome.tabs.query({ url: 'chrome-extension://*/canvas.html' })

  for (const tab of tabs) {
    await chrome.tabs.remove(tab.id)
  }

  isCanvasVisible = false
  return { ok: true }
}

async function handleCanvasNavigate(params) {
  const url = params.url
  if (!url) throw new Error('Missing url parameter')

  const tabs = await chrome.tabs.query({ url: 'chrome-extension://*/canvas.html' })

  if (tabs.length === 0) {
    throw new Error('Canvas not visible, call canvas.present first')
  }

  // Send message to canvas tab to navigate
  for (const tab of tabs) {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'navigate',
      url: url,
    })
  }

  currentCanvasUrl = url
  return { ok: true }
}

async function handleCanvasEval(params) {
  const javaScript = params.javaScript
  if (!javaScript) throw new Error('Missing javaScript parameter')

  const tabs = await chrome.tabs.query({ url: 'chrome-extension://*/canvas.html' })

  if (tabs.length === 0) {
    throw new Error('Canvas not visible, call canvas.present first')
  }

  // Execute JavaScript in canvas tab
  const results = await chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    func: (code) => {
      return eval(code)
    },
    args: [javaScript],
  })

  const result = results[0]?.result
  return {
    payload: {
      result: result !== undefined ? String(result) : undefined,
    },
  }
}

async function handleCanvasSnapshot(params) {
  const format = params.format || 'jpeg'
  const maxWidth = params.maxWidth
  const quality = params.quality || 0.92

  const tabs = await chrome.tabs.query({ url: 'chrome-extension://*/canvas.html' })

  if (tabs.length === 0) {
    throw new Error('Canvas not visible, call canvas.present first')
  }

  // Capture the canvas tab
  const dataUrl = await chrome.tabs.captureVisibleTab(tabs[0].windowId, {
    format: format === 'png' ? 'png' : 'jpeg',
    quality: format === 'png' ? undefined : Math.round(quality * 100),
  })

  // Extract base64 data
  const base64 = dataUrl.split(',')[1]

  return {
    payload: {
      format: format === 'png' ? 'png' : 'jpeg',
      base64: base64,
    },
  }
}

async function handleCanvasA2UIPush(params) {
  const jsonl = params.jsonl
  if (!jsonl) throw new Error('Missing jsonl parameter')

  const tabs = await chrome.tabs.query({ url: 'chrome-extension://*/canvas.html' })

  if (tabs.length === 0) {
    throw new Error('Canvas not visible, call canvas.present first')
  }

  // Send A2UI content to canvas tab
  for (const tab of tabs) {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'a2ui-push',
      jsonl: jsonl,
    })
  }

  return { ok: true }
}

async function handleCanvasA2UIReset(params) {
  const tabs = await chrome.tabs.query({ url: 'chrome-extension://*/canvas.html' })

  if (tabs.length === 0) {
    throw new Error('Canvas not visible, call canvas.present first')
  }

  // Send reset to canvas tab
  for (const tab of tabs) {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'a2ui-reset',
    })
  }

  return { ok: true }
}

// Auto-connect on startup
console.log('[Canvas Node] LOADED VERSION: 2026-02-10-v2 with client.id=openclaw-browser-relay')
void ensureGatewayConnection()

// Reconnect on settings change
chrome.storage.onChanged.addListener((changes) => {
  if (changes.gatewayPort || changes.gatewayToken || changes.canvasNodeEnabled) {
    console.log('[Canvas Node] Settings changed, reconnecting...')
    if (gatewayWs) {
      gatewayWs.close()
    }
    void ensureGatewayConnection()
  }
})
