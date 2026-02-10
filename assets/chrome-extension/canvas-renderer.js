// Canvas renderer - handles rendering content in the canvas window

const canvasFrame = document.getElementById('canvas-frame')
const a2uiContainer = document.getElementById('a2ui-container')
const a2uiContent = document.getElementById('a2ui-content')
const canvasUrlDisplay = document.getElementById('canvas-url')

let currentMode = 'iframe' // 'iframe' or 'a2ui'

// Parse URL parameter if present
const urlParams = new URLSearchParams(window.location.search)
const initialUrl = urlParams.get('url')
if (initialUrl && initialUrl !== 'about:blank') {
  navigateToUrl(initialUrl)
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Canvas Renderer] Received message:', message)

  switch (message.type) {
    case 'navigate':
      navigateToUrl(message.url)
      sendResponse({ ok: true })
      break

    case 'a2ui-push':
      renderA2UI(message.jsonl)
      sendResponse({ ok: true })
      break

    case 'a2ui-reset':
      resetA2UI()
      sendResponse({ ok: true })
      break

    default:
      sendResponse({ error: 'Unknown message type' })
  }

  return true // Keep the message channel open for async response
})

function navigateToUrl(url) {
  console.log('[Canvas Renderer] Navigating to:', url)
  currentMode = 'iframe'
  canvasFrame.style.display = 'block'
  a2uiContainer.style.display = 'none'
  canvasFrame.src = url
  updateUrlDisplay(url)
}

function updateUrlDisplay(url) {
  try {
    const urlObj = new URL(url)
    canvasUrlDisplay.textContent = urlObj.hostname + urlObj.pathname
  } catch {
    canvasUrlDisplay.textContent = url.substring(0, 60)
  }
}

function renderA2UI(jsonl) {
  console.log('[Canvas Renderer] Rendering A2UI content')
  currentMode = 'a2ui'
  canvasFrame.style.display = 'none'
  a2uiContainer.style.display = 'block'

  try {
    const lines = jsonl.trim().split('\n')
    const messages = lines.map((line) => JSON.parse(line))

    // Clear existing content
    a2uiContent.innerHTML = ''

    // Render each message
    for (const message of messages) {
      renderA2UIMessage(message)
    }

    updateUrlDisplay('A2UI Content')
  } catch (err) {
    console.error('[Canvas Renderer] Failed to render A2UI:', err)
    a2uiContent.innerHTML = `<div style="color: red; padding: 20px;">Error rendering A2UI: ${err.message}</div>`
  }
}

function renderA2UIMessage(message) {
  // Simple A2UI renderer supporting basic message types
  // For full A2UI support, integrate the official A2UI renderer library

  if (message.type === 'text') {
    const textEl = document.createElement('div')
    textEl.style.marginBottom = '16px'
    textEl.style.fontSize = '15px'
    textEl.style.lineHeight = '1.5'
    textEl.textContent = message.text || message.content || ''
    a2uiContent.appendChild(textEl)
  } else if (message.type === 'image') {
    const imgEl = document.createElement('img')
    imgEl.src = message.url || message.src || ''
    imgEl.style.maxWidth = '100%'
    imgEl.style.height = 'auto'
    imgEl.style.marginBottom = '16px'
    imgEl.style.borderRadius = '8px'
    a2uiContent.appendChild(imgEl)
  } else if (message.type === 'heading') {
    const headingEl = document.createElement('h2')
    headingEl.textContent = message.text || message.content || ''
    headingEl.style.marginTop = '24px'
    headingEl.style.marginBottom = '12px'
    headingEl.style.fontSize = '24px'
    headingEl.style.fontWeight = 'bold'
    a2uiContent.appendChild(headingEl)
  } else if (message.type === 'code') {
    const preEl = document.createElement('pre')
    const codeEl = document.createElement('code')
    codeEl.textContent = message.code || message.content || ''
    codeEl.style.fontSize = '13px'
    codeEl.style.fontFamily = 'monospace'
    preEl.appendChild(codeEl)
    preEl.style.background = '#f5f5f5'
    preEl.style.padding = '12px'
    preEl.style.borderRadius = '6px'
    preEl.style.overflow = 'auto'
    preEl.style.marginBottom = '16px'
    a2uiContent.appendChild(preEl)
  } else {
    // Fallback: render as JSON
    const preEl = document.createElement('pre')
    preEl.textContent = JSON.stringify(message, null, 2)
    preEl.style.background = '#f9f9f9'
    preEl.style.padding = '12px'
    preEl.style.borderRadius = '6px'
    preEl.style.fontSize = '12px'
    preEl.style.marginBottom = '16px'
    a2uiContent.appendChild(preEl)
  }
}

function resetA2UI() {
  console.log('[Canvas Renderer] Resetting A2UI')
  a2uiContent.innerHTML = '<div class="loading">A2UI renderer ready</div>'
  updateUrlDisplay('A2UI Reset')
}

console.log('[Canvas Renderer] Initialized')
