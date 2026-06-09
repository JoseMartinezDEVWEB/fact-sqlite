import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getBusinessInfo } from '../services/businessService';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';

const BusinessContext = createContext();

export const useBusiness = () => useContext(BusinessContext);

export const BusinessProvider = ({ children }) => {
  const [businessInfo, setBusinessInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Intentar cargar datos del localStorage al inicio para mostrar algo rápido
  useEffect(() => {
    try {
      const cachedData = localStorage.getItem('business_info_cache');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        
        // Validar que los datos sean un objeto válido y tengan propiedades mínimas
        if (parsedData && typeof parsedData === 'object' && parsedData.name) {
          setBusinessInfo(parsedData);
          console.log('[BusinessContext] Datos iniciales cargados desde caché');
        } else {
          console.warn('[BusinessContext] Datos en caché inválidos o incompletos');
        }
      }
    } catch (err) {
      console.warn('[BusinessContext] Error al cargar datos iniciales desde caché:', err);
    }
  }, []);

  // Usar useCallback para evitar recreaciones innecesarias de la función
  const fetchBusinessInfo = useCallback(async (force = false) => {
    // Evitar múltiples llamadas en corto tiempo (throttle)
    const now = Date.now();
    if (!force && now - lastFetch < 5000) { // 5 segundos entre solicitudes
      console.log('[BusinessContext] Solicitud ignorada, demasiado frecuente');
      return;
    }
    
    // Evitar múltiples llamadas si ya estamos cargando
    if (loading && !force) {
      console.log('[BusinessContext] Ya hay una solicitud en curso');
      return;
    }
    
    setLoading(true);
    setLastFetch(now);
    
    try {
      console.log('[BusinessContext] Obteniendo datos del negocio...');
      const response = await getBusinessInfo();
      
      if (response.success) {
        // Validar que los datos recibidos sean un objeto válido
        if (response.data && typeof response.data === 'object') {
          console.log('[BusinessContext] Datos obtenidos correctamente');
          
          // Normalizar datos para asegurar consistencia
          const normalizedData = {
            ...response.data,
            // Asegurar que taxId esté disponible (puede venir como tax_id o taxId)
            taxId: response.data.taxId || response.data.tax_id || '',
            // Asegurar que el logo sea una URL válida o null
            logo: response.data.logo && response.data.logo !== 'null' ? response.data.logo : null
          };
          
          setBusinessInfo(normalizedData);
          setError(null);
          
          // Notificar si se están usando datos en caché o predeterminados
          if (response.fromCache) {
            console.warn('[BusinessContext] Usando datos en caché');
          } else if (response.isDefault) {
            console.warn('[BusinessContext] Usando datos predeterminados');
          }
        } else {
          console.error('[BusinessContext] Datos recibidos inválidos:', response.data);
          setError('Datos del negocio inválidos');
        }
      } else {
        console.error('[BusinessContext] Error en respuesta:', response.message);
        setError(response.message || 'Error al obtener datos del negocio');
      }
    } catch (err) {
      console.error('[BusinessContext] Error al cargar datos del negocio:', err);
      setError(err.message || 'Error al cargar datos del negocio');
    } finally {
      setLoading(false);
    }
  }, [loading, lastFetch]);

  // Cargar datos del negocio al montar el componente o al autenticar
  useEffect(() => {
    // Esperar a que termine la verificación de sesión
    if (authLoading) return;
    
    // Si no está autenticado, marcar como cargado y salir
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    // Autenticado: obtener datos del negocio
    fetchBusinessInfo();
    
    // Configurar actualización periódica cada 5 minutos
    const intervalId = setInterval(() => {
      if (isAuthenticated) {
        console.log('[BusinessContext] Actualización periódica de datos del negocio');
        fetchBusinessInfo(true);
      }
    }, 5 * 60 * 1000); // 5 minutos
    
    return () => clearInterval(intervalId);
  }, [isAuthenticated, authLoading, fetchBusinessInfo]);

  // Actualizar datos del negocio en el contexto
  const updateBusinessInfo = useCallback((newInfo) => {
    if (!newInfo || typeof newInfo !== 'object') {
      console.error('[BusinessContext] Intento de actualizar con datos inválidos:', newInfo);
      return;
    }
    
    console.log('[BusinessContext] Actualizando datos del negocio');
    
    // Normalizar datos para asegurar consistencia
    const normalizedData = {
      ...newInfo,
      // Asegurar que taxId esté disponible (puede venir como tax_id o taxId)
      taxId: newInfo.taxId || newInfo.tax_id || '',
      // Asegurar que el logo sea una URL válida o null
      logo: newInfo.logo && newInfo.logo !== 'null' ? newInfo.logo : null
    };
    
    setBusinessInfo(normalizedData);
    
    // Actualizar caché local
    try {
      localStorage.setItem('business_info_cache', JSON.stringify(normalizedData));
      localStorage.setItem('business_info_timestamp', new Date().toISOString());
    } catch (e) {
      console.warn('[BusinessContext] Error al guardar datos en caché:', e);
    }
  }, []);

  // Memoizar el valor del contexto para evitar renderizados innecesarios
  const value = {
    businessInfo,
    updateBusinessInfo,
    loading,
    error,
    refetch: useCallback(() => fetchBusinessInfo(true), [fetchBusinessInfo])
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};