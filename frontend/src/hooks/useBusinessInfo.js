import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4500/api';

/**
 * Hook personalizado para obtener la información del negocio desde el backend
 * Incluye datos adicionales para la impresión de facturas
 */
const useBusinessInfo = () => {
  // Estado inicial con valores por defecto
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    address: '',
    phone: '',
    taxId: '',
    email: '',
    website: '',
    // Datos adicionales para impresión de facturas
    currency: 'RD$',
    taxRate: 18,
    includeTax: true,
    slogan: '',
    footer: '¡Gracias por su compra!',
    additionalComment: '¡Calidad y servicio garantizado!',
    // Configuración de impresión
    printConfig: {
      paperSize: 'receipt',
      paperWidth: 80,
      paperHeight: 297,
      paperOrientation: 'portrait',
      marginTop: 5,
      marginRight: 5,
      marginBottom: 5,
      marginLeft: 5,
      fontScale: 1.0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        // Intentar obtener información del localStorage primero (para uso offline)
        const cachedInfo = localStorage.getItem('businessInfo');
        if (cachedInfo) {
          const parsedInfo = JSON.parse(cachedInfo);
          setBusinessInfo(prevInfo => ({ ...prevInfo, ...parsedInfo }));
        }
        
        // Obtener token de autenticación
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No se encontró token de autenticación');
        }
        
        // Realizar petición al backend
        const response = await axios.get(`${API_BASE_URL}/business`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Combinar datos recibidos con valores por defecto
        const updatedInfo = { ...businessInfo, ...response.data };
        
        // Actualizar estado y guardar en localStorage para uso offline
        setBusinessInfo(updatedInfo);
        localStorage.setItem('businessInfo', JSON.stringify(updatedInfo));
        
        // Cargar configuración de impresión si existe
        try {
          const savedPrintConfig = localStorage.getItem('print_configuration_settings');
          if (savedPrintConfig) {
            const parsedConfig = JSON.parse(savedPrintConfig);
            setBusinessInfo(prevInfo => ({
              ...prevInfo,
              printConfig: { ...prevInfo.printConfig, ...parsedConfig }
            }));
          }
        } catch (configError) {
          console.error('Error al cargar configuración de impresión:', configError);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching business info:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchBusinessInfo();
  }, []);

  // Función para actualizar la información del negocio
  const updateBusinessInfo = async (newInfo) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Actualizar en el backend
      await axios.put(`${API_BASE_URL}/business`, newInfo, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Actualizar estado local
      const updatedInfo = { ...businessInfo, ...newInfo };
      setBusinessInfo(updatedInfo);
      
      // Actualizar en localStorage
      localStorage.setItem('businessInfo', JSON.stringify(updatedInfo));
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      console.error('Error updating business info:', err);
      setError(err.message);
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  // Función para actualizar la configuración de impresión
  const updatePrintConfig = (newConfig) => {
    try {
      const updatedConfig = { ...businessInfo.printConfig, ...newConfig };
      
      // Actualizar estado
      setBusinessInfo(prevInfo => ({
        ...prevInfo,
        printConfig: updatedConfig
      }));
      
      // Guardar en localStorage
      localStorage.setItem('print_configuration_settings', JSON.stringify(updatedConfig));
      
      return { success: true };
    } catch (err) {
      console.error('Error updating print config:', err);
      return { success: false, error: err.message };
    }
  };

  return { 
    businessInfo, 
    loading, 
    error, 
    updateBusinessInfo,
    updatePrintConfig
  };
};

export default useBusinessInfo;