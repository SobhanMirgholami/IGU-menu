import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import { registerServiceWorker } from './lib/pwa'
import { stampBuild } from './lib/buildInfo'

stampBuild()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

registerServiceWorker()
