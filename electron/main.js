// main.js - Proceso principal de Electron (versión SQLite - sin MongoDB)
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const portfinder = require('portfinder');
const { spawnProcess, waitForUrl, killTree } = require('./utils/processes');

// Variables globales
let mainWindow;
let splashWindow;
let backendProcess;
let isQuitting = false;
let apiPort;

// Configuración de rutas
const isDev = process.env.NODE_ENV === 'development';
const BACKEND_PATH = isDev
  ? path.join(__dirname, '..', 'backend')
  : path.join(process.resourcesPath, 'app-backend');

// Ruta de datos para SQLite (userData es la carpeta persistente de Electron)
const userDataPath = app.getPath('userData');

// Prevenir múltiples instancias
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Ya existe una instancia de la aplicación ejecutándose');
  app.quit();
}

// ===== APIs DE IMPRESIÓN NATIVAS =====
ipcMain.handle('print:get-printers', async () => {
  try {
    if (mainWindow && mainWindow.webContents) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      return { success: true, data: printers.map(p => ({ name: p.name, displayName: p.displayName || p.name, isDefault: p.isDefault || false, status: p.status || 0, options: p.options || {} })) };
    }
    throw new Error('Ventana principal no disponible');
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('print:get-default-printer', async () => {
  try {
    if (mainWindow && mainWindow.webContents) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      const def = printers.find(p => p.isDefault) || printers[0];
      return { success: true, data: def ? def.name : null };
    }
    throw new Error('Ventana principal no disponible');
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('print:print-content', async (event, options) => {
  try {
    const { content, printerName, silent = false, copies = 1, pageSize = 'A4', landscape = false } = options;
    const printWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
    try {
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);
      await new Promise(r => setTimeout(r, 1000));
      const result = await new Promise(resolve => {
        printWindow.webContents.print({ silent, printBackground: false, deviceName: printerName || '', copies: copies || 1, margins: { marginType: 'minimum' }, pageSize }, (success, reason) => {
          setTimeout(() => { if (!printWindow.isDestroyed()) printWindow.close(); }, 500);
          resolve(success ? { success: true } : { success: false, error: reason });
        });
      });
      return result;
    } catch (e) {
      if (!printWindow.isDestroyed()) printWindow.close();
      throw e;
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('print:print-pdf', async (event, options) => {
  try {
    const { content, filePath, pageSize = 'A4', landscape = false } = options;
    const pdfWindow = new BrowserWindow({ show: false, backgroundColor: '#ffffff', webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: false } });
    try {
      if (content) await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);
      else if (filePath) await pdfWindow.loadFile(filePath);
      else throw new Error('Se requiere contenido o ruta de archivo');
      await new Promise(r => setTimeout(r, 300));
      const pdfBuffer = await pdfWindow.webContents.printToPDF({ pageSize, landscape, printBackground: true, preferCSSPageSize: true });
      return { success: true, data: { pdf: pdfBuffer.toString('base64'), size: pdfBuffer.length } };
    } finally {
      if (!pdfWindow.isDestroyed()) pdfWindow.close();
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('print:open-pdf-preview', async (event, options) => {
  try {
    const { content, filePath, title = 'Vista Previa', pageSize = 'A4', landscape = false } = options || {};
    const genWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: false } });
    let pdfBuffer;
    try {
      if (content) await genWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);
      else if (filePath) await genWindow.loadFile(filePath);
      await new Promise(r => setTimeout(r, 150));
      pdfBuffer = await genWindow.webContents.printToPDF({ pageSize, landscape, printBackground: true });
    } finally {
      if (!genWindow.isDestroyed()) genWindow.close();
    }
    const base64 = pdfBuffer.toString('base64');
    const win = new BrowserWindow({ width: 900, height: 700, title, autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true } });
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html><html><head><title>${title}</title><style>body{margin:0;height:100vh;display:flex;flex-direction:column}.bar{padding:8px;background:#f5f5f5;border-bottom:1px solid #ddd}embed{flex:1}</style></head><body><div class="bar"><button onclick="window.print()">Imprimir</button> <button onclick="window.close()">Cerrar</button></div><embed type="application/pdf" src="data:application/pdf;base64,${base64}" width="100%" height="100%"/></body></html>`)}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('print:get-print-settings', async () => {
  try {
    if (mainWindow && mainWindow.webContents) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      const def = printers.find(p => p.isDefault);
      return { success: true, data: { printers, defaultPrinter: def?.name || (printers[0]?.name || null), availablePageSizes: ['A4','A5','Letter','Legal'], platform: process.platform } };
    }
    throw new Error('Ventana no disponible');
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== CONTROL DE VENTANAS =====
ipcMain.handle('app:retry-startup', async () => {
  try {
    if (backendProcess && backendProcess.pid) { await killTree(backendProcess.pid); backendProcess = null; }
    await startApplication();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('splash:close', () => { closeSplashWindow(); return { success: true }; });
ipcMain.handle('splash:is-open', () => splashWindow && !splashWindow.isDestroyed());
ipcMain.handle('app:quit', () => { app.quit(); return { success: true }; });
ipcMain.handle('app:reload', () => {
  if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.reload(); return { success: true }; }
  return { success: false, error: 'Ventana no disponible' };
});

// DevTools solo para superadmin — el renderer envía el rol
ipcMain.handle('devtools:open', (event, userRole) => {
  if (userRole !== 'superadmin') return { success: false, reason: 'forbidden' };
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
    return { success: true };
  }
  return { success: false, reason: 'no-window' };
});

// ===== INICIO DEL BACKEND =====
async function startBackend() {
  try {
    portfinder.basePort = 4000;
    apiPort = await portfinder.getPortPromise();
    console.log(`✅ Puerto ${apiPort} seleccionado para el backend.`);

    const backendScript = path.join(BACKEND_PATH, 'src', 'server.js');
    const nodeExecutable = isDev ? 'node' : process.execPath;

    const env = {
      ...process.env,
      PORT: apiPort,
      NODE_ENV: isDev ? 'development' : 'production',
      // Pasar la ruta de datos del usuario para que SQLite guarde en el lugar correcto
      SQLITE_DB_FULL_PATH: path.join(userDataPath, 'factura.db'),
      ...(isDev ? {} : { ELECTRON_RUN_AS_NODE: '1' })
    };

    backendProcess = spawn(nodeExecutable, [backendScript], {
      cwd: BACKEND_PATH,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    backendProcess.stdout.on('data', (data) => console.log(`[Backend]: ${data}`));
    backendProcess.stderr.on('data', (data) => console.error(`[Backend ERR]: ${data}`));
    backendProcess.on('error', (error) => { console.error('❌ Error backend process:', error); throw error; });
    backendProcess.on('exit', (code) => console.log(`Backend salió con código: ${code}`));

    if (!backendProcess.pid) throw new Error('No se pudo iniciar el proceso backend');

    console.log(`✅ Backend iniciado con PID: ${backendProcess.pid}`);
    await waitForUrl(`http://localhost:${apiPort}/api/health`, 30000);
    console.log('✅ Servidor API listo');
    return true;
  } catch (error) {
    let msg = error.message;
    if (msg.includes('spawn')) msg = 'No se pudo ejecutar el servidor backend. Verifique que Node.js esté instalado.';
    else if (msg.includes('timeout') || msg.includes('waitForUrl')) msg = 'El servidor backend no responde. Verifique la configuración.';
    throw new Error(msg);
  }
}

// ===== VENTANA PRINCIPAL =====
function closeSplashWindow() {
  try {
    if (splashWindow && !splashWindow.isDestroyed()) { splashWindow.close(); splashWindow = null; }
  } catch (e) { console.error('Error cerrando splash:', e); }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1200, minHeight: 700,
    show: false, autoHideMenuBar: true, maximized: true,
    icon: path.join(__dirname, 'assets', 'icons', 'ICONOnew1.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true }
  });

  try {
    await mainWindow.loadURL(`http://localhost:${apiPort}`);
  } catch {
    const indexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    closeSplashWindow();
    mainWindow.setMenu(null);
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', closeSplashWindow);
  mainWindow.on('focus', closeSplashWindow);

  setTimeout(() => { if (mainWindow && !mainWindow.isVisible()) { closeSplashWindow(); mainWindow.show(); } }, 3000);
  setTimeout(closeSplashWindow, 5000);

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Bloquear todas las recargas de página (F5, Ctrl+R, Ctrl+F5, Ctrl+Shift+R)
    // En Electron con React Router, recargar una ruta SPA causa MIME error
    const isAnyRefresh =
      input.key === 'F5' ||
      (input.key.toLowerCase() === 'r' && (input.control || input.meta));
    if (isAnyRefresh) {
      event.preventDefault();
      // Hard refresh (Ctrl+Shift+R) — bloquear completamente en producción
      if (input.shift) return;
      // Obtener la ruta actual y pasarla como query param para restaurarla
      try {
        const currentUrl = mainWindow.webContents.getURL();
        const urlObj = new URL(currentUrl);
        const path = urlObj.pathname + urlObj.search + urlObj.hash;
        const redirectParam = path !== '/' && path !== '' ? `?redirect=${encodeURIComponent(path)}` : '';
        mainWindow.loadURL(`http://localhost:${apiPort}${redirectParam}`).catch(() => {});
      } catch {
        mainWindow.loadURL(`http://localhost:${apiPort}`).catch(() => {});
      }
      return;
    }
    // F12 → solicitar al renderer que verifique el rol antes de abrir DevTools
    if (input.key === 'F12') {
      event.preventDefault();
      mainWindow.webContents.send('devtools:request');
    }
  });
}

function createSplashWindow() {
  try {
    if (splashWindow && !splashWindow.isDestroyed()) return;
    splashWindow = new BrowserWindow({
      width: 600, height: 400, resizable: false, frame: false, alwaysOnTop: false,
      show: true, center: true, backgroundColor: '#121212',
      icon: path.join(__dirname, 'assets', 'icons', 'ICONOnew1.ico'),
      webPreferences: { contextIsolation: true, sandbox: true }
    });
    splashWindow.setMenu(null);
    splashWindow.loadFile(path.join(__dirname, 'splash.html')).catch(e => console.error('Error cargando splash:', e));
  } catch (e) {
    console.error('No se pudo crear splash:', e);
  }
}

// ===== FUNCIÓN PRINCIPAL =====
async function startApplication() {
  try {
    console.log('🚀 Iniciando Factura SQLite...');
    createSplashWindow();

    const updateStatus = (msg) => {
      try { if (splashWindow && !splashWindow.isDestroyed()) splashWindow.webContents.send('update-status', msg); } catch {}
    };

    // Con SQLite no hay que esperar MongoDB - arranque instantáneo
    updateStatus('Iniciando servidor backend con SQLite...');
    await startBackend();

    updateStatus('Backend listo. Cargando interfaz...');
    await new Promise(r => setTimeout(r, 500));

    await createWindow();
    updateStatus('Aplicación lista. Abriendo...');
    console.log('✅ Factura SQLite iniciado correctamente');

  } catch (error) {
    console.error('❌ Error fatal iniciando aplicación:', error);
    let errorMsg = 'Error al iniciar la aplicación';
    let errorDetails = error.message || 'Sin detalles';

    if (error.message.includes('backend') || error.message.includes('servidor')) {
      errorMsg = 'Error al iniciar el servidor backend';
    } else if (error.message.includes('puerto') || error.message.includes('port')) {
      errorMsg = 'Error de configuración de puerto';
    }

    try {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('show-error', errorMsg, errorDetails);
        return;
      }
    } catch {}

    setTimeout(() => { closeSplashWindow(); app.quit(); }, 10000);
  }
}

// ===== LIMPIEZA =====
async function cleanup() {
  if (isQuitting) return;
  isQuitting = true;
  console.log('🧹 Limpiando procesos...');
  if (backendProcess && backendProcess.pid) {
    try { await killTree(backendProcess.pid); } catch {}
  }
  console.log('✅ Procesos cerrados');
}

// ===== EVENTOS DE ELECTRON =====
app.whenReady().then(startApplication);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanup().then(() => {
      try { if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close(); } catch {}
      app.quit();
    });
  }
});

app.on('before-quit', async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    await cleanup();
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  console.error('Excepción no capturada:', error);
  cleanup().then(() => process.exit(1));
});

console.log('🎯 Factura SQLite - Proceso principal iniciado');
