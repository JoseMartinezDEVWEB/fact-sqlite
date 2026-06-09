import axios from 'axios';
import { API_ROUTES, API_URL } from '../config/config';
import { getUserToken } from './loginService';

// Crear instancia de axios con cabeceras de autenticación
const createAuthClient = () => {
  const token = getUserToken();
  // Probar diferentes configuraciones de URL base para encontrar la que funciona
  const baseURLs = [
    'http://localhost:4000',
    'http://localhost:4000/api',
    API_URL
  ];
  
  // Usar la primera URL base por defecto
  return axios.create({
    baseURL: baseURLs[0],
    timeout: 60000, // Aumentado a 60 segundos para dar más tiempo
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });
};

// Función auxiliar para probar diferentes rutas
const tryMultipleRoutes = async (paths, method = 'get', data = null) => {
  const client = createAuthClient();
  let lastError = null;
  
  // Probar cada ruta hasta que una funcione
  for (const path of paths) {
    try {
      console.log(`Intentando ${method.toUpperCase()} a: ${path}`);
      let response;
      
      if (method === 'get') {
        response = await client.get(path);
      } else if (method === 'post') {
        response = await client.post(path, data);
      } else if (method === 'put') {
        response = await client.put(path, data);
      } else if (method === 'delete') {
        response = await client.delete(path);
      }
      
      console.log(`Éxito en ruta: ${path}`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error en ruta ${path}:`, error.message);
      lastError = error;
    }
  }
  
  // Si llegamos aquí, todas las rutas fallaron
  console.error('Todas las rutas fallaron');
  return { error: lastError?.message || 'Error al conectar con el servidor' };
};

/**
 * Activate a license for a user
 * @param {Object} data - License data (userId, isTrial, notes)
 * @returns {Promise<Object>} License data
 */
export const activateLicense = async (data) => {
  console.log('Activando licencia con datos:', data);
  
  // Probar diferentes rutas para activar licencia
  const possiblePaths = [
    '/api/licenses/activate',
    '/licenses/activate',
    API_ROUTES.LICENSES.ACTIVATE
  ];
  
  return await tryMultipleRoutes(possiblePaths, 'post', data);
};

/**
 * Renew a license for a user
 * @param {String} userId - User ID
 * @param {Object} data - License data (notes)
 * @returns {Promise<Object>} License data
 */
export const renewLicense = async (userId, data = {}) => {
  console.log('Renovando licencia para usuario:', userId, 'con datos:', data);
  
  // Probar diferentes rutas para renovar licencia
  const possiblePaths = [
    `/api/licenses/renew/${userId}`,
    `/licenses/renew/${userId}`,
    `${API_ROUTES.LICENSES.RENEW}/${userId}`
  ];
  
  return await tryMultipleRoutes(possiblePaths, 'post', data);
};

/**
 * Block a license for a user
 * @param {String} userId - User ID
 * @param {Object} data - License data (notes)
 * @returns {Promise<Object>} License data
 */
export const blockLicense = async (userId, data = {}) => {
  console.log('Bloqueando licencia para usuario:', userId, 'con razón:', data.reason);
  
  // Probar diferentes rutas para bloquear licencia
  const possiblePaths = [
    `/api/licenses/block/${userId}`,
    `/licenses/block/${userId}`,
    `${API_ROUTES.LICENSES.BLOCK}/${userId}`
  ];
  
  return await tryMultipleRoutes(possiblePaths, 'put', data);
};

/**
 * Get all licenses
 * @returns {Promise<Object>} Licenses data
 */
export const getAllLicenses = async () => {
  try {
    // Probar diferentes rutas para obtener licencias
    const possiblePaths = [
      '/api/licenses/list',
      '/licenses/list',
      API_ROUTES.LICENSES.LIST
    ];
    
    const result = await tryMultipleRoutes(possiblePaths);
    
    // Si hay un error, asegurarse de devolver un objeto con la estructura esperada
    if (result.error) {
      console.error('Error en getAllLicenses:', result.error);
      return { licenses: [], error: result.error };
    }
    
    // Verificar la estructura de la respuesta y adaptarla si es necesario
    if (Array.isArray(result)) {
      // Si el backend devuelve un array directamente
      console.log('getAllLicenses: Backend devolvió un array de licencias directamente');
      return { licenses: result, success: true };
    } else if (result.licenses && Array.isArray(result.licenses)) {
      // Si el backend devuelve un objeto con propiedad licenses
      console.log('getAllLicenses: Backend devolvió objeto con propiedad licenses');
      return result;
    } else if (result.success && result.data && Array.isArray(result.data)) {
      // Si el backend devuelve un objeto con propiedad data
      console.log('getAllLicenses: Backend devolvió objeto con propiedad data');
      return { licenses: result.data, success: true };
    } else if (result.success && Array.isArray(result.licenses)) {
      // Estructura esperada del backend actual
      console.log('getAllLicenses: Backend devolvió objeto con success y licenses');
      return result;
    } else {
      // Intentar encontrar cualquier array en la respuesta
      const possibleLicenseArrays = Object.values(result).filter(val => Array.isArray(val));
      if (possibleLicenseArrays.length > 0) {
        console.log('getAllLicenses: Encontrado posible array de licencias en la respuesta');
        return { licenses: possibleLicenseArrays[0], success: true };
      }
      
      console.error('getAllLicenses: Estructura de respuesta desconocida', result);
      return { licenses: [], error: 'Formato de respuesta no reconocido' };
    }
  } catch (err) {
    console.error('Error inesperado en getAllLicenses:', err);
    return { licenses: [], error: err.message || 'Error desconocido' };
  }
};

/**
 * Validate a license for a user
 * @param {String} userId - User ID
 * @returns {Promise<Object>} License validation data
 */
export const validateLicense = async (userId) => {
  console.log('Validando licencia para usuario:', userId);
  
  // Probar diferentes rutas para validar licencia
  const possiblePaths = [
    `/api/licenses/validate/${userId}`,
    `/licenses/validate/${userId}`,
    `${API_ROUTES.LICENSES.VALIDATE}/${userId}`
  ];
  
  const result = await tryMultipleRoutes(possiblePaths);
  
  // Para superadmin, devolver licencia válida incluso si hay error en API
  if (result.error && result.error.includes('superadmin')) {
    return { isValid: true, status: 'SUPERADMIN_ACTIVE', daysRemaining: Infinity, licenseType: 'SUPERADMIN' };
  }
  
  // Si hay un error, devolver objeto con isValid: false
  if (result.error) {
    return { isValid: false, error: result.error };
  }
  
  return result;
};

/**
 * Get license history for a license
 * @param {String} licenseId - License ID
 * @returns {Promise<Object>} License history data
 */
export const getLicenseHistory = async (licenseId) => {
  try {
    const client = createAuthClient();
    const response = await client.get(`${API_ROUTES.LICENSES.HISTORY}/${licenseId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting license history:', error);
    throw error.response?.data || error;
  }
};

/**
 * Store encrypted license validation data in localStorage
 * @param {Object} data - License validation data
 */
export const storeLicenseData = (data) => {
  try {
    // Simple encryption using base64 (in a real app, use a more secure method)
    const encryptedData = btoa(JSON.stringify({
      ...data,
      timestamp: Date.now()
    }));
    localStorage.setItem('licenseData', encryptedData);
  } catch (error) {
    console.error('Error storing license data:', error);
  }
};

/**
 * Get encrypted license validation data from localStorage
 * @returns {Object|null} License validation data or null if not found/invalid
 */
export const getLicenseData = () => {
  try {
    const encryptedData = localStorage.getItem('licenseData');
    if (!encryptedData) return null;
    
    // Decrypt data
    const data = JSON.parse(atob(encryptedData));
    
    // Check if data is still valid (not older than 1 hour)
    if (Date.now() - data.timestamp > 60 * 60 * 1000) {
      localStorage.removeItem('licenseData');
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting license data:', error);
    localStorage.removeItem('licenseData');
    return null;
  }
};
