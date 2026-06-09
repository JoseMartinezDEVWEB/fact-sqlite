 
/* eslint-disable react/prop-types */
// src/components/Dashboard/VentasDiariasChart.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, MoreVertical, ChevronLeft, ChevronRight, ChevronDown, X, Calendar, Search } from 'lucide-react';
import axios from 'axios';
import LoadingSpinner from '../common/LoadingSpinner';
import VentasDiariasDetallesModal from './VentasDiariasDetallesModal';

// Configuración de axios para las solicitudes API
const apiUrl = 'http://localhost:4000/api';

const VentasDiariasChart = ({ dashboardData }) => {
  // Estados del componente
  const [showAllSales, setShowAllSales] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [salesPerPage, setSalesPerPage] = useState(5);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDateFilter, setShowDateFilter] = useState(false);
  
  // Estados para el modal de detalles
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Referencias para evitar dependencias circulares
  const isFirstMount = useRef(true);
  const lastDashboardData = useRef(null);
  
  // Función para obtener datos desde el backend
  const fetchDailySales = (forceRefresh = false) => {
    if (isLoading && !forceRefresh) return;
    
    setIsLoading(true);
    setError(null);
    
    // Obtener el token de autenticación
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.warn('No hay token de autenticación disponible');
      setIsLoading(false);
      return;
    }
    
    // Crear fecha para filtrar por mes y año específicos
    const filterDate = new Date(selectedYear, selectedMonth - 1, 1);
    const today = new Date();
    
    // Si el filtro es para el mes actual, solo mostrar hasta hoy
    const isCurrentMonth = selectedMonth === today.getMonth() + 1 && selectedYear === today.getFullYear();
    
    // Determinar fechas de inicio y fin
    let startDate, endDate;
    
    startDate = new Date(filterDate);
    startDate.setHours(0, 0, 0, 0);
    
    if (isCurrentMonth) {
      // Si es el mes actual, usar la fecha actual como fin
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Si es otro mes, usar el último día del mes
      endDate = new Date(selectedYear, selectedMonth, 0);
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Formatear fechas para la API en formato ISO sin zona horaria (YYYY-MM-DD)
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    
    // Prevenir caché con timestamp
    const timestamp = new Date().getTime();
    
    // Hacer la solicitud para obtener ventas diarias paginadas
    axios.get(
      `${apiUrl}/dashboard/daily-sales?startDate=${formattedStartDate}&endDate=${formattedEndDate}&page=${currentPage}&limit=${showAllSales ? 50 : salesPerPage}&sortBy=fecha&order=desc&t=${timestamp}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    .then(response => {
      // Verificar si la respuesta tiene el formato esperado
      if (response.data && response.data.success && response.data.data) {
        // Extraer las ventas y la información de paginación
        const { sales, pagination } = response.data.data;
        
        if (Array.isArray(sales) && sales.length > 0) {
          // Obtener la fecha actual del sistema
          const fechaActual = new Date();
          
          // 1. Aggregate sales by day
          const aggregatedSales = {};
          const todayDateString = `${fechaActual.getFullYear()}-${(fechaActual.getMonth() + 1).toString().padStart(2, '0')}-${fechaActual.getDate().toString().padStart(2, '0')}`;

          sales.forEach(item => {
            const itemDate = new Date(item.fecha);
            const localYear = itemDate.getFullYear();
            const localMonth = itemDate.getMonth();
            const localDay = itemDate.getDate();

            // Clave para agregación basada en la fecha local
            const dateKey = `${localYear}-${(localMonth + 1).toString().padStart(2, '0')}-${localDay.toString().padStart(2, '0')}`;

            if (!aggregatedSales[dateKey]) {
              aggregatedSales[dateKey] = {
                totalVentas: 0,
                cantidadFacturas: 0,
                fechaForSort: new Date(localYear, localMonth, localDay, 0, 0, 0, 0).toISOString(),
                count: 0,
              };
            }
            aggregatedSales[dateKey].totalVentas += item.totalVentas || 0;
            aggregatedSales[dateKey].cantidadFacturas += item.cantidadFacturas || 0;
            aggregatedSales[dateKey].count += 1;
          });

          // 2. Normalizar datos agregados para el gráfico
          let normalizedData = Object.entries(aggregatedSales).map(([dateKey, data]) => {
            const [year, month, day] = dateKey.split('-').map(Number);
            const fechaVenta = new Date(year, month - 1, day, 0, 0, 0, 0);

            const esHoy = fechaVenta.getFullYear() === fechaActual.getFullYear() &&
                          fechaVenta.getMonth() === fechaActual.getMonth() &&
                          fechaVenta.getDate() === fechaActual.getDate();

            const formattedDate = `${fechaVenta.getDate().toString().padStart(2, '0')}/${(fechaVenta.getMonth() + 1).toString().padStart(2, '0')}/${fechaVenta.getFullYear()}`;
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDateLong = fechaVenta.toLocaleDateString('es-ES', options);
            const displayDate = esHoy ? `${formattedDateLong} (Hoy)` : formattedDateLong;

            return {
              name: formattedDate,
              displayDate: displayDate,
              total: data.totalVentas,
              cantidad: data.cantidadFacturas,
              fecha: data.fechaForSort,
              esHoy: esHoy,
            };
          });

          // 3. Asegurar que "Hoy" esté presente si es el mes actual y no hay ventas para hoy
          let hayVentasHoy = !!aggregatedSales[todayDateString];

          if (!hayVentasHoy && isCurrentMonth) {
            console.log('Agregando entrada para el día actual (post-agregación)');
            
            // Usar fechaActual para los detalles de la entrada "Hoy"
            const diaActualHoy = fechaActual.getDate();
            const mesActualHoy = fechaActual.getMonth();
            const anioActualHoy = fechaActual.getFullYear();

            const formattedDateHoy = `${diaActualHoy.toString().padStart(2, '0')}/${(mesActualHoy + 1).toString().padStart(2, '0')}/${anioActualHoy}`;
            const optionsHoy = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDateLongHoy = fechaActual.toLocaleDateString('es-ES', optionsHoy);
            
            // Obtener el total de ventas de hoy desde los datos del dashboard si están disponibles
            let totalVentasHoy = 0;
            let cantidadFacturasHoy = 0;
            
            if (dashboardData && dashboardData.totalVentas && dashboardData.totalVentas.hoy !== undefined) {
              totalVentasHoy = dashboardData.totalVentas.hoy;
              console.log('Usando total de ventas de hoy del dashboard:', totalVentasHoy);
            }
            
            if (dashboardData && dashboardData.facturasCreadas && dashboardData.facturasCreadas.hoy !== undefined) {
              cantidadFacturasHoy = dashboardData.facturasCreadas.hoy;
              console.log('Usando cantidad de facturas de hoy del dashboard:', cantidadFacturasHoy);
            }
            
            normalizedData.push({
              name: formattedDateHoy,
              displayDate: `${formattedDateLongHoy} (Hoy)`,
              total: totalVentasHoy,
              cantidad: cantidadFacturasHoy,
              fecha: fechaActual.toISOString(),
              esHoy: true,
            });
          }

          // 4. Ordenar por fecha (más reciente primero)
          normalizedData.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          
          // 5. Actualizar el estado con los datos normalizados
          setChartData(normalizedData);
          setTotalPages(pagination?.totalPages || 1);
        } else {
          // Si no hay ventas, usar array vacío
          setChartData([]);
          setTotalPages(1);
          console.log('No hay ventas registradas en este período');
        }
      } else {
        // Si la respuesta no tiene el formato esperado
        console.warn('Formato de respuesta incorrecto:', response.data);
        setChartData([]);
        setTotalPages(1);
      }
    })
    .catch(error => {
      console.error('Error al obtener ventas diarias:', error);
      setError('Error al cargar las ventas. Por favor, intente de nuevo.');
      
      // Usar datos de ejemplo en caso de error
      setChartData(getDummySalesData());
      setTotalPages(Math.ceil(chartData.length / salesPerPage));
    })
    .finally(() => {
      setIsLoading(false);
    });
  };
  
  // Función auxiliar para datos de ejemplo en caso de error
  const getDummySalesData = () => {
    const today = new Date();
    const dummyData = [];
    
    // Generar datos para los últimos 7 días
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const formattedDateLong = date.toLocaleDateString('es-ES', options);
      const displayDate = i === 0 ? `${formattedDateLong} (Hoy)` : formattedDateLong;
      
      // Si es hoy y tenemos datos del dashboard, usarlos
      let totalVentas = Math.floor(Math.random() * 10000);
      let cantidadFacturas = Math.floor(Math.random() * 10);
      
      if (i === 0 && dashboardData && dashboardData.totalVentas && dashboardData.totalVentas.hoy !== undefined) {
        totalVentas = dashboardData.totalVentas.hoy;
        cantidadFacturas = dashboardData.facturasCreadas?.hoy || 0;
      }
      
      dummyData.push({
        name: formattedDate,
        displayDate: displayDate,
        total: totalVentas,
        cantidad: cantidadFacturas,
        fecha: date.toISOString(),
        esHoy: i === 0
      });
    }
    
    return dummyData;
  };
  
  // Obtener datos para la página actual
  const getCurrentPageData = () => {
    if (showAllSales) {
      return chartData;
    }
    
    const startIndex = (currentPage - 1) * salesPerPage;
    const endIndex = startIndex + salesPerPage;
    return chartData.slice(startIndex, endIndex);
  };
  
  // Función para normalizar datos de ventas
  const normalizeSalesData = (sales, isCurrentMonth) => {
    // Implementación de la normalización de datos
    // ...
    return sales;
  };
  
  // Cargar datos al montar el componente
  useEffect(() => {
    // Carga inicial
    fetchDailySales(false);
    
    // Actualización automática cada 5 minutos
    const intervalId = setInterval(() => {
      fetchDailySales(true);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []); // Sin dependencias para evitar bucles
  
  // Efecto para actualizar cuando cambian los filtros
  useEffect(() => {
    // Solo ejecutar si no es la primera carga y no estamos ya cargando
    if (!isFirstMount.current && !isLoading) {
      fetchDailySales(true);
    }
    
    // Después de la primera renderización, marcar como no primera carga
    isFirstMount.current = false;
  }, [selectedMonth, selectedYear, showAllSales, currentPage, salesPerPage]);
  
  // Efecto separado para actualizar cuando cambian los datos del dashboard
  useEffect(() => {
    // Evitar actualizaciones innecesarias
    if (!dashboardData || !dashboardData.totalVentas || isLoading) return;
    
    // Verificar si los datos del dashboard han cambiado
    const currentTotal = dashboardData.totalVentas.hoy;
    if (lastDashboardData.current === currentTotal) return;
    
    // Solo actualizar si estamos viendo el mes actual
    const today = new Date();
    const isCurrentMonthSelected = 
      selectedMonth === (today.getMonth() + 1) && 
      selectedYear === today.getFullYear();
    
    if (isCurrentMonthSelected) {
      // Actualizar la referencia
      lastDashboardData.current = currentTotal;
      
      // Buscar si ya existe una entrada para hoy en chartData
      const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      const existingTodayEntry = chartData.find(item => item.name === todayStr || item.esHoy);
      
      // Solo actualizar si no hay entrada para hoy o si los valores son diferentes
      if (!existingTodayEntry || 
          existingTodayEntry.total !== currentTotal || 
          existingTodayEntry.cantidad !== (dashboardData.facturasCreadas?.hoy || 0)) {
        console.log('Actualizando gráfico con nuevos datos del dashboard');
        fetchDailySales(true);
      }
    }
  }, [dashboardData]);
  
  // Función para cambiar de página
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  // Función para refrescar datos manualmente
  const handleRefresh = () => {
    fetchDailySales(true);
  };
  
  // Función para cambiar el número de ventas por página
  const handleSalesPerPageChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setSalesPerPage(value);
      setCurrentPage(1); // Resetear a la primera página
    }
  };
  
  // Función para mostrar/ocultar todas las ventas
  const toggleShowAllSales = () => {
    setShowAllSales(!showAllSales);
    setCurrentPage(1); // Resetear a la primera página
  };
  
  // Función para cambiar el mes seleccionado
  const handleMonthChange = (e) => {
    setSelectedMonth(parseInt(e.target.value));
    setCurrentPage(1); // Resetear a la primera página
  };
  
  // Función para cambiar el año seleccionado
  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
    setCurrentPage(1); // Resetear a la primera página
  };
  
  // Función para formatear valores en el tooltip
  const formatTooltipValue = (value) => {
    return value.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    });
  };
  
  // Función para formatear el eje Y
  const formatYAxis = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value;
  };
  
  // Función para manejar el clic en una barra del gráfico
  const handleBarClick = (data) => {
    if (data && data.fecha) {
      setSelectedDate(data.fecha);
      setShowDetallesModal(true);
    }
  };
  
  // Renderizar componente
  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Ventas Diarias {selectedMonth && selectedYear ? `${new Date(2000, selectedMonth - 1, 1).toLocaleString('es-ES', { month: 'long' })} ${selectedYear}` : ''}</h2>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            title="Filtrar por fecha"
          >
            <Calendar size={18} />
          </button>
          
          <button 
            onClick={handleRefresh}
            className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${isLoading ? 'animate-spin' : ''}`}
            title="Refrescar datos"
            disabled={isLoading}
          >
            <RefreshCw size={18} />
          </button>
          
          <button 
            onClick={() => setShowModal(!showModal)}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            title="Más opciones"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>
      
      {/* Filtro de fecha */}
      {showDateFilter && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-4 p-3 bg-gray-50 rounded-lg flex flex-wrap items-center gap-3"
        >
          <div className="flex items-center">
            <label htmlFor="month" className="mr-2 text-sm text-gray-600">Mes:</label>
            <select 
              id="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="border rounded px-2 py-1 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1, 1).toLocaleString('es-ES', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center">
            <label htmlFor="year" className="mr-2 text-sm text-gray-600">Año:</label>
            <select 
              id="year"
              value={selectedYear}
              onChange={handleYearChange}
              className="border rounded px-2 py-1 text-sm"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={() => setShowDateFilter(false)}
            className="ml-auto p-1 rounded-full hover:bg-gray-200 transition-colors"
            title="Cerrar filtro"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
      
      {/* Contenido principal */}
      <div className="relative bg-gray-100 border border-gray-300 rounded-xl p-4 shadow-lg my-auto">
        <div className="h-[250px] relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 rounded-lg">
            <LoadingSpinner text="Cargando datos..." />
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 p-4 rounded-lg">
            <div className="text-red-500 text-center">
              <p>{error}</p>
              <button 
                onClick={handleRefresh}
                className="mt-2 px-3 py-1 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors text-sm"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && chartData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-600 p-4 rounded-lg">
            <p className="text-center">No hay ventas registradas en este período</p>
          </div>
        )}

        {!isLoading && !error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={getCurrentPageData()}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
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
                        <p className="text-green-600">
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
                name="Ventas (RD$)" 
                fill="#FF6B81" 
                radius={[4, 4, 0, 0]}
                barSize={30}
                onClick={handleBarClick}
                cursor="pointer"
                shape={(props) => {
                  const { x, y, width, height, esHoy } = props;
                  
                  const fill = esHoy ? '#FF4070' : '#FF6B81';
                  const stroke = esHoy ? '#333' : 'none';
                  const strokeWidth = esHoy ? 1 : 0;
                  
                  return (
                    <rect 
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      rx={4}
                      ry={4}
                      className="hover:opacity-80 transition-opacity"
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        </div> {/* Closes div from line 488 (h-[250px] relative) */}
      </div> {/* Closes div from line 487 (bg-gray-100 ... my-auto) */}
      
      {/* Paginación */}
      {!showAllSales && chartData.length > salesPerPage && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            Mostrando {Math.min(salesPerPage, chartData.length)} de {chartData.length} ventas
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-1 rounded-full ${currentPage === 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Página anterior"
            >
              <ChevronLeft size={18} />
            </button>
            
            <span className="text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-1 rounded-full ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Página siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
      
      {/* Modal de opciones */}
      {showModal && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute top-12 right-4 bg-white rounded-lg shadow-lg p-3 z-20 w-64 border border-gray-200"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-gray-700">Opciones</h3>
            <button 
              onClick={() => setShowModal(false)}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="salesPerPage" className="block text-sm text-gray-600 mb-1">
                Ventas por página:
              </label>
              <input
                id="salesPerPage"
                type="number"
                min="1"
                value={salesPerPage}
                onChange={handleSalesPerPageChange}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            
            <div className="flex items-center">
              <input
                id="showAllSales"
                type="checkbox"
                checked={showAllSales}
                onChange={toggleShowAllSales}
                className="mr-2"
              />
              <label htmlFor="showAllSales" className="text-sm text-gray-600">
                Mostrar todas las ventas
              </label>
            </div>
          </div>
        </motion.div>
      )}
      
      <div className="text-xs text-gray-400 mt-2 text-center">
        Los gráficos se actualizan cada vez que se carga la página
      </div>
      
      {/* Modal de detalles de ventas diarias */}
      {showDetallesModal && (
        <VentasDiariasDetallesModal
          isOpen={showDetallesModal}
          onClose={() => setShowDetallesModal(false)}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
};

export default VentasDiariasChart;