import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Settings, Save, TestTube } from 'lucide-react';
import { printInvoice, getPrinters, updatePrintConfig } from '../utils/printService';

const PrintConfigModalNew = ({ isOpen, onClose, onPrint }) => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [printConfig, setPrintConfig] = useState({
    paperSize: 'A4',
    paperWidth: 80,
    paperHeight: 297,
    paperOrientation: 'portrait',
    marginTop: 10,
    marginRight: 10,
    marginBottom: 10,
    marginLeft: 10,
    fontScale: 1.0,
    thermalMode: false,
    silent: false,
    printBackground: true,
    copies: 1
  });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadPrinters();
      loadPrintConfig();
    }
  }, [isOpen]);

  const loadPrinters = async () => {
    try {
      setLoading(true);
      const availablePrinters = await getPrinters();
      setPrinters(availablePrinters);
      
      if (availablePrinters.length > 0) {
        const defaultPrinter = availablePrinters.find(p => p.isDefault) || availablePrinters[0];
        setSelectedPrinter(defaultPrinter.name);
      }
    } catch (error) {
      console.error('Error cargando impresoras:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPrintConfig = () => {
    try {
      const stored = localStorage.getItem('printConfig');
      if (stored) {
        const config = JSON.parse(stored);
        setPrintConfig(prev => ({ ...prev, ...config }));
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const handleConfigChange = (key, value) => {
    setPrintConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      const success = await updatePrintConfig(printConfig);
      if (success) {
        console.log('✅ Configuración guardada');
        // Mostrar notificación de éxito
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestPrint = async () => {
    try {
      setLoading(true);
      setTestResult(null);

      // Datos de prueba
      const testInvoiceData = {
        receiptNumber: 'TEST-001',
        customer: { name: 'Cliente de Prueba' },
        items: [
          { name: 'Producto de Prueba 1', quantity: 2, price: 10.50 },
          { name: 'Producto de Prueba 2', quantity: 1, price: 25.00 }
        ],
        totals: {
          subtotal: 46.00,
          tax: 8.28,
          total: 54.28
        },
        paymentMethod: 'cash',
        date: new Date(),
        isCredit: false,
        cashReceived: 60.00
      };

      const result = await printInvoice(testInvoiceData, {
        ...printConfig,
        printerName: selectedPrinter
      });

      setTestResult(result);
      console.log('Resultado de prueba:', result);

    } catch (error) {
      console.error('Error en prueba de impresión:', error);
      setTestResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint({
        ...printConfig,
        printerName: selectedPrinter
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <Printer className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">
                Configuración de Impresión
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Impresoras */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                Impresora
              </h3>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Seleccionar impresora</option>
                {printers.map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    {printer.displayName || printer.name}
                    {printer.isDefault ? ' (Predeterminada)' : ''}
                  </option>
                ))}
              </select>
              {printers.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  No se detectaron impresoras. Asegúrate de que estés en Electron.
                </p>
              )}
            </div>

            {/* Configuración de papel */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                Configuración de Papel
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tamaño
                  </label>
                  <select
                    value={printConfig.paperSize}
                    onChange={(e) => handleConfigChange('paperSize', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="A4">A4</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                    <option value="80mm">80mm (Térmica)</option>
                    <option value="58mm">58mm (Térmica)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orientación
                  </label>
                  <select
                    value={printConfig.paperOrientation}
                    onChange={(e) => handleConfigChange('paperOrientation', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="portrait">Vertical</option>
                    <option value="landscape">Horizontal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Márgenes */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                Márgenes (mm)
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Arriba
                  </label>
                  <input
                    type="number"
                    value={printConfig.marginTop}
                    onChange={(e) => handleConfigChange('marginTop', parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Derecha
                  </label>
                  <input
                    type="number"
                    value={printConfig.marginRight}
                    onChange={(e) => handleConfigChange('marginRight', parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Abajo
                  </label>
                  <input
                    type="number"
                    value={printConfig.marginBottom}
                    onChange={(e) => handleConfigChange('marginBottom', parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Izquierda
                  </label>
                  <input
                    type="number"
                    value={printConfig.marginLeft}
                    onChange={(e) => handleConfigChange('marginLeft', parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="50"
                  />
                </div>
              </div>
            </div>

            {/* Configuración adicional */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                Configuración Adicional
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="thermalMode"
                      checked={printConfig.thermalMode}
                      onChange={(e) => handleConfigChange('thermalMode', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="thermalMode" className="ml-2 text-sm text-gray-700">
                      Modo Térmico
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="silent"
                      checked={printConfig.silent}
                      onChange={(e) => handleConfigChange('silent', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="silent" className="ml-2 text-sm text-gray-700">
                      Impresión Silenciosa
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="printBackground"
                      checked={printConfig.printBackground}
                      onChange={(e) => handleConfigChange('printBackground', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="printBackground" className="ml-2 text-sm text-gray-700">
                      Imprimir Fondo
                    </label>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Escala de Fuente
                    </label>
                    <input
                      type="number"
                      value={printConfig.fontScale}
                      onChange={(e) => handleConfigChange('fontScale', parseFloat(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Copias
                    </label>
                    <input
                      type="number"
                      value={printConfig.copies}
                      onChange={(e) => handleConfigChange('copies', parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Resultado de prueba */}
            {testResult && (
              <div className={`p-4 rounded-lg ${
                testResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {testResult.success ? (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✗</span>
                    </div>
                  )}
                  <span className={`font-medium ${
                    testResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResult.success ? 'Prueba Exitosa' : 'Error en Prueba'}
                  </span>
                </div>
                <p className={`mt-2 text-sm ${
                  testResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {testResult.message || testResult.error}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div className="flex space-x-3">
              <button
                onClick={handleSaveConfig}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Guardar</span>
              </button>
              <button
                onClick={handleTestPrint}
                disabled={loading || !selectedPrinter}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <TestTube className="w-4 h-4" />
                <span>Probar</span>
              </button>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePrint}
                disabled={loading || !selectedPrinter}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PrintConfigModalNew;
