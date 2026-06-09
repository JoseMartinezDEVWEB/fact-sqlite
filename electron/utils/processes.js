// processes.js - Utilidades para gestión de procesos hijo
// Funciones para spawning, monitoreo y terminación limpia de procesos

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Función para crear directorios de logs si no existen
function ensureLogDirectory() {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

// Función para escribir logs a archivo
function writeLog(filename, data) {
  try {
    const logDir = ensureLogDirectory();
    const logPath = path.join(logDir, filename);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${data}\n`;
    fs.appendFileSync(logPath, logEntry);
  } catch (error) {
    console.error('Error escribiendo log:', error);
  }
}

// Función para spawn un proceso con logging
function spawnProcess(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Spawning: ${command} ${args.join(' ')}`);
    
    const defaultOptions = {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options
    };
    
    const child = spawn(command, args, defaultOptions);
    
    if (!child.pid) {
      reject(new Error(`Failed to spawn process: ${command}`));
      return;
    }
    
    console.log(`✅ Process spawned with PID: ${child.pid}`);
    
    // Configurar logging de stdout
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[${command}:${child.pid}] ${output.trim()}`);
        writeLog(`${command}-stdout.log`, output.trim());
      });
    }
    
    // Configurar logging de stderr
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        const output = data.toString();
        console.error(`[${command}:${child.pid}] ERROR: ${output.trim()}`);
        writeLog(`${command}-stderr.log`, output.trim());
      });
    }
    
    // Manejar errores del proceso
    child.on('error', (error) => {
      console.error(`❌ Process error [${command}:${child.pid}]:`, error);
      writeLog(`${command}-error.log`, `Process error: ${error.message}`);
      reject(error);
    });
    
    // Manejar salida del proceso
    child.on('exit', (code, signal) => {
      const exitInfo = signal ? `signal ${signal}` : `code ${code}`;
      console.log(`🔄 Process exited [${command}:${child.pid}] with ${exitInfo}`);
      writeLog(`${command}-exit.log`, `Process exited with ${exitInfo}`);
    });
    
    resolve(child);
  });
}

// Función para esperar a que una URL esté disponible
function waitForUrl(url, timeout = 30000, interval = 1000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    console.log(`⏳ Esperando a que ${url} esté disponible...`);
    
    const checkUrl = () => {
      const urlObj = new URL(url);
      const options = {
        hostname: '127.0.0.1', // Usar IP directa en lugar de localhost
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'HEAD',
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          console.log(`✅ URL ${url} está disponible`);
          resolve(true);
        } else {
          console.log(`⚠️ URL ${url} respondió con código ${res.statusCode}`);
          scheduleNextCheck();
        }
      });
      
      req.on('error', (error) => {
        console.log(`🔄 URL ${url} no disponible aún: ${error.message}`);
        scheduleNextCheck();
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        console.log(`⏰ Timeout esperando ${url}`);
        scheduleNextCheck();
      });
      
      req.end(); // Asegurar que la petición se envíe
    };
    
    const scheduleNextCheck = () => {
      if (Date.now() - startTime >= timeout) {
        reject(new Error(`Timeout esperando a que ${url} esté disponible después de ${timeout}ms`));
        return;
      }
      
      setTimeout(checkUrl, interval);
    };
    
    // Iniciar la primera verificación después de un pequeño delay
    setTimeout(checkUrl, 1000);
  });
}

// Función para terminar un proceso y todos sus hijos (tree kill)
async function killTree(pid) {
  if (!pid) {
    console.log('⚠️ No se proporcionó PID para killTree');
    return;
  }
  
  console.log(`🔄 Terminando árbol de procesos para PID: ${pid}`);
  
  try {
    // En Windows, usar taskkill para terminar el árbol de procesos
    if (process.platform === 'win32') {
      const killProcess = spawn('taskkill', ['/pid', pid.toString(), '/t', '/f'], {
        stdio: 'ignore'
      });
      
      return new Promise((resolve) => {
        killProcess.on('exit', (code) => {
          if (code === 0) {
            console.log(`✅ Árbol de procesos ${pid} terminado correctamente`);
          } else {
            console.log(`⚠️ Árbol de procesos ${pid} terminado con código ${code}`);
          }
          resolve();
        });
        
        killProcess.on('error', (error) => {
          console.error(`❌ Error terminando árbol de procesos ${pid}:`, error);
          resolve();
        });
        
        // Timeout de seguridad
        setTimeout(() => {
          killProcess.kill();
          resolve();
        }, 5000);
      });
    } else {
      // En sistemas Unix, usar kill con señal TERM primero, luego KILL
      try {
        process.kill(-pid, 'SIGTERM');
        
        // Esperar un poco y luego usar SIGKILL si es necesario
        setTimeout(() => {
          try {
            process.kill(-pid, 'SIGKILL');
          } catch (e) {
            // El proceso probablemente ya terminó
          }
        }, 2000);
        
        console.log(`✅ Señales de terminación enviadas a PID: ${pid}`);
      } catch (error) {
        console.log(`⚠️ Error enviando señal a PID ${pid}:`, error.message);
      }
    }
  } catch (error) {
    console.error(`❌ Error en killTree para PID ${pid}:`, error);
  }
}

// Función para obtener rutas dentro del bundle asar o unpacked
function getResourcePath(relativePath) {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, '..', '..', relativePath);
  } else {
    // En producción, verificar si estamos en asar o unpacked
    const resourcesPath = process.resourcesPath || path.join(process.cwd(), 'resources');
    return path.join(resourcesPath, relativePath);
  }
}

// Función para verificar si un puerto está en uso
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(false); // Puerto disponible
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(true); // Puerto en uso
    });
  });
}

// Función para encontrar un puerto disponible
async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const inUse = await isPortInUse(port);
    
    if (!inUse) {
      console.log(`✅ Puerto disponible encontrado: ${port}`);
      return port;
    }
  }
  
  throw new Error(`No se encontró puerto disponible después de ${maxAttempts} intentos desde ${startPort}`);
}

module.exports = {
  spawnProcess,
  waitForUrl,
  killTree,
  getResourcePath,
  isPortInUse,
  findAvailablePort,
  writeLog,
  ensureLogDirectory
};
