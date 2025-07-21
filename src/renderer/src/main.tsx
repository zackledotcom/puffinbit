import './globals.css'
import './styles/magic-ui.css'
import './styles/chat-enhancements.css'

// Assistant UI styles - DISABLED for PremiumChatInterface
// import '@assistant-ui/styles/index.css'
// import '@assistant-ui/styles/modal.css'
// import '@assistant-ui/styles/markdown.css'

import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

console.log('🚀 Renderer starting...')

try {
  const container = document.getElementById('app')
  if (!container) {
    throw new Error('App container not found!')
  }
  console.log('📦 Container found:', container)

  const root = createRoot(container)
  console.log('🌳 Root created, rendering App...')

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

  console.log('✅ App rendered!')
} catch (error) {
  console.error('❌ Failed to render app:', error)
  // Display error on screen
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: monospace; color: red;">
      <h1>Failed to start Puffer</h1>
      <pre>${error}</pre>
    </div>
  `
}
