// Sistema de impresión simplificado y robusto para Electron
// Evita errores de configuración de pageSize usando enfoques más directos

class SimplePrintManager {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    this.printers = [];
    this.defaultPrinter = null;
    this.initialized = false;
  }

  // Inicializar el sistema
  async initialize() {
    if (!this.isElectron) {
      console.warn('⚠️ No estamos en Electron, usando fallback web');
      return false;
    }

    try {
      console.log('🔄 Inicializando sistema de impresión simple...');
      
      const printersResult = await window.electronAPI.getPrinters();
      if (printersResult.success) {
        this.printers = printersResult.data || [];
        console.log(`✅ ${this.printers.length} impresoras encontradas`);
      }

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

  // Detectar si es impresora térmica
  isThermalPrinter(printer) {
    const name = printer.name?.toLowerCase() || '';
    const thermalKeywords = [
      'thermal', 'pos', 'receipt', 'ticket', 'tm-', 'rp-', 'tsp-',
      'star', 'epson', 'bixolon', 'citizen', '80mm', '58mm'
    ];
    return thermalKeywords.some(keyword => name.includes(keyword));
  }

  // Configuración simplificada que evita errores de pageSize
  getSimplePrintSettings(printer) {
    const isThermal = this.isThermalPrinter(printer);
    
    // Configuración básica que funciona con todas las impresoras
    return {
      printerName: printer.name,
      silent: true, // Cambiar a true para evitar diálogos
      printBackground: false,
      color: false,
      margins: {
        marginType: 'minimum'
      },
      landscape: false,
      scaleFactor: isThermal ? 85 : 100, // Reducir escala para térmicas
      preferCSSPageSize: true, // Dejar que CSS maneje el tamaño
      pageSize: 'A4' // Especificar tamaño de página explícitamente
    };
  }

  // Generar HTML optimizado y simple
  generateSimpleHTML(invoiceData) {
    // Validar datos
    if (!invoiceData || !invoiceData.items) {
      throw new Error('Datos de factura inválidos');
    }

    const totals = invoiceData.totals || {};
    const company = invoiceData.company || {};
    const client = invoiceData.client || {};
    const items = invoiceData.items || [];

    // HTML con CSS inline para máxima compatibilidad
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Factura ${invoiceData.receiptNumber || 'N/A'}</title>
  <style>
    /* CSS optimizado para impresión */
    @media print {
      @page {
        margin: 5mm;
        size: auto;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.3;
      color: #000;
      background: #fff;
      max-width: 80mm;
      margin: 0 auto;
      padding: 5px;
    }
    
    .receipt {
      width: 100%;
    }
    
    .header {
      text-align: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #000;
    }
    
    .company-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .company-info {
      font-size: 10px;
      margin: 1px 0;
    }
    
    .invoice-info {
      margin: 8px 0;
      font-size: 10px;
    }
    
    .client-info {
      margin: 8px 0;
      padding: 4px;
      border: 1px dashed #666;
      font-size: 10px;
    }
    
    .items {
      margin: 10px 0;
    }
    
    .items-title {
      font-weight: bold;
      text-align: center;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    
    .item {
      margin: 4px 0;
      padding: 2px 0;
      border-bottom: 1px dotted #ccc;
      font-size: 10px;
    }
    
    .item-name {
      font-weight: bold;
      margin-bottom: 1px;
    }
    
    .item-details {
      font-size: 9px;
      color: #333;
    }
    
    .totals {
      margin: 10px 0;
      padding-top: 8px;
      border-top: 1px solid #000;
      font-size: 11px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    
    .total-final {
      font-weight: bold;
      font-size: 13px;
      border-top: 1px solid #000;
      padding-top: 4px;
      margin-top: 4px;
    }
    
    .payment {
      margin: 8px 0;
      text-align: center;
      font-size: 10px;
    }
    
    .footer {
      text-align: center;
      margin-top: 12px;
      font-size: 9px;
      border-top: 1px dashed #000;
      padding-top: 8px;
    }
    
    /* Estilos específicos para pantalla */
    @media screen {
      body {
        max-width: 300px;
        margin: 20px auto;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 5px;
        background: #f9f9f9;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Encabezado -->
    <div class="header">
      <div class="company-name">${company.name || 'Empresa'}</div>
      ${company.address ? `<div class="company-info">${company.address}</div>` : ''}
      ${company.rif ? `<div class="company-info">RNC: ${company.rif}</div>` : ''}
      ${company.phone ? `<div class="company-info">Tel: ${company.phone}</div>` : ''}
    </div>

    <!-- Info de factura -->
    <div class="invoice-info">
      <div><strong>FACTURA N°:</strong> ${invoiceData.receiptNumber || 'N/A'}</div>
      <div><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-DO')}</div>
      <div><strong>Hora:</strong> ${new Date().toLocaleTimeString('es-DO', { hour12: false })}</div>
    </div>

    <!-- Cliente -->
    ${client.name && client.name !== 'Cliente General' ? `
      <div class="client-info">
        <div><strong>Cliente:</strong> ${client.name}</div>
        ${client.identification ? `<div><strong>RNC/CI:</strong> ${client.identification}</div>` : ''}
      </div>
    ` : ''}

    <!-- Productos -->
    <div class="items">
      <div class="items-title">PRODUCTOS</div>
      ${items.map(item => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price || item.unitPrice) || 0;
        const total = qty * price;
        
        return `
          <div class="item">
            <div class="item-name">${item.name || item.description || 'Producto'}</div>
            <div class="item-details">
              ${qty} x $${price.toFixed(2)} = $${total.toFixed(2)}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Totales -->
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>$${(Number(totals.subtotal) || 0).toFixed(2)}</span>
      </div>
      ${totals.tax && Number(totals.tax) > 0 ? `
        <div class="total-row">
          <span>ITBIS:</span>
          <span>$${Number(totals.tax).toFixed(2)}</span>
        </div>
      ` : ''}
      <div class="total-row total-final">
        <span>TOTAL:</span>
        <span>$${(Number(totals.total) || 0).toFixed(2)}</span>
      </div>
    </div>

    <!-- Pago -->
    ${this.generatePaymentSection(invoiceData)}

    <!-- Pie -->
    <div class="footer">
      <div>¡Gracias por su compra!</div>
      <div>Impreso: ${new Date().toLocaleString('es-DO')}</div>
    </div>
  </div>
</body>
</html>`;
  }

  // Generar sección de pago
  generatePaymentSection(invoiceData) {
    const method = invoiceData.paymentMethod;
    const cash = Number(invoiceData.actualCashReceived) || 0;
    const total = Number(invoiceData.totals?.total) || 0;

    if (method === 'cash' && cash > 0) {
      const change = Math.max(0, cash - total);
      return `
        <div class="payment">
          <div><strong>Método:</strong> Efectivo</div>
          <div><strong>Recibido:</strong> $${cash.toFixed(2)}</div>
          ${change > 0 ? `<div><strong>Cambio:</strong> $${change.toFixed(2)}</div>` : ''}
        </div>
      `;
    } else if (method === 'credit') {
      return `
        <div class="payment">
          <div><strong>COMPRA FIADA</strong></div>
          <div>Cliente: ${invoiceData.client?.name || invoiceData.clientName || 'N/A'}</div>
        </div>
      `;
    } else {
      const methodNames = {
        'credit_card': 'Tarjeta',
        'bank_transfer': 'Transferencia',
        'cash': 'Efectivo'
      };
      return `
        <div class="payment">
          <div><strong>Método:</strong> ${methodNames[method] || method || 'N/A'}</div>
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
        return this.webPrint(invoiceData);
      }

      // Seleccionar impresora
      const printer = options.printerName 
        ? this.printers.find(p => p.name === options.printerName)
        : this.selectBestPrinter();

      if (!printer) {
        throw new Error('No hay impresoras disponibles');
      }

      console.log(`🖨️ Imprimiendo en: ${printer.name}`);

      // Generar HTML
      const html = this.generateSimpleHTML(invoiceData);

      // Configuración simplificada
      const printOptions = {
        ...this.getSimplePrintSettings(printer),
        content: html,
        silent: options.silent || false
      };

      console.log('⚙️ Opciones de impresión:', {
        printer: printer.name,
        silent: printOptions.silent,
        isThermal: this.isThermalPrinter(printer)
      });

      // Verificar que la impresora esté disponible antes de imprimir
      if (printer.status !== 0) {
        console.warn(`⚠️ Impresora ${printer.name} no está disponible (status: ${printer.status})`);
      }

      // Imprimir con timeout para evitar cuelgues
      const result = await Promise.race([
        window.electronAPI.printContent(printOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout en impresión')), 30000)
        )
      ]);

      if (result.success) {
        console.log('✅ Impresión exitosa');
        return {
          success: true,
          printerUsed: printer.name,
          printerType: this.isThermalPrinter(printer) ? 'thermal' : 'standard'
        };
      } else {
        throw new Error(result.error || 'Error en impresión');
      }

    } catch (error) {
      console.error('❌ Error imprimiendo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Seleccionar mejor impresora
  selectBestPrinter() {
    if (!this.printers.length) return null;

    // Preferir impresora por defecto si está disponible
    if (this.defaultPrinter && this.defaultPrinter.status === 0) {
      return this.defaultPrinter;
    }

    // Buscar primera impresora disponible
    return this.printers.find(p => p.status === 0) || this.printers[0];
  }

  // Fallback web
  async webPrint(invoiceData) {
    try {
      const html = this.generateSimpleHTML(invoiceData);
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Esperar a que cargue y luego imprimir
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };

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

  // Estado del sistema
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
const simplePrintManager = new SimplePrintManager();

// Exportar funciones
export const initializePrintSystem = () => simplePrintManager.initialize();
export const printInvoice = (invoiceData, options) => simplePrintManager.print(invoiceData, options);
export const getPrintStatus = () => simplePrintManager.getStatus();
export const refreshPrinters = () => simplePrintManager.initialize();

export default simplePrintManager;
