import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import UpdateNotification from './components/UpdateNotification.jsx'
import './index.css'
import './config/axiosConfig.js'

// Detectar si estamos en un entorno Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {isElectron && <UpdateNotification />}
  </React.StrictMode>,
)
