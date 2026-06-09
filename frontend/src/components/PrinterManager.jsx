import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Printer, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Monitor, 
  Zap,
  Info,
  Save,
  TestTube
} from 'lucide-react';
import smartPrintManager, { 
  initializePrintSystem, 
  getPrintStatus, 
  refreshPrinters, 
  updatePrintConfig,
  smartPrint
} from '../utils/smartPrintManager';

const PrinterManager = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({});
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      if (!smartPrintManager.isInitialized) {
        await initializePrintSystem();
      }
      const currentStatus = getPrintStatus();
      setStatus(currentStatus);
      setConfig(currentStatus.config);
    } catch (error) {
      console.error('Error cargando estado:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const newStatus = await refreshPrinters();
      setStatus(newStatus);
    } catch (error) {
      console.error('Error refrescando impresoras:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    updatePrintConfig(newConfig);
  };

  const handleTestPrint = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      const testHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              text-align: center; 
            }
            .test-header { 
              border-bottom: 2px solid #333; 
              padding-bottom: 10px; 
              margin-bottom: 20px; 
            }
            .success { color: #28a745; }
            .info { color: #007bff; }
          </style>
        </head>
        <body>
          <div class="test-header">
            <h2>🖨️ Prueba de Impresión</h2>
            <p class="success">✅ Sistema de impresión funcionando correctamente</p>
          </div>
          <div>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-DO')}</p>
            <p><strong>Sistema:</strong> Smart Print Manager</p>
            <p class="info">Si puede ver este documento, la impresión está configurada correctamente.</p>
          </div>
        </body>
        </html>
      `;

      const result = await smartPrint(testHTML, {
        documentType: 'receipt',
        silent: false
      });

      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getPrinterIcon = (printer) => {
    if (printer.type === 'thermal') {
      return <Zap className="w-4 h-4 text-orange-500" />;
    }
    return <Monitor className="w-4 h-4 text-blue-500" />;
  };

  const getPrinterStatus = (printer) => {
    if (printer.score > 50) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (printer.score > 0) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-red-500" />;
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
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Printer className="w-6 h-6" />
                <h2 className="text-xl font-bold">Gestor de Impresoras Inteligente</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {loading && !status ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600">Cargando sistema de impresión...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Estado del Sistema */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Info className="w-5 h-5 mr-2 text-blue-500" />
                    Estado del Sistema
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{status?.totalPrinters || 0}</div>
                      <div className="text-sm text-gray-600">Total Impresoras</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{status?.thermalPrinters || 0}</div>
                      <div className="text-sm text-gray-600">Térmicas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{status?.standardPrinters || 0}</div>
                      <div className="text-sm text-gray-600">Estándar</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{status?.platform || 'N/A'}</div>
                      <div className="text-sm text-gray-600">Plataforma</div>
                    </div>
                  </div>
                </div>

                {/* Lista de Impresoras */}
                {status?.totalPrinters > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <Printer className="w-5 h-5 mr-2 text-gray-700" />
                      Impresoras Detectadas
                    </h3>
                    <div className="space-y-2">
                      {smartPrintManager.printers?.map((printer, index) => (
                        <div
                          key={index}
                          className={`p-4 border rounded-lg ${
                            printer.name === status?.defaultPrinter 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getPrinterIcon(printer)}
                              <div>
                                <div className="font-medium">{printer.name}</div>
                                <div className="text-sm text-gray-500">
                                  {printer.type === 'thermal' ? 'Impresora Térmica' : 'Impresora Estándar'}
                                  {printer.name === status?.defaultPrinter && (
                                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                      Por Defecto
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="text-sm text-gray-500">
                                Score: {printer.score}
                              </div>
                              {getPrinterStatus(printer)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Configuración */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-gray-700" />
                    Configuración
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Detección Automática</div>
                        <div className="text-sm text-gray-500">
                          Detectar automáticamente nuevas impresoras
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.autoDetectPrinters || false}
                          onChange={(e) => handleConfigChange('autoDetectPrinters', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Preferir Térmicas para Recibos</div>
                        <div className="text-sm text-gray-500">
                          Usar impresoras térmicas automáticamente para facturas
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.preferThermalForReceipts || false}
                          onChange={(e) => handleConfigChange('preferThermalForReceipts', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Impresión Silenciosa</div>
                        <div className="text-sm text-gray-500">
                          Imprimir sin mostrar diálogos del sistema
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.silentPrint || false}
                          onChange={(e) => handleConfigChange('silentPrint', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Fallback a Estándar</div>
                        <div className="text-sm text-gray-500">
                          Usar impresoras estándar si las térmicas no están disponibles
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.fallbackToStandard || false}
                          onChange={(e) => handleConfigChange('fallbackToStandard', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Prueba de Impresión */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <TestTube className="w-5 h-5 mr-2 text-gray-700" />
                    Prueba de Impresión
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleTestPrint}
                      disabled={loading || !status?.totalPrinters}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      <span>Ejecutar Prueba de Impresión</span>
                    </button>

                    {testResult && (
                      <div className={`p-3 rounded-lg ${
                        testResult.success 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-center space-x-2">
                          {testResult.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className={`font-medium ${
                            testResult.success ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {testResult.success ? 'Prueba Exitosa' : 'Error en Prueba'}
                          </span>
                        </div>
                        {testResult.printerUsed && (
                          <div className="text-sm text-gray-600 mt-1">
                            Impresora utilizada: {testResult.printerUsed} ({testResult.printerType})
                          </div>
                        )}
                        {testResult.error && (
                          <div className="text-sm text-red-600 mt-1">
                            Error: {testResult.error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PrinterManager;
