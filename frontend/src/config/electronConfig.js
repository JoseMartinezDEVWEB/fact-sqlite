// Configuración específica para Electron
// Maneja el acceso a localStorage de forma segura

/**
 * Verifica si estamos en un entorno Electron
 */
export const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

/**
 * Obtiene el valor de localStorage de forma segura
 */
export const getLocalStorage = (key) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  } catch (error) {
    console.warn('Error accediendo a localStorage:', error);
    return null;
  }
};

/**
 * Establece el valor en localStorage de forma segura
 */
export const setLocalStorage = (key, value) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Error estableciendo localStorage:', error);
    return false;
  }
};

/**
 * Elimina el valor de localStorage de forma segura
 */
export const removeLocalStorage = (key) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Error eliminando localStorage:', error);
    return false;
  }
};

/**
 * Limpia todo el localStorage de forma segura
 */
export const clearLocalStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Error limpiando localStorage:', error);
    return false;
  }
};
