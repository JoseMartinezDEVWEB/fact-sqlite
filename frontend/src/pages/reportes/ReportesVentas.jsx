import { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { getVentasReport } from '../../services/reportService';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import ReportFilter from '../../components/reportes/ReportFilter';
import ReportCharts from '../../components/reportes/ReportCharts';
import ReportExport from '../../components/reportes/ReportExport';
import ReportSummaryCards from '../../components/reportes/ReportSummaryCards';
import { FiRefreshCw } from 'react-icons/fi';

const ReportesVentas = () => {
  const [ventasData, setVentasData] = useState([]);
  const [resumen, setResumen] = useState({
    totalVentas: 0,
    totalEfectivo: 0,
    totalTarjeta: 0,
    totalTransferencia: 0,
    totalCredito: 0,
    cantidadFacturas: 0
  });
  const [filtros, setFiltros] = useState({
    periodo: 'semanal',
    fechaInicio: '',
    fechaFin: '',
    useCache: true
  });
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Manejar cambios en los filtros
  const handleFilterChange = (newFilters) => {
    // Resetear la página cuando cambian los filtros
    setPage(1);
    setFiltros(newFilters);
  };

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    if (filtros.fechaInicio && filtros.fechaFin) {
      // Primero cargar solo el resumen para mostrar rápidamente
      fetchVentasData(true);
      
      // Luego cargar los detalles completos
      setTimeout(() => {
        fetchVentasData(false);
      }, 100);
    }
  }, [filtros.fechaInicio, filtros.fechaFin, filtros.useCache, fetchVentasData]);
  
  // Cargar más datos cuando se cambia de página
  const loadMoreData = () => {
    setPage(prevPage => prevPage + 1);
  };
  
  // Efecto para cargar más datos cuando cambia la página
  useEffect(() => {
    if (page > 1) {
      fetchVentasData(false);
    }
  }, [page, fetchVentasData]);
  
  // Forzar recarga de datos sin usar caché
  const handleRefreshData = () => {
    const newFilters = { ...filtros, useCache: false };
    setFiltros(newFilters);
  };

  // Función para cargar datos de ventas con soporte para carga progresiva
  const fetchVentasData = useCallback(async (loadSummaryOnly = false) => {
    try {
      // Si estamos cargando solo el resumen o es la primera carga, mostrar el indicador de carga principal
      if (loadSummaryOnly) {
        setLoading(true);
      } else {
        setLoadingDetails(true);
      }
      
      setError(null);
      
      const startTime = performance.now();
      
      // Obtener datos de ventas por fecha usando el servicio
      const response = await getVentasReport({
        startDate: filtros.fechaInicio,
        endDate: filtros.fechaFin,
        useCache: filtros.useCache,
        page: loadSummaryOnly ? 1 : page,
        limit: itemsPerPage,
        summaryOnly: loadSummaryOnly
      });
      
      const endTime = performance.now();
      setResponseTime((endTime - startTime).toFixed(2));
      setFromCache(response.fromCache || false);
      
      console.log('Datos de ventas:', response);
      
      if (response.success && response.data) {
        const { ventas, resumen, pagination } = response.data;
        
        // Si hay información de paginación, actualizar el estado
        if (pagination) {
          setTotalItems(pagination.total || ventas.length);
        }
        
        // Formatear datos para el gráfico
        const formattedData = ventas.map(item => ({
          fecha: format(parseISO(item.fecha), 'dd/MM/yyyy'),
          total: item.total,
          efectivo: item.efectivo || 0,
          tarjeta: item.tarjeta || 0,
          transferencia: item.transferencia || 0,
          credito: item.credito || 0
        }));
        
        // Si estamos cargando más páginas, añadir a los datos existentes
        if (!loadSummaryOnly && page > 1) {
          setVentasData(prevData => [...prevData, ...formattedData]);
        } else {
          setVentasData(formattedData);
        }
        
        // Actualizar el resumen
        setResumen({
          totalVentas: resumen.totalVentas || 0,
          totalEfectivo: resumen.totalEfectivo || 0,
          totalTarjeta: resumen.totalTarjeta || 0,
          totalTransferencia: resumen.totalTransferencia || 0,
          totalCredito: resumen.totalCredito || 0,
          cantidadFacturas: resumen.cantidadFacturas || 0
        });
      } else {
        throw new Error(response.message || 'Error al obtener datos de ventas');
      }
    } catch (error) {
      console.error('Error al obtener datos de ventas:', error);
      setError('Error al cargar los datos de ventas. Intente nuevamente.');
      
      // Datos de ejemplo para desarrollo
      const demoData = generarDatosDemostracion();
      setVentasData(demoData.ventas);
      setResumen(demoData.resumen);
    } finally {
      setLoading(false);
      setLoadingDetails(false);
    }
  }, [filtros, page, itemsPerPage]);

  // Función para generar datos de demostración
  const generarDatosDemostracion = () => {
    const ventas = [];
    let totalEfectivo = 0;
    let totalTarjeta = 0;
    let totalTransferencia = 0;
    let totalCredito = 0;
    let totalVentas = 0;
    
    // Generar datos para cada día en el rango de fechas
    const inicio = parseISO(filtros.fechaInicio);
    const fin = parseISO(filtros.fechaFin);
    let currentDate = inicio;
    
    while (currentDate <= fin) {
      const efectivo = Math.floor(Math.random() * 5000) + 1000;
      const tarjeta = Math.floor(Math.random() * 3000) + 500;
      const transferencia = Math.floor(Math.random() * 2000) + 300;
      const credito = Math.floor(Math.random() * 1500) + 200;
      const total = efectivo + tarjeta + transferencia + credito;
      
      ventas.push({
        fecha: format(currentDate, 'dd/MM/yyyy'),
        total,
        efectivo,
        tarjeta,
        transferencia,
        credito
      });
      
      totalEfectivo += efectivo;
      totalTarjeta += tarjeta;
      totalTransferencia += transferencia;
      totalCredito += credito;
      totalVentas += total;
      
      // Avanzar al siguiente día
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      ventas,
      resumen: {
        totalVentas,
        totalEfectivo,
        totalTarjeta,
        totalTransferencia,
        totalCredito,
        cantidadFacturas: ventas.length * 5 // Aproximadamente 5 facturas por día
      }
    };
  };

  // Función para formatear moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Preparar datos para los gráficos
  const chartSeries = [
    { dataKey: 'efectivo', name: 'Efectivo', color: '#4ade80' },
    { dataKey: 'tarjeta', name: 'Tarjeta', color: '#a78bfa' },
    { dataKey: 'transferencia', name: 'Transferencia', color: '#fbbf24' },
    { dataKey: 'credito', name: 'Crédito', color: '#f87171' }
  ];

  // Preparar datos para las tarjetas de resumen
  const getSummaryCards = () => {
    return [
      {
        title: 'Total Ventas',
        value: formatCurrency(resumen.totalVentas),
        color: 'border-blue-500',
        icon: (
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        iconBg: 'bg-blue-100'
      },
      {
        title: 'Efectivo',
        value: formatCurrency(resumen.totalEfectivo),
        color: 'border-green-500',
        icon: (
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        iconBg: 'bg-green-100',
        subtitle: `${((resumen.totalEfectivo / resumen.totalVentas) * 100).toFixed(1)}% del total`
      },
      {
        title: 'Tarjeta',
        value: formatCurrency(resumen.totalTarjeta),
        color: 'border-purple-500',
        icon: (
          <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
        iconBg: 'bg-purple-100',
        subtitle: `${((resumen.totalTarjeta / resumen.totalVentas) * 100).toFixed(1)}% del total`
      },
      {
        title: 'Facturas',
        value: resumen.cantidadFacturas,
        color: 'border-yellow-500',
        icon: (
          <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        iconBg: 'bg-yellow-100'
      }
    ];
  };

  // Preparar datos para exportación
  const getExportColumns = () => {
    return [
      { dataKey: 'fecha', title: 'Fecha' },
      { dataKey: 'efectivo', title: 'Efectivo', format: formatCurrency },
      { dataKey: 'tarjeta', title: 'Tarjeta', format: formatCurrency },
      { dataKey: 'transferencia', title: 'Transferencia', format: formatCurrency },
      { dataKey: 'credito', title: 'Crédito', format: formatCurrency },
      { dataKey: 'total', title: 'Total', format: formatCurrency }
    ];
  };

  // Función para generar PDF
  const generarPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Reporte de Ventas', 105, 15, { align: 'center' });
    
    // Periodo
    doc.setFontSize(12);
    doc.text(`Periodo: ${format(parseISO(filtros.fechaInicio), 'dd/MM/yyyy')} - ${format(parseISO(filtros.fechaFin), 'dd/MM/yyyy')}`, 105, 25, { align: 'center' });
    
    // Resumen
    doc.setFontSize(14);
    doc.text('Resumen', 14, 35);
    
    const resumenData = [
      ['Total Ventas', formatCurrency(resumen.totalVentas)],
      ['Efectivo', formatCurrency(resumen.totalEfectivo)],
      ['Tarjeta', formatCurrency(resumen.totalTarjeta)],
      ['Transferencia', formatCurrency(resumen.totalTransferencia)],
      ['Crédito', formatCurrency(resumen.totalCredito)],
      ['Cantidad Facturas', resumen.cantidadFacturas.toString()]
    ];
    
    doc.autoTable({
      startY: 40,
      head: [['Concepto', 'Valor']],
      body: resumenData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Detalle por día
    doc.setFontSize(14);
    doc.text('Detalle por Día', 14, doc.autoTable.previous.finalY + 10);
    
    const ventasTableData = ventasData.map(item => [
      item.fecha,
      formatCurrency(item.efectivo),
      formatCurrency(item.tarjeta),
      formatCurrency(item.transferencia),
      formatCurrency(item.credito),
      formatCurrency(item.total)
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 15,
      head: [['Fecha', 'Efectivo', 'Tarjeta', 'Transferencia', 'Crédito', 'Total']],
      body: ventasTableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
      doc.text(`Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 292, { align: 'center' });
    }
    
    // Guardar PDF
    doc.save(`Reporte_Ventas_${fechaInicio}_${fechaFin}.pdf`);
  };

  return (
    <>
      <Helmet>
        <title>Reporte de Ventas | App Facturación</title>
      </Helmet>
      
      <div className="space-y-6">
        {/* Filtros */}
        <ReportFilter onFilterChange={handleFilterChange} />
        
        {/* Acciones de exportación */}
        <div className="flex justify-end">
          <ReportExport 
            title="Reporte de Ventas"
            filename="reporte-ventas"
            data={ventasData}
            columns={getExportColumns()}
            summary={resumen}
            config={{
              companyName: 'App Facturación',
              periodo: filtros.periodo
            }}
          />
        </div>
        
        {/* Tarjetas de resumen */}
        <ReportSummaryCards items={getSummaryCards()} />
        
        {/* Gráfico */}
        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-md p-4">
            <p className="text-gray-500">Cargando datos...</p>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64 bg-red-50 rounded-lg shadow-md p-4">
            <p className="text-red-500">{error}</p>
          </div>
        ) : ventasData.length === 0 ? (
          <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg shadow-md p-4">
            <p className="text-gray-500">No hay datos disponibles para el período seleccionado</p>
          </div>
        ) : (
          <ReportCharts 
            data={ventasData} 
            series={chartSeries} 
            xAxisKey="fecha" 
            formatter={formatCurrency}
            defaultType="bar"
          />
        )}
        
        {/* Tabla de ventas por día */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Detalle de Ventas por Día</h3>
            
            <div className="flex items-center space-x-2">
              {fromCache && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Datos en caché ({responseTime}ms)
                </span>
              )}
              
              <button 
                onClick={handleRefreshData}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Recargar datos sin usar caché"
              >
                <FiRefreshCw size={16} />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {loadingDetails ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Efectivo</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tarjeta</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Transferencia</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Crédito</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ventasData.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.fecha}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.efectivo)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.tarjeta)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.transferencia)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.credito)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Total</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatCurrency(resumen.totalEfectivo)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatCurrency(resumen.totalTarjeta)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatCurrency(resumen.totalTransferencia)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatCurrency(resumen.totalCredito)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatCurrency(resumen.totalVentas)}</td>
                    </tr>
                  </tfoot>
                </table>
                
                {/* Botón para cargar más datos */}
                {ventasData.length < totalItems && (
                  <div className="mt-4 text-center">
                    <button 
                      onClick={loadMoreData}
                      disabled={loadingDetails}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors disabled:opacity-50"
                    >
                      {loadingDetails ? 'Cargando...' : `Cargar más (${ventasData.length} de ${totalItems})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportesVentas;
