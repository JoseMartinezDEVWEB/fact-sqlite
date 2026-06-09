// Utilidad para detectar, clasificar y configurar impresoras disponibles

// Mapa de marcas conocidas con palabras clave y configuración de papel sugerida
const PRINTER_BRANDS = {
  'Epson': {
    keywords: ['epson', 'tm-t', 'tm-u', 'tm88', 'tm-88', 'l3', 'l6', 'l800', 'xp-', 'stylus'],
    isThermal: true,
    defaultPaperSize: 'receipt',
    defaultWidth: 80,
  },
  'Star Micronics': {
    keywords: ['star ', 'tsp1', 'tsp6', 'tsp7', 'tsp8', 'mcp', 'sp5', 'sp7', 'star micronics'],
    isThermal: true,
    defaultPaperSize: 'receipt',
    defaultWidth: 80,
  },
  'Bixolon': {
    keywords: ['bixolon', 'srp-3', 'srp-5', 'srp-7', 'slp-', 'xd3', 'xd5'],
    isThermal: true,
    defaultPaperSize: 'receipt',
    defaultWidth: 80,
  },
  'Citizen': {
    keywords: ['citizen', 'ct-s', 'cbm-', 'ct-e', 'cl-s'],
    isThermal: true,
    defaultPaperSize: 'receipt',
    defaultWidth: 80,
  },
  'Posiflex': {
    keywords: ['posiflex', 'pp-', 'aura-'],
    isThermal: true,
    defaultPaperSize: 'receipt',
    defaultWidth: 80,
  },
  'Zebra': {
    keywords: ['zebra', 'zp4', 'zp5', 'gk4', 'gk2', 'gc4', 'gt8', 'zt2', 'zt4', 'zd4', 'zd2'],
    isThermal: true,
    defaultPaperSize: 'receipt',
    defaultWidth: 80,
  },
  'Custom / POS58': {
    keywords: ['pos58', 'pos-58', '58mm', 'thermal 58'],
    isThermal: true,
    defaultPaperSize: 'receipt',
    defaultWidth: 58,
  },
  'Custom / POS80': {
    keywords: ['pos80', 'pos-80', '80mm', 'thermal 80', 'thermal receipt'],
    isThermal: true,
    defaultPaperSize: 'receipt',
    defaultWidth: 80,
  },
  'HP': {
    keywords: ['hp ', 'hewlett', 'laserjet', 'deskjet', 'officejet', 'envy', 'photosmart', 'hp-'],
    isThermal: false,
    defaultPaperSize: 'letter',
    defaultWidth: 216,
  },
  'Canon': {
    keywords: ['canon', 'pixma', 'imagerunner', 'imageclass', 'lbp', 'mf4', 'mf6', 'mf8'],
    isThermal: false,
    defaultPaperSize: 'a4',
    defaultWidth: 210,
  },
  'Brother': {
    keywords: ['brother', 'hl-', 'mfc-', 'dcp-', 'ql-'],
    isThermal: false,
    defaultPaperSize: 'a4',
    defaultWidth: 210,
  },
  'Samsung': {
    keywords: ['samsung', 'xpress', 'clp-', 'clx-', 'scx-', 'sl-m'],
    isThermal: false,
    defaultPaperSize: 'a4',
    defaultWidth: 210,
  },
  'Xerox': {
    keywords: ['xerox', 'phaser', 'workcentre', 'versalink', 'altalink'],
    isThermal: false,
    defaultPaperSize: 'a4',
    defaultWidth: 210,
  },
  'Lexmark': {
    keywords: ['lexmark', 'optra', 'ms3', 'ms4', 'ms6', 'ms8', 'mx3', 'mx4'],
    isThermal: false,
    defaultPaperSize: 'a4',
    defaultWidth: 210,
  },
  'Ricoh': {
    keywords: ['ricoh', 'aficio', 'sp ', 'mp ', 'im '],
    isThermal: false,
    defaultPaperSize: 'a4',
    defaultWidth: 210,
  },
};

