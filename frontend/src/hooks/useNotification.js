import { useState, useCallback } from 'react';

export const useNotification = () => {
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  const showNotification = useCallback((title, message, type = 'success') => {
    setNotification({
      isOpen: true,
      title,
      message,
      type
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  // Función específica para operaciones exitosas
  const showSuccess = useCallback((operation, entity) => {
    const titles = {
      create: 'Creación Exitosa',
      update: 'Actualización Exitosa',
      delete: 'Eliminación Exitosa'
    };
    
    const messages = {
      create: `${entity} creado correctamente`,
      update: `${entity} actualizado correctamente`,
      delete: `${entity} eliminado correctamente`
    };

    showNotification(
      titles[operation] || 'Operación Exitosa',
      messages[operation] || `${entity} procesado correctamente`,
      'success'
    );
  }, [showNotification]);

  // Función específica para errores
  const showError = useCallback((operation, entity, errorMessage = null) => {
    const titles = {
      create: 'Error al Crear',
      update: 'Error al Actualizar',
      delete: 'Error al Eliminar',
      fetch: 'Error al Cargar',
      validation: 'Error de Validación'
    };

    const defaultMessages = {
      create: `No se pudo crear ${entity}`,
      update: `No se pudo actualizar ${entity}`,
      delete: `No se pudo eliminar ${entity}`,
      fetch: `No se pudo cargar ${entity}`,
      validation: `Error de validación en los datos de ${entity}`
    };

    showNotification(
      titles[operation] || 'Error',
      errorMessage || defaultMessages[operation] || `Error al procesar ${entity}`,
      'error'
    );
  }, [showNotification]);

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError
  };
};
