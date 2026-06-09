import YjsProvider from '../components/common/YjsProvider';

/**
 * High Order Component (HOC) que envuelve un componente con YjsProvider
 * para garantizar que YJS solo se cargue en el lado del cliente.
 * 
 * @param {React.ComponentType} Component - El componente que utiliza YJS
 * @returns {React.FC} Componente envuelto con YjsProvider
 */
const withYjs = (Component) => {
  const WithYjs = (props) => (
    <YjsProvider fallback={<div>Cargando editor colaborativo...</div>}>
      <Component {...props} />
    </YjsProvider>
  );

  // Copiar el nombre para facilitar la depuración
  WithYjs.displayName = `WithYjs(${Component.displayName || Component.name || 'Component'})`;
  
  return WithYjs;
};

export default withYjs; 