class PrinterDetector {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
  }

  // Detecta la marca de una impresora a partir de su nombre
  detectPrinterBrand(printerName) {
    const nameLower = (printerName || '').toLowerCase();

    for (const [brand, info] of Object.entries(PRINTER_BRANDS)) {
      if (info.keywords.some(kw => nameLower.includes(kw))) {
        return { brand, ...info };
      }
    }

    // Heurística de respaldo: si contiene palabras clave genéricas de térmica
    const thermalHints = ['thermal', 'receipt', 'pos', 'ticket', 'direct'];
    if (thermalHints.some(h => nameLower.includes(h))) {
      return {
        brand: 'Térmica (genérica)',
        isThermal: true,
        defaultPaperSize: 'receipt',
        defaultWidth: 80,
      };
    }

    return {
      brand: 'Desconocida',
      isThermal: false,
      defaultPaperSize: 'receipt',
      defaultWidth: 80,
    };
  }

  // Sugiere configuración de papel según el nombre de la impresora
  suggestPaperConfig(printerName) {
    const info = this.detectPrinterBrand(printerName);
    return {
      brand:         info.brand,
      isThermal:     info.isThermal,
      paperSize:     info.defaultPaperSize,
      paperWidth:    info.defaultWidth,
      printerType:   info.isThermal ? 'thermal' : 'standard',
    };
  }

  // Detectar todas las impresoras disponibles
  async detectPrinters() {
    if (!this.isElectron) {
      console.warn('⚠️ No estamos en Electron - no se pueden detectar impresoras');
      return [];
    }

    try {
      console.log('🔍 Detectando impresoras...');
      
      const result = await window.electronAPI.getPrinters();
      
      if (result.success) {
        const printers = result.data || [];
        console.log(`✅ ${printers.length} impresoras detectadas:`);
        
        printers.forEach((printer, index) => {
          console.log(`📄 Impresora ${index + 1}:`, {
            nombre: printer.name,
            estado: this.getStatusText(printer.status),
            porDefecto: printer.isDefault ? 'Sí' : 'No',
            descripcion: printer.description || 'N/A'
          });
        });
        
        return printers;
      } else {
        console.error('❌ Error detectando impresoras:', result.error);
        return [];
      }
    } catch (error) {
      console.error('❌ Error en detección:', error);
      return [];
    }
  }

  // Obtener impresora por defecto
  async getDefaultPrinter() {
    if (!this.isElectron) return null;

    try {
      const result = await window.electronAPI.getDefaultPrinter();
      
      if (result.success && result.data) {
        console.log('🎯 Impresora por defecto:', result.data.name);
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo impresora por defecto:', error);
      return null;
    }
  }

  // Convertir código de estado a texto
  getStatusText(status) {
    const statusMap = {
      0: 'Disponible',
      1: 'Ocupada',
      2: 'Error',
      3: 'Sin conexión',
      4: 'Sin papel',
      5: 'Sin tinta',
      6: 'Atascada'
    };
    
    return statusMap[status] || `Estado ${status}`;
  }

  // Clasificar impresoras por tipo
  classifyPrinters(printers) {
    const thermal = [];
    const standard = [];
    
    printers.forEach(printer => {
      const name = printer.name.toLowerCase();
      const description = (printer.description || '').toLowerCase();
      
      const thermalKeywords = [
        'thermal', 'pos', 'receipt', 'ticket', 'tm-', 'rp-', 'tsp-',
        'star', 'epson', 'bixolon', 'citizen', '80mm', '58mm'
      ];
      
      const isThermal = thermalKeywords.some(keyword => 
        name.includes(keyword) || description.includes(keyword)
      );
      
      if (isThermal) {
        thermal.push(printer);
      } else {
        standard.push(printer);
      }
    });
    
    return { thermal, standard };
  }

  // Mostrar reporte completo de impresoras
  async showPrinterReport() {
    console.log('🖨️ === REPORTE DE IMPRESORAS ===');
    
    const printers = await this.detectPrinters();
    const defaultPrinter = await this.getDefaultPrinter();
    const classified = this.classifyPrinters(printers);
    
    console.log('\n📊 RESUMEN:');
    console.log(`Total de impresoras: ${printers.length}`);
    console.log(`Impresoras térmicas: ${classified.thermal.length}`);
    console.log(`Impresoras estándar: ${classified.standard.length}`);
    console.log(`Impresora por defecto: ${defaultPrinter?.name || 'Ninguna'}`);
    
    if (classified.thermal.length > 0) {
      console.log('\n🎫 IMPRESORAS TÉRMICAS:');
      classified.thermal.forEach(printer => {
        console.log(`  • ${printer.name} - ${this.getStatusText(printer.status)}`);
      });
    }
    
    if (classified.standard.length > 0) {
      console.log('\n🖨️ IMPRESORAS ESTÁNDAR:');
      classified.standard.forEach(printer => {
        console.log(`  • ${printer.name} - ${this.getStatusText(printer.status)}`);
      });
    }
    
    const available = printers.filter(p => p.status === 0);
    console.log(`\n✅ Impresoras disponibles para usar: ${available.length}`);
    
    return {
      total: printers.length,
      thermal: classified.thermal.length,
      standard: classified.standard.length,
      available: available.length,
      defaultPrinter: defaultPrinter?.name || 'Ninguna'
    };
  }
}

// Instancia global
const printerDetector = new PrinterDetector();

// Funciones de conveniencia
export const detectAllPrinters    = ()          => printerDetector.detectPrinters();
export const getDefaultPrinter    = ()          => printerDetector.getDefaultPrinter();
export const showPrinterReport    = ()          => printerDetector.showPrinterReport();
export const classifyPrinters     = (printers)  => printerDetector.classifyPrinters(printers);
export const detectPrinterBrand   = (name)      => printerDetector.detectPrinterBrand(name);
export const suggestPaperConfig   = (name)      => printerDetector.suggestPaperConfig(name);

export default printerDetector;
