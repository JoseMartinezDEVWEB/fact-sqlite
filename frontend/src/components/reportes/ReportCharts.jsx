import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

// Función para transformar datos para gráfico de pastel
function getPieData(data, series, COLORS) {
  return series.map((item, index) => {
    const total = data.reduce((sum, dataPoint) => sum + (dataPoint[item.dataKey] || 0), 0);
    return {
      name: item.name,
      value: total,
      color: item.color || COLORS[index % COLORS.length]
    };
  }).filter(item => item.value > 0);
}

/**
 * Componente para mostrar diferentes tipos de gráficos en reportes
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.data - Datos para el gráfico
 * @param {Array} props.series - Series de datos a mostrar
 * @param {string} props.xAxisKey - Clave para el eje X
 * @param {function} props.formatter - Función para formatear valores en el tooltip
 * @param {string} props.defaultType - Tipo de gráfico por defecto
 * @param {number|string} props.height - Altura del gráfico
 * @param {number|string} props.width - Ancho del gráfico
 * @param {function} props.customTooltip - Componente de tooltip personalizado
 */
const ReportCharts = ({
  data = [],
  series = [],
  xAxisKey = 'fecha',
  formatter = (value) => value,
  defaultType = 'bar',
  height = 400,
  width = '100%',
  customTooltip
}) => {
  const [chartType, setChartType] = useState(defaultType);
  const COLORS = ['#4ade80', '#a78bfa', '#fbbf24', '#f87171', '#60a5fa', '#c084fc', '#34d399', '#fb923c'];
  const pieData = getPieData(data, series, COLORS);
  const tooltipProps = customTooltip ? { content: customTooltip } : { formatter };

  const chartTypes = [
    { type: 'bar', label: 'Barras' },
    { type: 'line', label: 'Líneas' },
    { type: 'area', label: 'Área' },
    { type: 'pie', label: 'Circular' }
  ];

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width={width} height={height}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip {...tooltipProps} />
              <Legend />
              {series.map((item, index) => (
                <Bar key={item.dataKey} dataKey={item.dataKey} name={item.name} fill={item.color || COLORS[index % COLORS.length]} stackId={item.stack ? "stack" : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width={width} height={height}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip {...tooltipProps} />
              <Legend />
              {series.map((item, index) => (
                <Line key={item.dataKey} type="monotone" dataKey={item.dataKey} name={item.name} stroke={item.color || COLORS[index % COLORS.length]} activeDot={{ r: 8 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width={width} height={height}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip {...tooltipProps} />
              <Legend />
              {series.map((item, index) => (
                <Area key={item.dataKey} type="monotone" dataKey={item.dataKey} name={item.name} fill={item.color || COLORS[index % COLORS.length]} stroke={item.color || COLORS[index % COLORS.length]} fillOpacity={0.3} stackId={item.stack ? "stack" : undefined} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width={width} height={height}>
            <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipProps} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <div className="flex justify-center items-center h-64 bg-gray-100 rounded-lg">
            <p className="text-gray-500">Tipo de gráfico no soportado</p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Visualización de Datos</h3>
        <div className="flex space-x-2" role="group" aria-label="Tipo de gráfico">
          {chartTypes.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-3 py-1 text-sm rounded-md ${chartType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              aria-pressed={chartType === type}
              aria-label={`Mostrar gráfico de ${label}`}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {data.length > 0 ? (
        renderChart()
      ) : (
        <div className="flex justify-center items-center h-64 bg-gray-100 rounded-lg">
          <p className="text-gray-500">No hay datos disponibles para mostrar</p>
        </div>
      )}
    </div>
  );
};

export default ReportCharts;
