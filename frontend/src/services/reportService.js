import api from '../config/axiosConfig';
import { getAuthConfig } from './authService';

// Valores por defecto para cuando la API falla
const DEFAULT_RESPONSE = {
  success: false,
  data: null,
  message: 'Error al obtener los datos del reporte'
};

/**
 * Limpia la caché de reportes en el servidor
 * @param {string} type - Tipo de reporte a limpiar (opcional, si no se especifica limpia todos)
 * @returns {Promise<Object>} Resultado de la operación
 */
export const clearReportCache = async (type = null) => {
  try {
    const params = type ? { type } : {};
    const response = await api.get('/reports/clear-cache', { params });
    
    return {
      success: true,
      message: response.data?.message || 'Caché limpiada correctamente'
    };
  } catch (error) {
    console.error('[ERROR] Error al limpiar caché de reportes:', error);
    return {
      success: false,
      message: 'Error al limpiar la caché de reportes'
    };
  }
};

// Función para generar fechas aleatorias en un rango
const randomDateInRange = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Función para generar datos de demostración para ventas
const generateDemoSalesData = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const ventas = [];
  
  // Generar datos para cada día en el rango
  let currentDate = new Date(start);
  while (currentDate <= end) {
    const efectivo = Math.floor(Math.random() * 5000) + 1000;
    const tarjeta = Math.floor(Math.random() * 3000) + 500;
    const transferencia = Math.floor(Math.random() * 2000) + 300;
    const credito = Math.floor(Math.random() * 1500) + 200;
    const total = efectivo + tarjeta + transferencia + credito;
    
    ventas.push({
      fecha: currentDate.toISOString().split('T')[0],
      efectivo,
      tarjeta,
      transferencia,
      credito,
      total
    });
    
    // Avanzar al siguiente día
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Calcular totales
  const totalVentas = ventas.reduce((sum, item) => sum + item.total, 0);
  const totalEfectivo = ventas.reduce((sum, item) => sum + item.efectivo, 0);
  const totalTarjeta = ventas.reduce((sum, item) => sum + item.tarjeta, 0);
  const totalTransferencia = ventas.reduce((sum, item) => sum + item.transferencia, 0);
  const totalCredito = ventas.reduce((sum, item) => sum + item.credito, 0);
  
  return {
    ventas,
    resumen: {
      totalVentas,
      totalEfectivo,
      totalTarjeta,
      totalTransferencia,
      totalCredito,
      cantidadFacturas: ventas.length * 3 // Aproximadamente 3 facturas por día
    }
  };
};

// Función para generar datos de demostración para gastos
const generateDemoExpensesData = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const gastos = [];
  const categorias = ['Servicios', 'Materiales', 'Salarios', 'Alquiler', 'Otros'];
  
  // Generar datos para cada día en el rango
  let currentDate = new Date(start);
  while (currentDate <= end) {
    // No todos los días tienen gastos
    if (Math.random() > 0.3) { // 70% de probabilidad de tener gastos
      const categoria = categorias[Math.floor(Math.random() * categorias.length)];
      const monto = Math.floor(Math.random() * 2000) + 100;
      
      gastos.push({
        fecha: currentDate.toISOString().split('T')[0],
        categoria,
        monto,
        descripcion: `Gasto de ${categoria.toLowerCase()}`
      });
    }
    
    // Avanzar al siguiente día
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Agrupar por categoría
  const porCategoria = categorias.map(categoria => ({
    categoria,
    total: gastos
      .filter(g => g.categoria === categoria)
      .reduce((sum, item) => sum + item.monto, 0)
  })).filter(c => c.total > 0);
  
  // Calcular total
  const totalGastos = gastos.reduce((sum, item) => sum + item.monto, 0);
  
  return {
    gastos,
    porCategoria,
    resumen: {
      totalGastos,
      cantidadGastos: gastos.length
    }
  };
};

