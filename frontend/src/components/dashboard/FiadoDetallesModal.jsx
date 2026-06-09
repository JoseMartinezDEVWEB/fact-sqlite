import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Filter, Download, ChevronLeft, ChevronRight, User } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import axios from 'axios';
import ClienteFiadoModal from './ClienteFiadoModal';

const FiadoDetallesModal = ({ isOpen, onClose, selectedDate }) => {
  const [activeTab, setActiveTab] = useState('resumen');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [filtro, setFiltro] = useState('ultima-semana');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  
  // Función para cargar los datos de ventas fiadas
  const cargarVentasFiadas = async () => {
    if (!isOpen) return;
    
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
      
      // Configurar fechas según el filtro
      const hoy = new Date();
      let startDate, endDate;
      
      switch (filtro) {
        case 'ultima-semana':
          startDate = new Date(hoy);
          startDate.setDate(hoy.getDate() - 7);
          endDate = new Date(hoy);
          break;
        case 'ultimo-mes':
          startDate = new Date(hoy.getFullYear(), hoy.getMonth() - 1, hoy.getDate());
          endDate = new Date(hoy);
          break;
        case 'este-mes':
          startDate = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
          endDate = new Date(hoy);
          break;
        default:
          startDate = new Date(hoy);
          startDate.setDate(hoy.getDate() - 7);
          endDate = new Date(hoy);
      }
      
      // Si hay una fecha seleccionada, usarla como filtro
      if (selectedDate) {
        const fecha = new Date(selectedDate);
        startDate = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
        endDate = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59);
      }
      
      // Realizar petición a la API
      const response = await axios.get('http://localhost:4000/api/dashboard/daily-credit-sales', {
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
      
      if (response.data.success) {
        setVentas(response.data.data.sales || []);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
      } else {
        setError('Error al cargar datos: ' + (response.data.message || 'Error desconocido'));
      }
    } catch (err) {
      console.error('Error al obtener ventas fiadas:', err);
      setError('Error al cargar datos: ' + (err.message || 'Error de red'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cargar datos cuando se abre el modal o cambian los filtros
  useEffect(() => {
    if (isOpen) {
      cargarVentasFiadas();
    }
  }, [isOpen, filtro, currentPage, selectedDate]);
  
  // Manejadores de eventos
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  const handleFiltroChange = (e) => {
    setFiltro(e.target.value);
    setCurrentPage(1);
  };
  
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
  
  const handleClienteClick = (cliente) => {
    if (cliente && cliente.clienteId) {
      setSelectedCliente({
        id: cliente.clienteId,
        nombre: cliente.cliente
      });
      setShowClienteModal(true);
    }
  };
  
  // Si el modal no está abierto, no renderizar nada
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
        {/* Cabecera del modal */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Detalles de Ventas</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Pestañas */}
        <div className="flex border-b">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'resumen'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => handleTabChange('resumen')}
          >
            Resumen
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'fiado-diario'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => handleTabChange('fiado-diario')}
          >
            Fiado Diario
          </button>
        </div>
        
        {/* Contenido */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'resumen' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Resumen de Ventas</h3>
              
              {/* Tarjetas de resumen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm text-gray-600 mb-2">HOY</h4>
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-gray-700">Ventas Fiadas</p>
                      <p className="text-2xl font-bold text-gray-900">
                        RD$ {ventas[0]?.totalVentas.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm text-gray-600 mb-2">ESTE MES</h4>
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-gray-700">Ventas Fiadas</p>
                      <p className="text-2xl font-bold text-gray-900">
                        RD$ {ventas.reduce((total, venta) => total + venta.totalVentas, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'fiado-diario' && (
            <div className="space-y-4">
              {/* Barra de herramientas */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <select
                    value={filtro}
                    onChange={handleFiltroChange}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="ultima-semana">Última semana</option>
                    <option value="ultimo-mes">Último mes</option>
                    <option value="este-mes">Este mes</option>
                  </select>
                </div>
                
                <button
                  onClick={handleExportar}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 text-sm hover:bg-blue-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar</span>
                </button>
              </div>
              
              {/* Tabla de ventas */}
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <LoadingSpinner text="Cargando datos..." />
                </div>
              ) : error ? (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                  <p>{error}</p>
                </div>
              ) : ventas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay datos disponibles para este período
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ventas Totales
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Facturas
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Promedio por Venta
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {ventas.map((venta, index) => {
                        // Agrupar facturas por cliente para esta fecha
                        const clientesMap = {};
                        
                        if (venta.facturas && venta.facturas.length > 0) {
                          venta.facturas.forEach(factura => {
                            if (!clientesMap[factura.clienteId]) {
                              clientesMap[factura.clienteId] = {
                                clienteId: factura.clienteId,
                                cliente: factura.cliente || 'Cliente sin nombre',
                                totalVentas: 0,
                                cantidadFacturas: 0
                              };
                            }
                            clientesMap[factura.clienteId].totalVentas += factura.total;
                            clientesMap[factura.clienteId].cantidadFacturas += 1;
                          });
                        }
                        
                        const clientes = Object.values(clientesMap);
                        
                        // Si no hay clientes, mostrar una fila con los totales
                        if (clientes.length === 0) {
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                {new Date(venta.fecha).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                No disponible
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                RD$ {venta.totalVentas.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {venta.cantidadFacturas}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                RD$ {venta.promedioVenta.toFixed(2)}
                              </td>
                            </tr>
                          );
                        }
                        
                        // Si hay clientes, mostrar una fila por cada cliente
                        return clientes.map((cliente, clienteIndex) => (
                          <tr key={`${index}-${clienteIndex}`} className="hover:bg-gray-50">
                            {clienteIndex === 0 ? (
                              <td className="px-6 py-4 whitespace-nowrap" rowSpan={clientes.length}>
                                {new Date(venta.fecha).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </td>
                            ) : null}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button 
                                onClick={() => handleClienteClick(cliente)}
                                className="flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <User className="w-4 h-4 mr-1" />
                                {cliente.cliente}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              RD$ {cliente.totalVentas.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {cliente.cantidadFacturas}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              RD$ {(cliente.totalVentas / cliente.cantidadFacturas).toFixed(2)}
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Paginación */}
              {!isLoading && ventas.length > 0 && (
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
      
      {/* Modal de cliente */}
      {showClienteModal && selectedCliente && (
        <ClienteFiadoModal
          isOpen={showClienteModal}
          onClose={() => setShowClienteModal(false)}
          clienteId={selectedCliente.id}
          clienteNombre={selectedCliente.nombre}
        />
      )}
    </motion.div>
  );
};

export default FiadoDetallesModal;
