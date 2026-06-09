// Sistema de impresión optimizado para Electron
// Maneja diferentes tipos de impresoras y resuelve problemas de dimensiones

class ElectronPrintManager {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    this.printers = [];
    this.defaultPrinter = null;
    this.initialized = false;
  }

  // Inicializar el sistema de impresión
  async initialize() {
    if (!this.isElectron) {
      console.warn('⚠️ No estamos en Electron, usando fallback web');
      return false;
    }

    try {
      console.log('🔄 Inicializando sistema de impresión Electron...');
      
      // Obtener impresoras disponibles
      const printersResult = await window.electronAPI.getPrinters();
      if (printersResult.success) {
        this.printers = printersResult.data || [];
        console.log(`✅ ${this.printers.length} impresoras encontradas`);
      }

      // Obtener impresora por defecto
      const defaultResult = await window.electronAPI.getDefaultPrinter();
      if (defaultResult.success) {
        this.defaultPrinter = defaultResult.data;
        console.log(`✅ Impresora por defecto: ${this.defaultPrinter?.name}`);
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Error inicializando impresión:', error);
      return false;
    }
  }

  // Detectar tipo de impresora basado en nombre y características
  detectPrinterType(printer) {
    const name = printer.name?.toLowerCase() || '';
    const description = printer.description?.toLowerCase() || '';
    
    // Patrones para impresoras térmicas/POS
    const thermalPatterns = [
      'thermal', 'pos', 'receipt', 'ticket', 'tm-', 'rp-', 'tsp-',
      'star', 'epson', 'bixolon', 'citizen', 'zebra', 'datamax',
      '80mm', '58mm', 'xp-', 'ct-'
    ];

    const isThermal = thermalPatterns.some(pattern => 
      name.includes(pattern) || description.includes(pattern)
    );

    return {
      type: isThermal ? 'thermal' : 'standard',
      isThermal,
      isStandard: !isThermal
    };
  }

  // Configuraciones optimizadas por tipo de impresora
  getPrintSettings(printer, documentType = 'receipt') {
    const printerType = this.detectPrinterType(printer);
    
    if (printerType.isThermal) {
      return {
        // Configuración para impresoras térmicas - usar tamaño estándar
        pageSize: 'A4', // Usar tamaño estándar para evitar errores
        margins: {
          marginType: 'custom',
          top: 5,      // 5mm
          bottom: 5,   // 5mm
          left: 5,     // 5mm
          right: 5     // 5mm
        },
        printBackground: false,
        color: false,
        headerFooter: false,
        landscape: false,
        preferCSSPageSize: true, // Permitir que CSS controle el tamaño
        scaleFactor: 100,
        silent: false
      };
    } else {
      return {
        // Configuración para impresoras estándar
        pageSize: 'A4',
        margins: {
          marginType: 'minimum'
        },
        printBackground: true,
        color: true,
        headerFooter: false,
        landscape: false,
        preferCSSPageSize: true,
        scaleFactor: 100,
        silent: false
      };
    }
  }

  // Generar HTML optimizado según tipo de impresora
  generateOptimizedHTML(invoiceData, printerType) {
    const isThermal = printerType === 'thermal';
    
    // Validar datos de entrada
    if (!invoiceData || !invoiceData.items) {
      throw new Error('Datos de factura inválidos');
    }

    const totals = invoiceData.totals || {};
    const company = invoiceData.company || {};
    const client = invoiceData.client || {};
    const items = invoiceData.items || [];

    // Generar CSS específico para el tipo de impresora
    const css = isThermal ? this.getThermalCSS() : this.getStandardCSS();
    
    // Generar contenido HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura ${invoiceData.receiptNumber || 'N/A'}</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="invoice">
          <!-- Encabezado -->
          <div class="header">
            <div class="company-name">${company.name || 'Empresa'}</div>
            ${company.address ? `<div class="company-info">${company.address}</div>` : ''}
            ${company.rif ? `<div class="company-info">RNC: ${company.rif}</div>` : ''}
            ${company.phone ? `<div class="company-info">Tel: ${company.phone}</div>` : ''}
          </div>

          <!-- Información de factura -->
          <div class="invoice-info">
            <div><strong>FACTURA N°:</strong> ${invoiceData.receiptNumber || 'N/A'}</div>
            <div><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-DO')}</div>
            <div><strong>Hora:</strong> ${new Date().toLocaleTimeString('es-DO')}</div>
          </div>

          <!-- Cliente (solo si no es cliente general) -->
          ${client.name && client.name !== 'Cliente General' ? `
            <div class="client-info">
              <div><strong>Cliente:</strong> ${client.name}</div>
              ${client.identification ? `<div><strong>RNC/CI:</strong> ${client.identification}</div>` : ''}
            </div>
          ` : ''}

          <!-- Productos -->
          <div class="items">
            <div class="items-header">PRODUCTOS</div>
            ${items.map(item => {
              const quantity = Number(item.quantity) || 1;
              const price = Number(item.price || item.unitPrice) || 0;
              const total = quantity * price;
              
              return `
                <div class="item">
                  <div class="item-name">${item.name || item.description || 'Producto'}</div>
                  <div class="item-details">
                    ${quantity} x $${price.toFixed(2)} = $${total.toFixed(2)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Totales -->
          <div class="totals">
            <div class="total-line">
              <span>Subtotal:</span>
              <span>$${(Number(totals.subtotal) || 0).toFixed(2)}</span>
            </div>
            ${totals.tax && Number(totals.tax) > 0 ? `
              <div class="total-line">
                <span>ITBIS:</span>
                <span>$${Number(totals.tax).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-line total-final">
              <span>TOTAL:</span>
              <span>$${(Number(totals.total) || 0).toFixed(2)}</span>
            </div>
          </div>

          <!-- Información de pago -->
          ${this.generatePaymentInfo(invoiceData)}

          <!-- Pie de página -->
          <div class="footer">
            <div>¡Gracias por su compra!</div>
            <div class="print-time">Impreso: ${new Date().toLocaleString('es-DO')}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  // CSS para impresoras térmicas (80mm)
  getThermalCSS() {
    return `
      @page {
        size: 80mm auto;
        margin: 2mm;
      }
      
      @media print {
        @page {
          size: 80mm auto;
          margin: 2mm;
        }
        
        body {
          width: 76mm !important;
          max-width: 76mm !important;
        }
      }
      
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      body {
        font-family: 'Courier New', monospace;
        font-size: 11px;
        line-height: 1.2;
        width: 76mm;
        max-width: 76mm;
        margin: 0 auto;
        padding: 1mm;
        background: white;
        color: black;
        overflow-x: hidden;
      }
      
      .invoice {
        width: 100%;
        max-width: 74mm;
      }
      
      .header {
        text-align: center;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px dashed #000;
      }
      
      .company-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 3px;
      }
      
      .company-info {
        font-size: 10px;
        margin: 1px 0;
      }
      
      .invoice-info {
        margin: 6px 0;
        font-size: 10px;
      }
      
      .client-info {
        margin: 6px 0;
        padding: 3px;
        border: 1px dashed #666;
        font-size: 10px;
      }
      
      .items {
        margin: 8px 0;
      }
      
      .items-header {
        font-weight: bold;
        border-bottom: 1px solid #000;
        padding-bottom: 3px;
        margin-bottom: 5px;
        text-align: center;
      }
      
      .item {
        margin: 4px 0;
        padding: 2px 0;
        border-bottom: 1px dotted #ccc;
      }
      
      .item-name {
        font-weight: bold;
        font-size: 11px;
      }
      
      .item-details {
        font-size: 10px;
        color: #333;
      }
      
      .totals {
        margin: 8px 0;
        padding-top: 6px;
        border-top: 1px solid #000;
      }
      
      .total-line {
        display: flex;
        justify-content: space-between;
        margin: 2px 0;
        font-size: 11px;
      }
      
      .total-final {
        font-weight: bold;
        font-size: 13px;
        border-top: 1px solid #000;
        padding-top: 3px;
        margin-top: 3px;
      }
      
      .payment-info {
        margin: 6px 0;
        font-size: 10px;
        text-align: center;
      }
      
      .footer {
        text-align: center;
        margin-top: 10px;
        font-size: 9px;
        border-top: 1px dashed #000;
        padding-top: 6px;
      }
      
      .print-time {
        margin-top: 2px;
        color: #666;
      }
    `;
  }

  // CSS para impresoras estándar (A4)
  getStandardCSS() {
    return `
      @page {
        size: A4;
        margin: 15mm;
      }
      
      body {
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        color: #000;
        background: white;
      }
      
      .invoice {
        max-width: 100%;
        margin: 0 auto;
      }
      
      .header {
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #000;
      }
      
      .company-name {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 8px;
      }
      
      .company-info {
        font-size: 12px;
        margin: 3px 0;
      }
      
      .invoice-info {
        margin: 15px 0;
        font-size: 12px;
      }
      
      .client-info {
        margin: 15px 0;
        padding: 10px;
        border: 1px solid #666;
        font-size: 12px;
      }
      
      .items {
        margin: 20px 0;
      }
      
      .items-header {
        font-weight: bold;
        font-size: 16px;
        border-bottom: 2px solid #000;
        padding-bottom: 8px;
        margin-bottom: 10px;
        text-align: center;
      }
      
      .item {
        margin: 8px 0;
        padding: 5px 0;
        border-bottom: 1px dotted #ccc;
      }
      
      .item-name {
        font-weight: bold;
        font-size: 14px;
      }
      
      .item-details {
        font-size: 12px;
        color: #555;
        margin-top: 2px;
      }
      
      .totals {
        margin: 20px 0;
        padding-top: 15px;
        border-top: 2px solid #000;
      }
      
      .total-line {
        display: flex;
        justify-content: space-between;
        margin: 5px 0;
        font-size: 14px;
      }
      
      .total-final {
        font-weight: bold;
        font-size: 18px;
        border-top: 1px solid #000;
        padding-top: 8px;
        margin-top: 8px;
      }
      
      .payment-info {
        margin: 15px 0;
        font-size: 12px;
        text-align: center;
      }
      
      .footer {
        text-align: center;
        margin-top: 30px;
        font-size: 11px;
        border-top: 1px solid #000;
        padding-top: 15px;
      }
      
      .print-time {
        margin-top: 5px;
        color: #666;
      }
    `;
  }

  // Generar información de pago
  generatePaymentInfo(invoiceData) {
    const paymentMethod = invoiceData.paymentMethod;
    const totals = invoiceData.totals || {};
    const cashReceived = Number(invoiceData.actualCashReceived) || 0;
    const total = Number(totals.total) || 0;

    if (paymentMethod === 'cash' && cashReceived > 0) {
      const change = Math.max(0, cashReceived - total);
      return `
        <div class="payment-info">
          <div><strong>Método:</strong> Efectivo</div>
          <div><strong>Recibido:</strong> $${cashReceived.toFixed(2)}</div>
          ${change > 0 ? `<div><strong>Cambio:</strong> $${change.toFixed(2)}</div>` : ''}
        </div>
      `;
    } else if (paymentMethod === 'credit') {
      return `
        <div class="payment-info">
          <div><strong>COMPRA FIADA</strong></div>
          <div>Cliente: ${invoiceData.client?.name || invoiceData.clientName || 'N/A'}</div>
        </div>
      `;
    } else {
      const methodName = {
        'credit_card': 'Tarjeta',
        'bank_transfer': 'Transferencia',
        'cash': 'Efectivo'
      }[paymentMethod] || paymentMethod || 'N/A';

      return `
        <div class="payment-info">
          <div><strong>Método:</strong> ${methodName}</div>
        </div>
      `;
    }
  }

  // Función principal de impresión
  async print(invoiceData, options = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.isElectron) {
        return this.fallbackWebPrint(invoiceData);
      }

      // Seleccionar impresora
      const targetPrinter = options.printerName 
        ? this.printers.find(p => p.name === options.printerName)
        : this.selectBestPrinter(options.documentType);

      if (!targetPrinter) {
        throw new Error('No hay impresoras disponibles');
      }

      console.log(`🖨️ Imprimiendo en: ${targetPrinter.name}`);

      // Detectar tipo de impresora
      const printerType = this.detectPrinterType(targetPrinter);
      console.log(`📋 Tipo detectado: ${printerType.type}`);

      // Generar HTML optimizado
      const html = this.generateOptimizedHTML(invoiceData, printerType.type);

      // Configurar opciones de impresión
      const printSettings = {
        ...this.getPrintSettings(targetPrinter, options.documentType),
        printerName: targetPrinter.name,
        silent: options.silent || false,
        content: html
      };

      console.log('⚙️ Configuración de impresión:', printSettings);

      // Ejecutar impresión
      const result = await window.electronAPI.printContent(printSettings);

      if (result.success) {
        console.log('✅ Impresión exitosa');
        return {
          success: true,
          printerUsed: targetPrinter.name,
          printerType: printerType.type
        };
      } else {
        throw new Error(result.error || 'Error desconocido en impresión');
      }

    } catch (error) {
      console.error('❌ Error en impresión:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Seleccionar la mejor impresora disponible
  selectBestPrinter(documentType = 'receipt') {
    if (!this.printers.length) return null;

    // Para recibos, preferir impresoras térmicas
    if (documentType === 'receipt') {
      const thermal = this.printers.find(p => 
        this.detectPrinterType(p).isThermal && p.status === 0
      );
      if (thermal) return thermal;
    }

    // Usar impresora por defecto si está disponible
    if (this.defaultPrinter && this.defaultPrinter.status === 0) {
      return this.defaultPrinter;
    }

    // Usar la primera impresora disponible
    return this.printers.find(p => p.status === 0) || this.printers[0];
  }

  // Fallback para impresión web
  async fallbackWebPrint(invoiceData) {
    try {
      const html = this.generateOptimizedHTML(invoiceData, 'standard');
      const printWindow = window.open('', '_blank');
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();

      return {
        success: true,
        printerUsed: 'Navegador Web',
        printerType: 'web'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener estado del sistema
  getStatus() {
    return {
      initialized: this.initialized,
      isElectron: this.isElectron,
      printersCount: this.printers.length,
      defaultPrinter: this.defaultPrinter?.name || 'Ninguna',
      availablePrinters: this.printers.filter(p => p.status === 0).length
    };
  }
}

// Instancia global
const electronPrintManager = new ElectronPrintManager();

// Funciones de conveniencia para exportar
export const initializePrintSystem = () => electronPrintManager.initialize();
export const printInvoice = (invoiceData, options) => electronPrintManager.print(invoiceData, options);
export const getPrintStatus = () => electronPrintManager.getStatus();
export const refreshPrinters = () => electronPrintManager.initialize();

export default electronPrintManager;