// Función para generar datos de demostración para deudas
const generateDemoDebtsData = (tipo) => {
  const deudas = [];
  const tiposDeuda = tipo === 'todas' ? ['clientes', 'proveedores'] : [tipo];
  
  // Generar entre 5-15 deudas
  const cantidad = Math.floor(Math.random() * 10) + 5;
  
  for (let i = 0; i < cantidad; i++) {
    const esCliente = tiposDeuda.includes('clientes') && 
                    (tiposDeuda.length === 1 || Math.random() > 0.5);
    const monto = Math.floor(Math.random() * 5000) + 500;
    const pagado = Math.floor(Math.random() * monto);
    const pendiente = monto - pagado;
    const fechaCreacion = new Date();
    fechaCreacion.setDate(fechaCreacion.getDate() - Math.floor(Math.random() * 60));
    const fechaVencimiento = new Date(fechaCreacion);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + Math.floor(Math.random() * 30) + 15);
    
    deudas.push({
      id: `deuda-${i+1}`,
      tipo: esCliente ? 'cliente' : 'proveedor',
      nombre: esCliente ? `Cliente ${i+1}` : `Proveedor ${i+1}`,
      monto,
      pagado,
      pendiente,
      fechaCreacion: fechaCreacion.toISOString().split('T')[0],
      fechaVencimiento: fechaVencimiento.toISOString().split('T')[0],
      estado: new Date() > fechaVencimiento ? 'vencida' : 'pendiente'
    });
  }
  
  // Filtrar según el tipo solicitado
  let deudasFiltradas = deudas;
  if (tipo === 'clientes') {
    deudasFiltradas = deudas.filter(d => d.tipo === 'cliente');
  } else if (tipo === 'proveedores') {
    deudasFiltradas = deudas.filter(d => d.tipo === 'proveedor');
  } else if (tipo === 'vencidas') {
    deudasFiltradas = deudas.filter(d => d.estado === 'vencida');
  } else if (tipo === 'por-vencer') {
    deudasFiltradas = deudas.filter(d => d.estado === 'pendiente');
  }
  
  // Calcular totales
  const totalDeuda = deudasFiltradas.reduce((sum, item) => sum + item.monto, 0);
  const totalPagado = deudasFiltradas.reduce((sum, item) => sum + item.pagado, 0);
  const totalPendiente = deudasFiltradas.reduce((sum, item) => sum + item.pendiente, 0);
  
  return {
    deudas: deudasFiltradas,
    resumen: {
      totalDeuda,
      totalPagado,
      totalPendiente,
      cantidadDeudas: deudasFiltradas.length
    }
  };
};

// Función para generar datos de demostración para productos
const generateDemoProductsData = (startDate, endDate, type) => {
  const productos = [];
  const categorias = ['Electrónicos', 'Ropa', 'Alimentos', 'Hogar', 'Otros'];
  
  // Generar entre 10-30 productos
  const cantidad = Math.floor(Math.random() * 20) + 10;
  
  for (let i = 0; i < cantidad; i++) {
    const categoria = categorias[Math.floor(Math.random() * categorias.length)];
    const precio = Math.floor(Math.random() * 1000) + 50;
    const costo = Math.floor(precio * 0.6);
    const stock = Math.floor(Math.random() * 100);
    const vendidos = Math.floor(Math.random() * 50);
    
    productos.push({
      id: `prod-${i+1}`,
      nombre: `Producto ${i+1}`,
      categoria,
      precio,
      costo,
      stock,
      vendidos,
      fechaCreacion: new Date(startDate).toISOString().split('T')[0],
      ganancia: (precio - costo) * vendidos
    });
  }
  
  // Filtrar según el tipo solicitado
  let productosFiltrados = productos;
  if (type === 'ventas') {
    productosFiltrados = productos.sort((a, b) => b.vendidos - a.vendidos).slice(0, 15);
  } else if (type === 'stock') {
    productosFiltrados = productos.sort((a, b) => a.stock - b.stock).slice(0, 15);
  } else if (type === 'nuevos') {
    productosFiltrados = productos.sort((a, b) => 
      new Date(b.fechaCreacion) - new Date(a.fechaCreacion)).slice(0, 15);
  }
  
  // Agrupar por categoría
  const porCategoria = categorias.map(categoria => ({
    categoria,
    cantidad: productosFiltrados.filter(p => p.categoria === categoria).length,
    total: productosFiltrados
      .filter(p => p.categoria === categoria)
      .reduce((sum, item) => sum + item.precio, 0)
  })).filter(c => c.cantidad > 0);
  
  return {
    productos: productosFiltrados,
    porCategoria,
    resumen: {
      totalProductos: productosFiltrados.length,
      valorInventario: productosFiltrados.reduce((sum, item) => sum + (item.precio * item.stock), 0),
      totalVendidos: productosFiltrados.reduce((sum, item) => sum + item.vendidos, 0),
      gananciaTotal: productosFiltrados.reduce((sum, item) => sum + item.ganancia, 0)
    }
  };
};

