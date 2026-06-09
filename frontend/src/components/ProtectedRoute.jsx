/* eslint-disable react/prop-types */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader.jsx';

/**
 * Componente para proteger rutas basado en autenticación y roles.
 * @param {object} props
 * @param {React.ReactNode} props.children - El componente a renderizar si está autorizado.
 * @param {string[]} [props.roles] - Lista de roles permitidos para acceder a la ruta. Si no se especifica, solo requiere autenticación.
 */
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Mostrar el loader global mientras se verifica la autenticación
  if (loading) {
    return <Loader message="Verificando sesión..." />;
  }

  // Si no está autenticado, redirigir al login
  // Guardamos la ubicación actual para redirigir de vuelta después del login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar si el usuario es superadmin (tiene acceso a todo)
  if (user && user.role === 'superadmin') {
    // El superadmin siempre tiene acceso a todas las páginas
    return children;
  }
  
  // Si se especifican roles y el usuario no tiene uno de los roles permitidos
  if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
    // Redirigir a una página de "No autorizado" con información sobre la ruta
    return <Navigate to="/unauthorized" state={{ path: location.pathname }} replace />;
  }

  // Si está autenticado y tiene el rol correcto (o no se requieren roles específicos), renderizar el componente hijo
  return children;
};

export default ProtectedRoute;
