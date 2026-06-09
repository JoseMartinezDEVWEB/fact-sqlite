// preload.js - Script de precarga para IPC seguro
// Expone APIs seguras al proceso renderer usando contextBridge

const { contextBridge, ipcRenderer } = require('electron');

// API segura expuesta al proceso renderer
const electronAPI = {
  // Información de la aplicación
  getVersion: () => ipcRenderer.invoke('app:version'),
  
  // Control de la aplicación
  quit: () => ipcRenderer.invoke('app:quit'),
  reloadApp: () => ipcRenderer.invoke('app:reload'),
  
  // Utilidades
  ping: () => ipcRenderer.invoke('app:ping'),
  
  // Información del entorno
  isElectron: true,
  platform: process.platform,
  
  // ===== APIs DE IMPRESIÓN =====
  // Obtener lista de impresoras disponibles
  getPrinters: () => ipcRenderer.invoke('print:get-printers'),
  
  // Obtener impresora por defecto
  getDefaultPrinter: () => ipcRenderer.invoke('print:get-default-printer'),
  
  // Imprimir contenido HTML
  printContent: (options) => ipcRenderer.invoke('print:print-content', options),
  
  // Imprimir archivo PDF
  printPDF: (options) => ipcRenderer.invoke('print:print-pdf', options),
  // Alias para compatibilidad (algunos módulos usan printToPDF)
  printToPDF: (options) => ipcRenderer.invoke('print:print-pdf', options),

  // Abrir vista previa de PDF en una nueva ventana de Electron
  openPdfPreview: (options) => ipcRenderer.invoke('print:open-pdf-preview', options),
  
  // Obtener configuración de impresión
  getPrintSettings: () => ipcRenderer.invoke('print:get-print-settings'),
  
  // Obtener información detallada de una impresora específica
  getPrinterInfo: (printerName) => ipcRenderer.invoke('print:get-printer-info', printerName),
  
  // ===== FIN APIs DE IMPRESIÓN =====
  
  // ===== APIs DEL SPLASH SCREEN =====
  // Actualizar estado del splash
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', callback);
    return () => ipcRenderer.removeListener('update-status', callback);
  },
  
  // Mostrar error en splash
  onShowError: (callback) => {
    ipcRenderer.on('show-error', callback);
    return () => ipcRenderer.removeListener('show-error', callback);
  },
  
  // Estado de éxito en splash
  onStatusSuccess: (callback) => {
    ipcRenderer.on('status-success', callback);
    return () => ipcRenderer.removeListener('status-success', callback);
  },
  
  // Reintentar inicio de la aplicación
  retryStartup: () => ipcRenderer.invoke('app:retry-startup'),
  
  // Cerrar splash screen desde el proceso de renderizado
  closeSplash: () => ipcRenderer.invoke('splash:close'),
  
  // Verificar si el splash screen está abierto
  isSplashOpen: () => ipcRenderer.invoke('splash:is-open'),
  
  // ===== FIN APIs DEL SPLASH SCREEN =====
  
  // Eventos del sistema (opcional para futuras funcionalidades)
  onAppUpdate: (callback) => {
    ipcRenderer.on('app:update-available', callback);
    return () => ipcRenderer.removeListener('app:update-available', callback);
  },
  
  onAppError: (callback) => {
    ipcRenderer.on('app:error', callback);
    return () => ipcRenderer.removeListener('app:error', callback);
  },

  // ===== DEVTOOLS (solo superadmin) =====
  // Abrir/cerrar DevTools si el rol lo permite
  openDevTools: (userRole) => ipcRenderer.invoke('devtools:open', userRole),
  // El main process envía este evento cuando se presiona F12
  onDevToolsRequest: (callback) => {
    ipcRenderer.on('devtools:request', callback);
    return () => ipcRenderer.removeListener('devtools:request', callback);
  }
};

// Exponer la API de forma segura al contexto del renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Log para confirmar que el preload script se cargó correctamente
console.log('🔒 Preload script cargado - IPC bridge configurado de forma segura');

// Opcional: Exponer información del entorno para debugging
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('electronDebug', {
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome
  });
}
