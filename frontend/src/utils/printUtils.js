/**
 * Sistema de Impresión Universal - Compatible Web y Electron
 * Versión optimizada para máxima compatibilidad y rendimiento
 */

// ===== DETECCIÓN DE PLATAFORMA MEJORADA =====
const isElectron = () => {
  try {
    // Verificación más robusta del entorno Electron
    return typeof window !== 'undefined' && 
           window.electronAPI && 
           typeof window.electronAPI.getPrinters === 'function' &&
           typeof window.electronAPI.printContent === 'function';
  } catch (error) {
    console.error('🔍 Detección Electron falló:', error.message);
    return false;
  }
};

const isWeb = () => {
  return typeof window !== 'undefined' && !isElectron();
};

// ===== CONFIGURACIÓN =====
const getDefaultConfig = () => ({
  selectedPrinter: null,
  defaultPrinter: null,
  printSettings: {
    silent: false,
    printBackground: true,
    copies: 1,
    pageSize: 'A4',
    landscape: false,
    margins: { top: 10, bottom: 10, left: 10, right: 10 }
  },
  thermalSettings: {
    width: '80mm',
    margins: { top: 5, bottom: 5, left: 5, right: 5 },
    fontSize: '12px',
    fontFamily: 'Courier New, monospace'
  }
});

const getPrintConfig = () => {
  try {
    const config = localStorage.getItem('print_config');
    return config ? JSON.parse(config) : getDefaultConfig();
  } catch {
    return getDefaultConfig();
  }
};

