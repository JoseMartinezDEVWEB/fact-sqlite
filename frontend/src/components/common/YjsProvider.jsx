import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Componente que garantiza que YJS solo se cargue en el lado del cliente
 * para evitar errores de "document is not defined" o importaciones múltiples de YJS.
 * 
 * Este componente debe envolver cualquier componente que utilice YJS.
 */
const YjsProvider = ({ children, fallback = null }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Solo renderiza los hijos cuando estamos en el cliente
  if (!isClient) {
    return fallback;
  }

  return <>{children}</>;
};

YjsProvider.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node
};

export default YjsProvider; 