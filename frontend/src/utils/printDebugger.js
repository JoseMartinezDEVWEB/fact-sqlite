/**
 * Utilidad de Debugging para el Sistema de Impresión
 * Ayuda a identificar problemas específicos en la impresión
 */

class PrintDebugger {
  constructor() {
    this.debugLog = [];
    this.maxLogEntries = 100;
  }

  /**
   * Agregar entrada al log de debugging
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      message,
      data,
      stack: new Error().stack
    };

    this.debugLog.push(entry);
    
    // Mantener solo las últimas entradas
    if (this.debugLog.length > this.maxLogEntries) {
      this.debugLog.shift();
    }

    // También loggear en consola
    const consoleMethod = level === 'ERROR' ? 'error' : 
                         level === 'WARN' ? 'warn' : 
                         level === 'INFO' ? 'info' : 'log';
    
    console[consoleMethod](`[${level}] ${message}`, data || '');
  }

  /**
   * Verificar estado del sistema de impresión
   */
  async checkSystemStatus() {
    this.log('INFO', '🔍 Verificando estado del sistema de impresión...');
    
    const status = {
      timestamp: new Date().toISOString(),
      environment: this.checkEnvironment(),
      electronAPI: this.checkElectronAPI(),
      localStorage: this.checkLocalStorage(),
      businessInfo: this.checkBusinessInfo(),
      printConfig: this.checkPrintConfig(),
      recommendations: []
    };

    // Generar recomendaciones
    if (!status.electronAPI.available) {
      status.recommendations.push('La API de Electron no está disponible. Verifica que estés ejecutando en Electron.');
    }
    
    if (!status.businessInfo.available) {
      status.recommendations.push('La información del negocio no está disponible. Verifica la configuración del negocio.');
    }
    
    if (!status.printConfig.available) {
      status.recommendations.push('La configuración de impresión no está disponible. Verifica la configuración de impresión.');
    }

    this.log('INFO', '✅ Verificación del sistema completada', status);
    return status;
  }

