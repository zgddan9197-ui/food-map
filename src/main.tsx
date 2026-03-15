import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { setupAmapSecurityConfig } from './lib/amap'
import './styles/theme.css'
import './styles/app.css'
import './styles/components.css'

setupAmapSecurityConfig()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
