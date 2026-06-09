import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import axios from 'axios';

const ClienteFacturasModal = ({ isOpen, onClose, clienteId, clienteNombre, clienteCompleto = {} }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDeuda, setTotalDeuda] = useState(0);
  const [clienteInfo, setClienteInfo] = useState({});

  // Función para cargar las facturas fiadas del cliente
  const cargarFacturasCliente = useCallback(async () => {
    if (!clienteId || typeof clienteId !== 'string') {
      console.error('ID de cliente no disponible o no es una cadena:', clienteId);
      setError('ID de cliente inválido.');
      setIsLoading(false); // Asegurar que el estado de carga se detenga
      return;
    }
    
    // Usar la información del cliente completo si está disponible
    if (clienteCompleto && Object.keys(clienteCompleto).length > 0) {
      console.log('Usando información del cliente completo:', clienteCompleto);
      // Actualizar el estado con la información del cliente
      setClienteInfo({
        _id: clienteCompleto._id || clienteCompleto.id,
        nombre: clienteCompleto.nombre || clienteCompleto.name,
        telefono: clienteCompleto.telefono || clienteCompleto.phone || '',
        direccion: clienteCompleto.direccion || clienteCompleto.address || ''
      });
    }
    
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
      
      // Realizar petición a la API
      console.log('Solicitando facturas para cliente ID:', clienteId);
      console.log('Nombre del cliente:', clienteNombre);
      
      const reactAppApiUrl = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
        ? process.env.REACT_APP_API_URL
        : null;
      const apiUrl = reactAppApiUrl || 'http://localhost:4000';
      const endpoint = `/api/dashboard/client-credit-invoices/${clienteId}`;
      console.log('URL completa:', `${apiUrl}${endpoint}`);
      
      const response = await axios.get(`${apiUrl}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Respuesta del servidor:', response.data);
      
      if (response.data.success) {
        // Verificar si la respuesta tiene el formato esperado
        if (response.data.data && Array.isArray(response.data.data.facturas)) {
          setFacturas(response.data.data.facturas);
          setTotalDeuda(response.data.data.totalDeuda || 0);
          setClienteInfo(response.data.data.cliente || {});
          
          // Si no hay facturas, mostrar mensaje
          if (response.data.data.facturas.length === 0) {
            console.log('El cliente no tiene facturas pendientes');
          }
        } else {
          console.error('Formato de respuesta inesperado:', response.data);
          setFacturas([]);
          setTotalDeuda(0);
          setError('Formato de respuesta inesperado del servidor');
        }
      } else {
        setError(response.data.message || 'Error al cargar facturas');
        setFacturas([]);
        setTotalDeuda(0);
      }
    } catch (error) {
      console.error('-----------------------------------------------------');
      console.error('Error detallado en cargarFacturasCliente:', error);
      if (error.response) {
        // La solicitud se hizo y el servidor respondió con un código de estado
        // que cae fuera del rango de 2xx
        console.error('Error - Datos de respuesta:', error.response.data);
        console.error('Error - Estado de respuesta:', error.response.status);
        console.error('Error - Cabeceras de respuesta:', error.response.headers);
      } else if (error.request) {
        // La solicitud se hizo pero no se recibió respuesta
        console.error('Error - Solicitud (sin respuesta):', error.request);
      } else {
        // Algo sucedió al configurar la solicitud que provocó un error
        console.error('Error - Mensaje:', error.message);
      }
      console.error('Error - Configuración de Axios:', error.config);
      console.error('-----------------------------------------------------');

      // Set error message for UI
      let detailedErrorMessage = 'Error de red o desconocido.';
      if (error.response) { // Error from server response
        detailedErrorMessage = `Error del servidor: ${(typeof error.response.data === 'string' ? error.response.data : error.response.data?.message) || error.response.statusText || 'Respuesta inesperada.'}`;
      } else if (error.request) { // No response received
        detailedErrorMessage = 'No se recibió respuesta del servidor (verifique red o CORS).';
      } else if (error.message) { // Other errors (e.g., setup)
        detailedErrorMessage = `Error en la aplicación cliente: ${error.message}`;
      }
      setError(`No se pudieron cargar las facturas. ${detailedErrorMessage}`);
      
      // Datos de ejemplo para desarrollo (solo en modo desarrollo)
      const nodeEnv = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV)
        ? process.env.NODE_ENV
        : 'production'; // Default to 'production' to be safe
      if (nodeEnv === 'development') {
        console.log('Usando datos de ejemplo en desarrollo debido a error en carga de datos.');
        setFacturas([
          { _id: '1', invoiceNumber: 'FAC-202305-0001', total: 1250.00, createdAt: new Date(), status: 'pending' },
          { _id: '2', invoiceNumber: 'FAC-202305-0002', total: 800.50, createdAt: new Date(), status: 'pending' },
        ]);
        setClienteInfo({
          nombre: clienteNombre || 'Cliente de Ejemplo',
          telefono: '123-456-7890',
          direccion: 'Calle Falsa 123'
        });
        setTotalDeuda(2050.50);
        setTotalPages(1);
      }
    } finally {
      setIsLoading(false);
    }
  }, [clienteId, clienteNombre, clienteCompleto]); // Dependencias del useCallback
  
  // Efecto para cargar facturas cuando se abre el modal
  useEffect(() => {
    if (isOpen && clienteId) {
      cargarFacturasCliente();
    }
  }, [isOpen, clienteId, cargarFacturasCliente]);
  
  // Efecto para actualizar la paginación cuando cambian las facturas
  useEffect(() => {
    // Calcular el número total de páginas
    const itemsPerPage = 10;
    const pages = Math.max(1, Math.ceil(facturas.length / itemsPerPage));
    setTotalPages(pages);
    
    // Resetear a la primera página cuando cambian las facturas
    setCurrentPage(1);
    
    console.log(`Paginación actualizada: ${facturas.length} facturas, ${pages} páginas`);
  }, [facturas]);
  
  // Manejadores de eventos para paginación
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
  
  // Función para formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no disponible';
    
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };
  
  // Obtener facturas para la página actual (paginación local)
  const getFacturasPaginadas = () => {
    const itemsPerPage = 10;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return facturas.slice(startIndex, startIndex + itemsPerPage);
  };
  
  // Función para depurar problemas
  useEffect(() => {
    if (error) {
      console.error('Error en ClienteFacturasModal:', error);
    }
    
    console.log('Estado actual:', {
      clienteId,
      isLoading,
      facturas: facturas.length,
      totalDeuda
    });
  }, [error, clienteId, isLoading, facturas, totalDeuda]);
  
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
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Facturas de {clienteNombre || 'Cliente'}
          </h2>
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Contenido principal */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error al cargar facturas</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={cargarFacturasCliente}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : facturas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No hay facturas pendientes para este cliente.</p>
            </div>
          ) : (
            <div>
              {/* Resumen de deuda */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Deuda Total</h3>
                    <p className="text-xs text-blue-600 mt-1">Todas las facturas pendientes</p>
                  </div>
                  <div className="text-2xl font-bold text-blue-800">
                    RD$ {totalDeuda.toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* Tabla de facturas */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nº Factura
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFacturasPaginadas().map((factura, index) => {
                      // Depurar cada factura para identificar problemas
                      console.log(`Factura ${index}:`, factura);
                      return (
                        <tr key={factura._id || `factura-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {factura.invoiceNumber || `Factura ${index + 1}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            RD$ {typeof factura.total === 'number' ? factura.total.toLocaleString() : '0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {formatearFecha(factura.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
    </motion.div>
  );
};

export default ClienteFacturasModal;
