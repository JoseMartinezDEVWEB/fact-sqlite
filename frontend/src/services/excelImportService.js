import axios from 'axios';
import api from '../config/apis';
import { API_ROUTES } from '../config/config';

/**
 * Servicio para manejar la importación de productos desde Excel
 */
export const excelImportService = {
  /**
   * Importa productos desde un archivo Excel
   * @param {File} file - Archivo Excel a importar
   * @param {Object} options - Opciones adicionales para la importación
   * @returns {Promise} - Promesa con el resultado de la importación
   */
  importExcelFile: async (file, options = {}) => {
    try {
      // Validar que se haya proporcionado un archivo
      if (!file) {
        throw new Error('No se ha proporcionado un archivo para importar');
      }

      // Crear un FormData para enviar el archivo
      const formData = new FormData();
      formData.append('excelFile', file);
      
      // Agregar opciones adicionales si se proporcionan
      if (options.defaultCategory) {
        formData.append('defaultCategory', options.defaultCategory);
      }
      
      if (options.defaultUnitType) {
        formData.append('defaultUnitType', options.defaultUnitType);
      }

      // Realizar la petición al servidor
      const response = await api.post(`${API_ROUTES.PRODUCTS}/import/excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return {
        success: true,
        message: response.data.message || 'Importación completada exitosamente',
        data: response.data
      };
    } catch (error) {
      console.error('Error al importar archivo Excel:', error);
      
      let errorMessage = 'Error desconocido al importar productos';
      
      if (error.response) {
        console.error('Respuesta de error:', error.response.data);
        errorMessage = error.response.data?.message || `Error ${error.response.status}: ${error.response.statusText}`;
        
        // Manejar errores específicos
        if (error.response.status === 401) {
          localStorage.removeItem('token');
          errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
        } else if (error.response.status === 403) {
          errorMessage = 'No tienes permisos para importar productos.';
        }
      } else if (error.request) {
        errorMessage = 'No se recibió respuesta del servidor';
      } else {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage,
        error
      };
    }
  },
  
  /**
   * Importa productos desde datos de Excel procesados
   * @param {Array} products - Array de productos en formato compatible con el modelo
   * @returns {Promise} - Promesa con el resultado de la importación
   */
  importProducts: async (products) => {
    try {
      // Validar que haya productos para importar
      if (!products || !Array.isArray(products) || products.length === 0) {
        throw new Error('No hay productos para importar');
      }

      // Crear los productos en el servidor (uno por uno)
      const results = await Promise.all(
        products.map(async (product) => {
          try {
            console.log('Enviando producto:', product);
            const response = await api.post(API_ROUTES.PRODUCTS, product);
            console.log('Respuesta del servidor:', response.data);
            return {
              success: true,
              data: response.data,
              originalProduct: product
            };
          } catch (error) {
            console.error(`Error al importar producto ${product.name}:`, error);
            let errorMessage = 'Error desconocido';
            
            if (error.response) {
              console.error('Respuesta de error:', error.response.data);
              errorMessage = error.response.data?.message || `Error ${error.response.status}: ${error.response.statusText}`;
            } else if (error.request) {
              errorMessage = 'No se recibió respuesta del servidor';
            } else {
              errorMessage = error.message;
            }
            
            return {
              success: false,
              error: errorMessage,
              originalProduct: product
            };
          }
        })
      );

      // Calcular estadísticas de la importación
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        success: true,
        message: `Importación completada: ${successful} productos importados, ${failed} fallidos`,
        results,
        stats: {
          total: products.length,
          successful,
          failed
        }
      };
    } catch (error) {
      console.error('Error en el servicio de importación:', error);
      return {
        success: false,
        message: error.message || 'Error al importar productos',
        error
      };
    }
  }
};

export default excelImportService;