  /**
   * Verificar entorno de ejecución
   */
  checkEnvironment() {
    try {
      // Mejorar la detección de Electron
      const userAgent = navigator.userAgent;
      const isElectronFromUA = userAgent.includes('Electron');
      const hasElectronAPI = typeof window !== 'undefined' && window.electronAPI;
      
      return {
        userAgent: userAgent,
        platform: navigator.platform,
        isElectron: isElectronFromUA || hasElectronAPI,
        isBrowser: !isElectronFromUA && !hasElectronAPI,
        isNode: typeof process !== 'undefined' && process.versions && process.versions.node,
        documentReady: document.readyState,
        windowLoaded: typeof window !== 'undefined',
        electronDetected: {
          fromUserAgent: isElectronFromUA,
          fromAPI: hasElectronAPI,
          apiMethods: hasElectronAPI ? Object.keys(window.electronAPI) : []
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Verificar API de Electron
   */
  checkElectronAPI() {
    try {
      if (typeof window === 'undefined') {
        return { available: false, reason: 'Window no disponible' };
      }

      // Verificar si estamos en Electron por User Agent
      const userAgent = navigator.userAgent;
      const isElectronFromUA = userAgent.includes('Electron');
      
      const api = window.electronAPI;
      if (!api) {
        if (isElectronFromUA) {
          return { 
            available: false, 
            reason: 'electronAPI no definido pero User Agent indica Electron',
            userAgent: userAgent,
            recommendation: 'Verificar configuración del preload script'
          };
        }
        return { available: false, reason: 'electronAPI no definido' };
      }

      const methods = [
        'printContent',
        'getPrinters',
        'getDefaultPrinter',
        'printPDF',
        'openPdfPreview'
      ];

      const availableMethods = methods.filter(method => typeof api[method] === 'function');
      const missingMethods = methods.filter(method => typeof api[method] !== 'function');

      return {
        available: true,
        availableMethods,
        missingMethods,
        totalMethods: methods.length,
        coverage: `${availableMethods.length}/${methods.length}`,
        userAgent: userAgent,
        isElectronFromUA: isElectronFromUA
      };
    } catch (error) {
      return { available: false, reason: error.message };
    }
  }

  /**
   * Verificar localStorage
   */
  checkLocalStorage() {
    try {
      if (typeof localStorage === 'undefined') {
        return { available: false, reason: 'localStorage no disponible' };
      }

      const testKey = '__print_debug_test__';
      localStorage.setItem(testKey, 'test');
      const testValue = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      if (testValue !== 'test') {
        return { available: false, reason: 'localStorage no funciona correctamente' };
      }

      return { available: true, reason: 'Funcionando correctamente' };
    } catch (error) {
      return { available: false, reason: error.message };
    }
  }

  /**
   * Verificar información del negocio
   */
  checkBusinessInfo() {
    try {
      if (typeof localStorage === 'undefined') {
        return { available: false, reason: 'localStorage no disponible' };
      }

      const businessInfo = localStorage.getItem('businessInfo');
      if (!businessInfo) {
        return { available: false, reason: 'No hay información del negocio en localStorage' };
      }

      const parsed = JSON.parse(businessInfo);
      const requiredFields = ['name', 'address', 'phone', 'taxId'];
      const missingFields = requiredFields.filter(field => !parsed[field]);

      return {
        available: true,
        hasData: true,
        missingFields,
        fieldsCount: Object.keys(parsed).length,
        data: parsed
      };
    } catch (error) {
      return { available: false, reason: error.message };
    }
  }

  /**
   * Verificar configuración de impresión
   */
  checkPrintConfig() {
    try {
      if (typeof localStorage === 'undefined') {
        return { available: false, reason: 'localStorage no disponible' };
      }

      const printConfig = localStorage.getItem('printConfig');
      if (!printConfig) {
        return { available: false, reason: 'No hay configuración de impresión en localStorage' };
      }

      const parsed = JSON.parse(printConfig);
      const requiredFields = ['paperSize', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight'];
      const missingFields = requiredFields.filter(field => !parsed[field]);

      return {
        available: true,
        hasData: true,
        missingFields,
        fieldsCount: Object.keys(parsed).length,
        data: parsed
      };
    } catch (error) {
      return { available: false, reason: error.message };
    }
  }

  /**
   * Probar impresión básica
   */
  async testBasicPrint() {
    this.log('INFO', '🧪 Probando impresión básica...');
    
    try {
      const testHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test de Impresión</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .test-content { text-align: center; padding: 40px; }
          </style>
        </head>
        <body>
          <div class="test-content">
            <h1>🧪 Test de Impresión</h1>
            <p>Fecha: ${new Date().toLocaleString('es-DO')}</p>
            <p>Este es un test para verificar que la impresión funciona correctamente.</p>
            <p>Si puedes ver esto impreso, el sistema básico funciona.</p>
          </div>
        </body>
        </html>
      `;

      if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.printContent) {
        this.log('INFO', '🖨️ Probando impresión en Electron...');
        const result = await window.electronAPI.printContent({
          content: testHTML,
          silent: true
        });
        this.log('INFO', '✅ Resultado de test en Electron:', result);
        return { success: true, platform: 'electron', result };
      } else {
        this.log('INFO', '🌐 Probando impresión en navegador...');
        const printWindow = window.open('', '_blank', 'width=600,height=400');
        if (printWindow) {
          printWindow.document.write(testHTML);
          printWindow.document.close();
          printWindow.print();
          setTimeout(() => printWindow.close(), 1000);
          this.log('INFO', '✅ Test en navegador completado');
          return { success: true, platform: 'browser' };
        } else {
          throw new Error('No se pudo abrir ventana de impresión');
        }
      }
    } catch (error) {
      this.log('ERROR', '❌ Error en test de impresión básica:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener log de debugging
   */
  getLog() {
    return [...this.debugLog];
  }

  /**
   * Limpiar log
   */
  clearLog() {
    this.debugLog = [];
    this.log('INFO', '🧹 Log de debugging limpiado');
  }

  /**
   * Exportar log como JSON
   */
  exportLog() {
    try {
      const logData = {
        exportDate: new Date().toISOString(),
        totalEntries: this.debugLog.length,
        entries: this.debugLog
      };
      
      const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `print-debug-log-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.log('INFO', '📁 Log exportado exitosamente');
      return true;
    } catch (error) {
      this.log('ERROR', '❌ Error exportando log:', error);
      return false;
    }
  }
}

// Crear instancia global
const printDebugger = new PrintDebugger();

// Exportar funciones principales
export const {
  checkSystemStatus,
  testBasicPrint,
  getLog,
  clearLog,
  exportLog
} = printDebugger;

// Exportar instancia completa
export default printDebugger;
