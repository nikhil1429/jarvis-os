// main.jsx — JARVIS OS Entry Point
// WHY: This is where React mounts. We import global.css here (not in App.jsx)
// because styles need to load before any component renders.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
