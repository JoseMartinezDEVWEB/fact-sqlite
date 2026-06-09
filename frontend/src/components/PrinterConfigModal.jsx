import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, RefreshCw, CheckCircle, AlertCircle, Settings, FileText, Thermometer, Wand2 } from 'lucide-react';
import { getPrinters, getDefaultPrinter, universalPrint, configurePrinter, getCurrentConfig } from '../utils/printUtils';
import { detectPrinterBrand, suggestPaperConfig } from '../utils/printerDetector';

const PrinterConfigModal = ({ isOpen, onClose, onPrinterSelect }) => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [defaultPrinter, setDefaultPrinter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('printers');
  const [config, setConfig] = useState({});
  const [suggestion, setSuggestion] = useState(null);

  // Configuración de impresora
  const [printerType, setPrinterType] = useState('standard');
  const [pdfSettings, setPdfSettings] = useState({
    pageSize: 'A4',
    margins: { top: 10, bottom: 10, left: 10, right: 10 },
    landscape: false,
    printBackground: true
  });
  const [thermalSettings, setThermalSettings] = useState({
    width: '80mm',
    margins: { top: 5, bottom: 5, left: 5, right: 5 }
  });

  // Cargar datos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Cargar impresoras
      const printersList = await getPrinters();
      const defaultPrinterName = await getDefaultPrinter();
      
      setPrinters(printersList);
      setDefaultPrinter(defaultPrinterName);
      
      // Cargar configuración actual
      const currentConfig = getCurrentConfig();
      setConfig(currentConfig);
      
      if (currentConfig) {
        setSelectedPrinter(currentConfig.selectedPrinter || '');
        setPrinterType(currentConfig.printerType || 'standard');
        setPdfSettings(currentConfig.pdfSettings || pdfSettings);
        setThermalSettings(currentConfig.thermalSettings || thermalSettings);
      }
      
      // Seleccionar impresora por defecto si no hay una seleccionada
      if (!selectedPrinter && defaultPrinterName) {
        setSelectedPrinter(defaultPrinterName);
      }
      
      console.log('Datos cargados:', { printers: printersList.length, config: currentConfig });
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error cargando datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrinterSelect = (printerName) => {
    setSelectedPrinter(printerName);
    setError('');
    setSuccess('');
    // Detectar marca y sugerir configuración automáticamente
    const s = suggestPaperConfig(printerName);
    setSuggestion(s);
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setPrinterType(suggestion.printerType);
    if (suggestion.isThermal) {
      setThermalSettings(prev => ({
        ...prev,
        width: `${suggestion.paperWidth}mm`
      }));
    } else {
      setPdfSettings(prev => ({
        ...prev,
        pageSize: suggestion.paperSize === 'a4' ? 'A4' : 'Letter'
      }));
    }
    setActiveTab('settings');
    setSuccess(`Configuración de ${suggestion.brand} aplicada. Revisa y guarda.`);
  };

  const handleTestPrint = async () => {
    if (!selectedPrinter) {
      setError('Por favor selecciona una impresora');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const testContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Prueba de Impresión</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .content { margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🖨️ Prueba de Impresión</h1>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Impresora:</strong> ${selectedPrinter}</p>
            <p><strong>Tipo:</strong> ${printerType}</p>
          </div>
          
          <div class="content">
            <h2>Información de la Prueba</h2>
            <p>Esta es una prueba del sistema de impresión.</p>
            <p>Si puedes ver este contenido impreso, la impresora funciona correctamente.</p>
            
            <h3>Detalles:</h3>
            <ul>
              <li>✅ Electron API funcionando</li>
              <li>✅ Impresora: ${selectedPrinter}</li>
              <li>✅ Tipo: ${printerType}</li>
              <li>✅ Contenido HTML generado</li>
              <li>✅ Sistema operativo</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>Prueba completada exitosamente</p>
            <p>${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}</p>
          </div>
        </body>
        </html>
      `;

      const result = await universalPrint(testContent, {
        printerName: selectedPrinter,
        silent: false,
        printBackground: true,
        copies: 1,
        printerType: printerType
      });

      if (result.success) {
        setSuccess('Prueba de impresión enviada correctamente');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error en prueba de impresión:', error);
      setError('Error en la prueba de impresión: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!selectedPrinter) {
      setError('Por favor selecciona una impresora');
      return;
    }

    try {
      const settings = {
        printerType,
        pdfSettings,
        thermalSettings
      };

      const result = configurePrinter(selectedPrinter, settings);
      
      if (result.success) {
        setSuccess('Configuración guardada correctamente');
        
        // Notificar al componente padre
        onPrinterSelect(selectedPrinter);
        
        // Cerrar modal después de un momento
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      setError('Error guardando configuración: ' + error.message);
    }
  };

  const updatePdfSetting = (key, value) => {
    setPdfSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateThermalSetting = (key, value) => {
    setThermalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateMargin = (type, side, value) => {
    const numValue = parseInt(value) || 0;
    if (type === 'pdf') {
      setPdfSettings(prev => ({
        ...prev,
        margins: {
          ...prev.margins,
          [side]: numValue
        }
      }));
    } else {
      setThermalSettings(prev => ({
        ...prev,
        margins: {
          ...prev.margins,
          [side]: numValue
        }
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <Printer className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Configuración Avanzada de Impresora
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('printers')}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === 'printers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Impresoras</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Configuración</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Status Messages */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-700 text-sm">{success}</span>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'printers' && (
              <div className="space-y-4">
                {/* Refresh Button */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Impresoras Disponibles
                  </h3>
                  <button
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Actualizar</span>
                  </button>
                </div>

                {/* Printers List */}
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {loading ? (
                    <div className="p-4 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      <p>Cargando impresoras...</p>
                    </div>
                  ) : printers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <Printer className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No se encontraron impresoras</p>
                      <p className="text-sm">Verifica que las impresoras estén conectadas</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {printers.map((printer, index) => {
                        const brandInfo = detectPrinterBrand(printer.name);
                        return (
                          <div
                            key={index}
                            className={`p-3 cursor-pointer transition-colors ${
                              selectedPrinter === printer.name
                                ? 'bg-blue-50 border-l-4 border-blue-500'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => handlePrinterSelect(printer.name)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{printer.name}</p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  {/* Marca detectada */}
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                    {brandInfo.brand}
                                  </span>
                                  {/* Tipo de impresora */}
                                  {brandInfo.isThermal ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                      <Thermometer className="w-3 h-3" />
                                      Térmica {brandInfo.defaultWidth}mm
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                      <FileText className="w-3 h-3" />
                                      Estándar
                                    </span>
                                  )}
                                  {printer.isDefault && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Por defecto
                                    </span>
                                  )}
                                  {selectedPrinter === printer.name && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      Seleccionada
                                    </span>
                                  )}
                                </div>
                              </div>
                              {selectedPrinter === printer.name && (
                                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Configuración sugerida basada en la impresora seleccionada */}
                {suggestion && selectedPrinter && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-amber-800 mb-1">
                          Configuración sugerida para {suggestion.brand}
                        </p>
                        <ul className="text-sm text-amber-700 space-y-0.5">
                          <li>• Tipo: <strong>{suggestion.isThermal ? 'Térmica' : 'Estándar'}</strong></li>
                          <li>• Papel: <strong>{suggestion.isThermal ? `Recibo ${suggestion.paperWidth}mm` : suggestion.paperSize.toUpperCase()}</strong></li>
                        </ul>
                      </div>
                      <button
                        onClick={applySuggestion}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors flex-shrink-0"
                      >
                        <Wand2 className="w-4 h-4" />
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}

                {/* Default Printer Info */}
                {defaultPrinter && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Impresora por defecto del sistema:</strong> {defaultPrinter}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Printer Type Selection */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Tipo de Impresora
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setPrinterType('standard')}
                      className={`p-4 border-2 rounded-lg text-center transition-colors ${
                        printerType === 'standard'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Printer className="w-8 h-8 mx-auto mb-2" />
                      <p className="font-medium">Estándar</p>
                      <p className="text-sm text-gray-500">Impresora normal</p>
                    </button>
                    
                    <button
                      onClick={() => setPrinterType('thermal')}
                      className={`p-4 border-2 rounded-lg text-center transition-colors ${
                        printerType === 'thermal'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Thermometer className="w-8 h-8 mx-auto mb-2" />
                      <p className="font-medium">Térmica</p>
                      <p className="text-sm text-gray-500">Impresora térmica</p>
                    </button>
                    
                    <button
                      onClick={() => setPrinterType('pdf')}
                      className={`p-4 border-2 rounded-lg text-center transition-colors ${
                        printerType === 'pdf'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="w-8 h-8 mx-auto mb-2" />
                      <p className="font-medium">PDF</p>
                      <p className="text-sm text-gray-500">Generar PDF</p>
                    </button>
                  </div>
                </div>

                {/* PDF Settings */}
                {printerType === 'pdf' && (
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Configuración PDF</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tamaño de página
                        </label>
                        <select
                          value={pdfSettings.pageSize}
                          onChange={(e) => updatePdfSetting('pageSize', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="A4">A4</option>
                          <option value="A5">A5</option>
                          <option value="Letter">Letter</option>
                          <option value="Legal">Legal</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Orientación
                        </label>
                        <select
                          value={pdfSettings.landscape ? 'landscape' : 'portrait'}
                          onChange={(e) => updatePdfSetting('landscape', e.target.value === 'landscape')}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="portrait">Vertical</option>
                          <option value="landscape">Horizontal</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Márgenes (mm)
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500">Arriba</label>
                          <input
                            type="number"
                            value={pdfSettings.margins.top}
                            onChange={(e) => updateMargin('pdf', 'top', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Abajo</label>
                          <input
                            type="number"
                            value={pdfSettings.margins.bottom}
                            onChange={(e) => updateMargin('pdf', 'bottom', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Izquierda</label>
                          <input
                            type="number"
                            value={pdfSettings.margins.left}
                            onChange={(e) => updateMargin('pdf', 'left', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Derecha</label>
                          <input
                            type="number"
                            value={pdfSettings.margins.right}
                            onChange={(e) => updateMargin('pdf', 'right', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Thermal Settings */}
                {printerType === 'thermal' && (
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Configuración Térmica</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ancho del papel
                        </label>
                        <select
                          value={thermalSettings.width}
                          onChange={(e) => updateThermalSetting('width', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="58mm">58mm</option>
                          <option value="80mm">80mm</option>
                          <option value="112mm">112mm</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Márgenes (mm)
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500">Arriba</label>
                          <input
                            type="number"
                            value={thermalSettings.margins.top}
                            onChange={(e) => updateMargin('thermal', 'top', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Abajo</label>
                          <input
                            type="number"
                            value={thermalSettings.margins.bottom}
                            onChange={(e) => updateMargin('thermal', 'bottom', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Izquierda</label>
                          <input
                            type="number"
                            value={thermalSettings.margins.left}
                            onChange={(e) => updateMargin('thermal', 'left', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Derecha</label>
                          <input
                            type="number"
                            value={thermalSettings.margins.right}
                            onChange={(e) => updateMargin('thermal', 'right', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 p-6 border-t bg-gray-50">
            <button
              onClick={handleTestPrint}
              disabled={!selectedPrinter || loading}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Probar Impresora</span>
            </button>
            
            <button
              onClick={handleSave}
              disabled={!selectedPrinter || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Guardar Configuración
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PrinterConfigModal;
