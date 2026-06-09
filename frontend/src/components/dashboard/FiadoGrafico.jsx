import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FiadoDetallesModal from './FiadoDetallesModal';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { Calendar, RefreshCw, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

const FiadoGrafico = ({ dashboardData }) => {
  // Estados para los datos y la UI
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAllData, setShowAllData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Referencias para controlar las actualizaciones
  const isFirstRender = useRef(true);
  const isManualRefresh = useRef(false);
  const previousMonth = useRef(selectedMonth);
  const previousYear = useRef(selectedYear);
  const timer = useRef(null);
  
  // Función para formatear valores del eje Y
  const formatYAxis = (value) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value;
  };
  
  // Función para obtener las ventas fiadas diarias desde la API
  const fetchDailyCreditSales = () => {
    setIsLoading(true);
    setError(null);
    
    // Obtener token de autenticación
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No hay token de autenticación');
      setIsLoading(false);
      return;
    }
    
    // Construir parámetros de la consulta
    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0); // Último día del mes
    
    // Configurar parámetros de paginación
    const params = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      sortBy: 'fecha',
      order: 'desc'
    };
    
    // Si no se muestra toda la data, aplicar paginación
    if (!showAllData) {
      params.page = currentPage;
      params.limit = itemsPerPage;
    }
    
    // Realizar la petición a la API
    axios.get('http://localhost:4000/api/dashboard/daily-credit-sales', {
      headers: { Authorization: `Bearer ${token}` },
      params
    })
    .then(response => {
      if (response.data.success) {
        // Procesar los datos para el gráfico
        const salesData = response.data.data.sales || [];
        
        // Actualizar total de páginas
        if (response.data.data.pagination) {
          setTotalPages(response.data.data.pagination.totalPages || 1);
        }
        
        // Normalizar datos para el gráfico
        const normalizedData = salesData.map(item => {
          const date = new Date(item.fecha);
          return {
            name: date.getDate().toString(), // Día del mes como string
            displayDate: date.toLocaleDateString('es-ES', { 
              day: 'numeric', 
              month: 'short'
            }),
            total: item.totalVentas || 0,
            cantidad: item.cantidadFacturas || 0,
            fecha: date
          };
        });
        
        // Ordenar por fecha (ascendente)
        normalizedData.sort((a, b) => a.fecha - b.fecha);
        
        // Verificar si el día actual está en los datos
        const today = new Date();
        const isCurrentMonth = today.getMonth() + 1 === selectedMonth && today.getFullYear() === selectedYear;
        const todayStr = today.getDate().toString();
        const hasTodayData = normalizedData.some(item => item.name === todayStr && isCurrentMonth);
        
        // Si estamos en el mes actual y no hay datos para hoy, añadirlos desde dashboardData
        if (isCurrentMonth && !hasTodayData && dashboardData) {
          const pendientesHoy = dashboardData.totalVentas?.pendientesHoy || 0;
          const facturasPendientesHoy = dashboardData.facturasCreadas?.pendientesHoy || 0;
          
          if (pendientesHoy > 0 || facturasPendientesHoy > 0) {
            normalizedData.push({
              name: todayStr,
              displayDate: today.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'short'
              }),
              total: pendientesHoy,
              cantidad: facturasPendientesHoy,
              fecha: new Date(today),
              isToday: true
            });
            
            // Re-ordenar después de añadir el día actual
            normalizedData.sort((a, b) => a.fecha - b.fecha);
          }
        }
        
        setChartData(normalizedData);
      } else {
        setError('Error al cargar datos: ' + (response.data.message || 'Error desconocido'));
      }
      setIsLoading(false);
    })
    .catch(err => {
      console.error('Error al obtener ventas fiadas:', err);
      setError('Error al cargar datos: ' + (err.message || 'Error de red'));
      setIsLoading(false);
    });
  };
  
  // Efecto para la carga inicial
  useEffect(() => {
    if (isFirstRender.current) {
      fetchDailyCreditSales();
      isFirstRender.current = false;
    }
  }, []);
  
  // Efecto para actualización periódica
  useEffect(() => {
    // Actualizar cada 5 minutos
    timer.current = setInterval(() => {
      if (!isLoading) {
        fetchDailyCreditSales();
      }
    }, 5 * 60 * 1000);
    
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
  }, [isLoading]);
  
  // Efecto para cambios en filtros (mes, año, paginación)
  useEffect(() => {
    // Si es la primera renderización, no hacer nada (ya se maneja en el primer useEffect)
    if (isFirstRender.current) {
      return;
    }
    
    // Si es un cambio de mes o año, resetear a la página 1
    if (previousMonth.current !== selectedMonth || previousYear.current !== selectedYear) {
      setCurrentPage(1);
      previousMonth.current = selectedMonth;
      previousYear.current = selectedYear;
    }
    
    // Si es un refresh manual, usar la bandera
    if (isManualRefresh.current) {
      isManualRefresh.current = false;
    }
    
    fetchDailyCreditSales();
  }, [selectedMonth, selectedYear, currentPage, itemsPerPage, showAllData]);
  
  // Efecto para sincronizar con datos del dashboard cuando cambian
  useEffect(() => {
    if (dashboardData && !isFirstRender.current) {
      // Solo actualizar si estamos en el mes actual
      const today = new Date();
      const isCurrentMonth = today.getMonth() + 1 === selectedMonth && today.getFullYear() === selectedYear;
      
      if (isCurrentMonth) {
        // Actualizar el día actual con datos del dashboard
        const todayStr = today.getDate().toString();
        const pendientesHoy = dashboardData.totalVentas?.pendientesHoy || 0;
        const facturasPendientesHoy = dashboardData.facturasCreadas?.pendientesHoy || 0;
        
        // Crear una copia del array de datos
        const updatedData = [...chartData];
        const todayIndex = updatedData.findIndex(item => item.name === todayStr);
        
        if (todayIndex >= 0) {
          // Actualizar el día existente
          updatedData[todayIndex] = {
            ...updatedData[todayIndex],
            total: pendientesHoy,
            cantidad: facturasPendientesHoy,
            isToday: true
          };
        } else if (pendientesHoy > 0 || facturasPendientesHoy > 0) {
          // Añadir el día actual si no existe
          updatedData.push({
            name: todayStr,
            displayDate: today.toLocaleDateString('es-ES', { 
              day: 'numeric', 
              month: 'short'
            }),
            total: pendientesHoy,
            cantidad: facturasPendientesHoy,
            fecha: new Date(today),
            isToday: true
          });
          
          // Re-ordenar después de añadir el día actual
          updatedData.sort((a, b) => a.fecha - b.fecha);
        }
        
        setChartData(updatedData);
      }
    }
  }, [dashboardData]);
  
  // Manejadores de eventos
  const handleRefresh = () => {
    isManualRefresh.current = true;
    fetchDailyCreditSales();
  };
  
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
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
  
  const toggleOptionsModal = () => {
    setShowOptionsModal(!showOptionsModal);
  };
  
  const toggleDetallesModal = (date = null) => {
    if (date) {
      setSelectedDate(date);
    }
    setShowDetallesModal(!showDetallesModal);
  };
  
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };
  
  const toggleShowAllData = () => {
    setShowAllData(!showAllData);
  };
  
  // Renderizado del componente
  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Fiado Diario {selectedMonth && selectedYear ? `${new Date(2000, selectedMonth - 1, 1).toLocaleString('es-ES', { month: 'long' })} ${selectedYear}` : ''}</h2>
        
        <div className="flex space-x-2">
          <button 
            onClick={handleRefresh} 
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            disabled={isLoading}
            title="Actualizar datos"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <button 
            onClick={toggleOptionsModal} 
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            title="Opciones"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => toggleDetallesModal()} 
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            title="Ver detalles"
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Controles de navegación de mes */}
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={handlePrevMonth}
          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="text-sm font-medium text-gray-700">
          {new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
        </div>
        
        <button 
          onClick={handleNextMonth}
          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Contenido principal */}
      <div className="h-[250px] relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
            <LoadingSpinner text="Cargando datos..." />
          </div>
        )}
        
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={formatYAxis}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = chartData.find(item => item.name === label);
                    const displayDate = item?.displayDate || label;
                    
                    return (
                      <div className="bg-white p-3 rounded-md shadow-lg border border-gray-200">
                        <p className="font-medium text-gray-700 capitalize">{displayDate}</p>
                        <p className="text-purple-600">
                          <span className="font-bold">RD$ {payload[0].value.toLocaleString()}</span>
                        </p>
                        {payload[0].payload.cantidad && (
                          <p className="text-blue-600">
                            <span className="font-bold">{payload[0].payload.cantidad}</span> facturas
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="total" 
                name="Total Fiado" 
                fill="#9F7AEA" 
                radius={[4, 4, 0, 0]}
                barSize={40}
                onClick={(data) => {
                  // Al hacer clic en una barra, abrir el modal con la fecha seleccionada
                  if (data && data.fecha) {
                    toggleDetallesModal(data.fecha);
                  }
                }}
                cursor="pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isToday ? '#805AD5' : '#9F7AEA'}
                    stroke={entry.isToday ? '#553C9A' : 'none'}
                    strokeWidth={entry.isToday ? 1 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            {isLoading ? 'Cargando datos...' : 'No hay datos disponibles para este período'}
          </div>
        )}
      </div>
      
      {/* Paginación */}
      {!showAllData && chartData.length > 0 && (
        <div className="flex justify-between items-center mt-4 text-sm">
          <div className="text-gray-600">
            Página {currentPage} de {totalPages}
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`p-1 rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button 
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`p-1 rounded ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Modal de opciones */}
      {showOptionsModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={toggleOptionsModal}
        >
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-lg p-6 w-80 max-w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Opciones de visualización</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Elementos por página
              </label>
              <select 
                value={itemsPerPage} 
                onChange={handleItemsPerPageChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={showAllData}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
                <option value="30">30</option>
              </select>
            </div>
            
            <div className="mb-6">
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  checked={showAllData} 
                  onChange={toggleShowAllData}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Mostrar todos los datos</span>
              </label>
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={toggleOptionsModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Nota informativa */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Los gráficos se actualizan cada vez que se carga la página
      </div>
      
      {/* Modal de detalles */}
      <FiadoDetallesModal 
        isOpen={showDetallesModal} 
        onClose={() => setShowDetallesModal(false)} 
        selectedDate={selectedDate} 
      />
    </div>
  );
};

export default FiadoGrafico;
