import { useState, useEffect } from 'react';
import { notification, Button } from 'antd';

/**
 * Componente para manejar notificaciones de actualizaciones automáticas
 * en la versión desktop (Electron) de la aplicación
 */
const UpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

  useEffect(() => {
    // Verificar si estamos en un entorno Electron
    if (typeof window !== 'undefined' && window.electronAPI) {
      // Escuchar eventos de actualización disponible
      const unsubscribeUpdateAvailable = window.electronAPI.onAppUpdate(() => {
        setUpdateAvailable(true);
        notification.info({
          message: 'Actualización disponible',
          description: 'Se está descargando una nueva versión del sistema en segundo plano.',
          duration: 10,
          placement: 'bottomRight',
        });
      });

      // Escuchar eventos de error de la aplicación
      const unsubscribeAppError = window.electronAPI.onAppError(() => {
        notification.error({
          message: 'Error de la aplicación',
          description: 'Ha ocurrido un error en la aplicación.',
          duration: 10,
          placement: 'bottomRight',
        });
      });

      // Cleanup de los listeners
      return () => {
        if (unsubscribeUpdateAvailable) unsubscribeUpdateAvailable();
        if (unsubscribeAppError) unsubscribeAppError();
      };
    }
  }, []);

  // Función para reiniciar la aplicación e instalar la actualización
  const handleRestartApp = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.quit();
    }
  };

  // No renderizamos nada visible directamente, solo los efectos y notificaciones
  return null;
};

export default UpdateNotification; 