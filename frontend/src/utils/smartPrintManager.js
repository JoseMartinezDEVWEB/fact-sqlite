/**
 * Sistema Inteligente de Gestión de Impresión
 * Detecta automáticamente tipos de impresoras y configura la impresión óptima
 */

class SmartPrintManager {
  constructor() {
    this.printers = [];
    this.defaultPrinter = null;
    this.thermalPrinters = [];
    this.standardPrinters = [];
    this.isInitialized = false;
    this.config = this.loadConfig();
  }

  /**
   * Cargar configuración guardada
   */
  loadConfig() {
    try {
      const saved = localStorage.getItem('smart_print_config');
      return saved ? JSON.parse(saved) : {
        autoDetectPrinters: true,
        preferThermalForReceipts: true,
        fallbackToStandard: true,
        silentPrint: false,
        autoSelectBest: true,
        lastUsedPrinter: null,
        printerPreferences: {}
      };
    } catch (error) {
      console.error('Error cargando configuración:', error);
      return {
        autoDetectPrinters: true,
        preferThermalForReceipts: true,
        fallbackToStandard: true,
        silentPrint: false,
        autoSelectBest: true,
        lastUsedPrinter: null,
        printerPreferences: {}
      };
    }
  }

  /**
   * Guardar configuración
   */
  saveConfig() {
    try {
      localStorage.setItem('smart_print_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error guardando configuración:', error);
    }
  }