const savePrintConfig = (config) => {
  try {
    localStorage.setItem('print_config', JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
};

// ===== FUNCIONES DE IMPRESIÓN ELECTRON MEJORADAS =====
const electronPrint = async (content, options = {}) => {
  try {
    if (!isElectron()) {
      throw new Error('Electron no está disponible');
    }

    const config = getPrintConfig();
    const printOptions = {
      content,
      printerName: options.printerName || config?.selectedPrinter || null,
      silent: options.silent ?? config?.printSettings?.silent ?? false,
      printBackground: options.printBackground ?? config?.printSettings?.printBackground ?? true,
      copies: options.copies ?? config?.printSettings?.copies ?? 1,
      pageSize: options.pageSize ?? config?.printSettings?.pageSize ?? 'A4',
      landscape: options.landscape ?? config?.printSettings?.landscape ?? false,
      margins: options.margins ?? config?.printSettings?.margins ?? { top: 10, bottom: 10, left: 10, right: 10 }
    };

    console.info('🖨️ Imprimiendo con Electron (APIs nativas):', printOptions);
    
    // Verificar que las APIs estén disponibles
    if (!window.electronAPI.printContent) {
      throw new Error('API de impresión no disponible');
    }
    
    const result = await window.electronAPI.printContent(printOptions);
    
    if (result && result.success) {
      console.info('✅ Impresión Electron completada exitosamente');
      return { success: true, message: 'Impresión completada con APIs nativas', platform: 'electron' };
    } else {
      throw new Error(result?.error || 'Error desconocido en Electron');
    }
  } catch (error) {
    console.error('❌ Error en Electron:', error.message);
    return { success: false, error: error.message, platform: 'electron' };
  }
};

// ===== FUNCIONES DE IMPRESIÓN WEB MEJORADAS =====
const webPrint = async (content, options = {}) => {
  return new Promise((resolve) => {
    try {
      console.info('🖨️ Imprimiendo con navegador web (fallback)');
      
      // Validar contenido antes de proceder
      if (!content || typeof content !== 'string') {
        resolve({ success: false, error: 'Contenido inválido para impresión web', platform: 'web' });
        return;
      }
      
      // Crear ventana de impresión con configuración mejorada
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      if (!printWindow) {
        resolve({ success: false, error: 'Bloqueador de ventanas emergentes activo', platform: 'web' });
        return;
      }

      let printCompleted = false;
      
      // Escribir contenido mejorado
      printWindow.document.write(content);
      printWindow.document.close();
      
      // Función para manejar la impresión
      const handlePrint = () => {
        if (printCompleted) return;
        
        try {
          printWindow.focus();
          printWindow.print();
          
          // Esperar un momento antes de cerrar
          setTimeout(() => {
            if (!printWindow.closed) {
              printWindow.close();
            }
            if (!printCompleted) {
              printCompleted = true;
              console.info('✅ Impresión web completada');
              resolve({ success: true, message: 'Impresión web completada', platform: 'web' });
            }
          }, 1000);
          
        } catch (error) {
          if (!printWindow.closed) {
            printWindow.close();
          }
          if (!printCompleted) {
            printCompleted = true;
            console.error('❌ Error en impresión web:', error.message);
            resolve({ success: false, error: error.message, platform: 'web' });
          }
        }
      };
      
      // Esperar a que cargue completamente
      if (printWindow.document.readyState === 'complete') {
        setTimeout(handlePrint, 500);
      } else {
        printWindow.onload = () => setTimeout(handlePrint, 500);
      }

      // Timeout de seguridad extendido
      setTimeout(() => {
        if (!printCompleted) {
          printCompleted = true;
          if (!printWindow.closed) {
            printWindow.close();
          }
          resolve({ success: false, error: 'Timeout en impresión web (15s)', platform: 'web' });
        }
      }, 15000);

    } catch (error) {
      console.error('❌ Error en webPrint:', error.message);
      resolve({ success: false, error: error.message, platform: 'web' });
    }
  });
};

// ===== FUNCIÓN UNIVERSAL DE IMPRESIÓN MEJORADA =====
export const universalPrint = async (content, options = {}) => {
  const startTime = Date.now();
  
  try {
    console.info('🖨️ Iniciando impresión universal...');
    
    // Validar contenido
    if (!content || typeof content !== 'string') {
      throw new Error('Contenido de impresión inválido');
    }
    
    // Intentar Electron primero si está disponible
    if (isElectron()) {
      console.info('📱 Detectado Electron, usando APIs nativas');
      try {
        const result = await electronPrint(content, options);
        if (result.success) {
          const duration = Date.now() - startTime;
          console.info(`✅ Impresión Electron exitosa en ${duration}ms`);
          return { ...result, duration };
        }
        console.warn('⚠️ Electron falló, intentando fallback web:', result.error);
      } catch (electronError) {
        console.warn('⚠️ Error en Electron, usando fallback web:', electronError.message);
      }
    }

    // Fallback a impresión web
    if (isWeb()) {
      console.info('🌐 Usando impresión web como fallback');
      try {
        const result = await webPrint(content, options);
        const duration = Date.now() - startTime;
        console.info(`✅ Impresión web exitosa en ${duration}ms`);
        return { ...result, duration };
      } catch (webError) {
        console.error('❌ Error en impresión web:', webError.message);
        throw webError;
      }
    }

    throw new Error('No se detectó plataforma compatible para impresión');

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error en impresión universal después de ${duration}ms:`, error.message);
    return { 
      success: false, 
      error: error.message, 
      platform: 'unknown',
      duration 
    };
  }
};

// ===== GENERACIÓN DE HTML PARA FACTURAS =====
export const generateInvoiceHTML = (invoiceData, businessInfo, options = {}) => {
  try {
    console.info('📄 Generando HTML de factura...');
    
    // Validar datos de entrada
    if (!invoiceData) {
      throw new Error('invoiceData es requerido');
    }

    if (!businessInfo) {
      throw new Error('businessInfo es requerido');
    }

    const {
      receiptNumber = 'N/A',
      date = new Date(),
      items = [],
      totals = { subtotal: 0, tax: 0, total: 0 },
      customer = {},
      paymentMethod = '',
      actualCashReceived = 0,
      isCredit = false,
      clientName = ''
    } = invoiceData;

    const {
      name: businessName = 'Mi Negocio',
      address: businessAddress = 'Dirección del Negocio',
      rnc: businessRNC = 'N/A',
      phone: businessPhone = 'N/A',
      email: businessEmail = '',
      slogan: businessSlogan = ''
    } = businessInfo;

    const isThermal = options.printerType === 'thermal';
    const fontScale = Number(options.fontScale || 1);
    const config = getPrintConfig();

    console.info('📄 Configuración HTML:', { isThermal, fontScale, itemsCount: items.length });

    // Estilos según tipo de impresora
    const styles = isThermal ? `
      <style>
        /* Forzar tamaño de página de recibo desde CSS (usado cuando no pasamos pageSize) */
        @page { size: 80mm auto; margin: 0; }
        body { 
          font-family: 'Courier New', monospace;
          font-size: ${Math.round(16 * fontScale)}px;
          width: 80mm;
          max-width: 80mm;
          margin: 0 auto;
          padding: 5mm; /* margen visual interno */
          box-sizing: border-box; /* incluir padding en el ancho */
          line-height: 1.35;
          background: #ffffff; color: #000000;
        }
        .header { text-align: center; margin-bottom: 10px; }
        .header h1 { font-size: ${Math.round(20 * fontScale)}px; margin: 0 0 4px 0; }
        .header h2 { font-size: ${Math.round(18 * fontScale)}px; margin: 4px 0; }
        .divider { border-top: 1px dashed #000; margin: 10px 0; }
        .item { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: ${Math.round(16 * fontScale)}px; table-layout: fixed; }
        td, th { word-wrap: break-word; }
        th, td { padding: 6px 0; border-bottom: 1px dashed #999; }
        .total { font-weight: bold; margin-top: 10px; font-size: ${Math.round(18 * fontScale)}px; }
        .footer { text-align: center; margin-top: 12px; }
        .customer-info { margin: 10px 0; }
      </style>
    ` : `
      <style>
        @page { margin: 15mm; }
        body { 
          font-family: Arial, sans-serif;
          margin: 20px;
          max-width: 800px;
          margin: 0 auto;
          line-height: 1.5;
          font-size: ${16 * fontScale}px;
        }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .header h1 { font-size: ${26 * fontScale}px; margin: 0 0 8px 0; }
        .header h2 { font-size: ${20 * fontScale}px; margin: 6px 0; }
        .invoice-info { margin-bottom: 20px; display: flex; justify-content: space-between; }
        .customer-info { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: ${15 * fontScale}px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .total { border-top: 2px solid #333; padding-top: 15px; font-weight: bold; font-size: 1.2em; }
        .footer { text-align: center; margin-top: 30px; color: #666; }
        .payment-info { margin: 20px 0; padding: 15px; background: #e3f2fd; border-radius: 5px; }
      </style>
    `;

    // Generar contenido de items
    const itemsHTML = isThermal ? 
      items.map(item => `
        <div class="item">
          <div>${item.name || 'Producto'}</div>
          <div>${item.quantity || 1} x $${(item.price || 0).toFixed(2)} = $${((item.quantity || 1) * (item.price || 0)).toFixed(2)}</div>
        </div>
      `).join('') :
      `
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.name || 'Producto'}</td>
                <td>${item.quantity || 1}</td>
                <td>$${(item.price || 0).toFixed(2)}</td>
                <td>$${((item.quantity || 1) * (item.price || 0)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

    // Información de pago
    const paymentHTML = paymentMethod ? `
      <div class="payment-info">
        <strong>Método de Pago:</strong> ${paymentMethod}<br>
        ${actualCashReceived > 0 ? `<strong>Efectivo Recibido:</strong> $${actualCashReceived.toFixed(2)}<br>` : ''}
        ${actualCashReceived > totals.total ? `<strong>Cambio:</strong> $${(actualCashReceived - totals.total).toFixed(2)}<br>` : ''}
        ${isCredit ? '<strong>Venta a Crédito</strong>' : ''}
      </div>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura ${receiptNumber}</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <h1>FACTURA</h1>
          <h2>${businessName}</h2>
          <p>${businessAddress}</p>
          ${businessRNC !== 'N/A' ? `<p>RNC: ${businessRNC}</p>` : ''}
          ${businessPhone !== 'N/A' ? `<p>Tel: ${businessPhone}</p>` : ''}
          ${businessEmail ? `<p>Email: ${businessEmail}</p>` : ''}
          ${businessSlogan ? `<p><em>${businessSlogan}</em></p>` : ''}
        </div>

        <div class="invoice-info">
          <div>
            <strong>Número:</strong> ${receiptNumber}<br>
            <strong>Fecha:</strong> ${new Date(date).toLocaleDateString('es-DO')}<br>
            <strong>Hora:</strong> ${new Date(date).toLocaleTimeString('es-DO')}
          </div>
        </div>

        ${(clientName || customer.name) ? `
          <div class="customer-info">
            <strong>Cliente:</strong> ${clientName || customer.name}
          </div>
        ` : ''}

        ${itemsHTML}

        <div class="total">
          <p><strong>Subtotal:</strong> $${(totals.subtotal || 0).toFixed(2)}</p>
          ${totals.tax && totals.tax > 0 ? `<p><strong>ITBIS:</strong> $${totals.tax.toFixed(2)}</p>` : ''}
          <p><strong>TOTAL:</strong> $${(totals.total || 0).toFixed(2)}</p>
        </div>

        ${paymentHTML}

        <div class="footer">
          <p>¡Gracias por su compra!</p>
          <p>Impreso: ${new Date().toLocaleString('es-DO')}</p>
        </div>
      </body>
      </html>
    `;

    console.info('✅ HTML de factura generado exitosamente');

    return html;
  } catch (error) {
    console.error('❌ Error generando HTML de factura:', error.message);
    
    // HTML de error mejorado
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            text-align: center;
            background: #f8f9fa;
          }
          .error-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 0 auto;
          }
          .error { 
            color: #dc3545; 
            font-size: 16px;
            margin: 15px 0;
          }
          .basic-info {
            background: #e9ecef;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            text-align: left;
          }
          h1 { color: #495057; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>Error en Factura</h1>
          <div class="error">❌ ${error.message}</div>
          <div class="basic-info">
            <h3>Información Disponible:</h3>
            <p><strong>Número:</strong> ${invoiceData?.receiptNumber || 'N/A'}</p>
            <p><strong>Total:</strong> $${invoiceData?.totals?.total || 0}</p>
            <p><strong>Items:</strong> ${invoiceData?.items?.length || 0}</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-DO')}</p>
          </div>
          <p style="color: #6c757d; font-size: 12px;">Por favor, contacte al soporte técnico si el problema persiste.</p>
        </div>
      </body>
      </html>
    `;
  }
};

// ===== FUNCIÓN PRINCIPAL PARA IMPRIMIR FACTURAS =====
export const printInvoice = async (invoiceData, businessInfo, options = {}) => {
  try {
    console.info('🖨️ Iniciando impresión de factura...');
    console.info('📋 Datos recibidos:', { invoiceData, businessInfo, options });

    // Validar datos críticos
    if (!invoiceData) {
      throw new Error('Datos de factura no proporcionados');
    }

    if (!businessInfo) {
      console.warn('⚠️ BusinessInfo no proporcionado, usando valores por defecto');
      businessInfo = {
        name: 'Mi Negocio',
        address: 'Dirección del Negocio',
        rnc: 'N/A',
        phone: 'N/A',
        email: '',
        slogan: '¡Gracias por su compra!'
      };
    }

    // Asegurar que los datos de la factura tengan la estructura correcta
    const processedInvoiceData = {
      receiptNumber: invoiceData.receiptNumber || `FAC-${Date.now().toString().slice(-6)}`,
      date: invoiceData.date || new Date(),
      items: invoiceData.items || [],
      totals: invoiceData.totals || { subtotal: 0, tax: 0, total: 0 },
      customer: invoiceData.customer || {},
      paymentMethod: invoiceData.paymentMethod || '',
      actualCashReceived: invoiceData.actualCashReceived || 0,
      isCredit: invoiceData.isCredit || false,
      clientName: invoiceData.clientName || invoiceData.customer?.name || 'Cliente General'
    };

    console.info('📋 Datos procesados para impresión:', processedInvoiceData);

    // Generar HTML de la factura
    const invoiceHTML = generateInvoiceHTML(processedInvoiceData, businessInfo, options);

    if (!invoiceHTML || invoiceHTML.length < 100) {
      throw new Error('Error generando HTML de la factura');
    }

    // Configurar opciones de impresión
    const printOptions = {
      silent: options.silent || false,
      printBackground: true,
      copies: options.copies || 1,
      printerType: options.printerType || 'standard',
      printerName: options.printerName || null,
      ...options
    };

    // Aplicar configuración específica según tipo de impresora
    if (options.printerType === 'thermal') {
      printOptions.margins = { top: 5, bottom: 5, left: 5, right: 5 };
      printOptions.pageSize = 'custom';
    }

    console.info('🖨️ Opciones de impresión:', printOptions);

    // Ejecutar impresión universal
    const result = await universalPrint(invoiceHTML, printOptions);

    if (result.success) {
      console.info('✅ Factura impresa exitosamente');
      return { 
        success: true, 
        message: 'Factura impresa correctamente', 
        platform: result.platform,
        duration: result.duration
      };
    } else {
      throw new Error(result.error || 'Error en la impresión de la factura');
    }
  } catch (error) {
    console.error('❌ Error imprimiendo factura:', error.message);
    return { success: false, error: error.message, platform: 'unknown' };
  }
};

// ===== FUNCIONES DE CONFIGURACIÓN MEJORADAS =====
export const getPrinters = async () => {
  try {
    if (!isElectron()) {
      console.warn('⚠️ No estamos en Electron, no se pueden obtener impresoras');
      return [];
    }

    // Verificar que la API esté disponible
    if (!window.electronAPI.getPrinters) {
      console.error('❌ API getPrinters no disponible');
      return [];
    }

    console.info('🔍 Obteniendo lista de impresoras...');
    const result = await window.electronAPI.getPrinters();
    
    if (result && result.success && Array.isArray(result.data)) {
      console.info('✅ Impresoras obtenidas exitosamente:', result.data.length);
      return result.data;
    } else {
      console.error('❌ Error obteniendo impresoras:', result?.error || 'Respuesta inválida');
      return [];
    }
  } catch (error) {
    console.error('❌ Error en getPrinters:', error.message);
    return [];
  }
};

export const getDefaultPrinter = async () => {
  try {
    if (!isElectron()) {
      console.warn('⚠️ No estamos en Electron, no se puede obtener impresora por defecto');
      return null;
    }

    // Verificar que la API esté disponible
    if (!window.electronAPI.getDefaultPrinter) {
      console.error('❌ API getDefaultPrinter no disponible');
      return null;
    }

    console.info('🔍 Obteniendo impresora por defecto...');
    const result = await window.electronAPI.getDefaultPrinter();
    
    if (result && result.success) {
      console.info('✅ Impresora por defecto encontrada:', result.data);
      return result.data;
    } else {
      console.error('❌ Error obteniendo impresora por defecto:', result?.error || 'Sin respuesta válida');
      
      // Fallback: intentar obtener la primera impresora disponible
      try {
        const printers = await getPrinters();
        if (printers.length > 0) {
          const firstPrinter = printers[0].name;
          console.info('🔄 Usando primera impresora disponible como fallback:', firstPrinter);
          return firstPrinter;
        }
      } catch (fallbackError) {
        console.error('❌ Error en fallback de impresora:', fallbackError.message);
      }
      
      return null;
    }
  } catch (error) {
    console.error('❌ Error en getDefaultPrinter:', error.message);
    return null;
  }
};

export const configurePrinter = (printerName, settings = {}) => {
  try {
    if (!printerName || typeof printerName !== 'string') {
      throw new Error('Nombre de impresora inválido');
    }
    
    const config = getPrintConfig() || {};
    
    const newConfig = {
      ...config,
      selectedPrinter: printerName,
      lastUpdated: new Date().toISOString(),
      platform: isElectron() ? 'electron' : 'web',
      ...settings
    };

    if (savePrintConfig(newConfig)) {
      console.info('✅ Configuración de impresora guardada:', printerName);
      return { success: true, message: 'Configuración guardada correctamente', config: newConfig };
    } else {
      throw new Error('Error guardando configuración en localStorage');
    }
  } catch (error) {
    console.error('❌ Error configurando impresora:', error.message);
    return { success: false, error: error.message };
  }
};

// ===== FUNCIONES DE UTILIDAD MEJORADAS =====
export const getCurrentConfig = () => {
  return getPrintConfig();
};

export const isElectronAvailable = isElectron;
export const isWebAvailable = isWeb;

// Función para verificar el estado del sistema de impresión
export const checkPrintingStatus = async () => {
  const status = {
    platform: isElectron() ? 'electron' : 'web',
    electronAvailable: isElectron(),
    webAvailable: isWeb(),
    printersCount: 0,
    defaultPrinter: null,
    errors: []
  };

  try {
    if (isElectron()) {
      const printers = await getPrinters();
      status.printersCount = printers.length;
      
      if (printers.length > 0) {
        status.defaultPrinter = await getDefaultPrinter();
      } else {
        status.errors.push('No se encontraron impresoras');
      }
    }
  } catch (error) {
    status.errors.push(`Error verificando impresoras: ${error.message}`);
  }

  return status;
};

// Función para diagnosticar problemas de impresión
export const diagnosePrintingIssues = async () => {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    issues: [],
    recommendations: []
  };

  try {
    const status = await checkPrintingStatus();
    
    if (!status.electronAvailable && !status.webAvailable) {
      diagnosis.issues.push('No se detectó ninguna plataforma de impresión');
      diagnosis.recommendations.push('Verificar que la aplicación esté funcionando correctamente');
    }
    
    if (status.electronAvailable && status.printersCount === 0) {
      diagnosis.issues.push('Electron detectado pero sin impresoras');
      diagnosis.recommendations.push('Verificar que las impresoras estén conectadas y configuradas');
    }
    
    if (status.errors.length > 0) {
      diagnosis.issues.push(...status.errors);
      diagnosis.recommendations.push('Revisar la configuración del sistema y permisos');
    }
    
    if (diagnosis.issues.length === 0) {
      diagnosis.recommendations.push('Sistema de impresión funcionando correctamente');
    }
    
  } catch (error) {
    diagnosis.issues.push(`Error en diagnóstico: ${error.message}`);
  }

  return diagnosis;
};

// Exportar funciones de configuración
export { getPrintConfig, savePrintConfig };
