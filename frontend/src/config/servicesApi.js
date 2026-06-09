// src/services/api.js
import axios from 'axios';
import { mockData } from './dashboardData';
import { API_BASE_URL } from './config';

// Configuración global
const USE_MOCK_DATA = false; // Cambiar a false para usar la API real

// Creamos la instancia de axios
const servicesApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para añadir el token y hacer logging
servicesApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('Token en localStorage:', token ? 'Presente' : 'Ausente');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`Realizando petición a: ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Error en la configuración de la petición:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
servicesApi.interceptors.response.use(
  (response) => {
    console.log(`Respuesta exitosa de ${response.config.url}:`, response.status);
    return response.data;
  },
  (error) => {
    console.error('Error completo:', error);
    
    if (error.response) {
      console.error(`Error ${error.response.status} en ${error.config.url}:`, error.response.data);
      
      // Solo redirigir a login en caso de error 401 si no estamos en la página de login
      if (error.response.status === 401 && !window.location.pathname.includes('login')) {
        console.warn('Redirigiendo a login debido a error de autenticación');
        // Añadimos un pequeño retraso para evitar redirecciones en cascada
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 500);
      }
      
      return Promise.reject(error.response.data);
    } else if (error.request) {
      console.error('No se recibió respuesta:', error.request);
      return Promise.reject({ message: 'No hay respuesta del servidor' });
    } else {
      console.error('Error en la configuración:', error.message);
      return Promise.reject({ message: 'Error al realizar la petición' });
    }
  }
);

// Servicio de autenticación mejorado
export const authService = {
  login: async (credentials) => {
    try {
      const response = await servicesApi.post('/login', credentials);
      
      if (response.token) {
        localStorage.setItem('token', response.token);
        console.log('Token guardado en localStorage');
        return response;
      } else {
        throw new Error('No se recibió token de autenticación');
      }
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  },
  
  verifySession: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw { status: 401, message: 'No hay token de autenticación' };
    }
    
    try {
      // Intenta obtener información del usuario para verificar la sesión
      return await servicesApi.get('/auth/users/info') // Corregido: la ruta real es /auth/users/info, no /users/info;
    } catch (error) {
      console.error('Error al verificar sesión:', error);
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    console.log('Token eliminado de localStorage');
    window.location.href = '/login';
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

// Datos de fallback mejorados para el dashboard
const FALLBACK_DATA = {
  totalVentas: {
    hoy: 1449.40,
    esteMes: 12624.08,
    pendientesHoy: 245.50,
    pendientesMes: 944.15
  },
  facturasCreadas: {
    hoy: 6,
    esteMes: 34,
    confirmadasHoy: 5,
    pendientesHoy: 1
  },
  balanceNeto: {
    hoy: 1449.40,
    esteMes: 12624.08
  },
  clientes: {
    totalClientes: 13,
    cuentasPendientes: 2188.55,
    cuentasVendidas: 205,
    totalPendientesCount: 8
  },
  productosServicios: {
    totalProductos: 10,
    totalServicios: 0
  },
  productosTopVendidos: [
    { nombre: "Galleta Princesa", cantidad: 12, ingresos: 720 },
    { nombre: "Coca-Cola", cantidad: 8, ingresos: 400 },
    { nombre: "Arroz Campo", cantidad: 5, ingresos: 750 },
    { nombre: "Rica 100%", cantidad: 4, ingresos: 300 },
    { nombre: "Carne de Res", cantidad: 3, ingresos: 900 }
  ]
};

// Servicio del dashboard mejorado
export const dashboardService = {
  getData: async (period = 'day') => {
    if (USE_MOCK_DATA) {
      console.log('Usando datos simulados para el dashboard');
      return mockData;
    }
    
    try {
      // Verificar la sesión primero (opcional)
      await authService.verifySession();
      
      // Añadir timestamp para evitar problemas de caché
      const timestamp = new Date().getTime();
      
      // Convertir período al formato esperado por la API
      let apiPeriod;
      switch (period) {
        case 'day': apiPeriod = 'today'; break;
        case 'week': apiPeriod = 'week'; break;
        case 'month': apiPeriod = 'month'; break;
        case 'year': apiPeriod = 'year'; break;
        default: apiPeriod = 'today';
      }
      
      console.log(`Obteniendo datos del dashboard para periodo: ${apiPeriod}`);
      const response = await servicesApi.get(`/dashboard/data?period=${apiPeriod}&t=${timestamp}`);
      
      // Verificar y normalizar los datos recibidos
      if (response && response.success) {
        // El backend devuelve los campos de forma PLANA (no anidada).
        // Mapear correctamente: data.ventasConfirmadasHoy → totalVentas.hoy, etc.
        const data = response.data || {};

        return {
          totalVentas: {
            hoy:          parseFloat(data.ventasConfirmadasHoy) || 0,
            esteMes:      parseFloat(data.ventasConfirmadasMes) || 0,
            pendientesHoy:parseFloat(data.ventasPendientesHoy)  || 0,
            pendientesMes:parseFloat(data.ventasPendientesMes)  || 0
          },
          balanceNeto: {
            hoy:     parseFloat(data.balanceHoy) || 0,
            esteMes: parseFloat(data.balanceMes) || 0
          },
          facturasCreadas: {
            hoy:           parseInt(data.totalFacturasHoy)  || 0,
            esteMes:       parseInt(data.totalFacturasMes)  || 0,
            confirmadasHoy:parseInt(data.totalFacturasHoy)  || 0,
            pendientesHoy: parseInt(data.cuentasPendientes) || 0
          },
          gastos: {
            hoy:     parseFloat(data.gastosHoy) || 0,
            esteMes: parseFloat(data.gastosMes) || 0
          },
          clientes: {
            totalClientes:       parseInt(data.totalClientes)    || 0,
            cuentasPendientes:   parseFloat(data.cuentasPendientes) || 0,  // monto total
            cuentasVendidas:     parseFloat(data.cuentasVendidas)   || 0,
            totalPendientesCount:parseInt(data.cuentasPendientes)   || 0   // count
          },
          productosServicios: {
            totalProductos: parseInt(data.productosCount) || 0,
            totalServicios: parseInt(data.serviciosCount) || 0
          },
          productosTopVendidos: Array.isArray(data.topProducts) ? data.topProducts : []
        };
      } else {
        console.warn('Formato de respuesta incorrecto del dashboard');
        return FALLBACK_DATA;
      }
    } catch (error) {
      console.error('Error al obtener datos del dashboard:', error);
      
      // Si hay un error de autenticación, no usamos los datos simulados
      if (error.status === 401) {
        throw error;
      }
      
      // Para otros errores, usamos los datos simulados como fallback
      console.warn('Fallback a datos de respaldo');
      return FALLBACK_DATA;
    }
  },
  
  getDetailedStats: async (period = 'week') => {
    if (USE_MOCK_DATA) {
      return {
        detailedStats: mockData.detailedStats || [],
        productosTopVendidos: mockData.productosTopVendidos || []
      };
    }
    
    try {
      // Añadir timestamp para evitar problemas de caché
      const timestamp = new Date().getTime();
      const response = await servicesApi.get(`/dashboard/stats?period=${period}&t=${timestamp}`);
      
      if (response && response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Formato de respuesta incorrecto');
      }
    } catch (error) {
      console.error('Error al obtener estadísticas detalladas:', error);
      
      // Datos de respaldo detallados
      return {
        detailedStats: [
          {
            _id: { year: 2025, month: 3, day: 30 },
            totalVentas: 1449.4,
            cantidadFacturas: 6,
            promedioVenta: 241.57
          },
          {
            _id: { year: 2025, month: 3, day: 29 },
            totalVentas: 2188.55,
            cantidadFacturas: 8,
            promedioVenta: 273.57
          },
          {
            _id: { year: 2025, month: 3, day: 28 },
            totalVentas: 3215.65,
            cantidadFacturas: 10,
            promedioVenta: 321.57
          }
        ],
        productosTopVendidos: FALLBACK_DATA.productosTopVendidos
      };
    }
  }
};

// Servicio para clientes y deudas
export const clienteService = {
  getClientesDeuda: async () => {
    try {
      const response = await servicesApi.get('/clientes/deudas');
      
      if (response && response.success) {
        return response.clientes || [];
      } else {
        throw new Error('Formato de respuesta incorrecto');
      }
    } catch (error) {
      console.error('Error al obtener clientes con deuda:', error);
      
      // Datos de muestra para desarrollo
      return [
        { id: 1, nombre: "Juan Pérez", totalDeuda: 245.50, facturasPendientes: 2 },
        { id: 2, nombre: "María García", totalDeuda: 350.65, facturasPendientes: 3 },
        { id: 3, nombre: "Carlos López", totalDeuda: 120.00, facturasPendientes: 1 },
        { id: 4, nombre: "Ana Martínez", totalDeuda: 228.00, facturasPendientes: 2 }
      ];
    }
  },
  
  saldarDeuda: async (clienteId) => {
    try {
      const response = await servicesApi.post('/clientes/saldar-deuda', { clienteId });
      return response;
    } catch (error) {
      console.error('Error al saldar deuda del cliente:', error);
      throw error;
    }
  },
  
  abonarDeuda: async (clienteId, montoAbono) => {
    try {
      const response = await servicesApi.post('/clientes/abonar-deuda', { 
        clienteId, 
        montoAbono 
      });
      return response;
    } catch (error) {
      console.error('Error al abonar a la deuda del cliente:', error);
      throw error;
    }
  }
};

export const getTopProducts = async (params = {}) => {
  try {
    // Parámetros de paginación y filtro
    const { 
      period = 'day', 
      page = 1, 
      limit = 10, 
      sortBy = 'cantidad', 
      order = 'desc' 
    } = params;
    
    // Añadir timestamp para evitar problemas de caché
    const timestamp = new Date().getTime();
    
    // Convertir período al formato esperado por la API
    let apiPeriod;
    switch (period) {
      case 'day': apiPeriod = 'today'; break;
      case 'week': apiPeriod = 'week'; break;
      case 'month': apiPeriod = 'month'; break;
      case 'year': apiPeriod = 'year'; break;
      default: apiPeriod = 'today';
    }
    
    // Endpoint para obtener productos con paginación
    const response = await servicesApi.get(
      `/dashboard/top-products?period=${apiPeriod}&page=${page}&limit=${limit}&sortBy=${sortBy}&order=${order}&t=${timestamp}`
    );
    
    if (response && response.success) {
      return {
        products: response.data?.products || [],
        pagination: response.data?.pagination || {
          currentPage: page,
          totalPages: 1,
          totalItems: response.data?.products?.length || 0,
          itemsPerPage: limit
        }
      };
    } else {
      throw new Error('Formato de respuesta incorrecto');
    }
  } catch (error) {
    console.error('Error al obtener top productos:', error);
    
    // Datos de fallback para desarrollo con paginación simulada
    const mockProducts = [
      { nombre: "Galleta Princesa", cantidad: 12, ingresos: 720 },
      { nombre: "Coca-Cola", cantidad: 8, ingresos: 400 },
      { nombre: "Arroz Campo", cantidad: 5, ingresos: 750 },
      { nombre: "Rica 100%", cantidad: 4, ingresos: 300 },
      { nombre: "Carne de Res", cantidad: 3, ingresos: 900 },
      { nombre: "Pan Integral", cantidad: 3, ingresos: 150 },
      { nombre: "Queso Blanco", cantidad: 2, ingresos: 400 },
      { nombre: "Jugo Naranja", cantidad: 2, ingresos: 160 },
      { nombre: "Aceite Vegetal", cantidad: 2, ingresos: 380 },
      { nombre: "Leche Entera", cantidad: 2, ingresos: 240 },
      { nombre: "Pasta Dental", cantidad: 1, ingresos: 85 },
      { nombre: "Jabón Tocador", cantidad: 1, ingresos: 65 },
      { nombre: "Papel Higiénico", cantidad: 1, ingresos: 120 },
      { nombre: "Atún Enlatado", cantidad: 1, ingresos: 95 },
      { nombre: "Galletas Saladas", cantidad: 1, ingresos: 45 }
    ];
    
    // Simular paginación
    const startIndex = (params.page - 1) * params.limit;
    const endIndex = startIndex + params.limit;
    const paginatedProducts = mockProducts.slice(startIndex, endIndex);
    
    return {
      products: paginatedProducts,
      pagination: {
        currentPage: params.page,
        totalPages: Math.ceil(mockProducts.length / params.limit),
        totalItems: mockProducts.length,
        itemsPerPage: params.limit
      }
    };
  }
}

export default servicesApi;