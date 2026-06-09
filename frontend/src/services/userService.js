import axios from 'axios';
import { API_ROUTES, API_URL } from '../config/config';
import { getUserToken } from './loginService';

// Crear cliente con autenticación
const createAuthClient = () => {
  const token = getUserToken();
  return axios.create({
    baseURL: 'http://localhost:4000', // URL base sin /api para que coincida con el backend
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
 * Obtener lista de todos los usuarios
 * @returns {Promise<Object>} Datos de usuarios
 */
export const getAllUsers = async () => {
  try {
    // Probar diferentes rutas para obtener usuarios
    const possiblePaths = [
      '/api/auth/users',
      '/api/users',
      '/auth/users',
      '/users'
    ];
    
    const result = await tryMultipleRoutes(possiblePaths);
    
    // Si hay un error, asegurarse de devolver un objeto con la estructura esperada
    if (result.error) {
      console.error('Error en getAllUsers:', result.error);
      return { users: [], error: result.error };
    }
    
    // Verificar la estructura de la respuesta y adaptarla si es necesario
    if (Array.isArray(result)) {
      // Si el backend devuelve un array directamente
      console.log('getAllUsers: Backend devolvió un array de usuarios directamente');
      return { users: result, success: true };
    } else if (result.users && Array.isArray(result.users)) {
      // Si el backend devuelve un objeto con propiedad users
      console.log('getAllUsers: Backend devolvió objeto con propiedad users');
      return result;
    } else if (result.success && result.data && Array.isArray(result.data)) {
      // Si el backend devuelve un objeto con propiedad data
      console.log('getAllUsers: Backend devolvió objeto con propiedad data');
      return { users: result.data, success: true };
    } else {
      // Intentar encontrar cualquier array en la respuesta
      const possibleUserArrays = Object.values(result).filter(val => Array.isArray(val));
      if (possibleUserArrays.length > 0) {
        console.log('getAllUsers: Encontrado posible array de usuarios en la respuesta');
        return { users: possibleUserArrays[0], success: true };
      }
      
      console.error('getAllUsers: Estructura de respuesta desconocida', result);
      return { users: [], error: 'Formato de respuesta no reconocido' };
    }
  } catch (err) {
    console.error('Error inesperado en getAllUsers:', err);
    return { users: [], error: err.message || 'Error desconocido' };
  }
};

/**
 * Obtener información de un usuario específico
 * @param {String} userId - ID del usuario
 * @returns {Promise<Object>} Datos del usuario
 */
export const getUserById = async (userId) => {
  try {
    const client = createAuthClient();
    const response = await client.get(`/auth/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error.response?.data || error;
  }
};

/**
 * Actualizar datos de un usuario
 * @param {String} userId - ID del usuario
 * @param {Object} userData - Datos actualizados del usuario
 * @returns {Promise<Object>} Datos del usuario actualizado
 */
export const updateUser = async (userId, userData) => {
  try {
    const client = createAuthClient();
    const response = await client.put(`/auth/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    throw error.response?.data || error;
  }
};

/**
 * Eliminar un usuario
 * @param {String} userId - ID del usuario a eliminar
 * @returns {Promise<Object>} Resultado de la operación
 */
export const deleteUser = async (userId) => {
  console.log('Intentando eliminar usuario con ID:', userId);
  
  // Probar diferentes rutas para eliminar usuario
  const possiblePaths = [
    `/api/auth/users/${userId}`,
    `/api/users/${userId}`,
    `/auth/users/${userId}`,
    `/users/${userId}`
  ];
  
  return await tryMultipleRoutes(possiblePaths, 'delete');
};
