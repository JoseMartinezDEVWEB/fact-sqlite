import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowLeft, Download } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import axios from 'axios';

const ClienteFiadoModal = ({ isOpen, onClose, clienteId, clienteNombre }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clienteData, setClienteData] = useState(null);
  
  useEffect(() => {
    if (isOpen && clienteId) {
      cargarDatosCliente();
    }
  }, [isOpen, clienteId]);
  
  const cargarDatosCliente = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No hay token de autenticación');
        setIsLoading(false);
        return;
      }
      
      const response = await axios.get(`http://localhost:4000/api/dashboard/client-credit-invoices/${clienteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setClienteData(response.data.data);
      } else {
        setError('Error al cargar datos: ' + (response.data.message || 'Error desconocido'));
      }
    } catch (err) {
      console.error('Error al obtener facturas del cliente:', err);
      setError('Error al cargar datos: ' + (err.message || 'Error de red'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  const handleExportar = () => {
    // Implementación de exportación (podría ser a CSV, PDF, etc.)
    alert('Funcionalidad de exportación no implementada');
  };
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        {/* Cabecera */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800">
              Facturas de {clienteNombre || 'Cliente'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Contenido */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner text="Cargando datos..." />
            </div>
          ) : error ? (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
              <p>{error}</p>
            </div>
          ) : !clienteData ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron datos del cliente
            </div>
          ) : (
            <div className="space-y-6">
              {/* Información del cliente */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-2">Información del Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Nombre:</p>
                    <p className="font-medium">{clienteData.cliente.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Teléfono:</p>
                    <p className="font-medium">{clienteData.cliente.telefono || 'No disponible'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Dirección:</p>
                    <p className="font-medium">{clienteData.cliente.direccion || 'No disponible'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Deuda:</p>
                    <p className="font-bold text-purple-700">RD$ {clienteData.totalDeuda.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              {/* Barra de herramientas */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Total: {clienteData.cantidadFacturas} facturas pendientes
                </div>
                <button
                  onClick={handleExportar}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 text-sm hover:bg-blue-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar</span>
                </button>
              </div>
              
              {/* Tabla de facturas */}
              {clienteData.facturas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Este cliente no tiene facturas fiadas pendientes
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nº Factura
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clienteData.facturas.map((factura) => (
                        <tr key={factura._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium">
                            {factura.invoiceNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {formatearFecha(factura.fecha)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            RD$ {factura.total.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Pendiente
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Pie del modal */}
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ClienteFiadoModal;
