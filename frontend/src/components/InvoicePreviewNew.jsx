import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer, Eye, Settings, Bug, AlertTriangle } from 'lucide-react';
import { generateInvoiceHTML, printInvoice } from '../utils/printService';
import { checkSystemStatus, testBasicPrint, getLog, exportLog } from '../utils/printDebugger';
import PrintConfigModalNew from './PrintConfigModalNew';

const InvoicePreviewNew = ({ 
  isOpen, 
  onClose, 
  invoiceData, 
  businessInfo: propBusinessInfo,
  onPrint 
}) => {
  const invoiceRef = useRef(null);
  const [showPrintConfig, setShowPrintConfig] = useState(false);
  const [printResult, setPrintResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [debugLog, setDebugLog] = useState([]);

  // Generar HTML de vista previa cuando se abre el modal
  useEffect(() => {
    if (isOpen && invoiceData) {
      generatePreview();
    }
  }, [isOpen, invoiceData]);

  // Verificar estado del sistema cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      checkSystemHealth();
    }
  }, [isOpen]);

  const checkSystemHealth = async () => {
    try {
      const status = await checkSystemStatus();
      setSystemStatus(status);
      
      // Si hay problemas, activar modo debug automáticamente
      if (status.recommendations.length > 0) {
        setDebugMode(true);
      }
    } catch (error) {
      console.error('Error verificando estado del sistema:', error);
    }
  };

  const generatePreview = async () => {
    try {
      setLoading(true);
      
      // Generar HTML usando el nuevo servicio
      const html = generateInvoiceHTML(invoiceData, {
        previewMode: true,
        fontScale: 1.0
      });
      
      setPreviewHTML(html);
    } catch (error) {
      console.error('Error generando vista previa:', error);
      setPreviewHTML(`
        <div style="padding: 20px; text-align: center; color: red;">
          <h3>Error generando vista previa</h3>
          <p>${error.message}</p>
        </div>
      `);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (printOptions = {}) => {
    try {
      setLoading(true);
      setPrintResult(null);

      console.log('🖨️ Imprimiendo factura con opciones:', printOptions);

      const result = await printInvoice(invoiceData, printOptions);
      
      setPrintResult(result);
      
      if (result.success) {
        console.log('✅ Factura impresa exitosamente');
        // Mostrar notificación de éxito
        if (onPrint) {
          onPrint(result);
        }
      } else {
        console.error('❌ Error imprimiendo factura:', result.error);
        // Activar modo debug si hay error
        setDebugMode(true);
      }

    } catch (error) {
      console.error('❌ Error en impresión:', error);
      setPrintResult({ success: false, error: error.message });
      // Activar modo debug si hay error
      setDebugMode(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectPrint = () => {
    handlePrint();
  };

  const handlePrintWithConfig = () => {
    setShowPrintConfig(true);
  };

  const handlePrintConfigClose = () => {
    setShowPrintConfig(false);
  };

  const handlePrintConfigPrint = (printOptions) => {
    setShowPrintConfig(false);
    handlePrint(printOptions);
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      
      // Aquí podrías implementar la generación de PDF
      // Por ahora, solo descargamos el HTML
      const blob = new Blob([previewHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoiceData?.receiptNumber || 'N/A'}.html`;
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  const runBasicPrintTest = async () => {
    try {
      setLoading(true);
      const result = await testBasicPrint();
      console.log('Resultado del test de impresión:', result);
      
      // Actualizar log de debugging
      setDebugLog(getLog());
      
      if (result.success) {
        alert('✅ Test de impresión exitoso!');
      } else {
        alert(`❌ Error en test de impresión: ${result.error}`);
      }
    } catch (error) {
      console.error('Error en test de impresión:', error);
      alert(`❌ Error en test: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportDebugLog = () => {
    exportLog();
  };

  const refreshDebugLog = () => {
    setDebugLog(getLog());
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <Eye className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Vista Previa de Factura
                </h2>
                {invoiceData?.receiptNumber && (
                  <span className="text-sm text-gray-500">
                    #{invoiceData.receiptNumber}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Botón de Debug */}
                <button
                  onClick={() => setDebugMode(!debugMode)}
                  className={`p-2 rounded-lg transition-colors ${
                    debugMode 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Modo Debug"
                >
                  <Bug className="w-5 h-5" />
                </button>
                
                {/* Botón de Descarga */}
                <button
                  onClick={handleDownloadPDF}
                  disabled={loading}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                  title="Descargar como HTML"
                >
                  <Download className="w-5 h-5" />
                </button>
                
                {/* Botón de Configuración */}
                <button
                  onClick={handlePrintWithConfig}
                  disabled={loading}
                  className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                  title="Configurar Impresión"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                {/* Botón de Impresión Directa */}
                <button
                  onClick={handleDirectPrint}
                  disabled={loading}
                  className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                  title="Imprimir Directamente"
                >
                  <Printer className="w-5 h-5" />
                </button>
                
                {/* Botón de Cerrar */}
                <button
                  onClick={onClose}
                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Debug Panel */}
            {debugMode && (
              <div className="bg-yellow-50 border-b border-yellow-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-yellow-800 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Panel de Debug
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={runBasicPrintTest}
                      disabled={loading}
                      className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
                    >
                      Test Impresión
                    </button>
                    <button
                      onClick={refreshDebugLog}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Actualizar Log
                    </button>
                    <button
                      onClick={exportDebugLog}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Exportar Log
                    </button>
                  </div>
                </div>
                
                {/* Estado del Sistema */}
                {systemStatus && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-semibold text-sm mb-2">Estado del Sistema</h4>
                      <div className="text-xs space-y-1">
                        <div>Electron: {systemStatus.electronAPI.available ? '✅' : '❌'}</div>
                        <div>localStorage: {systemStatus.localStorage.available ? '✅' : '❌'}</div>
                        <div>BusinessInfo: {systemStatus.businessInfo.available ? '✅' : '❌'}</div>
                        <div>PrintConfig: {systemStatus.printConfig.available ? '✅' : '❌'}</div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-semibold text-sm mb-2">Recomendaciones</h4>
                      <div className="text-xs space-y-1">
                        {systemStatus.recommendations.map((rec, index) => (
                          <div key={index} className="text-red-600">• {rec}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Log de Debug */}
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-semibold text-sm mb-2">Log de Debug ({debugLog.length} entradas)</h4>
                  <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                    {debugLog.slice(-10).map((entry, index) => (
                      <div key={index} className="text-gray-600">
                        <span className="text-gray-400">[{entry.timestamp.split('T')[1].split('.')[0]}]</span>
                        <span className={`ml-2 ${
                          entry.level === 'ERROR' ? 'text-red-600' :
                          entry.level === 'WARN' ? 'text-yellow-600' :
                          'text-gray-800'
                        }`}>
                          {entry.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Contenido de la Factura */}
            <div className="flex-1 overflow-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div
                  ref={invoiceRef}
                  dangerouslySetInnerHTML={{ __html: previewHTML }}
                  className="invoice-preview"
                />
              )}
            </div>

            {/* Resultado de Impresión */}
            {printResult && (
              <div className={`p-4 border-t ${
                printResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center">
                  {printResult.success ? (
                    <div className="text-green-800">
                      ✅ {printResult.message || 'Factura impresa correctamente'}
                    </div>
                  ) : (
                    <div className="text-red-800">
                      ❌ Error: {printResult.error || 'Error desconocido'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  <span className="font-medium">Total:</span> ${invoiceData?.totals?.total?.toFixed(2) || '0.00'}
                  {invoiceData?.totals?.tax && (
                    <span className="ml-4">
                      <span className="font-medium">ITBIS:</span> ${invoiceData.totals.tax.toFixed(2)}
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Cliente:</span> {invoiceData?.customer?.name || 'Cliente General'}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Modal de Configuración de Impresión */}
      <PrintConfigModalNew
        isOpen={showPrintConfig}
        onClose={handlePrintConfigClose}
        onPrint={handlePrintConfigPrint}
      />
    </>
  );
};

export default InvoicePreviewNew;
