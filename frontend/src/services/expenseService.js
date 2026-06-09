import axios from 'axios';
import { getAuthConfig } from './authService';
import api from '../config/axiosConfig';
import { API_ROUTES } from '../config/config';

const API_URL = API_ROUTES.EXPENSES;

// Obtener todos los gastos con filtros opcionales
export const getExpenses = async (filters = {}) => {
  try {
    // Construir los parámetros de consulta
    const queryParams = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        queryParams.append(key, filters[key]);
      }
    });
    
    const response = await api.get(`${API_URL}?${queryParams.toString()}`);
    
    // Manejar el formato de respuesta {success, count, data}
    console.log('Respuesta getExpenses:', response.data);
    
    // Si la respuesta tiene la propiedad data, extraerla
    if (response.data && response.data.data !== undefined) {
      // Mantener la estructura de response pero modificar data para que sea compatible
      return {
        ...response,
        data: response.data.data
      };
    }
    
    return response;
  } catch (error) {
    console.error('Error en getExpenses:', error);
    throw error.response?.data || { message: 'Error al obtener los gastos' };
  }
};

// Obtener un gasto específico
export const getExpense = async (id) => {
  try {
    const response = await api.get(`${API_URL}/${id}`);
    
    // Manejar el formato de respuesta {success, count, data}
    if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
      // Si data es un array con un solo elemento, devolver ese elemento
      if (Array.isArray(response.data.data) && response.data.data.length === 1) {
        return {
          ...response,
          data: response.data.data[0]
        };
      }
      // Si data no es un array o tiene múltiples elementos, devolver data directamente
      return {
        ...response,
        data: response.data.data
      };
    }
    
    return response;
  } catch (error) {
    console.error('Error en getExpense:', error);
    throw error.response?.data || { message: 'Error al obtener el gasto' };
  }
};

// Crear un nuevo gasto
export const createExpense = async (expenseData, isFormData = false) => {
  try {
    let config = {};
    if (isFormData) {
      config.headers = {
        'Content-Type': 'multipart/form-data'
      };
    }
    
    const response = await api.post(API_URL, expenseData, config);
    return response;
  } catch (error) {
    throw error.response?.data || { message: 'Error al crear el gasto' };
  }
};

// Actualizar un gasto existente
export const updateExpense = async (id, expenseData, isFormData = false) => {
  try {
    let config = {};
    if (isFormData) {
      config.headers = {
        'Content-Type': 'multipart/form-data'
      };
    }
    
    const response = await api.put(`${API_URL}/${id}`, expenseData, config);
    return response;
  } catch (error) {
    throw error.response?.data || { message: 'Error al actualizar el gasto' };
  }
};

// Eliminar un gasto
export const deleteExpense = async (id) => {
  try {
    const response = await api.delete(`${API_URL}/${id}`);
    return response;
  } catch (error) {
    throw error.response?.data || { message: 'Error al eliminar el gasto' };
  }
};

// Obtener gastos mensuales
export const getMonthlyExpenses = async () => {
  try {
    const response = await api.get(`${API_URL}/monthly`);
    
    // Manejar el formato de respuesta {success, count, data}
    console.log('Respuesta getMonthlyExpenses:', response.data);
    
    if (response.data && response.data.data !== undefined) {
      return {
        ...response,
        data: response.data.data
      };
    }
    
    return response;
  } catch (error) {
    console.error('Error en getMonthlyExpenses:', error);
    throw error.response?.data || { message: 'Error al obtener los gastos mensuales' };
  }
};

// Obtener el resumen de gastos
export const getExpenseSummary = async () => {
  try {
    const response = await api.get(`${API_URL}/summary`);
    
    // Manejar el formato de respuesta {success, count, data}
    console.log('Respuesta getExpenseSummary:', response.data);
    
    if (response.data && response.data.data !== undefined) {
      // Si la respuesta tiene el formato {success, count, data}
      // Extraer los datos del primer elemento si es un array, o usar data directamente si no lo es
      const summaryData = Array.isArray(response.data.data) && response.data.data.length > 0 
        ? response.data.data[0] 
        : response.data.data;
      
      return {
        ...response,
        data: summaryData
      };
    }
    
    return response;
  } catch (error) {
    console.error('Error en getExpenseSummary:', error);
    throw error.response?.data || { message: 'Error al obtener el resumen de gastos' };
  }
};

