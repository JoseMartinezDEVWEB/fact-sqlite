import { API_ROUTES } from '../config/config';
import api from '../config/axiosConfig';
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '../config/electronConfig';

/**
 * Obtiene la configuración de autenticación para las solicitudes HTTP
 * @returns {Object} Objeto de configuración con el token de autenticación
 */
export const getAuthConfig = () => {
  // Este método ya no es necesario porque configuramos axios globalmente,
  // pero lo mantenemos para mantener compatibilidad con código existente
  return {};
};

/**
 * Realiza la autenticación del usuario
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Datos del usuario y token
 */
/*
export const login = async (email, password) => {
  try {
    const response = await axios.post(API_ROUTES.AUTH.LOGIN, { email, password });
    const { token, user } = response.data;
    
    // Guardar token en localStorage
    setLocalStorage('token', token);
    
    return { token, user };
  } catch (error) {
    console.error('Error en login:', error.response?.data || error.message);
    throw error.response?.data || { message: 'Error al iniciar sesión' };
  }
};

*/

/**
 * Cierra la sesión del usuario
 */
/*
export const logout = () => {
  removeLocalStorage('token');
};

*/

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} True si está autenticado, false en caso contrario
 */
export const isAuthenticated = () => {
  const token = getLocalStorage('token');
  return !!token;
};

/**
 * Obtiene el token actual
 * @returns {string|null} Token o null si no existe
 */
export const getToken = () => {
  return getLocalStorage('token');
};

/**
 * Verifica si el token es válido haciendo una solicitud al servidor
 * @returns {Promise<boolean>} True si el token es válido, false en caso contrario
 */
export const validateToken = async (apiClient) => {
  try {
    if (!isAuthenticated()) return false;
    
    // Usamos el cliente API proporcionado o caemos en el predeterminado
    const client = apiClient || api;
    const response = await client.get('/auth/validate', getAuthConfig());
    return response.data.valid;
  } catch (error) {
    console.error('Error validando token:', error);
    return false;
  }
}; 


export const login = async (email, password, apiClient) => {
  try {
    // Usamos el cliente API proporcionado o caemos en el predeterminado
    const client = apiClient || api;
    
    // Realizar la solicitud POST
    const response = await client.post(API_ROUTES.AUTH.LOGIN, { email, password });
    
    // Asegurarnos de obtener los datos correctamente de response.data
    const data = response.data;
    console.log('Respuesta completa del login:', data);
    
    // Manejar formato {success, count, data}
    if (data && data.success && data.data) {
      // La respuesta tiene el formato {success: true, count: X, data: Array}
      // El token debería estar en el primer elemento del array data
      const userData = Array.isArray(data.data) ? data.data[0] : data.data;
      
      if (userData && userData.token) {
        console.log('Token encontrado en data[0]:', userData.token);
        setLocalStorage('token', userData.token);
        // También guarda el refresh token si está disponible
        if (userData.refreshToken) {
          setLocalStorage('refreshToken', userData.refreshToken);
        }
        return userData;
      }
    } 
    // Formato tradicional donde el token está directamente en data
    else if (data && data.token) {
      console.log('Token encontrado directamente en data:', data.token);
      setLocalStorage('token', data.token);
      // También guarda el refresh token si tu API lo proporciona
      if (data.refreshToken) {
        setLocalStorage('refreshToken', data.refreshToken);
      }
      return data;
    } 
    // No se encontró token en ningún formato
    else {
      console.error('Respuesta no contiene token válido:', data);
      throw new Error('La respuesta no contiene un token válido');
    }
  } catch (error) {
    console.error('Error en login:', error);
    if (error.response?.status === 401) {
      throw new Error('Credenciales inválidas');
    }
    
    throw error;
  }
};

export const logout = () => {
  removeLocalStorage('token');
  removeLocalStorage('refreshToken');
  return true;
};

export const refreshToken = async (apiClient) => {
  try {
    const refreshToken = getLocalStorage('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No hay refresh token disponible');
    }
    
    // Usamos el cliente API proporcionado o caemos en el predeterminado
    const client = apiClient || api;
    const response = await client.post('/auth/refresh-token', { refreshToken });
    
    if (response.data && response.data.token) {
      setLocalStorage('token', response.data.token);
      // También actualiza el refresh token si la API lo devuelve
      if (response.data.refreshToken) {
        setLocalStorage('refreshToken', response.data.refreshToken);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error al refrescar token:', error);
    // Eliminar los tokens si hay un error de refresco
    removeLocalStorage('token');
    removeLocalStorage('refreshToken');
    throw error;
  }
};