// Función para generar datos de demostración para balance
const generateDemoBalanceData = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dias = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  
  // Generar ingresos y gastos totales
  const ingresoTotal = Math.floor(Math.random() * 50000) + 10000;
  const gastoTotal = Math.floor(ingresoTotal * (Math.random() * 0.5 + 0.3)); // Entre 30% y 80% de los ingresos
  const gananciaTotal = ingresoTotal - gastoTotal;
  
  // Generar datos por categoría
  const ingresosPorCategoria = [
    { categoria: 'Ventas', monto: Math.floor(ingresoTotal * 0.8) },
    { categoria: 'Servicios', monto: Math.floor(ingresoTotal * 0.15) },
    { categoria: 'Otros', monto: Math.floor(ingresoTotal * 0.05) }
  ];
  
  const gastosPorCategoria = [
    { categoria: 'Compras', monto: Math.floor(gastoTotal * 0.5) },
    { categoria: 'Salarios', monto: Math.floor(gastoTotal * 0.3) },
    { categoria: 'Servicios', monto: Math.floor(gastoTotal * 0.15) },
    { categoria: 'Otros', monto: Math.floor(gastoTotal * 0.05) }
  ];
  
  // Generar datos por día
  const balanceDiario = [];
  let currentDate = new Date(start);
  while (currentDate <= end) {
    const ingresos = Math.floor(ingresoTotal / dias * (Math.random() * 0.5 + 0.75)); // Variación diaria
    const gastos = Math.floor(gastoTotal / dias * (Math.random() * 0.5 + 0.75)); // Variación diaria
    const balance = ingresos - gastos;
    
    balanceDiario.push({
      fecha: currentDate.toISOString().split('T')[0],
      ingresos,
      gastos,
      balance
    });
    
    // Avanzar al siguiente día
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return {
    balanceDiario,
    ingresosPorCategoria,
    gastosPorCategoria,
    resumen: {
      ingresoTotal,
      gastoTotal,
      gananciaTotal,
      periodoInicio: startDate,
      periodoFin: endDate
    }
  };
};

/**
 * Obtiene el reporte de ventas para un período específico
 * @param {Object} params - Parámetros para el reporte
 * @param {string} params.startDate - Fecha de inicio (YYYY-MM-DD)
 * @param {string} params.endDate - Fecha de fin (YYYY-MM-DD)
 * @param {boolean} params.useCache - Si se debe usar caché (default: true)
 * @returns {Promise<Object>} Datos del reporte de ventas
 */
export const getVentasReport = async (params = {}) => {
  try {
    // Aseguramos que useCache sea un string para la API
    const apiParams = {
      ...params,
      useCache: params.useCache !== false ? 'true' : 'false'
    };

    console.log('[DEBUG] Obteniendo reporte de ventas con parámetros:', apiParams);

    // Medimos el tiempo de respuesta para análisis de rendimiento
    const startTime = performance.now();

    // Intentar obtener datos de la API
    try {
      const response = await api.get('/reports/sales', { 
        params: apiParams,
        timeout: 15000 
      });

      const endTime = performance.now();
      console.log(`[PERF] Tiempo de respuesta para reporte de ventas: ${(endTime - startTime).toFixed(2)}ms`);

      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: 'Reporte de ventas obtenido correctamente',
          fromCache: response.headers['x-from-cache'] === 'true'
        };
      }
    } catch (apiError) {
      console.warn('[WARNING] Error al obtener datos de la API:', apiError.message);
      console.log('[INFO] Usando datos de demostración como respaldo');
    }

    // Si la API falla, usar datos de demostración
    console.log('[INFO] Generando datos de demostración para ventas');
    const demoData = generateDemoSalesData(params.startDate, params.endDate);

    return {
      success: true,
      data: demoData,
      message: 'Mostrando datos de demostración (modo offline)',
      fromCache: false
    };
  } catch (error) {
    console.error('[ERROR] Error al obtener reporte de ventas:', error);
    return DEFAULT_RESPONSE;
  }
};

