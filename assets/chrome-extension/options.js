const DEFAULT_PORT = 18792
const DEFAULT_GATEWAY_PORT = 18789

function clampPort(value) {
  const n = Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(n)) return DEFAULT_PORT
  if (n <= 0 || n > 65535) return DEFAULT_PORT
  return n
}

function updateRelayUrl(port) {
  const el = document.getElementById('relay-url')
  if (!el) return
  el.textContent = `http://127.0.0.1:${port}/`
}

function setStatus(kind, message) {
  const status = document.getElementById('status')
  if (!status) return
  status.dataset.kind = kind || ''
  status.textContent = message || ''
}

async function checkRelayReachable(port) {
  const url = `http://127.0.0.1:${port}/`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 900)
  try {
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    setStatus('ok', `Relay reachable at ${url}`)
  } catch {
    setStatus(
      'error',
      `Relay not reachable at ${url}. Start OpenClaw’s browser relay on this machine, then click the toolbar button again.`,
    )
  } finally {
    clearTimeout(t)
  }
}

async function load() {
  const stored = await chrome.storage.local.get(['relayPort'])
  const port = clampPort(stored.relayPort)
  document.getElementById('port').value = String(port)
  updateRelayUrl(port)
  await checkRelayReachable(port)
}

async function save() {
  const input = document.getElementById('port')
  const port = clampPort(input.value)
  await chrome.storage.local.set({ relayPort: port })
  input.value = String(port)
  updateRelayUrl(port)
  await checkRelayReachable(port)
}

// Canvas node configuration
function clampGatewayPort(value) {
  const n = Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(n)) return DEFAULT_GATEWAY_PORT
  if (n <= 0 || n > 65535) return DEFAULT_GATEWAY_PORT
  return n
}

function setCanvasStatus(kind, message) {
  const status = document.getElementById('canvas-status')
  if (!status) return
  status.dataset.kind = kind || ''
  status.textContent = message || ''
}

async function loadCanvas() {
  const stored = await chrome.storage.local.get([
    'gatewayPort',
    'gatewayToken',
    'canvasNodeEnabled',
  ])
  const gatewayPort = clampGatewayPort(stored.gatewayPort)
  const gatewayToken = stored.gatewayToken || ''
  const canvasEnabled = stored.canvasNodeEnabled !== false

  document.getElementById('gateway-port').value = String(gatewayPort)
  document.getElementById('gateway-token').value = gatewayToken
  document.getElementById('canvas-enabled').checked = canvasEnabled
}

async function saveCanvas() {
  const gatewayPortInput = document.getElementById('gateway-port')
  const gatewayTokenInput = document.getElementById('gateway-token')
  const canvasEnabledInput = document.getElementById('canvas-enabled')

  const gatewayPort = clampGatewayPort(gatewayPortInput.value)
  const gatewayToken = gatewayTokenInput.value.trim()
  const canvasEnabled = canvasEnabledInput.checked

  await chrome.storage.local.set({
    gatewayPort,
    gatewayToken: gatewayToken || null,
    canvasNodeEnabled: canvasEnabled,
  })

  gatewayPortInput.value = String(gatewayPort)
  setCanvasStatus('ok', 'Canvas settings saved. Reconnecting to Gateway...')

  // Trigger reconnection by sending message to background
  setTimeout(() => {
    setCanvasStatus('', '')
  }, 2000)
}

document.getElementById('save').addEventListener('click', () => void save())
document.getElementById('save-canvas').addEventListener('click', () => void saveCanvas())

void load()
void loadCanvas()
