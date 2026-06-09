import api from '../config/axiosConfig';

const API_URL = '/business';

// Datos predeterminados para cuando hay errores
const DEFAULT_BUSINESS_INFO = {
  name: 'Mi Negocio',
  address: 'Dirección Principal',
  phone: '123-456-7890',
  email: 'contacto@minegocio.com',
  tax_id: '12345678901',
  logo: null,
  config: {
    currency: 'USD',
    decimal_places: 2,
    tax_rate: 0.12
  }
};

// Obtener información del negocio
export const getBusinessInfo = async () => {
  console.log('[BUSINESS SERVICE] Iniciando obtención de información del negocio...');
  
  // 1. Primero intentar obtener del localStorage para mostrar algo rápido
  try {
    const cachedData = localStorage.getItem('business_info_cache');
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      console.log('[BUSINESS SERVICE] Datos en caché encontrados');
      
      // Si los datos en caché tienen un timestamp reciente (menos de 1 hora), usarlos
      const timestamp = localStorage.getItem('business_info_timestamp');
      if (timestamp) {
        const cacheAge = (new Date() - new Date(timestamp)) / (1000 * 60); // en minutos
        if (cacheAge < 60) { // 1 hora de validez
          console.log('[BUSINESS SERVICE] Usando datos en caché (válidos por 1 hora)');
          return { success: true, data: parsedData, fromCache: true };
        }
      }
    }
  } catch (e) {
    console.warn('[BUSINESS SERVICE] Error al procesar caché local:', e);
  }
  
  // 2. Si no hay caché válida, hacer la petición al servidor
  try {
    console.log('[BUSINESS SERVICE] Solicitando datos al servidor...');
    
    const response = await api.get(`${API_URL}/info`, { 
      timeout: 3000, // 3 segundos de timeout
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Accept': 'application/json'
      },
      validateStatus: function (status) {
        return status < 500; // Resolver si el código de estado es menor que 500
      }
    });
    
    console.log('[BUSINESS SERVICE] Respuesta del servidor:', {
      status: response.status,
      data: response.data
    });
    
    // Manejar diferentes códigos de estado
    if (response.status === 200 && response.data && response.data.success) {
      const businessData = response.data.data || response.data;
      
      // Guardar en caché para futuras peticiones
      try {
        localStorage.setItem('business_info_cache', JSON.stringify(businessData));
        localStorage.setItem('business_info_timestamp', new Date().toISOString());
        console.log('[BUSINESS SERVICE] Datos guardados en caché local');
      } catch (e) {
        console.warn('[BUSINESS SERVICE] Error al guardar en caché local:', e);
      }
      
      return { 
        success: true, 
        data: businessData,
        fromServer: true 
      };
    } else if (response.status === 404) {
      console.warn('[BUSINESS SERVICE] No se encontró información del negocio');
      return { 
        success: false, 
        message: 'No se encontró información del negocio',
        status: 404 
      };
    } else {
      console.warn('[BUSINESS SERVICE] Respuesta inesperada del servidor:', response);
      throw new Error(`Error del servidor: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    console.error('[BUSINESS SERVICE] Error al obtener datos del negocio:', error.message || error);
    
    // Intentar usar datos en caché si hay error de conexión
    try {
      const cachedData = localStorage.getItem('business_info_cache');
      if (cachedData) {
        const cachedBusinessInfo = JSON.parse(cachedData);
        console.log('[BUSINESS SERVICE] Usando datos en caché debido a error de conexión');
        return { 
          success: true, 
          data: cachedBusinessInfo,
          fromCache: true,
          message: 'Usando datos en caché debido a problemas de conexión'
        };
      }
    } catch (e) {
      console.warn('[BUSINESS SERVICE] Error al procesar caché de respaldo:', e);
    }
    
    // Si no hay caché disponible, devolver datos por defecto
    console.warn('[BUSINESS SERVICE] Usando datos predeterminados');
    
    // Detalles adicionales para depuración
    const errorDetails = {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    return { 
      success: false, 
      data: { ...DEFAULT_BUSINESS_INFO, _id: 'default_business_id' },
      isDefault: true,
      error: errorDetails,
      message: 'No se pudo obtener la información del negocio. Usando datos predeterminados.'
    };
  }
};

// Guardar información del negocio
export const saveBusinessInfo = async (businessData) => {
  try {
    console.log('[INFO] Guardando información del negocio...');
    
    const formData = new FormData();
    
    // Añadir campos de texto
    Object.keys(businessData).forEach(key => {
      if (key !== 'logo' || (key === 'logo' && typeof businessData[key] === 'string')) {
        formData.append(key, businessData[key]);
      }
    });
    
    // Añadir logo si es un archivo
    if (businessData.logo instanceof File) {
      formData.append('logo', businessData.logo);
    }
    
    const response = await api.post(`${API_URL}/info`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      // Timeout más largo para subida de archivos
      timeout: 20000
    });
    
    console.log('[INFO] Información del negocio guardada correctamente');
    return response.data;
  } catch (error) {
    console.error('[ERROR] Error al guardar datos del negocio:', error.message || error);
    
    // Mensaje más descriptivo en caso de timeout
    if (error.code === 'ECONNABORTED') {
      return { 
        success: false, 
        message: 'La conexión con el servidor ha tardado demasiado. Intente nuevamente más tarde.'
      };
    }
    
    // Devolver un objeto de error estructurado
    return { 
      success: false, 
      message: error.response?.data?.message || 'Error al guardar datos del negocio',
      error: error.message || 'Error desconocido'
    };
  }
}; 