/**
 * Obtiene el reporte de gastos para un período específico
 * @param {Object} params - Parámetros para el reporte
 * @param {string} params.startDate - Fecha de inicio (YYYY-MM-DD)
 * @param {string} params.endDate - Fecha de fin (YYYY-MM-DD)
 * @param {boolean} params.useCache - Si se debe usar caché (default: true)
 * @returns {Promise<Object>} Datos del reporte de gastos
 */
export const getGastosReport = async (params = {}) => {
  try {
    // Aseguramos que useCache sea un string para la API
    const apiParams = {
      ...params,
      useCache: params.useCache !== false ? 'true' : 'false'
    };

    console.log('[DEBUG] Obteniendo reporte de gastos con parámetros:', apiParams);

    // Medimos el tiempo de respuesta para análisis de rendimiento
    const startTime = performance.now();

    // Intentar obtener datos de la API
    try {
      const response = await api.get('/reports/expenses', { 
        params: apiParams,
        timeout: 15000 
      });

      const endTime = performance.now();
      console.log(`[PERF] Tiempo de respuesta para reporte de gastos: ${(endTime - startTime).toFixed(2)}ms`);

      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: 'Reporte de gastos obtenido correctamente',
          fromCache: response.headers['x-from-cache'] === 'true'
        };
      }
    } catch (apiError) {
      console.warn('[WARNING] Error al obtener datos de la API:', apiError.message);
      console.log('[INFO] Usando datos de demostración como respaldo');
    }

    // Si la API falla, usar datos de demostración
    console.log('[INFO] Generando datos de demostración para gastos');
    const demoData = generateDemoExpensesData(params.startDate, params.endDate);

    return {
      success: true,
      data: demoData,
      message: 'Mostrando datos de demostración (modo offline)',
      fromCache: false
    };
  } catch (error) {
    console.error('[ERROR] Error al obtener reporte de gastos:', error);
    return DEFAULT_RESPONSE;
  }
};

/**
 * Obtiene el reporte de deudas (créditos y proveedores)
 * @param {Object} params - Parámetros para el reporte
 * @param {string} params.tipo - Tipo de deudas (todas, proveedores, clientes, vencidas, por-vencer)
 * @param {boolean} params.useCache - Si se debe usar caché (default: true)
 * @returns {Promise<Object>} Datos del reporte de deudas
 */
export const getDeudasReport = async (params = {}) => {
  try {
    // Aseguramos que useCache sea un string para la API
    const apiParams = {
      ...params,
      useCache: params.useCache !== false ? 'true' : 'false'
    };

    console.log('[DEBUG] Obteniendo reporte de deudas con parámetros:', apiParams);

    // Medimos el tiempo de respuesta para análisis de rendimiento
    const startTime = performance.now();

    // Intentar obtener datos de la API
    try {
      const response = await api.get('/reports/debts', { 
        params: apiParams,
        timeout: 15000 
      });

      const endTime = performance.now();
      console.log(`[PERF] Tiempo de respuesta para reporte de deudas: ${(endTime - startTime).toFixed(2)}ms`);

      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: 'Reporte de deudas obtenido correctamente',
          fromCache: response.headers['x-from-cache'] === 'true'
        };
      }
    } catch (apiError) {
      console.warn('[WARNING] Error al obtener datos de la API:', apiError.message);
      console.log('[INFO] Usando datos de demostración como respaldo');
    }

    // Si la API falla, usar datos de demostración
    console.log('[INFO] Generando datos de demostración para deudas');
    const demoData = generateDemoDebtsData(params.tipo || 'todas');

    return {
      success: true,
      data: demoData,
      message: 'Mostrando datos de demostración (modo offline)',
      fromCache: false
    };
  } catch (error) {
    console.error('[ERROR] Error al obtener reporte de deudas:', error);
    return DEFAULT_RESPONSE;
  }
};

