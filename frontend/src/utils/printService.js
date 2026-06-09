/**
 * Servicio de Impresión Independiente - HTML + JavaScript Puro
 * Completamente separado de React para garantizar consistencia en impresión
 */

class PrintService {
  constructor() {
    this.businessInfo = null;
    this.printConfig = null;
    this.isInitialized = false;
    this.init();
  }

  /**
   * Inicializar el servicio
   */
  async init() {
    try {
      console.log('🔄 Inicializando PrintService...');
      
      // Esperar a que el DOM esté listo
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }
      
      await this.loadBusinessInfo();
      await this.loadPrintConfig();
      
      this.isInitialized = true;
      console.log('✅ PrintService inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando PrintService:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Cargar información del negocio desde localStorage o API
   */
  async loadBusinessInfo() {
    try {
      console.log('📋 Cargando información del negocio...');
      
      // Intentar obtener desde localStorage primero
      const storedBusinessInfo = localStorage.getItem('businessInfo');
      if (storedBusinessInfo) {
        this.businessInfo = JSON.parse(storedBusinessInfo);
        console.log('📋 BusinessInfo cargado desde localStorage:', this.businessInfo);
        return;
      }

      // Si no hay en localStorage, intentar desde la API
      try {
        const response = await fetch('/api/business/info');
        if (response.ok) {
          this.businessInfo = await response.json();
          // Guardar en localStorage para futuras impresiones
          localStorage.setItem('businessInfo', JSON.stringify(this.businessInfo));
          console.log('📋 BusinessInfo cargado desde API:', this.businessInfo);
        } else {
          throw new Error(`API responded with status: ${response.status}`);
        }
      } catch (apiError) {
        console.warn('⚠️ No se pudo cargar desde API, usando valores por defecto:', apiError.message);
        throw apiError;
      }
    } catch (error) {
      console.error('❌ Error cargando businessInfo:', error);
      // Usar valores por defecto
      this.businessInfo = {
        name: 'Mi Negocio',
        address: 'Dirección del Negocio',
        phone: '123-456-7890',
        taxId: '123456789',
        email: 'negocio@email.com',
        website: '',
        currency: 'RD$',
        taxRate: 18,
        includeTax: true,
        slogan: '¡Calidad y servicio garantizado!',
        footer: '¡Gracias por su compra!',
        additionalComment: ''
      };
      console.log('📋 Usando businessInfo por defecto:', this.businessInfo);
    }
  }

  /**
   * Cargar configuración de impresión
   */
  async loadPrintConfig() {
    try {
      const storedConfig = localStorage.getItem('printConfig');
      if (storedConfig) {
        this.printConfig = JSON.parse(storedConfig);
        console.log('⚙️ Configuración de impresión cargada:', this.printConfig);
      } else {
        this.printConfig = {
          paperSize: 'A4',
          paperWidth: 80,
          paperHeight: 297,
          paperOrientation: 'portrait',
          marginTop: 10,
          marginRight: 10,
          marginBottom: 10,
          marginLeft: 10,
          fontScale: 1.0,
          thermalMode: false
        };
        console.log('⚙️ Usando configuración de impresión por defecto:', this.printConfig);
      }
    } catch (error) {
      console.error('❌ Error cargando printConfig:', error);
      this.printConfig = {
        paperSize: 'A4',
        paperWidth: 80,
        paperHeight: 297,
        paperOrientation: 'portrait',
        marginTop: 10,
        marginRight: 10,
        marginBottom: 10,
        marginLeft: 10,
        fontScale: 1.0,
        thermalMode: false
      };
    }
  }

  /**
   * Verificar si el servicio está listo
   */
  isReady() {
    return this.isInitialized && this.businessInfo && this.printConfig;
  }

  /**
   * Generar HTML de factura con datos garantizados
   */
  generateInvoiceHTML(invoiceData, options = {}) {
    try {
      console.log('🖨️ Generando HTML de factura con datos:', {
        invoiceData,
        businessInfo: this.businessInfo,
        options,
        isReady: this.isReady()
      });

      // Verificar si el servicio está listo
      if (!this.isReady()) {
        console.warn('⚠️ PrintService no está listo, intentando inicializar...');
        this.init();
      }

      // Validar datos críticos
      if (!this.businessInfo) {
        throw new Error('BusinessInfo no disponible');
      }

      if (!invoiceData) {
        throw new Error('Datos de factura no disponibles');
      }

      const {
        receiptNumber = 'N/A',
        customer = {},
        items = [],
        totals = {},
        paymentMethod = '',
        date = new Date(),
        isCredit = false,
        clientName = '',
        cashReceived = 0
      } = invoiceData;

      const {
        name: businessName = this.businessInfo.name,
        address: businessAddress = this.businessInfo.address,
        phone: businessPhone = this.businessInfo.phone,
        taxId: businessRNC = this.businessInfo.taxId,
        email: businessEmail = this.businessInfo.email,
        slogan: businessSlogan = this.businessInfo.slogan
      } = this.businessInfo;

      // Configuración de impresión
      const config = { ...this.printConfig, ...options };
      const fontScale = config.fontScale || 1.0;
      const isThermal = config.thermalMode || false;

      // Estilos CSS
      const styles = `
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          
          body {
            font-family: ${isThermal ? 'Courier New, monospace' : 'Arial, sans-serif'};
            margin: ${config.marginTop}px ${config.marginRight}px ${config.marginBottom}px ${config.marginLeft}px;
            max-width: ${isThermal ? '80mm' : '800px'};
            margin: 0 auto;
            line-height: 1.5;
            font-size: ${16 * fontScale}px;
            color: #000;
            background: white;
          }
          
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #333; 
            padding-bottom: 15px; 
          }
          
          .business-name { 
            font-size: ${24 * fontScale}px; 
            font-weight: bold; 
            margin: 0 0 8px 0; 
            color: #000;
          }
          
          .business-address { 
            font-size: ${14 * fontScale}px; 
            margin: 4px 0; 
            color: #333;
          }
          
          .business-rnc { 
            font-size: ${12 * fontScale}px; 
            margin: 4px 0; 
            color: #666;
          }
          
          .business-phone { 
            font-size: ${12 * fontScale}px; 
            margin: 4px 0; 
            color: #666;
          }
          
          .business-slogan { 
            font-size: ${10 * fontScale}px; 
            font-style: italic; 
            margin: 8px 0; 
            color: #888;
          }
          
          .invoice-info { 
            margin: 20px 0; 
            display: flex; 
            justify-content: space-between; 
            font-size: ${12 * fontScale}px;
          }
          
          .customer-info { 
            margin: 15px 0; 
            padding: 12px; 
            background: #f8f9fa; 
            border-radius: 5px; 
            font-size: ${12 * fontScale}px;
          }
          
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0; 
            font-size: ${12 * fontScale}px; 
          }
          
          .items-table th, .items-table td { 
            padding: 8px; 
            text-align: left; 
            border-bottom: 1px solid #ddd; 
          }
          
          .items-table th { 
            background: #f8f9fa; 
            font-weight: bold; 
          }
          
          .totals { 
            border-top: 2px solid #333; 
            padding-top: 12px; 
            font-weight: bold; 
            font-size: ${14 * fontScale}px; 
            margin-top: 15px;
          }
          
          .footer { 
            text-align: center; 
            margin-top: 20px; 
            color: #666; 
            font-size: ${10 * fontScale}px;
          }
          
          .payment-info { 
            margin: 15px 0; 
            padding: 12px; 
            background: #e3f2fd; 
            border-radius: 5px; 
            font-size: ${12 * fontScale}px;
          }
          
          .credit-notice {
            margin: 15px 0;
            padding: 10px;
            border: 2px solid #f44336;
            border-radius: 5px;
            text-align: center;
            background: #ffebee;
          }
          
          .credit-notice h3 {
            color: #f44336;
            margin: 0 0 5px 0;
            font-size: ${16 * fontScale}px;
          }
          
          .credit-notice p {
            margin: 0;
            color: #d32f2f;
            font-size: ${12 * fontScale}px;
          }
        </style>
      `;

      // Generar contenido de items
      const itemsHTML = isThermal ? 
        items.map(item => `
          <div style="margin: 5px 0; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold;">${item.name || 'Producto'}</div>
            <div style="font-size: ${10 * fontScale}px; color: #666;">
              ${item.quantity || 1} x $${(item.price || 0).toFixed(2)} = $${((item.quantity || 1) * (item.price || 0)).toFixed(2)}
            </div>
          </div>
        `).join('') :
        `
          <table class="items-table">
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
          <strong>Método de Pago:</strong> ${this.getPaymentMethodTranslation(paymentMethod)}<br>
          ${cashReceived > 0 ? `<strong>Efectivo Recibido:</strong> $${cashReceived.toFixed(2)}<br>` : ''}
          ${cashReceived > totals.total ? `<strong>Cambio:</strong> $${(cashReceived - totals.total).toFixed(2)}<br>` : ''}
          ${isCredit ? '<strong>Venta a Crédito</strong>' : ''}
        </div>
      ` : '';

      // Aviso de crédito
      const creditNotice = isCredit ? `
        <div class="credit-notice">
          <h3>COMPRA FIADA</h3>
          <p>Cliente: ${clientName || customer.name || 'N/A'}</p>
          <p>Total a pagar: $${(totals.total || 0).toFixed(2)}</p>
        </div>
      ` : '';

      // Generar HTML completo
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Factura ${receiptNumber}</title>
          ${styles}
        </head>
        <body>
          <div class="header">
            <div class="business-name">${businessName}</div>
            <div class="business-address">${businessAddress}</div>
            <div class="business-rnc">RNC: ${businessRNC}</div>
            <div class="business-phone">Tel: ${businessPhone}</div>
            ${businessEmail ? `<div class="business-email">Email: ${businessEmail}</div>` : ''}
            ${businessSlogan ? `<div class="business-slogan">${businessSlogan}</div>` : ''}
          </div>

          <div class="invoice-info">
            <div>
              <strong>Número:</strong> ${receiptNumber}<br>
              <strong>Fecha:</strong> ${new Date(date).toLocaleDateString('es-DO')}<br>
              <strong>Hora:</strong> ${new Date(date).toLocaleTimeString('es-DO')}
            </div>
            <div>
              <strong>Cajero:</strong> ${this.getCurrentUserName()}<br>
              <strong>Tipo:</strong> ${isCredit ? 'Crédito' : 'Contado'}
            </div>
          </div>

          ${clientName || customer.name ? `
            <div class="customer-info">
              <strong>Cliente:</strong> ${clientName || customer.name}
            </div>
          ` : ''}

          ${itemsHTML}

          <div class="totals">
            <p><strong>Subtotal:</strong> $${(totals.subtotal || 0).toFixed(2)}</p>
            ${totals.tax ? `<p><strong>ITBIS (${(this.businessInfo.taxRate || 18)}%):</strong> $${totals.tax.toFixed(2)}</p>` : ''}
            <p><strong>TOTAL:</strong> $${(totals.total || 0).toFixed(2)}</p>
          </div>

          ${paymentHTML}
          ${creditNotice}

          <div class="footer">
            <p>${this.businessInfo.footer || '¡Gracias por su compra!'}</p>
            <p>${new Date().toLocaleString('es-DO')}</p>
          </div>
        </body>
        </html>
      `;

      console.log('✅ HTML de factura generado exitosamente');
      return html;

    } catch (error) {
      console.error('❌ Error generando HTML de factura:', error);
      return this.generateErrorHTML(error.message, invoiceData);
    }
  }

  /**
   * Generar HTML de error
   */
  generateErrorHTML(errorMessage, invoiceData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
          .error { color: red; font-size: 18px; margin: 20px 0; }
          .data { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>Error en Factura</h1>
        <div class="error">${errorMessage}</div>
        <div class="data">
          <h3>Datos disponibles:</h3>
          <p>Número: ${invoiceData?.receiptNumber || 'N/A'}</p>
          <p>Total: $${invoiceData?.totals?.total || 0}</p>
          <p>Fecha: ${new Date().toLocaleString('es-DO')}</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Obtener nombre del usuario actual
   */
  getCurrentUserName() {
    try {
      // Intentar obtener desde localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.name || user.username) {
        return user.name || user.username;
      }

      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser.name || currentUser.username) {
        return currentUser.name || currentUser.username;
      }

      const userName = localStorage.getItem('userName');
      if (userName) {
        return userName;
      }

      return 'Cajero';
    } catch (error) {
      console.warn('Error obteniendo nombre de usuario:', error);
      return 'Cajero';
    }
  }

  /**
   * Traducir método de pago
   */
  getPaymentMethodTranslation(method) {
    const translations = {
      'cash': 'Efectivo',
      'credit_card': 'Tarjeta',
      'bank_transfer': 'Transferencia',
      'credit': 'Crédito',
      'check': 'Cheque',
      'other': 'Otro'
    };
    return translations[method] || method;
  }

  /**
   * Imprimir factura
   */
  async printInvoice(invoiceData, options = {}) {
    try {
      console.log('🖨️ Iniciando impresión de factura...');

      // Generar HTML
      const html = this.generateInvoiceHTML(invoiceData, options);
      
      // Detectar plataforma
      if (this.isElectron()) {
        return await this.printInElectron(html, options);
      } else {
        return await this.printInBrowser(html);
      }

    } catch (error) {
      console.error('❌ Error imprimiendo factura:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detectar si estamos en Electron
   */
  isElectron() {
    try {
      // Verificar por User Agent primero
      const userAgent = navigator.userAgent;
      const isElectronFromUA = userAgent.includes('Electron');
      
      // Verificar por API disponible
      const hasElectronAPI = typeof window !== 'undefined' && 
                            window.electronAPI && 
                            typeof window.electronAPI.printContent === 'function';
      
      const isElectron = isElectronFromUA || hasElectronAPI;
      
      console.log('🔍 Detección de Electron:', {
        userAgent: userAgent,
        isElectronFromUA: isElectronFromUA,
        hasElectronAPI: hasElectronAPI,
        isElectron: isElectron
      });
      
      return isElectron;
    } catch (error) {
      console.error('❌ Error detectando Electron:', error);
      return false;
    }
  }

  /**
   * Imprimir en Electron
   */
  async printInElectron(html, options = {}) {
    try {
      console.log('🖨️ Verificando API de Electron...');
      
      if (!window.electronAPI) {
        throw new Error('API de Electron no disponible');
      }
      
      if (!window.electronAPI.printContent) {
        throw new Error('API de impresión de Electron no disponible');
      }

      const printOptions = {
        content: html,
        printerName: options.printerName || null,
        silent: options.silent || false,
        printBackground: options.printBackground !== false,
        copies: options.copies || 1,
        pageSize: options.pageSize || 'A4',
        landscape: options.landscape || false,
        margins: options.margins || { top: 10, bottom: 10, left: 10, right: 10 }
      };

      console.log('🖨️ Enviando a Electron:', printOptions);
      
      // Llamar a la API correcta
      const result = await window.electronAPI.printContent(printOptions);
      
      console.log('📋 Respuesta de Electron:', result);

      if (result && result.success) {
        console.log('✅ Impresión en Electron completada');
        return { success: true, message: 'Factura impresa correctamente', platform: 'electron' };
      } else {
        const errorMsg = result?.error || 'Error desconocido en Electron';
        console.error('❌ Error en respuesta de Electron:', errorMsg);
        throw new Error(errorMsg);
      }

    } catch (error) {
      console.error('❌ Error en Electron:', error);
      return { success: false, error: error.message, platform: 'electron' };
    }
  }

  /**
   * Imprimir en navegador
   */
  async printInBrowser(html) {
    try {
      console.log('🖨️ Imprimiendo en navegador...');

      // Crear ventana de impresión
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        throw new Error('No se pudo abrir ventana de impresión');
      }

      // Escribir contenido
      printWindow.document.write(html);
      printWindow.document.close();

      // Esperar a que se cargue
      await new Promise(resolve => {
        printWindow.onload = resolve;
        if (printWindow.document.readyState === 'complete') {
          resolve();
        }
      });

      // Imprimir
      printWindow.print();
      
      // Cerrar ventana después de un delay
      setTimeout(() => {
        printWindow.close();
      }, 1000);

      console.log('✅ Impresión en navegador completada');
      return { success: true, message: 'Factura enviada a impresión', platform: 'browser' };

    } catch (error) {
      console.error('❌ Error en navegador:', error);
      return { success: false, error: error.message, platform: 'browser' };
    }
  }

  /**
   * Obtener impresoras disponibles (solo en Electron)
   */
  async getPrinters() {
    try {
      if (!this.isElectron()) {
        return [];
      }

      if (!window.electronAPI.getPrinters) {
        return [];
      }

      const result = await window.electronAPI.getPrinters();
      if (result && result.success && Array.isArray(result.data)) {
        return result.data;
      } else {
        return [];
      }

    } catch (error) {
      console.error('❌ Error obteniendo impresoras:', error);
      return [];
    }
  }

  /**
   * Actualizar configuración de impresión
   */
  updatePrintConfig(newConfig) {
    try {
      this.printConfig = { ...this.printConfig, ...newConfig };
      localStorage.setItem('printConfig', JSON.stringify(this.printConfig));
      console.log('✅ Configuración de impresión actualizada:', this.printConfig);
      return true;
    } catch (error) {
      console.error('❌ Error actualizando configuración:', error);
      return false;
    }
  }

  /**
   * Actualizar información del negocio
   */
  updateBusinessInfo(newInfo) {
    try {
      this.businessInfo = { ...this.businessInfo, ...newInfo };
      localStorage.setItem('businessInfo', JSON.stringify(this.businessInfo));
      console.log('✅ BusinessInfo actualizado:', this.businessInfo);
      return true;
    } catch (error) {
      console.error('❌ Error actualizando businessInfo:', error);
      return false;
    }
  }
}

 

// Crear instancia global
const printService = new PrintService();

// Exportar funciones principales como wrappers para mantener el contexto `this`
// Evita errores como: "Cannot read properties of undefined (reading 'generateInvoiceHTML')"
export const printInvoice = (...args) => printService.printInvoice(...args);
export const generateInvoiceHTML = (...args) => printService.generateInvoiceHTML(...args);
export const getPrinters = (...args) => printService.getPrinters(...args);
export const updatePrintConfig = (...args) => printService.updatePrintConfig(...args);
export const updateBusinessInfo = (...args) => printService.updateBusinessInfo(...args);

// Exportar instancia completa para casos especiales
export default printService;
