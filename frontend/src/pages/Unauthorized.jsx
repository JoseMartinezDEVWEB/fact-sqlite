import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.state?.path || '';

  // Obtener el nombre de la sección a la que se intentó acceder
  const getSectionName = () => {
    if (path.includes('licencias')) return 'Control de Licencias y Suscripciones';
    if (path.includes('conexion-remota')) return 'Configuración de Conexión Remota';
    return 'esta sección';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Acceso Denegado</h1>
          <p className="text-gray-700 mb-4">
            No tienes los permisos necesarios para acceder a {getSectionName()}.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Tu rol actual es: <span className="font-semibold">{user?.role || 'Usuario'}</span>
          </p>
        </div>
        
        <div className="border-t border-gray-200 pt-4 mt-4">
          <p className="text-sm text-gray-600 mb-4">
            Si necesitas acceso a esta sección, contacta al administrador del sistema.
          </p>
        </div>
        
        <Link 
          to="/dashboard" 
          className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-center transition-colors"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;