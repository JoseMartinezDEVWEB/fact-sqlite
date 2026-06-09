import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { getGastosReport } from '../../services/reportService';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import ReportFilter from '../../components/reportes/ReportFilter';
import ReportCharts from '../../components/reportes/ReportCharts';
import ReportExport from '../../components/reportes/ReportExport';
import ReportSummaryCards from '../../components/reportes/ReportSummaryCards';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const ReportesGastos = () => {
  const [gastosPorCategoria, setGastosPorCategoria] = useState([]);
  const [gastosPorDia, setGastosPorDia] = useState([]);
  const [resumen, setResumen] = useState({
    totalGastos: 0,
    promedioGastosDiarios: 0,
    categoriaMaxGasto: '',
    montoMaxGasto: 0,
    cantidadGastos: 0
  });
  const [filtros, setFiltros] = useState({
    periodo: 'semanal',
    fechaInicio: '',
    fechaFin: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Manejar cambios en los filtros
  const handleFilterChange = (newFilters) => {
    setFiltros(newFilters);
  };

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    if (filtros.fechaInicio && filtros.fechaFin) {
      fetchGastosData();
    }
  }, [filtros.fechaInicio, filtros.fechaFin]);

  const fetchGastosData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener datos de gastos por fecha usando el servicio
      const response = await getGastosReport({
        startDate: filtros.fechaInicio,
        endDate: filtros.fechaFin
      });
      
      console.log('Datos de gastos:', response);
      
      if (response.success && response.data) {
        const { gastos, porCategoria, resumen } = response.data;
        
        // Formatear datos para el gráfico de categorías
        const formattedCategorias = porCategoria.map(item => ({
          name: item.categoria,
          value: item.total
        }));
        
        // Formatear datos para el gráfico por día
        const gastosAgrupados = {};
        gastos.forEach(item => {
          const fecha = format(parseISO(item.fecha), 'dd/MM/yyyy');
          if (!gastosAgrupados[fecha]) {
            gastosAgrupados[fecha] = 0;
          }
          gastosAgrupados[fecha] += item.monto;
        });
        
        const formattedDias = Object.entries(gastosAgrupados).map(([fecha, total]) => ({
          fecha,
          total
        }));
        
        setGastosPorCategoria(formattedCategorias);
        setGastosPorDia(formattedDias);
        setResumen({
          totalGastos: resumen.totalGastos || 0,
          promedioGastosDiarios: formattedDias.length > 0 ? resumen.totalGastos / formattedDias.length : 0,
          categoriaMaxGasto: formattedCategorias.length > 0 ? 
            formattedCategorias.reduce((max, item) => item.value > max.value ? item : max, formattedCategorias[0]).name : '',
          montoMaxGasto: formattedCategorias.length > 0 ? 
            formattedCategorias.reduce((max, item) => item.value > max.value ? item : max, formattedCategorias[0]).value : 0,
          cantidadGastos: resumen.cantidadGastos || 0
        });
      } else {
        throw new Error(response.message || 'Error al obtener datos de gastos');
      }
    } catch (error) {
      console.error('Error al obtener datos de gastos:', error);
      setError('Error al cargar los datos de gastos. Intente nuevamente.');
      
      // Datos de ejemplo para desarrollo
      const demoData = generarDatosDemostracion();
      setGastosPorCategoria(demoData.gastosPorCategoria);
      setGastosPorDia(demoData.gastosPorDia);
      setResumen(demoData.resumen);
    } finally {
      setLoading(false);
    }
  };

  // Función para generar datos de demostración
  const generarDatosDemostracion = () => {
    const categorias = [
      'Servicios', 'Alquiler', 'Salarios', 'Materiales', 
      'Transporte', 'Mantenimiento', 'Impuestos', 'Otros'
    ];
    
    const gastosPorCategoria = categorias.map(categoria => {
      const value = Math.floor(Math.random() * 5000) + 500;
      return { name: categoria, value };
    });
    
    // Ordenar por valor descendente
    gastosPorCategoria.sort((a, b) => b.value - a.value);
    
    // Generar datos por día
    const gastosPorDia = [];
    const inicio = parseISO(fechaInicio);
    const fin = parseISO(fechaFin);
    let currentDate = inicio;
    
    while (currentDate <= fin) {
      gastosPorDia.push({
        fecha: format(currentDate, 'dd/MM/yyyy'),
        total: Math.floor(Math.random() * 2000) + 200
      });
      
      // Avanzar al siguiente día
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Calcular total de gastos
    const totalGastos = gastosPorCategoria.reduce((sum, item) => sum + item.value, 0);
    
    return {
      gastosPorCategoria,
      gastosPorDia,
      resumen: {
        totalGastos,
        promedioGastosDiarios: totalGastos / gastosPorDia.length,
        categoriaMaxGasto: gastosPorCategoria[0].name,
        montoMaxGasto: gastosPorCategoria[0].value,
        cantidadGastos: Math.floor(Math.random() * 50) + 10
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
  
  // Preparar datos para los gráficos de categorías
  const chartSeriesCategoria = [
    { dataKey: 'value', name: 'Monto' }
  ];
  
  // Preparar datos para los gráficos por día
  const chartSeriesDia = [
    { dataKey: 'total', name: 'Total', color: '#0088FE' }
  ];
  
  // Preparar datos para las tarjetas de resumen
  const getSummaryCards = () => {
    return [
      {
        title: 'Total Gastos',
        value: formatCurrency(resumen.totalGastos),
        color: 'border-red-500',
        icon: (
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        iconBg: 'bg-red-100'
      },
      {
        title: 'Promedio Diario',
        value: formatCurrency(resumen.promedioGastosDiarios),
        color: 'border-blue-500',
        icon: (
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        iconBg: 'bg-blue-100'
      },
      {
        title: 'Mayor Categoría',
        value: resumen.categoriaMaxGasto,
        subtitle: formatCurrency(resumen.montoMaxGasto),
        color: 'border-purple-500',
        icon: (
          <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        ),
        iconBg: 'bg-purple-100'
      },
      {
        title: 'Cantidad Gastos',
        value: resumen.cantidadGastos,
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
  
  // Preparar datos para exportación de categorías
  const getExportColumnsCategoria = () => {
    return [
      { dataKey: 'name', title: 'Categoría' },
      { dataKey: 'value', title: 'Monto', format: formatCurrency },
      { 
        dataKey: 'porcentaje', 
        title: 'Porcentaje', 
        format: (value) => `${value}%`,
        rawDataKey: 'value'
      }
    ];
  };
  
  // Preparar datos para exportación de días
  const getExportColumnsDias = () => {
    return [
      { dataKey: 'fecha', title: 'Fecha' },
      { dataKey: 'total', title: 'Total', format: formatCurrency }
    ];
  };
  
  // Preparar datos para exportación de categorías con porcentajes
  const getExportDataCategoria = () => {
    return gastosPorCategoria.map(item => ({
      ...item,
      porcentaje: ((item.value / resumen.totalGastos) * 100).toFixed(2)
    }));
  };

  // Función para generar PDF
  const generarPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Reporte de Gastos', 105, 15, { align: 'center' });
    
    // Periodo
    doc.setFontSize(12);
    doc.text(`Periodo: ${format(parseISO(fechaInicio), 'dd/MM/yyyy')} - ${format(parseISO(fechaFin), 'dd/MM/yyyy')}`, 105, 25, { align: 'center' });
    
    // Resumen
    doc.setFontSize(14);
    doc.text('Resumen', 14, 35);
    
    const resumenData = [
      ['Total Gastos', formatCurrency(resumen.totalGastos)],
      ['Promedio Diario', formatCurrency(resumen.promedioGastosDiarios)],
      ['Categoría Mayor Gasto', resumen.categoriaMaxGasto],
      ['Monto Mayor Gasto', formatCurrency(resumen.montoMaxGasto)],
      ['Cantidad de Gastos', resumen.cantidadGastos.toString()]
    ];
    
    doc.autoTable({
      startY: 40,
      head: [['Concepto', 'Valor']],
      body: resumenData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Gastos por categoría
    doc.setFontSize(14);
    doc.text('Gastos por Categoría', 14, doc.autoTable.previous.finalY + 10);
    
    const categoriasTableData = gastosPorCategoria.map(item => [
      item.name,
      formatCurrency(item.value),
      `${((item.value / resumen.totalGastos) * 100).toFixed(2)}%`
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 15,
      head: [['Categoría', 'Monto', 'Porcentaje']],
      body: categoriasTableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Gastos por día
    doc.setFontSize(14);
    doc.text('Gastos por Día', 14, doc.autoTable.previous.finalY + 10);
    
    const diasTableData = gastosPorDia.map(item => [
      item.fecha,
      formatCurrency(item.total)
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 15,
      head: [['Fecha', 'Total']],
      body: diasTableData,
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
    doc.save(`Reporte_Gastos_${fechaInicio}_${fechaFin}.pdf`);
  };



  return (
    <>
      <Helmet>
        <title>Reporte de Gastos | App Facturación</title>
      </Helmet>
      
      <div className="space-y-6">
        {/* Filtros */}
        <ReportFilter onFilterChange={handleFilterChange} />
        
        {/* Acciones de exportación */}
        <div className="flex justify-end">
          <ReportExport 
            title="Reporte de Gastos"
            filename="reporte-gastos"
            data={getExportDataCategoria()}
            columns={getExportColumnsCategoria()}
            summary={resumen}
            config={{
              companyName: 'App Facturación',
              periodo: filtros.periodo
            }}
          />
        </div>
        
        {/* Tarjetas de resumen */}
        <ReportSummaryCards items={getSummaryCards()} />
        
        {/* Gráfico de categorías */}
        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-md p-4">
            <p className="text-gray-500">Cargando datos...</p>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64 bg-red-50 rounded-lg shadow-md p-4">
            <p className="text-red-500">{error}</p>
          </div>
        ) : gastosPorCategoria.length === 0 ? (
          <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg shadow-md p-4">
            <p className="text-gray-500">No hay datos disponibles para el período seleccionado</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución de Gastos por Categoría</h3>
            <ReportCharts 
              data={gastosPorCategoria} 
              series={chartSeriesCategoria} 
              xAxisKey="name" 
              formatter={formatCurrency}
              defaultType="pie"
            />
          </div>
        )}
        
        {/* Gráfico por día */}
        {!loading && !error && gastosPorDia.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Gastos por Día</h3>
            <ReportCharts 
              data={gastosPorDia} 
              series={chartSeriesDia} 
              xAxisKey="fecha" 
              formatter={formatCurrency}
              defaultType="bar"
            />
          </div>
        )}
        
        {/* Tabla de gastos por categoría */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Detalle de Gastos por Categoría</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Porcentaje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gastosPorCategoria.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        {item.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.value)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {((item.value / resumen.totalGastos) * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Total</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatCurrency(resumen.totalGastos)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        {/* Tabla de gastos por día */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Detalle de Gastos por Día</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gastosPorDia.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.fecha}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Total</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatCurrency(resumen.totalGastos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportesGastos;
