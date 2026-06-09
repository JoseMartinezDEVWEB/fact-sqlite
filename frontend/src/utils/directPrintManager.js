// Sistema de impresión directo y confiable para Electron
// Enfoque directo sin complicaciones para garantizar que la impresión funcione

class DirectPrintManager {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    this.printers = [];
    this.initialized = false;
  }

  async initialize() {
    if (!this.isElectron) {
      console.warn('⚠️ No estamos en Electron');
      return false;
    }

    try {
      console.log('🔄 Inicializando sistema de impresión directo...');
      
      const printersResult = await window.electronAPI.getPrinters();
      if (printersResult.success) {
        this.printers = printersResult.data || [];
        console.log(`✅ ${this.printers.length} impresoras encontradas:`, 
          this.printers.map(p => `${p.name} (status: ${p.status})`));
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Error inicializando:', error);
      return false;
    }
  }

  // Generar HTML simple y directo
  generateDirectHTML(invoiceData) {
    if (!invoiceData || !invoiceData.items) {
      throw new Error('Datos de factura inválidos');
    }

    const totals = invoiceData.totals || {};
    const company = invoiceData.company || {};
    const items = invoiceData.items || [];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Factura</title>
  <style>
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.2;
      margin: 0;
      padding: 10px;
      width: 300px;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-bottom: 1px dashed #000; margin: 5px 0; }
    .item { margin: 3px 0; }
    .total { margin-top: 10px; padding-top: 5px; border-top: 1px solid #000; }
  </style>
</head>
<body>
  <div class="center bold">${company.name || 'EMPRESA'}</div>
  <div class="center">${company.address || ''}</div>
  <div class="center">RNC: ${company.rif || 'N/A'}</div>
  <div class="center">Tel: ${company.phone || 'N/A'}</div>
  
  <div class="line"></div>
  
  <div><strong>FACTURA N°:</strong> ${invoiceData.receiptNumber || 'N/A'}</div>
  <div><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-DO')}</div>
  <div><strong>Hora:</strong> ${new Date().toLocaleTimeString('es-DO')}</div>
  
  <div class="line"></div>
  
  <div class="center bold">PRODUCTOS</div>
  ${items.map(item => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price || item.unitPrice) || 0;
    const total = qty * price;
    return `
      <div class="item">
        <div class="bold">${item.name || 'Producto'}</div>
        <div>${qty} x $${price.toFixed(2)} = $${total.toFixed(2)}</div>
      </div>
    `;
  }).join('')}
  
  <div class="total">
    <div>Subtotal: $${(Number(totals.subtotal) || 0).toFixed(2)}</div>
    ${totals.tax && Number(totals.tax) > 0 ? 
      `<div>ITBIS: $${Number(totals.tax).toFixed(2)}</div>` : ''}
    <div class="bold">TOTAL: $${(Number(totals.total) || 0).toFixed(2)}</div>
  </div>
  
  ${this.generatePaymentHTML(invoiceData)}
  
  <div class="line"></div>
  <div class="center">¡Gracias por su compra!</div>
</body>
</html>`;
  }

  generatePaymentHTML(invoiceData) {
    const method = invoiceData.paymentMethod;
    const cash = Number(invoiceData.actualCashReceived) || 0;
    const total = Number(invoiceData.totals?.total) || 0;

    if (method === 'cash' && cash > 0) {
      const change = Math.max(0, cash - total);
      return `
        <div style="margin-top: 10px;">
          <div><strong>Método:</strong> Efectivo</div>
          <div><strong>Recibido:</strong> $${cash.toFixed(2)}</div>
          ${change > 0 ? `<div><strong>Cambio:</strong> $${change.toFixed(2)}</div>` : ''}
        </div>
      `;
    } else if (method === 'credit') {
      return `
        <div style="margin-top: 10px;">
          <div><strong>COMPRA FIADA</strong></div>
          <div>Cliente: ${invoiceData.client?.name || 'N/A'}</div>
        </div>
      `;
    }
    return '';
  }

  // Función de impresión directa y simple
  async print(invoiceData, options = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.isElectron) {
        return this.webPrint(invoiceData);
      }

      // Buscar impresora disponible
      const availablePrinters = this.printers.filter(p => p.status === 0);
      if (availablePrinters.length === 0) {
        throw new Error('No hay impresoras disponibles');
      }

      const printer = availablePrinters[0]; // Usar la primera disponible
      console.log(`🖨️ Imprimiendo en: ${printer.name}`);

      // Generar HTML simple
      const html = this.generateDirectHTML(invoiceData);

      // Configuración mínima y directa
      const printOptions = {
        content: html,
        printerName: printer.name,
        silent: true, // Imprimir sin diálogos
        margins: {
          marginType: 'minimum'
        }
      };

      console.log('📄 Enviando a impresora...');

      // Intentar imprimir con manejo de errores robusto
      const result = await window.electronAPI.printContent(printOptions);

      console.log('📋 Resultado de impresión:', result);

      if (result && result.success) {
        console.log('✅ Impresión completada exitosamente');
        return {
          success: true,
          printerUsed: printer.name,
          printerType: 'direct'
        };
      } else {
        // Si falla, intentar con configuración alternativa
        console.log('⚠️ Primer intento falló, probando configuración alternativa...');
        
        const altOptions = {
          content: html,
          printerName: printer.name,
          silent: false, // Mostrar diálogo como fallback
          margins: {
            marginType: 'default'
          }
        };

        const altResult = await window.electronAPI.printContent(altOptions);
        
        if (altResult && altResult.success) {
          console.log('✅ Impresión exitosa con configuración alternativa');
          return {
            success: true,
            printerUsed: printer.name,
            printerType: 'direct-alt'
          };
        } else {
          throw new Error(altResult?.error || result?.error || 'Error desconocido en impresión');
        }
      }

    } catch (error) {
      console.error('❌ Error en impresión directa:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fallback web
  async webPrint(invoiceData) {
    try {
      const html = this.generateDirectHTML(invoiceData);
      const printWindow = window.open('', '_blank');
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
      
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

  getStatus() {
    return {
      initialized: this.initialized,
      isElectron: this.isElectron,
      printersCount: this.printers.length,
      availablePrinters: this.printers.filter(p => p.status === 0).length
    };
  }
}

// Instancia global
const directPrintManager = new DirectPrintManager();

// Exportar funciones
export const initializePrintSystem = () => directPrintManager.initialize();
export const printInvoice = (invoiceData, options) => directPrintManager.print(invoiceData, options);
export const getPrintStatus = () => directPrintManager.getStatus();
export const refreshPrinters = () => directPrintManager.initialize();

export default directPrintManager;
