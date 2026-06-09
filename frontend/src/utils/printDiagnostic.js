/**
 * Sistema de Diagnóstico de Impresión
 * Herramienta para detectar y solucionar problemas de impresión
 */

import { 
  isElectronAvailable, 
  isWebAvailable, 
  getPrinters, 
  getDefaultPrinter,
  checkPrintingStatus,
  diagnosePrintingIssues,
  universalPrint,
  generateInvoiceHTML
} from './printUtils';

/**
 * Ejecutar diagnóstico completo del sistema de impresión
 */
export const runFullDiagnostic = async () => {
  const diagnostic = {
    timestamp: new Date().toISOString(),
    platform: 'unknown',
    status: 'running',
    tests: [],
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0
    },
    recommendations: []
  };

  console.log('🔍 Iniciando diagnóstico completo del sistema de impresión...');

  try {
    // Test 1: Detección de plataforma
    const platformTest = await testPlatformDetection();
    diagnostic.tests.push(platformTest);
    diagnostic.platform = platformTest.result?.platform || 'unknown';

    // Test 2: Disponibilidad de APIs
    const apiTest = await testAPIAvailability();
    diagnostic.tests.push(apiTest);

    // Test 3: Detección de impresoras (solo Electron)
    if (diagnostic.platform === 'electron') {
      const printersTest = await testPrintersDetection();
      diagnostic.tests.push(printersTest);
    }

    // Test 4: Generación de HTML
    const htmlTest = await testHTMLGeneration();
    diagnostic.tests.push(htmlTest);

    // Test 5: Configuración de localStorage
    const storageTest = await testLocalStorageConfig();
    diagnostic.tests.push(storageTest);

    // Calcular resumen
    diagnostic.tests.forEach(test => {
      if (test.status === 'passed') diagnostic.summary.passed++;
      else if (test.status === 'failed') diagnostic.summary.failed++;
      else if (test.status === 'warning') diagnostic.summary.warnings++;
    });

    // Generar recomendaciones
    diagnostic.recommendations = generateRecommendations(diagnostic.tests);
    diagnostic.status = diagnostic.summary.failed > 0 ? 'failed' : 
                      diagnostic.summary.warnings > 0 ? 'warning' : 'passed';

    console.log('✅ Diagnóstico completado:', diagnostic);
    return diagnostic;

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    diagnostic.status = 'error';
    diagnostic.error = error.message;
    return diagnostic;
  }
};

/**
 * Test de detección de plataforma
 */
