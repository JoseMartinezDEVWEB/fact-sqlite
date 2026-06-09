import api from '../config/axiosConfig';
import { getAuthConfig } from './authService';
import { API_ROUTES } from '../config/config';

// Usar la ruta correcta sin duplicar el prefijo /api
const API_URL = API_ROUTES.INVOICES; // Esto es '/newinvoices' según config.js

// Log para verificar la ruta correcta
console.log('Servicio de facturas configurado con ruta:', API_URL);

// Valores por defecto para cuando la API falla
const DEFAULT_INVOICES_RESPONSE = {
  data: [],
  totalPages: 1,
  currentPage: 1,
  totalItems: 0
};

// Obtener todas las facturas con filtros
// Los errores se propagan para que el componente pueda mostrar mensajes claros
export const getInvoices = async (filters = {}) => {
  const queryParams = new URLSearchParams();

  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      queryParams.append(key, filters[key]);
    }
  });

  const response = await api.get(`${API_URL}?${queryParams.toString()}`);

  if (response.data) {
    // Estructura estándar del backend: { status, data: [...], totalPages, ... }
    if (Array.isArray(response.data.data)) {
      return response.data;
    }
    // El backend devolvió directamente un array
    if (Array.isArray(response.data)) {
      return {
        data: response.data,
        totalPages: 1,
        currentPage: filters.page || 1,
        totalItems: response.data.length
      };
    }
    console.warn('[WARNING] Formato inesperado en getInvoices:', response.data);
  }

  return DEFAULT_INVOICES_RESPONSE;
};

// Obtener una factura por ID
export const getInvoiceById = async (id) => {
  try {
    console.log(`[DEBUG] Obteniendo detalle de factura: ${id}`);
    
    const response = await api.get(`${API_URL}/${id}`);
    
    // Log para depuración
    console.log('[DEBUG] Respuesta de API detalle factura:', response.data);
    
    // Compatibilidad con diferentes estructuras de respuesta
    if (response.data && response.data._id) return response.data;
    if (response.data && response.data.data && response.data.data._id) return response.data.data;
    if (response.data && response.data.factura) return response.data.factura;
    
    throw new Error('Formato de respuesta inesperado');
  } catch (error) {
    console.error('[ERROR] Error al obtener detalle de factura:', error);
    throw error.response?.data || { message: 'Error al obtener la factura' };
  }
};

// Crear una nueva factura
export const createInvoice = async (invoiceData) => {
  try {
    console.log('[DEBUG] Creando nueva factura:', invoiceData);
    
    const response = await api.post(API_URL, invoiceData);
    
    // Log para depuración
    console.log('[DEBUG] Respuesta al crear factura:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('[ERROR] Error al crear factura:', error);
    throw error.response?.data || { message: 'Error al crear la factura' };
  }
};

// Agregar un pago a una factura
export const addPayment = async (invoiceId, paymentData) => {
  try {
    console.log(`[DEBUG] Agregando pago a factura ${invoiceId}:`, paymentData);
    
    const response = await api.post(
      `${API_URL}/${invoiceId}/payment`,
      paymentData
    );
    
    // Log para depuración
    console.log('[DEBUG] Respuesta al agregar pago:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('[ERROR] Error al agregar pago:', error);
    throw error.response?.data || { message: 'Error al agregar el pago' };
  }
};

// Cancelar una factura
export const cancelInvoice = async (invoiceId, reason) => {
  try {
    console.log(`[DEBUG] Cancelando factura ${invoiceId} con motivo: ${reason}`);
    
    const response = await api.post(
      `${API_URL}/${invoiceId}/cancel`,
      { reason }
    );
    
    // Log para depuración
    console.log('[DEBUG] Respuesta al cancelar factura:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('[ERROR] Error al cancelar factura:', error);
    throw error.response?.data || { message: 'Error al cancelar la factura' };
  }
};

// Procesar devolución o cambio de productos
export const processReturn = async (invoiceId, returnData) => {
  try {
    const response = await api.post(`${API_URL}/${invoiceId}/return`, returnData);
    return response.data;
  } catch (error) {
    console.error('[ERROR] Error al procesar devolución:', error);
    throw error.response?.data || { message: 'Error al procesar la devolución' };
  }
};

// Procesar una factura fiscal
export const processFiscalInvoice = async (invoiceId) => {
  try {
    console.log(`[DEBUG] Procesando factura fiscal ${invoiceId}`);
    
    const response = await api.post(
      `${API_URL}/${invoiceId}/process-fiscal`,
      {}
    );
    
    // Log para depuración
    console.log('[DEBUG] Respuesta al procesar factura fiscal:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('[ERROR] Error al procesar factura fiscal:', error);
    throw error.response?.data || { message: 'Error al procesar la factura fiscal' };
  }
}; 