  /**
   * Inicializar el sistema de impresión
   */
  async initialize() {
    try {
      console.log('🔄 Inicializando Smart Print Manager...');
      
      if (!this.isElectronAvailable()) {
        console.warn('⚠️ Electron no disponible, usando modo web');
        this.isInitialized = true;
        return { success: true, mode: 'web' };
      }

      // Obtener lista de impresoras
      await this.detectPrinters();
      
      // Clasificar impresoras por tipo
      this.classifyPrinters();
      
      // Seleccionar impresora por defecto inteligente
      this.selectSmartDefault();
      
      this.isInitialized = true;
      console.log('✅ Smart Print Manager inicializado');
      
      return {
        success: true,
        mode: 'electron',
        printers: this.printers.length,
        thermal: this.thermalPrinters.length,
        standard: this.standardPrinters.length,
        defaultPrinter: this.defaultPrinter
      };
    } catch (error) {
      console.error('❌ Error inicializando Smart Print Manager:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detectar todas las impresoras disponibles
   */
  async detectPrinters() {
    try {
      if (!window.electronAPI?.getPrinters) {
        throw new Error('API de impresoras no disponible');
      }

      const result = await window.electronAPI.getPrinters();
      if (result.success && Array.isArray(result.data)) {
        this.printers = result.data.map(printer => ({
          ...printer,
          type: this.detectPrinterType(printer),
          capabilities: this.analyzePrinterCapabilities(printer),
          score: this.calculatePrinterScore(printer)
        }));
        
        console.log(`🖨️ Detectadas ${this.printers.length} impresoras`);
        return this.printers;
      } else {
        throw new Error(result.error || 'No se pudieron obtener las impresoras');
      }
    } catch (error) {
      console.error('❌ Error detectando impresoras:', error);
      this.printers = [];
      return [];
    }
  }

  /**
   * Detectar el tipo de impresora basado en características
   */
  detectPrinterType(printer) {
    const name = (printer.name || '').toLowerCase();
    const description = (printer.description || '').toLowerCase();
    const displayName = (printer.displayName || '').toLowerCase();
    
    // Patrones para impresoras térmicas/POS
    const thermalPatterns = [
      'thermal', 'pos', 'receipt', 'ticket', 'tm-', 'rp-', 'tsp-',
      'star', 'epson', 'bixolon', 'citizen', 'zebra', 'datamax',
      'tmu', 'tsp', 'fvp', 'srp', 'slp', 'tlp', 'zd', 'gk',
      '80mm', '58mm', 'recibo', 'termica'
    ];
    
    // Patrones para impresoras de inyección/láser
    const standardPatterns = [
      'laser', 'inkjet', 'deskjet', 'laserjet', 'officejet',
      'pixma', 'workforce', 'brother', 'canon', 'hp', 'samsung',
      'xerox', 'kyocera', 'ricoh', 'a4', 'letter'
    ];

    const allText = `${name} ${description} ${displayName}`;
    
    // Verificar patrones térmicos
    for (const pattern of thermalPatterns) {
      if (allText.includes(pattern)) {
        return 'thermal';
      }
    }
    
    // Verificar patrones estándar
    for (const pattern of standardPatterns) {
      if (allText.includes(pattern)) {
        return 'standard';
      }
    }
    
    // Análisis adicional por opciones de la impresora
    if (printer.options) {
      const options = JSON.stringify(printer.options).toLowerCase();
      if (options.includes('receipt') || options.includes('thermal') || options.includes('pos')) {
        return 'thermal';
      }
    }
    
    // Por defecto, asumir estándar si no se puede determinar
    return 'standard';
  }

  /**
   * Analizar capacidades de la impresora
   */
  analyzePrinterCapabilities(printer) {
    const capabilities = {
      color: false,
      duplex: false,
      sizes: ['A4'],
      maxWidth: 210, // mm
      thermal: false,
      network: false
    };

    const name = (printer.name || '').toLowerCase();
    const description = (printer.description || '').toLowerCase();
    
    // Detectar capacidades de color
    if (name.includes('color') || description.includes('color') || 
        name.includes('colour') || description.includes('colour')) {
      capabilities.color = true;
    }
    
    // Detectar duplex
    if (name.includes('duplex') || description.includes('duplex') ||
        name.includes('double') || description.includes('double')) {
      capabilities.duplex = true;
    }
    
    // Detectar si es térmica
    if (printer.type === 'thermal') {
      capabilities.thermal = true;
      capabilities.sizes = ['80mm', '58mm', 'receipt'];
      capabilities.maxWidth = 80;
    }
    
    // Detectar si es de red
    if (name.includes('network') || name.includes('ip') || 
        name.includes('wifi') || name.includes('ethernet')) {
      capabilities.network = true;
    }

    return capabilities;
  }

  /**
   * Calcular puntuación de la impresora para selección automática
   */
  calculatePrinterScore(printer) {
    let score = 0;
    
    // Puntuación base por estar disponible
    if (printer.status === 0 || printer.status === 'idle') {
      score += 50;
    }
    
    // Bonificación por ser impresora por defecto del sistema
    if (printer.isDefault) {
      score += 30;
    }
    
    // Bonificación por tipo según preferencias
    if (printer.type === 'thermal' && this.config.preferThermalForReceipts) {
      score += 40;
    }
    
    // Penalización por estar offline o con errores
    if (printer.status === 'offline' || printer.status === 'error') {
      score -= 100;
    }
    
    // Bonificación por uso previo
    if (this.config.lastUsedPrinter === printer.name) {
      score += 20;
    }
    
    // Bonificación por preferencias del usuario
    const userPref = this.config.printerPreferences[printer.name];
    if (userPref) {
      score += userPref.preference || 0;
    }
    
    return Math.max(0, score);
  }

  /**
   * Clasificar impresoras por tipo
   */
  classifyPrinters() {
    this.thermalPrinters = this.printers.filter(p => p.type === 'thermal');
    this.standardPrinters = this.printers.filter(p => p.type === 'standard');
    
    console.log(`📊 Clasificación: ${this.thermalPrinters.length} térmicas, ${this.standardPrinters.length} estándar`);
  }

  /**
   * Seleccionar impresora por defecto de forma inteligente
   */
  selectSmartDefault() {
    if (this.printers.length === 0) {
      this.defaultPrinter = null;
      return;
    }
    
    // Ordenar por puntuación
    const sortedPrinters = [...this.printers].sort((a, b) => b.score - a.score);
    
    // Seleccionar la de mayor puntuación que esté disponible
    this.defaultPrinter = sortedPrinters.find(p => p.score > 0) || sortedPrinters[0];
    
    console.log(`🎯 Impresora por defecto seleccionada: ${this.defaultPrinter?.name} (score: ${this.defaultPrinter?.score})`);
  }

  /**
   * Obtener la mejor impresora para un tipo de documento
   */
  getBestPrinterFor(documentType = 'receipt') {
    if (!this.isInitialized) {
      console.warn('⚠️ Smart Print Manager no inicializado');
      return this.defaultPrinter;
    }
    
    let candidates = [];
    
    switch (documentType) {
      case 'receipt':
      case 'invoice':
      case 'ticket':
        // Preferir impresoras térmicas para recibos
        candidates = this.thermalPrinters.length > 0 ? this.thermalPrinters : this.standardPrinters;
        break;
        
      case 'report':
      case 'document':
      case 'letter':
        // Preferir impresoras estándar para documentos
        candidates = this.standardPrinters.length > 0 ? this.standardPrinters : this.thermalPrinters;
        break;
        
      default:
        candidates = this.printers;
    }
    
    // Filtrar solo las disponibles
    const available = candidates.filter(p => p.score > 0);
    
    if (available.length === 0) {
      console.warn('⚠️ No hay impresoras disponibles');
      return this.defaultPrinter;
    }
    
    // Retornar la de mayor puntuación
    const best = available.sort((a, b) => b.score - a.score)[0];
    console.log(`🎯 Mejor impresora para ${documentType}: ${best.name}`);
    
    return best;
  }

  /**
   * Configurar opciones de impresión automáticamente según el tipo de impresora
   */
  getOptimalPrintSettings(printer, documentType = 'receipt') {
    const baseSettings = {
      silent: this.config.silentPrint,
      printBackground: true,
      copies: 1
    };
    
    if (!printer) {
      return baseSettings;
    }
    
    if (printer.type === 'thermal') {
      return {
        ...baseSettings,
        pageSize: { width: 80, height: 'auto' }, // 80mm de ancho
        margins: { top: 2, bottom: 2, left: 2, right: 2 },
        landscape: false,
        scale: 1.0
      };
    } else {
      return {
        ...baseSettings,
        pageSize: 'A4',
        margins: { top: 10, bottom: 10, left: 10, right: 10 },
        landscape: false,
        scale: 1.0
      };
    }
  }

  /**
   * Imprimir con selección automática de impresora
   */
  async smartPrint(content, options = {}) {
    try {
      console.log('🖨️ Iniciando impresión inteligente...');
      
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Determinar tipo de documento
      const documentType = options.documentType || 'receipt';
      
      // Seleccionar la mejor impresora
      let targetPrinter = options.printerName ? 
        this.printers.find(p => p.name === options.printerName) :
        this.getBestPrinterFor(documentType);
      
      if (!targetPrinter && this.config.fallbackToStandard) {
        targetPrinter = this.defaultPrinter;
      }
      
      if (!targetPrinter) {
        throw new Error('No hay impresoras disponibles');
      }
      
      // Configurar opciones óptimas
      const printSettings = {
        ...this.getOptimalPrintSettings(targetPrinter, documentType),
        ...options,
        printerName: targetPrinter.name
      };
      
      console.log(`🎯 Imprimiendo en: ${targetPrinter.name} (${targetPrinter.type})`);
      
      // Ejecutar impresión
      let result;
      if (this.isElectronAvailable()) {
        result = await this.electronPrint(content, printSettings);
      } else {
        result = await this.webPrint(content, printSettings);
      }
      
      // Actualizar estadísticas si fue exitoso
      if (result.success) {
        this.updatePrinterStats(targetPrinter.name, true);
        this.config.lastUsedPrinter = targetPrinter.name;
        this.saveConfig();
      }
      
      return {
        ...result,
        printerUsed: targetPrinter.name,
        printerType: targetPrinter.type
      };
      
    } catch (error) {
      console.error('❌ Error en impresión inteligente:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Imprimir usando Electron
   */
  async electronPrint(content, settings) {
    try {
      if (!window.electronAPI?.printContent) {
        throw new Error('API de impresión de Electron no disponible');
      }
      
      const result = await window.electronAPI.printContent({
        content,
        ...settings
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error en impresión Electron:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Imprimir usando navegador web
   */
  async webPrint(content, settings) {
    return new Promise((resolve) => {
      try {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
          resolve({ success: false, error: 'Bloqueador de ventanas emergentes activo' });
          return;
        }
        
        printWindow.document.write(content);
        printWindow.document.close();
        
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            setTimeout(() => {
              printWindow.close();
              resolve({ success: true, message: 'Impresión web completada' });
            }, 1000);
          }, 500);
        };
        
      } catch (error) {
        resolve({ success: false, error: error.message });
      }
    });
  }

  /**
   * Actualizar estadísticas de uso de impresora
   */
  updatePrinterStats(printerName, success) {
    if (!this.config.printerPreferences[printerName]) {
      this.config.printerPreferences[printerName] = {
        uses: 0,
        successes: 0,
        preference: 0
      };
    }
    
    const stats = this.config.printerPreferences[printerName];
    stats.uses++;
    if (success) {
      stats.successes++;
    }
    
    // Calcular preferencia basada en tasa de éxito
    stats.preference = Math.round((stats.successes / stats.uses) * 20);
  }

  /**
   * Verificar si Electron está disponible
   */
  isElectronAvailable() {
    return typeof window !== 'undefined' && 
           window.electronAPI && 
           typeof window.electronAPI.getPrinters === 'function';
  }

  /**
   * Obtener información del estado actual
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      platform: this.isElectronAvailable() ? 'electron' : 'web',
      totalPrinters: this.printers.length,
      thermalPrinters: this.thermalPrinters.length,
      standardPrinters: this.standardPrinters.length,
      defaultPrinter: this.defaultPrinter?.name || null,
      config: this.config
    };
  }

  /**
   * Refrescar lista de impresoras
   */
  async refresh() {
    console.log('🔄 Refrescando lista de impresoras...');
    await this.detectPrinters();
    this.classifyPrinters();
    this.selectSmartDefault();
    return this.getStatus();
  }

  /**
   * Configurar preferencias del usuario
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    console.log('✅ Configuración actualizada');
  }
}

// Crear instancia global
const smartPrintManager = new SmartPrintManager();

// Exportar funciones principales
export const initializePrintSystem = () => smartPrintManager.initialize();
export const smartPrint = (content, options) => smartPrintManager.smartPrint(content, options);
export const getPrintStatus = () => smartPrintManager.getStatus();
export const refreshPrinters = () => smartPrintManager.refresh();
export const updatePrintConfig = (config) => smartPrintManager.updateConfig(config);
export const getBestPrinter = (documentType) => smartPrintManager.getBestPrinterFor(documentType);

// Exportar instancia para uso avanzado
export default smartPrintManager;
