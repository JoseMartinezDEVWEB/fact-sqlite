import api from '../config/axiosConfig';

/**
 * Servicio de diagnóstico para probar la API de facturas
 * Llama a este método desde la consola del navegador para ver la respuesta real
 */
export const debugGetInvoices = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/api/newinvoices?${queryParams}`);
    console.log('[DEBUG] Respuesta de /api/newinvoices:', response);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('[DEBUG] Error de respuesta:', error.response.status, error.response.data);
    } else {
      console.error('[DEBUG] Error desconocido:', error);
    }
    throw error;
  }
}; 