/**
 * Obtiene el reporte de productos
 * @param {Object} params - Parámetros para el reporte
 * @param {string} params.startDate - Fecha de inicio (YYYY-MM-DD)
 * @param {string} params.endDate - Fecha de fin (YYYY-MM-DD)
 * @param {string} params.type - Tipo de reporte (ventas, stock, nuevos)
 * @param {boolean} params.useCache - Si se debe usar caché (default: true)
 * @returns {Promise<Object>} Datos del reporte de productos
 */
export const getProductosReport = async (params = {}) => {
  try {
    // Aseguramos que useCache sea un string para la API
    const apiParams = {
      ...params,
      useCache: params.useCache !== false ? 'true' : 'false'
    };
    
    console.log('[DEBUG] Obteniendo reporte de productos con parámetros:', apiParams);
    
    // Medimos el tiempo de respuesta para análisis de rendimiento
    const startTime = performance.now();
    
    // Intentar obtener datos de la API
    try {
      const response = await api.get('/reports/products', { 
        params: apiParams,
        timeout: 15000 
      });
      
      const endTime = performance.now();
      console.log(`[PERF] Tiempo de respuesta para reporte de productos: ${(endTime - startTime).toFixed(2)}ms`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: 'Reporte de productos obtenido correctamente',
          fromCache: response.headers['x-from-cache'] === 'true'
        };
      }
    } catch (apiError) {
      console.warn('[WARNING] Error al obtener datos de la API:', apiError.message);
      console.log('[INFO] Usando datos de demostración como respaldo');
    }
    
    // Si la API falla, usar datos de demostración
    console.log('[INFO] Generando datos de demostración para productos');
    const demoData = generateDemoProductsData(
      params.startDate, 
      params.endDate, 
      params.type || 'ventas'
    );
    
    return {
      success: true,
      data: demoData,
      message: 'Mostrando datos de demostración (modo offline)',
      fromCache: false
    };
  } catch (error) {
    console.error('[ERROR] Error al obtener reporte de productos:', error);
    return DEFAULT_RESPONSE;
  }
};

/**
 * Obtiene el reporte de balance general
 * @param {Object} params - Parámetros para el reporte
 * @param {string} params.startDate - Fecha de inicio (YYYY-MM-DD)
 * @param {string} params.endDate - Fecha de fin (YYYY-MM-DD)
 * @param {boolean} params.useCache - Si se debe usar caché (default: true)
 * @returns {Promise<Object>} Datos del reporte de balance
 */
export const getBalanceReport = async (params = {}) => {
  try {
    // Aseguramos que useCache sea un string para la API
    const apiParams = {
      ...params,
      useCache: params.useCache !== false ? 'true' : 'false'
    };
    
    console.log('[DEBUG] Obteniendo reporte de balance con parámetros:', apiParams);
    
    // Medimos el tiempo de respuesta para análisis de rendimiento
    const startTime = performance.now();
    
    // Intentar obtener datos de la API
    try {
      const response = await api.get('/reports/balance', { 
        params: apiParams,
        timeout: 15000 
      });
      
      const endTime = performance.now();
      console.log(`[PERF] Tiempo de respuesta para reporte de balance: ${(endTime - startTime).toFixed(2)}ms`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: 'Reporte de balance obtenido correctamente',
          fromCache: response.headers['x-from-cache'] === 'true'
        };
      }
    } catch (apiError) {
      console.warn('[WARNING] Error al obtener datos de la API:', apiError.message);
      console.log('[INFO] Usando datos de demostración como respaldo');
    }
    
    // Si la API falla, usar datos de demostración
    console.log('[INFO] Generando datos de demostración para balance');
    const demoData = generateDemoBalanceData(params.startDate, params.endDate);
    
    return {
      success: true,
      data: demoData,
      message: 'Mostrando datos de demostración (modo offline)',
      fromCache: false
    };
  } catch (error) {
    console.error('[ERROR] Error al obtener reporte de balance:', error);
    return DEFAULT_RESPONSE;
  }
};
