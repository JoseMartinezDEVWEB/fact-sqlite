// Script para limpiar la sesión y forzar el inicio desde el principio
import { removeLocalStorage } from '../config/electronConfig';

/**
 * Limpia todos los datos de sesión almacenados
 */
export const clearSession = () => {
  try {
    // Limpiar todos los datos de autenticación
    removeLocalStorage('token');
    removeLocalStorage('refreshToken');
    removeLocalStorage('user');
    removeLocalStorage('userRole');
    
    // Limpiar otros datos que puedan estar causando problemas
    removeLocalStorage('licenseData');
    removeLocalStorage('businessInfo');
    
    console.log('✅ Sesión limpiada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error limpiando sesión:', error);
    return false;
  }
};

/**
 * Verifica si hay datos de sesión almacenados
 */
export const hasStoredSession = () => {
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const userRole = localStorage.getItem('userRole');
    
    return !!(token || user || userRole);
  } catch (error) {
    console.error('Error verificando sesión almacenada:', error);
    return false;
  }
};
