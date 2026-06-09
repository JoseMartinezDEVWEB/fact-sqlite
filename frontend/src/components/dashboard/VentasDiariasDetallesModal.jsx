import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Download, ChevronLeft, ChevronRight, User } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import axios from 'axios';
import ClienteFacturasModal from './ClienteFacturasModal';

const VentasDiariasDetallesModal = ({ isOpen, onClose, selectedDate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Estados para el modal de facturas de cliente
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  
  // Función para cargar los datos de ventas diarias
  const cargarVentasDiarias = async () => {
    if (!isOpen || !selectedDate) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No hay token de autenticación');
        setIsLoading(false);
        return;
      }
      
      // Configurar fechas para filtrar solo el día seleccionado
      const fecha = new Date(selectedDate);
      const startDate = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      const endDate = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59);
      
      // Realizar petición a la API
      const response = await axios.get('http://localhost:4000/api/dashboard/daily-sales', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          page: currentPage,
          limit: 10,
          sortBy: 'fecha',
          order: 'desc'
        }
      });
      
      if (response.data.success && response.data.data && response.data.data.sales) {
        // Si hay datos, procesarlos para mostrar facturas con detalles de cliente
        const ventasDelDia = response.data.data.sales;
        
        // Obtener detalles de las facturas para este día
        const detalleFacturas = await axios.get('http://localhost:4000/api/dashboard/invoices-by-date', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            date: startDate.toISOString().split('T')[0],
            page: currentPage,
            limit: 50
          }
        });
        
        if (detalleFacturas.data.success && detalleFacturas.data.data) {
          setVentas(detalleFacturas.data.data.invoices || []);
          setTotalPages(detalleFacturas.data.data.pagination?.totalPages || 1);
        } else {
          // Si no hay detalles específicos, usar los datos generales
          setVentas(ventasDelDia);
          setTotalPages(response.data.data.pagination?.totalPages || 1);
        }
      } else {
        setError('Error al cargar datos: ' + (response.data.message || 'Error desconocido'));
      }
    } catch (err) {
      console.error('Error al obtener ventas diarias:', err);
      setError('Error al cargar datos: ' + (err.message || 'Error de red'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cargar datos cuando se abre el modal o cambia la página
  useEffect(() => {
    if (isOpen && selectedDate) {
      cargarVentasDiarias();
    }
  }, [isOpen, currentPage, selectedDate]);
  
  // Manejadores de eventos
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const handleExportar = () => {
    // Implementación de exportación (podría ser a CSV, PDF, etc.)
    alert('Funcionalidad de exportación no implementada');
  };
  
  // Función para manejar el clic en el nombre del cliente
  const handleClienteClick = (cliente) => {
    if (cliente && cliente.clientId) {
      setSelectedCliente({
        id: cliente.clientId,
        nombre: cliente.client || cliente.clientName || 'Cliente'
      });
      setShowClienteModal(true);
    }
  };
  
  // Formatear fecha para mostrar
  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(fecha).toLocaleDateString('es-ES', options);
  };
  
  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;
  
  return (
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
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Detalles de Ventas - {formatearFecha(selectedDate)}
          </h2>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportar}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              title="Exportar datos"
            >
              <Download className="w-5 h-5" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Contenido del modal */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-md">
              <p>{error}</p>
            </div>
          ) : ventas.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No hay ventas registradas para esta fecha
            </div>
          ) : (
            <div>
              {/* Tabla de facturas */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nº Factura
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hora
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ventas.map((factura, index) => (
                      <tr key={factura._id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {factura.invoiceNumber || `Factura ${index + 1}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => handleClienteClick(factura)}
                            className="flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <User className="w-4 h-4 mr-1" />
                            {factura.client || factura.clientName || "Cliente sin nombre"}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          RD$ {factura.total ? factura.total.toLocaleString() : '0'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {factura.isCredit ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                              Crédito
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              Efectivo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {factura.createdAt ? new Date(factura.createdAt).toLocaleTimeString('es-ES') : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Resumen de totales */}
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">Resumen del día</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <p className="text-sm text-gray-500">Total Ventas</p>
                    <p className="text-xl font-semibold">
                      RD$ {ventas.reduce((sum, factura) => sum + (factura.total || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <p className="text-sm text-gray-500">Facturas</p>
                    <p className="text-xl font-semibold">{ventas.length}</p>
                  </div>
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <p className="text-sm text-gray-500">Promedio</p>
                    <p className="text-xl font-semibold">
                      RD$ {(ventas.reduce((sum, factura) => sum + (factura.total || 0), 0) / (ventas.length || 1)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 px-2">
                  <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className={`p-1 rounded ${
                        currentPage === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className={`p-1 rounded ${
                        currentPage === totalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
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
      
      {/* Modal de facturas de cliente */}
      {showClienteModal && selectedCliente && (
        <ClienteFacturasModal
          isOpen={showClienteModal}
          onClose={() => setShowClienteModal(false)}
          clienteId={selectedCliente.id}
          clienteNombre={selectedCliente.nombre}
        />
      )}
    </motion.div>
  );
};

export default VentasDiariasDetallesModal;
