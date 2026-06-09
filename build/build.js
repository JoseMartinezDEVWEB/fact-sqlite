#!/usr/bin/env node

/**
 * Script de build mejorado para App Total
 * Automatiza el proceso de construcción y distribución
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Función para loggear con colores
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para ejecutar comandos
function runCommand(command, options = {}) {
  const { cwd, silent = false } = options;
  
  if (!silent) {
    log(`🚀 Ejecutando: ${command}`, 'blue');
  }
  
  try {
    const result = execSync(command, {
      cwd: cwd || process.cwd(),
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8'
    });
    
    if (!silent) {
      log(`✅ Comando ejecutado exitosamente`, 'green');
    }
    
    return result;
  } catch (error) {
    log(`❌ Error ejecutando comando: ${error.message}`, 'red');
    throw error;
  }
}

// Función para verificar dependencias
function checkDependencies() {
  log('🔍 Verificando dependencias...', 'cyan');
  
  const requiredDeps = ['electron', 'electron-builder'];
  const missingDeps = [];
  
  for (const dep of requiredDeps) {
    try {
      require.resolve(dep);
    } catch (e) {
      missingDeps.push(dep);
    }
  }
  
  if (missingDeps.length > 0) {
    log(`⚠️ Dependencias faltantes: ${missingDeps.join(', ')}`, 'yellow');
    log('📦 Instalando dependencias...', 'blue');
    runCommand('npm install', { silent: true });
  } else {
    log('✅ Todas las dependencias están instaladas', 'green');
  }
}

// Función para limpiar directorios
function cleanDirectories() {
  log('🧹 Limpiando directorios de build...', 'cyan');
  
  const dirsToClean = [
    'release',
    'frontend/dist',
    'build/temp',
    'logs'
  ];
  
  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      rimraf.sync(dir);
      log(`🗑️ Limpiado: ${dir}`, 'green');
    }
  }
}

// Función para construir frontend
function buildFrontend() {
  log('🏗️ Construyendo frontend...', 'cyan');
  
  try {
    // Instalar dependencias del frontend
    log('📦 Instalando dependencias del frontend...', 'blue');
    runCommand('npm install', { cwd: 'frontend', silent: true });
    
    // Construir frontend
    log('🔨 Construyendo aplicación React...', 'blue');
    runCommand('npm run build', { cwd: 'frontend' });
    
    log('✅ Frontend construido exitosamente', 'green');
  } catch (error) {
    log('❌ Error construyendo frontend', 'red');
    throw error;
  }
}

// Función para construir backend
function buildBackend() {
  log('🏗️ Preparando backend...', 'cyan');
  
  try {
    // Instalar dependencias del backend
    log('📦 Instalando dependencias del backend...', 'blue');
    runCommand('npm install', { cwd: 'backend', silent: true });
    
    // Verificar que el servidor se puede ejecutar
    log('🔍 Verificando servidor backend...', 'blue');
    const serverPath = path.join('backend', 'src', 'server.js');
    
    if (!fs.existsSync(serverPath)) {
      throw new Error('Archivo server.js no encontrado en backend/src/');
    }
    
    log('✅ Backend preparado exitosamente', 'green');
  } catch (error) {
    log('❌ Error preparando backend', 'red');
    throw error;
  }
}

// Función para construir aplicación Electron
function buildElectron() {
  log('🏗️ Construyendo aplicación Electron...', 'cyan');
  
  try {
    // Usar electron-builder para construir
    log('🔨 Ejecutando electron-builder...', 'blue');
    runCommand('npx electron-builder --win --x64 --config electron-builder.json');
    
    log('✅ Aplicación Electron construida exitosamente', 'green');
  } catch (error) {
    log('❌ Error construyendo aplicación Electron', 'red');
    throw error;
  }
}

// Función para crear instalador NSIS personalizado
function createCustomInstaller() {
  log('🔧 Creando instalador NSIS personalizado...', 'cyan');
  
  try {
    // Verificar que NSIS esté disponible
    try {
      runCommand('makensis /VERSION', { silent: true });
    } catch (e) {
      log('⚠️ NSIS no está disponible en PATH', 'yellow');
      log('📥 Descargando NSIS portable...', 'blue');
      
      // Aquí podrías descargar NSIS portable si es necesario
      log('ℹ️ Por favor, instale NSIS desde https://nsis.sourceforge.io/Download', 'yellow');
      return;
    }
    
    // Crear instalador personalizado
    log('🔨 Compilando script NSIS...', 'blue');
    runCommand('makensis build/installer.nsi');
    
    log('✅ Instalador NSIS creado exitosamente', 'green');
  } catch (error) {
    log('❌ Error creando instalador NSIS', 'red');
    log('ℹ️ Continuando con instalador por defecto...', 'yellow');
  }
}

// Función para verificar archivos generados
function verifyBuild() {
  log('🔍 Verificando archivos generados...', 'cyan');
  
  const requiredFiles = [
    'release/win-unpacked/App Total.exe',
    'release/App Total-Setup-1.0.0.exe'
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} - NO ENCONTRADO`, 'red');
      allFilesExist = false;
    }
  }
  
  if (allFilesExist) {
    log('🎉 ¡Build completado exitosamente!', 'green');
    log('📁 Los archivos están en el directorio: release/', 'cyan');
  } else {
    log('⚠️ Algunos archivos no se generaron correctamente', 'yellow');
  }
  
  return allFilesExist;
}

// Función para mostrar información del build
function showBuildInfo() {
  log('\n📊 Información del Build:', 'cyan');
  log('========================', 'cyan');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  log(`📦 Versión: ${packageJson.version}`, 'white');
  log(`🏷️ Nombre: ${packageJson.productName}`, 'white');
  log(`🆔 App ID: ${packageJson.appId}`, 'white');
  
  // Calcular tamaño del build
  if (fs.existsSync('release')) {
    const size = getDirectorySize('release');
    log(`📏 Tamaño total: ${formatBytes(size)}`, 'white');
  }
  
  log('\n🚀 Para distribuir:', 'green');
  log('1. Ejecutar: npm run electron:build', 'white');
  log('2. Los archivos estarán en: release/', 'white');
  log('3. El instalador será: App Total-Setup-1.0.0.exe', 'white');
}

// Función para obtener tamaño de directorio
function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  }
  
  return totalSize;
}

// Función para formatear bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función principal
async function main() {
  try {
    log('🚀 Iniciando proceso de build para App Total', 'bright');
    log('============================================', 'bright');
    
    // Verificar dependencias
    checkDependencies();
    
    // Limpiar directorios
    cleanDirectories();
    
    // Construir frontend
    buildFrontend();
    
    // Preparar backend
    buildBackend();
    
    // Construir aplicación Electron
    buildElectron();
    
    // Crear instalador personalizado (opcional)
    createCustomInstaller();
    
    // Verificar build
    const success = verifyBuild();
    
    // Mostrar información
    showBuildInfo();
    
    if (success) {
      log('\n🎉 ¡Build completado exitosamente!', 'green');
      process.exit(0);
    } else {
      log('\n⚠️ Build completado con advertencias', 'yellow');
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n❌ Error fatal durante el build: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = {
  main,
  buildFrontend,
  buildBackend,
  buildElectron,
  createCustomInstaller,
  verifyBuild
};

