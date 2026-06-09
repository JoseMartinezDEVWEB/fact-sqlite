import React from 'react';

// Componentes SVG para flechas
const UpArrow = () => (
  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);
const DownArrow = () => (
  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);
const NoChange = () => (
  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
  </svg>
);

/**
 * Componente para mostrar tarjetas de resumen en reportes
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.items - Elementos a mostrar en las tarjetas
 * @param {string} props.className - Clases CSS adicionales para el contenedor
 */
const ReportSummaryCards = ({ items = [], className = '' }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6 ${className}`}>
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${item.color || 'border-blue-500'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{item.title}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{item.value}</p>
              {item.previousValue && (
                <div className="flex items-center mt-1">
                  {item.trend === 'up' ? (
                    <span className="text-green-500 text-xs flex items-center">
                      <UpArrow />
                      {item.percentChange}%
                    </span>
                  ) : item.trend === 'down' ? (
                    <span className="text-red-500 text-xs flex items-center">
                      <DownArrow />
                      {item.percentChange}%
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs flex items-center">
                      <NoChange />
                      Sin cambios
                    </span>
                  )}
                </div>
              )}
            </div>
            {item.icon && (
              <div className={`p-3 rounded-full ${item.iconBg || 'bg-blue-100'}`}>
                {item.icon}
              </div>
            )}
          </div>
          {item.subtitle && (
            <p className="text-xs text-gray-500 mt-2">{item.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReportSummaryCards;
