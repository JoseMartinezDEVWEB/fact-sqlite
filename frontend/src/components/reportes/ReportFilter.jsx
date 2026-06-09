import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { clearReportCache } from '../../services/reportService';
import { es } from 'date-fns/locale';

/**
 * Componente de filtro reutilizable para reportes
 * @param {Object} props - Propiedades del componente
 * @param {Function} props.onFilterChange - Función que se ejecuta cuando cambian los filtros
 * @param {boolean} props.showExtraFilters - Mostrar filtros adicionales específicos
 * @param {Array} props.extraFilterOptions - Opciones para filtros adicionales
 */

// Custom hook para lógica de periodo
function useReportPeriod(periodo, fechaInicio, fechaFin) {
  const [dates, setDates] = useState({ fechaInicio: '', fechaFin: '', isCustomDate: false });
  useEffect(() => {
    const today = new Date();
    if (periodo === 'semanal') {
      const inicio = startOfWeek(today, { weekStartsOn: 1 });
      const fin = endOfWeek(today, { weekStartsOn: 1 });
      setDates({ fechaInicio: format(inicio, 'yyyy-MM-dd'), fechaFin: format(fin, 'yyyy-MM-dd'), isCustomDate: false });
    } else if (periodo === 'mensual') {
      const inicio = startOfMonth(today);
      const fin = endOfMonth(today);
      setDates({ fechaInicio: format(inicio, 'yyyy-MM-dd'), fechaFin: format(fin, 'yyyy-MM-dd'), isCustomDate: false });
    } else if (periodo === 'trimestral') {
      const inicio = startOfMonth(subMonths(today, 2));
      const fin = endOfMonth(today);
      setDates({ fechaInicio: format(inicio, 'yyyy-MM-dd'), fechaFin: format(fin, 'yyyy-MM-dd'), isCustomDate: false });
    } else if (periodo === 'anual') {
      const inicio = new Date(today.getFullYear(), 0, 1);
      const fin = new Date(today.getFullYear(), 11, 31);
      setDates({ fechaInicio: format(inicio, 'yyyy-MM-dd'), fechaFin: format(fin, 'yyyy-MM-dd'), isCustomDate: false });
    } else if (periodo === 'personalizado') {
      setDates({ fechaInicio: fechaInicio || format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), fechaFin: fechaFin || format(today, 'yyyy-MM-dd'), isCustomDate: true });
    }
  }, [periodo]);
  return dates;
}

const ReportFilter = ({ 
  onFilterChange, 
  showExtraFilters = false, 
  extraFilterOptions = [],
  initialPeriod = 'semanal',
  initialExtraFilter = '',
  initialFilters = {}
}) => {
  const [periodo, setPeriodo] = useState(initialFilters.periodo || initialPeriod);
  const [fechaInicio, setFechaInicio] = useState(initialFilters.fechaInicio || '');
  const [fechaFin, setFechaFin] = useState(initialFilters.fechaFin || '');
  const [useCache, setUseCache] = useState(initialFilters.useCache !== false);
  const [extraFilter, setExtraFilter] = useState(initialExtraFilter || (extraFilterOptions[0]?.value || ''));
  const [error, setError] = useState('');
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Usar custom hook para fechas
  const { fechaInicio: defaultInicio, fechaFin: defaultFin, isCustomDate } = useReportPeriod(periodo, fechaInicio, fechaFin);
  useEffect(() => {
    if (!isCustomDate) {
      setFechaInicio(defaultInicio);
      setFechaFin(defaultFin);
    }
  }, [defaultInicio, defaultFin, isCustomDate]);

  // Validar fechas antes de aplicar filtros
  const aplicarFiltros = () => {
    setError('');
    if (fechaInicio && fechaFin) {
      if (new Date(fechaInicio) > new Date(fechaFin)) {
        setError('La fecha de inicio no puede ser mayor que la fecha de fin.');
        return;
      }
      const filters = {
        periodo,
        fechaInicio,
        fechaFin,
        useCache,
        extraFilter: showExtraFilters ? extraFilter : undefined
      };
      onFilterChange(filters);
    }
  };
  useEffect(() => {
    if (fechaInicio && fechaFin && !error) {
      aplicarFiltros();
    }
    // eslint-disable-next-line
  }, [fechaInicio, fechaFin]);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      const result = await clearReportCache();
      if (result.success) {
        alert('Caché de reportes limpiada correctamente');
      } else {
        alert(`Error al limpiar caché: ${result.message}`);
      }
    } catch (error) {
      console.error('Error al limpiar caché:', error);
      alert('Error al limpiar caché de reportes');
    } finally {
      setIsClearingCache(false);
    }
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return format(date, 'dd MMM yyyy', { locale: es });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-1/4">
          <label htmlFor="periodo" className="block text-sm font-medium text-gray-700 mb-1">
            Periodo
          </label>
          <select
            id="periodo"
            aria-label="Seleccionar periodo"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="semanal">Esta semana</option>
            <option value="mensual">Este mes</option>
            <option value="trimestral">Último trimestre</option>
            <option value="anual">Este año</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="useCache"
              aria-label="Usar caché"
              checked={useCache}
              onChange={(e) => setUseCache(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="useCache" className="ml-2 block text-sm text-gray-700">
              Usar caché (más rápido)
            </label>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            onClick={aplicarFiltros}
            aria-label="Aplicar filtros"
          >
            Aplicar Filtros
          </button>
          <button
            onClick={handleClearCache}
            disabled={isClearingCache}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
            aria-label="Limpiar caché"
          >
            {isClearingCache ? 'Limpiando...' : 'Limpiar Caché'}
          </button>
        </div>
        {isCustomDate ? (
          <>
            <div className="w-full md:w-1/4">
              <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                id="fechaInicio"
                aria-label="Fecha de inicio"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="w-full md:w-1/4">
              <label htmlFor="fechaFin" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                id="fechaFin"
                aria-label="Fecha de fin"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </>
        ) : (
          <div className="w-full md:w-2/4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rango de fechas
            </label>
            <div className="py-2 px-3 bg-gray-50 rounded-md border border-gray-300 text-sm text-gray-700">
              {formatDisplayDate(fechaInicio)} - {formatDisplayDate(fechaFin)}
            </div>
          </div>
        )}
        {showExtraFilters && extraFilterOptions.length > 0 && (
          <div className="w-full md:w-1/4">
            <label htmlFor="extraFilter" className="block text-sm font-medium text-gray-700 mb-1">
              {extraFilterOptions[0]?.label || 'Filtro'}
            </label>
            <select
              id="extraFilter"
              aria-label="Filtro adicional"
              value={extraFilter}
              onChange={(e) => setExtraFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {extraFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.text}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </div>
  );
};

export default ReportFilter;
