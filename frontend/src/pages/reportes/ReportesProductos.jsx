import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getProductosReport } from '../../services/reportService';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const ReportesProductos = () => {
  const [periodo, setPeriodo] = useState('mensual');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tipoReporte, setTipoReporte] = useState('ventas');
  const [productosMasVendidos, setProductosMasVendidos] = useState([]);
  const [productosPorCategoria, setProductosPorCategoria] = useState([]);
  const [productosNuevos, setProductosNuevos] = useState([]);
  const [productosStock, setProductosStock] = useState([]);
  const [resumen, setResumen] = useState({
    totalProductos: 0,
    totalCategorias: 0,
    totalProductosVendidos: 0,
    totalProductosBajoStock: 0,
    productoMasVendido: '',
    cantidadMasVendida: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Establecer fechas por defecto al cargar el componente
  useEffect(() => {
    const today = new Date();
    
    if (periodo === 'semanal') {
      const inicio = startOfWeek(today, { weekStartsOn: 1 }); // Lunes
      const fin = endOfWeek(today, { weekStartsOn: 1 }); // Domingo
      setFechaInicio(format(inicio, 'yyyy-MM-dd'));
      setFechaFin(format(fin, 'yyyy-MM-dd'));
    } else if (periodo === 'mensual') {
      const inicio = startOfMonth(today);
      const fin = endOfMonth(today);
      setFechaInicio(format(inicio, 'yyyy-MM-dd'));
      setFechaFin(format(fin, 'yyyy-MM-dd'));
    }
  }, [periodo]);

  // Cargar datos cuando cambian las fechas, el periodo o el tipo de reporte
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      fetchProductosData();
    }
  }, [fechaInicio, fechaFin, tipoReporte]);

  const fetchProductosData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener datos de productos usando el servicio
      const response = await getProductosReport({
        startDate: fechaInicio,
        endDate: fechaFin,
        type: tipoReporte
      });
      
      console.log('Datos de productos:', response);
      
      if (response.success && response.data) {
        const { productosMasVendidos, productosPorCategoria, productosNuevos, productosStock, resumen } = response.data;
        
        // Formatear datos para los gráficos
        const formattedMasVendidos = productosMasVendidos.map(item => ({
          name: item.nombre,
          value: item.cantidad,
          precio: item.precio,
          total: item.total
        }));
        
        const formattedPorCategoria = productosPorCategoria.map(item => ({
          name: item.categoria,
          value: item.cantidad,
          productos: item.productos
        }));
        
        const formattedNuevos = productosNuevos.map(item => ({
          name: item.nombre,
          categoria: item.categoria,
          precio: item.precio,
          stock: item.stock,
          fechaCreacion: format(parseISO(item.fechaCreacion), 'dd/MM/yyyy')
        }));
        
        const formattedStock = productosStock.map(item => ({
          name: item.nombre,
          categoria: item.categoria,
          precio: item.precio,
          stock: item.stock,
          stockMinimo: item.stockMinimo
        }));
        
        setProductosMasVendidos(formattedMasVendidos);
        setProductosPorCategoria(formattedPorCategoria);
        setProductosNuevos(formattedNuevos);
        setProductosStock(formattedStock);
        setResumen({
          totalProductos: resumen.totalProductos || 0,
          totalCategorias: resumen.totalCategorias || 0,
          totalProductosVendidos: resumen.totalProductosVendidos || 0,
          totalProductosBajoStock: resumen.totalProductosBajoStock || 0,
          productoMasVendido: resumen.productoMasVendido || '',
          cantidadMasVendida: resumen.cantidadMasVendida || 0
        });
      } else {
        throw new Error(response.message || 'Error al obtener datos de productos');
      }
    } catch (error) {
      console.error('Error al obtener datos de productos:', error);
      setError('Error al cargar los datos de productos. Intente nuevamente.');
      
      // Datos de ejemplo para desarrollo
      const demoData = generarDatosDemostracion();
      setProductosMasVendidos(demoData.productosMasVendidos);
      setProductosPorCategoria(demoData.productosPorCategoria);
      setProductosNuevos(demoData.productosNuevos);
      setProductosStock(demoData.productosStock);
      setResumen(demoData.resumen);
    } finally {
      setLoading(false);
    }
  };

  // Función para generar datos de demostración
  const generarDatosDemostracion = () => {
    const categorias = ['Electrónicos', 'Alimentos', 'Bebidas', 'Limpieza', 'Papelería', 'Herramientas'];
    
    // Generar productos más vendidos
    const productosMasVendidos = [
      { name: 'Smartphone XYZ', value: 42, precio: 12500, total: 525000 },
      { name: 'Laptop Pro', value: 28, precio: 35000, total: 980000 },
      { name: 'Audífonos Bluetooth', value: 65, precio: 1200, total: 78000 },
      { name: 'Mouse Inalámbrico', value: 53, precio: 650, total: 34450 },
      { name: 'Teclado Mecánico', value: 31, precio: 1800, total: 55800 },
      { name: 'Monitor 24"', value: 22, precio: 8500, total: 187000 },
      { name: 'Impresora Láser', value: 18, precio: 7200, total: 129600 },
      { name: 'Disco Duro Externo', value: 37, precio: 3500, total: 129500 }
    ];
    
    // Generar productos por categoría
    const productosPorCategoria = categorias.map(categoria => ({
      name: categoria,
      value: Math.floor(Math.random() * 100) + 20,
      productos: Math.floor(Math.random() * 30) + 5
    }));
    
    // Generar productos nuevos
    const productosNuevos = [];
    for (let i = 0; i < 10; i++) {
      const categoria = categorias[Math.floor(Math.random() * categorias.length)];
      productosNuevos.push({
        name: `Producto Nuevo ${i + 1}`,
        categoria,
        precio: Math.floor(Math.random() * 5000) + 500,
        stock: Math.floor(Math.random() * 50) + 10,
        fechaCreacion: format(new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000), 'dd/MM/yyyy')
      });
    }
    
    // Generar productos con bajo stock
    const productosStock = [];
    for (let i = 0; i < 8; i++) {
      const categoria = categorias[Math.floor(Math.random() * categorias.length)];
      const stock = Math.floor(Math.random() * 10) + 1;
      productosStock.push({
        name: `Producto ${i + 1}`,
        categoria,
        precio: Math.floor(Math.random() * 5000) + 500,
        stock,
        stockMinimo: 10
      });
    }
    
    return {
      productosMasVendidos,
      productosPorCategoria,
      productosNuevos,
      productosStock,
      resumen: {
        totalProductos: 150,
        totalCategorias: categorias.length,
        totalProductosVendidos: productosMasVendidos.reduce((sum, item) => sum + item.value, 0),
        totalProductosBajoStock: productosStock.length,
        productoMasVendido: productosMasVendidos[0].name,
        cantidadMasVendida: productosMasVendidos[0].value
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
    doc.text('Reporte de Productos', 105, 15, { align: 'center' });
    
    // Periodo
    doc.setFontSize(12);
    doc.text(`Periodo: ${format(parseISO(fechaInicio), 'dd/MM/yyyy')} - ${format(parseISO(fechaFin), 'dd/MM/yyyy')}`, 105, 25, { align: 'center' });
    
    // Resumen
    doc.setFontSize(14);
    doc.text('Resumen', 14, 35);
    
    const resumenData = [
      ['Total Productos', resumen.totalProductos.toString()],
      ['Total Categorías', resumen.totalCategorias.toString()],
      ['Total Productos Vendidos', resumen.totalProductosVendidos.toString()],
      ['Productos Bajo Stock', resumen.totalProductosBajoStock.toString()],
      ['Producto Más Vendido', resumen.productoMasVendido],
      ['Cantidad Más Vendida', resumen.cantidadMasVendida.toString()]
    ];
    
    doc.autoTable({
      startY: 40,
      head: [['Concepto', 'Valor']],
      body: resumenData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Productos más vendidos
    doc.setFontSize(14);
    doc.text('Productos Más Vendidos', 14, doc.autoTable.previous.finalY + 10);
    
    const masVendidosData = productosMasVendidos.map(item => [
      item.name,
      item.value.toString(),
      formatCurrency(item.precio),
      formatCurrency(item.total)
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 15,
      head: [['Producto', 'Cantidad', 'Precio', 'Total']],
      body: masVendidosData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Productos por categoría
    doc.setFontSize(14);
    doc.text('Productos por Categoría', 14, doc.autoTable.previous.finalY + 10);
    
    const categoriasData = productosPorCategoria.map(item => [
      item.name,
      item.value.toString(),
      item.productos.toString()
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 15,
      head: [['Categoría', 'Cantidad Vendida', 'Total Productos']],
      body: categoriasData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Productos con bajo stock
    doc.setFontSize(14);
    doc.text('Productos con Bajo Stock', 14, doc.autoTable.previous.finalY + 10);
    
    const stockData = productosStock.map(item => [
      item.name,
      item.categoria,
      item.stock.toString(),
      item.stockMinimo.toString(),
      formatCurrency(item.precio)
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 15,
      head: [['Producto', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Precio']],
      body: stockData,
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
    doc.save(`Reporte_Productos_${fechaInicio}_${fechaFin}.pdf`);
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
        <title>Reporte de Productos | App Facturación</title>
      </Helmet>
      
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Reporte de Productos
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Selector de periodo */}
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="form-select rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
            >
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
              <option value="personalizado">Personalizado</option>
            </select>
            
            {/* Selector de tipo de reporte */}
            <select
              value={tipoReporte}
              onChange={(e) => setTipoReporte(e.target.value)}
              className="form-select rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
            >
              <option value="ventas">Ventas de productos</option>
              <option value="stock">Stock de productos</option>
              <option value="nuevos">Productos nuevos</option>
            </select>
            
            {/* Fechas personalizadas */}
            {periodo === 'personalizado' && (
              <>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="form-input rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                />
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="form-input rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                />
              </>
            )}
            
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500">Total Productos</h3>
            <p className="text-xl font-bold text-gray-800">{resumen.totalProductos}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500">Total Categorías</h3>
            <p className="text-xl font-bold text-gray-800">{resumen.totalCategorias}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <h3 className="text-sm font-medium text-gray-500">Productos Vendidos</h3>
            <p className="text-xl font-bold text-gray-800">{resumen.totalProductosVendidos}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <h3 className="text-sm font-medium text-gray-500">Bajo Stock</h3>
            <p className="text-xl font-bold text-gray-800">{resumen.totalProductosBajoStock}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500 col-span-1 sm:col-span-2">
            <h3 className="text-sm font-medium text-gray-500">Producto Más Vendido</h3>
            <p className="text-xl font-bold text-gray-800 truncate">{resumen.productoMasVendido} ({resumen.cantidadMasVendida})</p>
          </div>
        </div>
        
        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de productos más vendidos */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos Más Vendidos</h3>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-4">{error}</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={productosMasVendidos.slice(0, 8)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [value, 'Cantidad']} />
                  <Bar dataKey="value" name="Cantidad Vendida" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Gráfico de productos por categoría */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos por Categoría</h3>
            
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
                    data={productosPorCategoria}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {productosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} unidades`, 'Cantidad']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        {/* Tabla de productos más vendidos */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Detalle de Productos Más Vendidos</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unitario</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productosMasVendidos.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.value}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.precio)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Tabla de productos con bajo stock */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos con Bajo Stock</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Actual</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Mínimo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productosStock.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.categoria}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${item.stock < item.stockMinimo ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                      {item.stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.stockMinimo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportesProductos;