const testPlatformDetection = async () => {
  const test = {
    name: 'Detección de Plataforma',
    status: 'running',
    details: {}
  };

  try {
    const isElectron = isElectronAvailable();
    const isWeb = isWebAvailable();
    
    test.details = {
      isElectron,
      isWeb,
      userAgent: navigator.userAgent,
      hasElectronAPI: typeof window !== 'undefined' && !!window.electronAPI
    };

    if (isElectron) {
      test.status = 'passed';
      test.result = { platform: 'electron' };
      test.message = 'Plataforma Electron detectada correctamente';
    } else if (isWeb) {
      test.status = 'passed';
      test.result = { platform: 'web' };
      test.message = 'Plataforma Web detectada correctamente';
    } else {
      test.status = 'failed';
      test.message = 'No se pudo detectar la plataforma';
    }

  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  return test;
};

/**
 * Test de disponibilidad de APIs
 */
const testAPIAvailability = async () => {
  const test = {
    name: 'Disponibilidad de APIs',
    status: 'running',
    details: {}
  };

  try {
    const apis = {
      window: typeof window !== 'undefined',
      electronAPI: typeof window !== 'undefined' && !!window.electronAPI,
      printContent: typeof window !== 'undefined' && 
                   window.electronAPI && 
                   typeof window.electronAPI.printContent === 'function',
      getPrinters: typeof window !== 'undefined' && 
                  window.electronAPI && 
                  typeof window.electronAPI.getPrinters === 'function'
    };

    test.details = apis;

    if (isElectronAvailable()) {
      if (apis.printContent && apis.getPrinters) {
        test.status = 'passed';
        test.message = 'Todas las APIs de Electron están disponibles';
      } else {
        test.status = 'failed';
        test.message = 'APIs de Electron faltantes o incompletas';
      }
    } else {
      if (apis.window) {
        test.status = 'passed';
        test.message = 'APIs web básicas disponibles';
      } else {
        test.status = 'failed';
        test.message = 'APIs web no disponibles';
      }
    }

  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  return test;
};

/**
 * Test de detección de impresoras
 */
const testPrintersDetection = async () => {
  const test = {
    name: 'Detección de Impresoras',
    status: 'running',
    details: {}
  };

  try {
    const printers = await getPrinters();
    const defaultPrinter = await getDefaultPrinter();

    test.details = {
      printersCount: printers.length,
      printers: printers.map(p => ({ name: p.name, status: p.status })),
      defaultPrinter
    };

    if (printers.length > 0) {
      test.status = 'passed';
      test.message = `${printers.length} impresora(s) detectada(s)`;
    } else {
      test.status = 'warning';
      test.message = 'No se detectaron impresoras instaladas';
    }

  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  return test;
};

/**
 * Test de generación de HTML
 */
const testHTMLGeneration = async () => {
  const test = {
    name: 'Generación de HTML',
    status: 'running',
    details: {}
  };

  try {
    const testInvoiceData = {
      receiptNumber: 'TEST-001',
      date: new Date(),
      items: [
        { name: 'Producto Test', quantity: 1, price: 10.00 }
      ],
      totals: { subtotal: 10.00, tax: 1.80, total: 11.80 },
      customer: { name: 'Cliente Test' },
      paymentMethod: 'cash'
    };

    const testBusinessInfo = {
      name: 'Negocio Test',
      address: 'Dirección Test',
      rnc: '123456789',
      phone: '809-123-4567',
      email: 'test@negocio.com'
    };

    const html = generateInvoiceHTML(testInvoiceData, testBusinessInfo);

    test.details = {
      htmlLength: html.length,
      containsTitle: html.includes('Factura TEST-001'),
      containsItems: html.includes('Producto Test'),
      containsTotal: html.includes('11.80')
    };

    if (html && html.length > 500 && test.details.containsTitle) {
      test.status = 'passed';
      test.message = 'HTML generado correctamente';
    } else {
      test.status = 'failed';
      test.message = 'Error en la generación de HTML';
    }

  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  return test;
};

/**
 * Test de configuración de localStorage
 */
const testLocalStorageConfig = async () => {
  const test = {
    name: 'Configuración localStorage',
    status: 'running',
    details: {}
  };

  try {
    // Verificar acceso a localStorage
    const hasLocalStorage = typeof Storage !== 'undefined';
    
    if (!hasLocalStorage) {
      test.status = 'failed';
      test.message = 'localStorage no disponible';
      return test;
    }

    // Verificar configuraciones existentes
    const configs = {
      printConfig: localStorage.getItem('print_config'),
      businessInfo: localStorage.getItem('businessInfo'),
      user: localStorage.getItem('user')
    };

    test.details = {
      hasLocalStorage,
      hasPrintConfig: !!configs.printConfig,
      hasBusinessInfo: !!configs.businessInfo,
      hasUser: !!configs.user
    };

    // Test de escritura/lectura
    const testKey = 'print_diagnostic_test';
    const testValue = JSON.stringify({ test: true, timestamp: Date.now() });
    
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);

    if (retrieved === testValue) {
      test.status = 'passed';
      test.message = 'localStorage funcionando correctamente';
    } else {
      test.status = 'failed';
      test.message = 'Error en operaciones de localStorage';
    }

  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  return test;
};

/**
 * Generar recomendaciones basadas en los tests
 */
const generateRecommendations = (tests) => {
  const recommendations = [];

  tests.forEach(test => {
    switch (test.name) {
      case 'Detección de Plataforma':
        if (test.status === 'failed') {
          recommendations.push('Verificar que la aplicación esté ejecutándose correctamente');
        }
        break;

      case 'Disponibilidad de APIs':
        if (test.status === 'failed') {
          recommendations.push('Verificar que las APIs de Electron estén correctamente expuestas');
          recommendations.push('Revisar el archivo preload.js en la configuración de Electron');
        }
        break;

      case 'Detección de Impresoras':
        if (test.status === 'warning') {
          recommendations.push('Instalar y configurar al menos una impresora en el sistema');
          recommendations.push('Verificar que las impresoras estén encendidas y conectadas');
        } else if (test.status === 'failed') {
          recommendations.push('Verificar permisos de acceso a impresoras del sistema');
        }
        break;

      case 'Generación de HTML':
        if (test.status === 'failed') {
          recommendations.push('Revisar la función generateInvoiceHTML en printUtils.js');
          recommendations.push('Verificar que los datos de entrada sean válidos');
        }
        break;

      case 'Configuración localStorage':
        if (test.status === 'failed') {
          recommendations.push('Verificar que localStorage esté habilitado en el navegador');
          recommendations.push('Limpiar caché y datos de la aplicación si es necesario');
        }
        break;
    }
  });

  if (recommendations.length === 0) {
    recommendations.push('Sistema de impresión funcionando correctamente');
  }

  return recommendations;
};

/**
 * Test rápido de impresión
 */
export const testPrint = async (options = {}) => {
  console.log('🖨️ Ejecutando test de impresión...');

  try {
    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Test de Impresión</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
          .test-box { border: 2px solid #007bff; padding: 20px; margin: 20px 0; }
          .success { color: #28a745; }
        </style>
      </head>
      <body>
        <div class="test-box">
          <h1>🖨️ Test de Impresión</h1>
          <p class="success">✅ Si puedes ver este documento, la impresión está funcionando</p>
          <p>Fecha: ${new Date().toLocaleString('es-DO')}</p>
          <p>Plataforma: ${isElectronAvailable() ? 'Electron' : 'Web'}</p>
        </div>
      </body>
      </html>
    `;

    const result = await universalPrint(testHTML, {
      silent: options.silent || false,
      ...options
    });

    console.log('📋 Resultado del test:', result);
    return result;

  } catch (error) {
    console.error('❌ Error en test de impresión:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Exportar funciones principales
 */
export default {
  runFullDiagnostic,
  testPrint
};
