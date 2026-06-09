import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDeudasReport } from '../../services/reportService';
import { format, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ReportesDeudas = () => {
  const [tipoDeuda, setTipoDeuda] = useState('todas');
  const [deudasProveedores, setDeudasProveedores] = useState([]);
  const [deudasClientes, setDeudasClientes] = useState([]);
  const [deudasPorVencer, setDeudasPorVencer] = useState([]);
  const [resumen, setResumen] = useState({
    totalDeudasProveedores: 0,
    totalDeudasClientes: 0,
    totalDeudasPorVencer: 0,
    totalDeudasVencidas: 0,
    cantidadFacturasCredito: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar datos cuando cambia el tipo de deuda
  useEffect(() => {
    fetchDeudasData();
  }, [tipoDeuda]);

  const fetchDeudasData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener datos de deudas usando el servicio
      const response = await getDeudasReport({
        tipo: tipoDeuda
      });
      
      console.log('Datos de deudas:', response);
      
      if (response.success && response.data) {
        const { deudasProveedores, deudasClientes, deudasPorVencer, resumen } = response.data;
        
        // Formatear datos para los gráficos
        const formattedProveedores = deudasProveedores.map(item => ({
          name: item.proveedor,
          value: item.monto,
          fechaVencimiento: format(parseISO(item.fechaVencimiento), 'dd/MM/yyyy'),
          diasRestantes: item.diasRestantes
        }));
        
        const formattedClientes = deudasClientes.map(item => ({
          name: item.cliente,
          value: item.monto,
          fechaVencimiento: format(parseISO(item.fechaVencimiento), 'dd/MM/yyyy'),
          diasRestantes: item.diasRestantes
        }));
        
        const formattedPorVencer = deudasPorVencer.map(item => ({
          name: item.tipo === 'proveedor' ? item.proveedor : item.cliente,
          tipo: item.tipo,
          value: item.monto,
          fechaVencimiento: format(parseISO(item.fechaVencimiento), 'dd/MM/yyyy'),
          diasRestantes: item.diasRestantes
        }));
        
        setDeudasProveedores(formattedProveedores);
        setDeudasClientes(formattedClientes);
        setDeudasPorVencer(formattedPorVencer);
        setResumen({
          totalDeudasProveedores: resumen.totalDeudasProveedores || 0,
          totalDeudasClientes: resumen.totalDeudasClientes || 0,
          totalDeudasPorVencer: resumen.totalDeudasPorVencer || 0,
          totalDeudasVencidas: resumen.totalDeudasVencidas || 0,
          cantidadFacturasCredito: resumen.cantidadFacturasCredito || 0
        });
      } else {
        throw new Error(response.message || 'Error al obtener datos de deudas');
      }
    } catch (error) {
      console.error('Error al obtener datos de deudas:', error);
      setError('Error al cargar los datos de deudas. Intente nuevamente.');
      
      // Datos de ejemplo para desarrollo
      const demoData = generarDatosDemostracion();
      setDeudasProveedores(demoData.deudasProveedores);
      setDeudasClientes(demoData.deudasClientes);
      setDeudasPorVencer(demoData.deudasPorVencer);
      setResumen(demoData.resumen);
    } finally {
      setLoading(false);
    }
  };

  // Función para generar datos de demostración
  const generarDatosDemostracion = () => {
    const proveedores = [
      'Distribuidora XYZ', 'Importadora ABC', 'Suministros Técnicos', 
      'Papelería Nacional', 'Tecnología Moderna'
    ];
    
    const clientes = [
      'Restaurante El Sabor', 'Tienda La Esquina', 'Farmacia San Juan', 
      'Supermercado Central', 'Hotel Las Palmas', 'Cafetería Aroma'
    ];
    
    // Generar deudas de proveedores
    const deudasProveedores = proveedores.map(proveedor => {
      const value = Math.floor(Math.random() * 50000) + 5000;
      const diasRestantes = Math.floor(Math.random() * 30) - 10; // Algunos negativos (vencidos)
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + diasRestantes);
      
      return {
        name: proveedor,
        value,
        fechaVencimiento: format(fechaVencimiento, 'dd/MM/yyyy'),
        diasRestantes
      };
    });
    
    // Generar deudas de clientes
    const deudasClientes = clientes.map(cliente => {
      const value = Math.floor(Math.random() * 20000) + 1000;
      const diasRestantes = Math.floor(Math.random() * 30) - 5; // Algunos negativos (vencidos)
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + diasRestantes);
      
      return {
        name: cliente,
        value,
        fechaVencimiento: format(fechaVencimiento, 'dd/MM/yyyy'),
        diasRestantes
      };
    });
    
    // Filtrar deudas por vencer (diasRestantes > 0)
    const deudasPorVencer = [
      ...deudasProveedores.filter(d => d.diasRestantes > 0).map(d => ({ ...d, tipo: 'proveedor' })),
      ...deudasClientes.filter(d => d.diasRestantes > 0).map(d => ({ ...d, tipo: 'cliente' }))
    ];
    
    // Calcular totales
    const totalDeudasProveedores = deudasProveedores.reduce((sum, item) => sum + item.value, 0);
    const totalDeudasClientes = deudasClientes.reduce((sum, item) => sum + item.value, 0);
    const totalDeudasPorVencer = deudasPorVencer.reduce((sum, item) => sum + item.value, 0);
    const totalDeudasVencidas = 
      deudasProveedores.filter(d => d.diasRestantes <= 0).reduce((sum, item) => sum + item.value, 0) +
      deudasClientes.filter(d => d.diasRestantes <= 0).reduce((sum, item) => sum + item.value, 0);
    
    return {
      deudasProveedores,
      deudasClientes,
      deudasPorVencer,
      resumen: {
        totalDeudasProveedores,
        totalDeudasClientes,
        totalDeudasPorVencer,
        totalDeudasVencidas,
        cantidadFacturasCredito: deudasClientes.length
      }
    };
  };

  // Función para formatear moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(value);
  };

  // Función para generar PDF
  const generarPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Reporte de Deudas', 105, 15, { align: 'center' });
    
    // Fecha
    doc.setFontSize(12);
    doc.text(`Generado el ${format(new Date(), 'dd/MM/yyyy')}`, 105, 25, { align: 'center' });
    
    // Resumen
    doc.setFontSize(14);
    doc.text('Resumen de Deudas', 14, 35);
    
    const resumenData = [
      ['Total Deudas a Proveedores', formatCurrency(resumen.totalDeudasProveedores)],
      ['Total Deudas de Clientes', formatCurrency(resumen.totalDeudasClientes)],
      ['Total Deudas por Vencer', formatCurrency(resumen.totalDeudasPorVencer)],
      ['Total Deudas Vencidas', formatCurrency(resumen.totalDeudasVencidas)],
      ['Cantidad Facturas a Crédito', resumen.cantidadFacturasCredito.toString()]
    ];
    
    doc.autoTable({
      startY: 40,
      head: [['Concepto', 'Valor']],
      body: resumenData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Deudas a proveedores
    doc.setFontSize(14);
    doc.text('Deudas a Proveedores', 14, doc.autoTable.previous.finalY + 10);
    
    const proveedoresTableData = deudasProveedores.map(item => [
      item.name,
      formatCurrency(item.value),
      item.fechaVencimiento,
      item.diasRestantes <= 0 ? 'Vencido' : `${item.diasRestantes} días`
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 15,
      head: [['Proveedor', 'Monto', 'Vencimiento', 'Estado']],
      body: proveedoresTableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Deudas de clientes
    doc.setFontSize(14);
    doc.text('Deudas de Clientes (Facturas a Crédito)', 14, doc.autoTable.previous.finalY + 10);
    
    const clientesTableData = deudasClientes.map(item => [
      item.name,
      formatCurrency(item.value),
      item.fechaVencimiento,
      item.diasRestantes <= 0 ? 'Vencido' : `${item.diasRestantes} días`
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 15,
      head: [['Cliente', 'Monto', 'Vencimiento', 'Estado']],
      body: clientesTableData,
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
    doc.save(`Reporte_Deudas_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  // Renderizador personalizado para las etiquetas del gráfico de pastel
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <>
      <Helmet>
        <title>Reporte de Deudas | App Facturación</title>
      </Helmet>
      
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Reporte de Deudas
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Selector de tipo de deuda */}
            <select
              value={tipoDeuda}
              onChange={(e) => setTipoDeuda(e.target.value)}
              className="form-select rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
            >
              <option value="todas">Todas las deudas</option>
              <option value="proveedores">Deudas a proveedores</option>
              <option value="clientes">Facturas a crédito</option>
              <option value="vencidas">Deudas vencidas</option>
              <option value="por-vencer">Deudas por vencer</option>
            </select>
            
            {/* Botón para generar PDF */}
            <button
              onClick={generarPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
            >
              Exportar PDF
            </button>
          </div>
        </div>
        
        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500">Deudas a Proveedores</h3>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(resumen.totalDeudasProveedores)}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500">Facturas a Crédito</h3>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(resumen.totalDeudasClientes)}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <h3 className="text-sm font-medium text-gray-500">Deudas por Vencer</h3>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(resumen.totalDeudasPorVencer)}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <h3 className="text-sm font-medium text-gray-500">Deudas Vencidas</h3>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(resumen.totalDeudasVencidas)}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <h3 className="text-sm font-medium text-gray-500">Facturas a Crédito</h3>
            <p className="text-xl font-bold text-gray-800">{resumen.cantidadFacturasCredito}</p>
          </div>
        </div>
        
        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de deudas por tipo */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución de Deudas</h3>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-4">{error}</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Proveedores', value: resumen.totalDeudasProveedores },
                      { name: 'Clientes', value: resumen.totalDeudasClientes }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#0088FE" />
                    <Cell fill="#00C49F" />
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Gráfico de deudas por estado */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado de Deudas</h3>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-4">{error}</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Por Vencer', value: resumen.totalDeudasPorVencer },
                      { name: 'Vencidas', value: resumen.totalDeudasVencidas }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#FFBB28" />
                    <Cell fill="#FF8042" />
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        {/* Tabla de deudas a proveedores */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Deudas a Proveedores</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Vencimiento</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deudasProveedores.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.value)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{item.fechaVencimiento}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {item.diasRestantes <= 0 ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Vencido
                        </span>
                      ) : item.diasRestantes <= 7 ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {item.diasRestantes} días
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {item.diasRestantes} días
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Total</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatCurrency(resumen.totalDeudasProveedores)}</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        {/* Tabla de facturas a crédito */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Facturas a Crédito (Deudas de Clientes)</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Vencimiento</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deudasClientes.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.value)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{item.fechaVencimiento}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {item.diasRestantes <= 0 ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Vencido
                        </span>
                      ) : item.diasRestantes <= 7 ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {item.diasRestantes} días
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {item.diasRestantes} días
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Total</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatCurrency(resumen.totalDeudasClientes)}</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportesDeudas;
