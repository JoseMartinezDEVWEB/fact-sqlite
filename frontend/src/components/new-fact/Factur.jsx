 
/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CreditCard, DollarSign, ArrowRightLeft, Plus, Minus, X, AlertCircle, Scale, Settings, Bug, AlertTriangle, Package } from 'lucide-react';
import axios from 'axios';
import { invoiceApi, cashRegisterApi } from '../../config/apis';
import BuscarProduct from './BuscarProduct';
import InvoicePreviewModal from './InvoicePreviewModal';
import BusinessInfoSettings from './BusinessInfoSettings';
import printJS from 'print-js';
import { API_ROUTES } from '../../config/config';
import { printInvoice, initializePrintSystem, getPrintStatus } from '../../utils/directPrintManager';
import PrinterManager from '../PrinterManager';
import ProductListDisplay from './ProductListDisplay';
import CashRegisterModal from '../CashRegisterModal';
import CarritoCompra from './CarritoCompra';
import PrintConfirmationModal from './PrintConfirmationModal';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://localhost:4000/api';

// Ajustar configuración de axios según las capacidades del backend
// Si el backend no soporta credenciales, no debemos habilitarlas
axios.defaults.withCredentials = false;

// Función mejorada para obtener token de autenticación
const getAuthToken = () => {
  // Intentar obtener el token con diferentes claves comunes
  const possibleKeys = ['auth_token', 'token', 'access_token', 'jwt_token', 'authToken'];
  let token = null;
  
  // Buscar en localStorage con diferentes claves
  for (const key of possibleKeys) {
    const storedToken = localStorage.getItem(key);
    if (storedToken) {
      console.log(`Token encontrado en localStorage con clave: ${key}`);
      token = storedToken;
      break;
    }
  }
  
  // Si no se encuentra en localStorage, intentar obtener desde sessionStorage
  if (!token) {
    for (const key of possibleKeys) {
      const storedToken = sessionStorage.getItem(key);
      if (storedToken) {
        console.log(`Token encontrado en sessionStorage con clave: ${key}`);
        token = storedToken;
        break;
      }
    }
  }
  
  // Si aún no hay token, verificar si hay cookies con el token
  if (!token && document.cookie) {
    console.log('Buscando token en cookies...');
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (possibleKeys.includes(name)) {
        console.log(`Token encontrado en cookies con nombre: ${name}`);
        token = decodeURIComponent(value);
        break;
      }
    }
  }
  
  if (!token) {
    // console.warn('No se encontró token de autenticación en ninguna ubicación común');
  } else {
    console.log('Token encontrado, formato:', token.substring(0, 15) + '...');
  }
  
  return token;
};

// Variables globales para el manejo de refreshing
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Función auxiliar para obtener valor de una cookie
function getCookieValue(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Configuración del cliente axios con interceptores mejorados
axios.interceptors.request.use(config => {
  const token = getAuthToken();
  if (token) {
    // Formato correcto para enviar el token
    if (token.startsWith('Bearer ')) {
      config.headers.Authorization = token;
    } else if (token.startsWith('Basic ')) {
      config.headers.Authorization = token;
    } else if (token.startsWith('JWT ')) {
      config.headers.Authorization = token;
    } else {
      // Asumir que es un token JWT sin prefijo
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Token configurado en cabecera:', config.headers.Authorization.substring(0, 20) + '...');
  } else {
    // Verificar si el token está disponible en una cookie específica
    const cookieValue = getCookieValue('auth_token') || getCookieValue('token');
    if (cookieValue) {
      config.headers.Authorization = `Bearer ${cookieValue}`;
      console.log('Token configurado desde cookie:', config.headers.Authorization.substring(0, 20) + '...');
    }
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Interceptor de respuesta con manejo de refresh token
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config || {};
    const url = originalRequest.url || '';
    // No aplicar refresh token en endpoints de autenticación
    if (url.includes('/auth/login') || url.includes('/auth/refresh-token') || url.includes('/auth/check-session')) {
      return Promise.reject(error);
    }
    
    // Solo intentar refresh si es error 401 y no hemos intentado ya
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Si ya estamos en proceso de refresh, encolar esta petición
      if (isRefreshing) {
        try {
          const token = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return axios(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }
      
      // Marcar esta petición como retry y activar flag de refreshing
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        // Intentar obtener un nuevo token
        const refreshTokenValue = localStorage.getItem('refreshToken');
        if (!refreshTokenValue) {
          throw new Error('No hay refresh token disponible');
        }
        
        console.log('Intentando refrescar token...');
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken: refreshTokenValue
        }, {
          headers: {
            Authorization: null // No enviar el token expirado
          }
        });
        
        // Guardar nuevo token y actualizar configuración
        if (data && data.token) {
          console.log('Token refrescado exitosamente');
          localStorage.setItem('token', data.token);
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          
          // Procesar cola con éxito
          processQueue(null, data.token);
          
          // Reintentar petición original con nuevo token
          originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
          return axios(originalRequest);
        } else {
          throw new Error('Respuesta inválida al refrescar token');
        }
      } catch (refreshError) {
        console.error('Error al refrescar token:', refreshError);
        
        // Limpiar tokens solo si hay un error real de autenticación
        if (refreshError.response?.status === 401 || 
            refreshError.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          
          // Procesar cola con error
          processQueue(refreshError, null);
          
          // Opcional: redirigir a login solo si es necesario
          console.warn('Sesión expirada. Considere iniciar sesión nuevamente.');
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Si no es 401 o ya intentamos refresh, simplemente rechazar
    return Promise.reject(error);
  }
);

// Custom hook para manejar productos
const useProducts = () => {
  const [productError, setProductError] = useState('');
  
  const fetchProductByBarcode = useCallback(async (barcode) => {
    try {
      if (!barcode?.trim()) return null;
      
      console.log('Buscando producto por código:', barcode);
      const { data } = await axios.get(`${API_URL}/products/barcode/${barcode}`);
      return data || null;
    } catch (error) {
      console.error('Error al buscar por código de barras:', error);
      setProductError(`No se pudo encontrar el producto: ${error.response?.data?.message || error.message}`);
      return null;
    }
  }, []);

  // Función modificada para evitar el error 500
  const fetchProductByName = useCallback(async (name) => {
    try {
      if (!name?.trim()) return null;
      
      console.log('Buscando producto por nombre:', name);
      
      // SOLUCIÓN PARA EVITAR ERROR 500: Usar método alternativo en lugar del endpoint problemático
      try {
        // Obtener todos los productos y filtrar en el cliente
        const allProductsResponse = await axios.get(`${API_URL}/products`, {
          timeout: 15000, // Mayor timeout para obtener todos los productos
        });
        
        console.log('Obteniendo todos los productos para búsqueda local');
        
        // Extraer productos según la estructura de respuesta
        let allProducts = [];
        if (Array.isArray(allProductsResponse.data)) {
          allProducts = allProductsResponse.data;
        } else if (allProductsResponse.data && Array.isArray(allProductsResponse.data.products)) {
          allProducts = allProductsResponse.data.products;
        } else if (allProductsResponse.data && allProductsResponse.data.data && Array.isArray(allProductsResponse.data.data)) {
          allProducts = allProductsResponse.data.data;
        }
        
        // Filtrar productos localmente
        const searchTermLower = name.trim().toLowerCase();
        const filteredProducts = allProducts.filter(product => 
          product.name?.toLowerCase().includes(searchTermLower)
        );
        
        console.log(`Encontrados ${filteredProducts.length} productos mediante filtrado local`);
        
        // Devolver en formato adecuado para useProducts
        return { products: filteredProducts };
      } catch (err) {
        console.error('Error en búsqueda alternativa:', err);
        throw err; // Re-lanzar para manejo de errores principal
      }
    } catch (error) {
      console.error('Error al buscar por nombre:', error);
      setProductError(`No se pudo encontrar el producto: ${error.response?.data?.message || error.message}`);
      return null;
    }
  }, []);

  return { fetchProductByBarcode, fetchProductByName, productError };
};

const POSSystem = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [applyTax, setApplyTax] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [currentProduct, setCurrentProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualQuantity, setManualQuantity] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [customer, setCustomer] = useState({
    name: 'Cliente General',
    email: '',
    phone: '',
    address: ''
  });

  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState({ address: '', notes: '', messengerName: '' });

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [printerManagerOpen, setPrinterManagerOpen] = useState(false);
  const [cashRegisterOpen, setCashRegisterOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const [showProductList, setShowProductList] = useState(true);
  const [businessInfo, setBusinessInfo] = useState(() => {
    // Intentar cargar la configuración guardada
    const savedConfig = localStorage.getItem('business_invoice_config');
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (error) {
        console.error('Error al cargar configuración de negocio:', error);
      }
    }
    
    // Configuración por defecto
    return {
      name: "Mi Negocio",
      address: "Dirección del Negocio",
      phone: "123-456-7890",
      rnc: "123456789",
      slogan: "¡Calidad y servicio garantizado!",
      currency: "RD$",
      taxRate: 18,
      includeTax: true,
      footer: "¡Gracias por su compra!",
      additionalComment: ""
    };
  });

  // Cargar configuración de impresión desde localStorage
  const [printConfig, setPrintConfig] = useState(() => {
    // Intentar cargar la configuración guardada
    const savedConfig = localStorage.getItem('print_configuration_settings');
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (error) {
        console.error('Error al cargar configuración de impresión:', error);
      }
    }
    
    // Configuración por defecto
    return {
      paperSize: 'receipt',
      paperWidth: 80,
      paperHeight: 210,
      paperOrientation: 'portrait',
      includeTax: true,
      taxRate: 18,
      showCashier: true,
      printCopies: 1,
      marginTop: 5,
      marginRight: 5,
      marginBottom: 5,
      marginLeft: 5
    };
  });
  
  // Estado para guardar información del cajero
  const [cashierInfo, setCashierInfo] = useState(() => {
    // Intentar cargar la información del cajero desde localStorage
    const savedCashier = localStorage.getItem('currentUser');
    if (savedCashier) {
      try {
        return JSON.parse(savedCashier);
      } catch (error) {
        console.error('Error al cargar información del cajero:', error);
      }
    }
    
    // Si no hay información guardada, usar valores por defecto
    return {
      name: 'Cajero',
      role: 'Empleado'
    };
  });
  
  // Función para establecer manualmente el nombre del cajero
  const setCashierName = (name) => {
    const updatedCashier = { ...cashierInfo, name };
    setCashierInfo(updatedCashier);
    localStorage.setItem('currentUser', JSON.stringify(updatedCashier));
  };
  
  // Estado para el modal de impresión
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const { fetchProductByBarcode, fetchProductByName, productError } = useProducts();
  
  // Función de impresión optimizada para Electron
  const handlePrint = async () => {
    if (!currentInvoice) {
      setError('No hay datos de factura para imprimir');
      return;
    }

    // Validar datos críticos antes de imprimir
    if (!currentInvoice.items || currentInvoice.items.length === 0) {
      setError('No hay productos en la factura para imprimir');
      return;
    }

    if (!currentInvoice.totals || typeof currentInvoice.totals.total !== 'number') {
      setError('Los totales de la factura no son válidos');
      return;
    }

    try {
      setStatusMessage('Preparando impresión...');
      
      // Inicializar el sistema de impresión
      await initializePrintSystem();
      
      setStatusMessage('Configurando impresora...');
      
      // Preparar datos optimizados para el nuevo sistema
      const printData = {
        receiptNumber: currentInvoice.receiptNumber,
        items: currentInvoice.items.map(item => ({
          name: item.name,
          description: item.description || item.name,
          quantity: Number(item.quantity) || 1,
          price: Number(item.price || item.salePrice) || 0,
          unitPrice: Number(item.salePrice || item.price) || 0
        })),
        totals: {
          subtotal: Number(currentInvoice.totals.subtotal) || 0,
          tax: Number(currentInvoice.totals.tax) || 0,
          total: Number(currentInvoice.totals.total) || 0
        },
        company: {
          name: businessInfo?.name || 'Empresa',
          address: businessInfo?.address || '',
          rif: businessInfo?.rnc || '',
          phone: businessInfo?.phone || ''
        },
        client: {
          name: currentInvoice.isCredit ? 
            (currentInvoice.clientName || 'Cliente') : 
            (currentInvoice.customer?.name || 'Cliente General'),
          identification: currentInvoice.customer?.identification || ''
        },
        paymentMethod: currentInvoice.paymentMethod || 'cash',
        actualCashReceived: Number(currentInvoice.actualCashReceived) || 0,
        isCredit: currentInvoice.isCredit || false,
        clientName: currentInvoice.clientName
      };

      setStatusMessage('Enviando a impresora...');

      // Usar el nuevo sistema de impresión optimizado
      const printResult = await printInvoice(printData, {
        documentType: 'receipt',
        silent: printConfig?.silentPrint || false
      });
      
      if (printResult.success) {
        console.log(`✅ Factura impresa exitosamente en: ${printResult.printerUsed} (${printResult.printerType})`);

        // Si es factura fiada/crédito → imprimir segunda copia automáticamente
        if (currentInvoice?.isCredit) {
          setStatusMessage('Imprimiendo segunda copia (Compra Fiada)...');
          await new Promise(resolve => setTimeout(resolve, 1200));
          try {
            await printInvoice(printData, {
              documentType: 'receipt',
              silent: printConfig?.silentPrint || false
            });
            console.log('✅ Segunda copia de factura fiada impresa');
          } catch (secondCopyErr) {
            console.error('Error al imprimir segunda copia:', secondCopyErr);
          }
        }

        // Reset relevant states after successful print
        setPrintModalOpen(false);
        setCart([]);
        setPaymentMethod('');
        setCashReceived('');
        setCurrentProduct(null);
        setQuantity(1);
        setManualQuantity('');
        setSearchTerm('');
        setError(''); // Limpiar errores previos
        const copias = currentInvoice?.isCredit ? ' (2 copias - Compra Fiada)' : '';
        setStatusMessage(`✅ Factura impresa en ${printResult.printerUsed}${copias}`);
        setTimeout(() => setStatusMessage(''), 5000);
      } else {
        throw new Error(printResult.error || 'Error desconocido en impresión');
      }
    } catch (error) {
      console.error('❌ Error al imprimir:', error);
      setStatusMessage('');
      
      // Proporcionar mensajes de error más específicos
      let errorMessage = 'Error al imprimir: ';
      if (error.message.includes('microns') || error.message.includes('minimum')) {
        errorMessage += 'Problema de configuración de página. El sistema se ajustará automáticamente.';
      } else if (error.message.includes('printer')) {
        errorMessage += 'Problema con la impresora. Verifique que esté encendida y conectada.';
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage += 'Problema de conexión. Verifique la red.';
      } else if (error.message.includes('permission')) {
        errorMessage += 'Sin permisos para imprimir. Verifique la configuración.';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
      
      // Mantener el modal abierto para que el usuario pueda intentar de nuevo
      // setPrintModalOpen(false); // Comentado para permitir reintentos
    }
  };

  // Función para generar HTML optimizado para impresión
  const generateOptimizedInvoiceHTML = (invoiceData) => {
    // Validar que invoiceData existe y tiene las propiedades necesarias
    if (!invoiceData) {
      console.error('❌ No hay datos de factura para generar HTML');
      return '<html><body><h1>Error: No hay datos de factura</h1></body></html>';
    }

    // Asegurar que totals existe con valores por defecto
    const totals = invoiceData.totals || {};
    const safeSubtotal = Number(totals.subtotal) || 0;
    const safeTax = Number(totals.tax) || 0;
    const safeTotal = Number(totals.total) || 0;
    const safeCashReceived = Number(invoiceData.actualCashReceived) || 0;

    // Asegurar que businessInfo existe
    const safeBusinessInfo = businessInfo || {};

    const printData = {
      invoice: {
        invoiceNumber: invoiceData.receiptNumber || 'N/A',
        date: new Date(),
        subtotal: safeSubtotal,
        taxAmount: safeTax,
        total: safeTotal,
        cashReceived: safeCashReceived,
        taxRate: Number(safeBusinessInfo.taxRate) || 18
      },
      company: {
        name: safeBusinessInfo.name || 'Empresa',
        address: safeBusinessInfo.address || '',
        rif: safeBusinessInfo.rnc || '',
        phone: safeBusinessInfo.phone || '',
        email: safeBusinessInfo.email || '',
        slogan: safeBusinessInfo.slogan || ''
      },
      client: {
        name: invoiceData.isCredit ? (invoiceData.clientName || 'Cliente') : (invoiceData.customer?.name || 'Cliente General'),
        identification: invoiceData.customer?.identification || '',
        address: invoiceData.customer?.address || '',
        phone: invoiceData.customer?.phone || '',
        email: invoiceData.customer?.email || ''
      },
      items: (invoiceData.items || []).map(item => {
        const safeQuantity = Number(item.quantity) || 1;
        const safePrice = Number(item.price || item.salePrice) || 0;
        const safeUnitPrice = Number(item.salePrice || item.price) || 0;
        
        return {
          quantity: safeQuantity,
          name: item.name || 'Producto',
          description: item.description || item.name || 'Producto',
          price: safePrice,
          unitPrice: safeUnitPrice,
          details: item.weightInfo ? `${item.weightInfo.value || ''} ${item.weightInfo.unit || ''}` : ''
        };
      }),
      paymentMethod: invoiceData.paymentMethod || 'efectivo',
      observations: safeBusinessInfo.additionalComment || ''
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Factura ${printData.invoice.invoiceNumber}</title>
        <style>
          @page { 
            size: 80mm auto; 
            margin: 0; 
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            width: 80mm;
            max-width: 80mm;
            margin: 0 auto;
            padding: 5mm;
            box-sizing: border-box;
            line-height: 1.35;
            background: #ffffff;
            color: #000000;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 5px 0;
          }
          .company-info {
            font-size: 12px;
            margin: 2px 0;
          }
          .invoice-info {
            margin: 10px 0;
            font-size: 12px;
          }
          .client-info {
            margin: 10px 0;
            padding: 5px;
            border: 1px dashed #666;
            font-size: 12px;
          }
          .items {
            margin: 10px 0;
          }
          .item {
            margin: 5px 0;
            padding: 3px 0;
            border-bottom: 1px dotted #ccc;
            font-size: 12px;
          }
          .item-name {
            font-weight: bold;
          }
          .item-details {
            font-size: 11px;
            color: #666;
          }
          .totals {
            margin: 10px 0;
            padding-top: 10px;
            border-top: 1px solid #000;
            font-size: 13px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .total-final {
            font-weight: bold;
            font-size: 16px;
            border-top: 1px solid #000;
            padding-top: 5px;
          }
          .payment-info {
            margin: 10px 0;
            font-size: 12px;
            text-align: center;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 11px;
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${printData.company.name}</div>
          <div class="company-info">${printData.company.address}</div>
          <div class="company-info">RNC: ${printData.company.rif}</div>
          <div class="company-info">Tel: ${printData.company.phone}</div>
          ${printData.company.email ? `<div class="company-info">Email: ${printData.company.email}</div>` : ''}
          ${printData.company.slogan ? `<div class="company-info"><em>${printData.company.slogan}</em></div>` : ''}
        </div>

        <div class="invoice-info">
          <div><strong>FACTURA N°:</strong> ${printData.invoice.invoiceNumber}</div>
          <div><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-DO')}</div>
          <div><strong>Hora:</strong> ${new Date().toLocaleTimeString('es-DO')}</div>
          <div><strong>Cajero:</strong> ${localStorage.getItem('userName') || (cashierInfo && cashierInfo.name) || 'Cajero'}</div>
        </div>

        ${printData.client.name !== 'Cliente General' ? `
          <div class="client-info">
            <div><strong>Cliente:</strong> ${printData.client.name}</div>
            ${printData.client.identification ? `<div><strong>RNC/CI:</strong> ${printData.client.identification}</div>` : ''}
            ${printData.client.phone ? `<div><strong>Tel:</strong> ${printData.client.phone}</div>` : ''}
          </div>
        ` : ''}

        <div class="items">
          <div style="border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 5px; font-weight: bold;">
            PRODUCTOS
          </div>
          ${printData.items.map(item => `
            <div class="item">
              <div class="item-name">${item.description}</div>
              <div class="item-details">
                ${item.quantity} x $${item.unitPrice.toFixed(2)} = $${(item.quantity * item.unitPrice).toFixed(2)}
                ${item.details ? `<br><small>${item.details}</small>` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>$${printData.invoice.subtotal.toFixed(2)}</span>
          </div>
          ${printData.invoice.taxAmount > 0 ? `
          <div class="total-line">
            <span>ITBIS (${printData.invoice.taxRate}%):</span>
            <span>$${printData.invoice.taxAmount.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="total-line total-final">
            <span>TOTAL:</span>
            <span>$${printData.invoice.total.toFixed(2)}</span>
          </div>
        </div>

        ${printData.paymentMethod === 'cash' && printData.invoice.cashReceived > 0 ? `
          <div class="payment-info">
            <div><strong>Método:</strong> Efectivo</div>
            <div><strong>Recibido:</strong> $${printData.invoice.cashReceived.toFixed(2)}</div>
            <div><strong>Cambio:</strong> $${(printData.invoice.cashReceived - printData.invoice.total).toFixed(2)}</div>
          </div>
        ` : printData.paymentMethod === 'credit' ? `
          <div class="payment-info">
            <div><strong>COMPRA FIADA</strong></div>
            <div>Cliente: ${printData.client.name}</div>
          </div>
        ` : `
          <div class="payment-info">
            <div><strong>Método:</strong> ${
              printData.paymentMethod === 'credit_card' ? 'Tarjeta' :
              printData.paymentMethod === 'bank_transfer' ? 'Transferencia' :
              printData.paymentMethod
            }</div>
          </div>
        `}

        ${printData.observations ? `
          <div style="margin: 10px 0; font-size: 11px; text-align: center;">
            <strong>Observaciones:</strong><br>
            ${printData.observations}
          </div>
        ` : ''}

        <div class="footer">
          <div>¡Gracias por su compra!</div>
          <div>Impreso: ${new Date().toLocaleString('es-DO')}</div>
        </div>
      </body>
      </html>
    `;
  };

  // Efecto inicial para verificar estado de auth y preparar sesión
  useEffect(() => {
    const verifyTokenAndPrepare = async () => {
      // Verificar si hay token y si parece válido
      const token = getAuthToken();
      
      if (token) {
        console.log('Token encontrado, intentando usarlo directamente');
        // En lugar de hacer una verificación que puede fallar, confiamos en el token existente
        setStatusMessage('Sesión activa');
        setTimeout(() => setStatusMessage(''), 2000);

        // Guardar información del cajero actual en localStorage si no existe
        if (!localStorage.getItem('currentUser')) {
          try {
            // Intentar obtener la información del usuario actual
            const userResponse = await axios.get(API_ROUTES.AUTH.USER_INFO);
            if (userResponse && userResponse.data) {
              const userData = {
                name: userResponse.data.username || userResponse.data.name || 'Cajero',
                role: userResponse.data.role || 'Empleado'
              };
              localStorage.setItem('currentUser', JSON.stringify(userData));
              console.log('Información del cajero guardada en localStorage:', userData);
            }
          } catch (error) {
            console.error('Error al obtener información del cajero:', error);
            // Si falla, crear un usuario genérico para mostrar en la factura
            const defaultUser = { name: 'Cajero', role: 'Empleado' };
            localStorage.setItem('currentUser', JSON.stringify(defaultUser));
          }
        }
      } else {
        console.warn('No se encontró token. Intentando estrategias alternativas...');
        
        // Intento 1: Buscar token en cookies específicas del backend
        const jwtFromCookie = getCookieValue('jwt') || getCookieValue('auth');
        if (jwtFromCookie) {
          console.log('Token encontrado en cookie, guardándolo en localStorage');
          localStorage.setItem('auth_token', jwtFromCookie);
          setStatusMessage('Sesión recuperada desde cookie');
          setTimeout(() => setStatusMessage(''), 2000);
          return;
        }
        
        // Intento 2: Verificar si hay una sesión activa mediante una petición al backend
        try {
          const response = await axios.get(`${API_URL}/auth/check-session`, {
            withCredentials: true // Importante para enviar cookies si existen
          });
          
          if (response.data && response.data.token) {
            console.log('Sesión verificada por el servidor, recibido nuevo token');
            localStorage.setItem('auth_token', response.data.token);
            if (response.data.refreshToken) {
              localStorage.setItem('refresh_token', response.data.refreshToken);
            }
            setStatusMessage('Sesión verificada con éxito');
            setTimeout(() => setStatusMessage(''), 2000);
          }
        } catch (error) {
          console.error('No se pudo verificar la sesión:', error);
          // No mostramos error al usuario para no interrumpir la experiencia
        }
      }
    };
    
    verifyTokenAndPrepare();
  }, []);
  
  // Cargar turno de caja al inicio
  useEffect(() => {
    const loadShift = async () => {
      try {
        const data = await cashRegisterApi.getCurrentShift();
        setCurrentShift(data.hasOpenShift ? data.shift : null);
      } catch (err) {
        console.error('Error al cargar turno:', err);
      }
    };
    loadShift();
  }, []);

  // Limpiar error de "DEBE ABRIR CAJA" cuando el turno se detecta/actualiza
  useEffect(() => {
    if (currentShift && error === 'DEBE ABRIR CAJA ANTES DE REALIZAR UNA VENTA') {
      setError('');
    }
  }, [currentShift, error]);
  
  // Actualizar error cuando cambia productError
  useEffect(() => {
    if (productError) {
      setError(productError);
    }
  }, [productError]);

  const handleSearch = useCallback(async (event) => {
    if (event.key === 'Enter' && searchTerm) {
      setLoading(true);
      setError('');
      try {
        let product;
        
        // Si el input es solo números, buscar por código de barras
        if (/^\d+$/.test(searchTerm)) {
          product = await fetchProductByBarcode(searchTerm);
        } else {
          // Si es texto, buscar por nombre
          product = await fetchProductByName(searchTerm);
        }

        if (product) {
          setCurrentProduct(product);
          setQuantity(1);
          setManualQuantity('');
        } else {
          setError('Producto no encontrado');
        }
      } catch (err) {
        setError(`Error al buscar el producto: ${err.response?.data?.message || err.message}`);
      } finally {
        setSearchTerm('');
        setLoading(false);
      }
    }
  }, [searchTerm, fetchProductByBarcode, fetchProductByName]);

  const addToCart = useCallback((product, qty = 1) => {
    if (!product) return;
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === product._id);
      if (existingItem) {
        // Solo incrementamos la cantidad si NO es un producto por peso
        if (product.unitType !== 'peso') {
          return prevCart.map(item =>
            item._id === product._id
              ? { 
                  ...item, 
                  quantity: item.quantity + qty,
                  subtotal: (item.quantity + qty) * item.salePrice 
                }
              : item
          );
        }
      }
      return [...prevCart, { 
        ...product, 
        quantity: qty,
        subtotal: qty * product.salePrice 
      }];
    });
    
    setCurrentProduct(null);
    setQuantity(1);
    setManualQuantity('');
    setSearchTerm('');
  }, []);

  const handleManualQuantityChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setManualQuantity(value);
      if (value !== '') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && parsed > 0) setQuantity(parsed);
      }
    }
  };

  // Referencia para el botón de agregar al carrito
  const addToCartButtonRef = useRef(null);

  // Función para manejar el evento de teclado en el input de cantidad
  const handleQuantityKeyDown = (e) => {
    // Si se presiona Enter, mover el foco al botón de agregar al carrito
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevenir comportamiento predeterminado del Enter
      if (addToCartButtonRef.current) {
        addToCartButtonRef.current.focus();
      }
    }
  };

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Enter' && currentProduct && !event.shiftKey) {
        // Solo agregamos directamente productos que no son por peso
        if (currentProduct.unitType !== 'peso') {
          const qtyToAdd = manualQuantity ? parseFloat(manualQuantity) : quantity;
          addToCart(currentProduct, qtyToAdd);
        }
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [currentProduct, quantity, manualQuantity, addToCart]);

  // Calcular totales del carrito
  const calculateTotals = useCallback(() => {
    const subtotal = cart.reduce((sum, item) => {
      if (item.weightInfo) {
        // Para productos por peso
        return sum + (item.weightInfo.value * item.weightInfo.pricePerUnit);
      } else {
        // Para productos normales
        const price = parseFloat(item.salePrice) || 0;
        return sum + (price * item.quantity);
      }
    }, 0);
    
    const tax = applyTax ? subtotal * 0.18 : 0; // ITBIS 18%
    const total = subtotal + tax;
    
    // Asegurar que cashReceived sea tratado como número
    const cashAmount = parseFloat(cashReceived) || 0;
    // Calcular el cambio correctamente
    const change = Math.max(0, cashAmount - total);
    
    // Debug para verificar los valores
    console.log('DEBUG Factur - calculateTotals:', { 
      subtotal, 
      tax, 
      total, 
      cashReceived, 
      cashAmount, 
      change 
    });

    return { 
      subtotal, 
      tax, 
      total, 
      change, 
      cashReceived: cashAmount 
    };
  }, [cart, applyTax, cashReceived]);

  const updateQuantity = useCallback((productId, newQuantity) => {
    if (newQuantity < 1) {
      setCart(prevCart => prevCart.filter(item => item._id !== productId));
    } else {
      setCart(prevCart => prevCart.map(item =>
        item._id === productId
          ? { 
              ...item, 
              quantity: newQuantity,
              subtotal: newQuantity * item.salePrice 
            }
          : item
      ));
    }
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(prevCart => prevCart.filter(item => item._id !== productId));
  }, []);

  // Función para manejar la impresión con datos de la factura guardada
  const handlePrintInvoice = async (invoiceData) => {
    try {
      console.log('Preparando datos para impresión:', invoiceData);
      
      // Capturar el valor actual del efectivo
      const actualCashReceived = parseFloat(cashReceived) || 0;
      console.log('VALOR ACTUAL EFECTIVO:', actualCashReceived);
      
      // Determinar si es una compra fiada
      const isCredit = invoiceData.isCredit || 
                      invoiceData.paymentMethod === 'credit' || 
                      paymentMethod === 'credit';
      
      // Extraer o determinar el nombre del cliente para compras fiadas
      const clientName = invoiceData.clientName || 
                        (invoiceData.clientInfo?.name) ||
                        (isCredit && paymentDetails?.clientName) || null;
      
      // Obtener el número de recibo
      const receiptNumber = invoiceData.receiptNumber || 
                            `FAC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${(invoiceData._id || '').substring(0, 4)}`;
      
      // Añadir la fecha si no existe
      const currentDate = invoiceData.date || new Date().toISOString();
      
      // Importante: Asegurar que tengamos la información de pago correcta
      let paymentDetailsToUse = invoiceData.paymentDetails || {};
      let totalsToUse = { ...calculateTotals() };
      
      // CORRECCIÓN CRÍTICA: Si es compra fiada, no debe tener valores de efectivo
      if (isCredit) {
        // Asegurar que no hay valores de efectivo en compras fiadas
        paymentDetailsToUse = {
          clientId: paymentDetailsToUse.clientId || paymentDetails.clientId,
          clientName: paymentDetailsToUse.clientName || paymentDetails.clientName
          // No incluir received o change en compras a crédito
        };
        
        // Limpiar valores de efectivo en los totales
        totalsToUse.cashReceived = 0;
        totalsToUse.change = 0;
        
        console.log('FIADO - Sin valores de efectivo', totalsToUse);
      }
      // Si estamos creando una nueva factura de efectivo, usar los valores actuales
      else if (paymentMethod === 'cash' && !invoiceData.paymentDetails) {
        // Usar el valor actual del efectivo capturado
        paymentDetailsToUse = {
          received: actualCashReceived,
          change: totalsToUse.change
        };
        
        // Asegurar que los totales incluyen los montos correctos
        totalsToUse.cashReceived = actualCashReceived;
        totalsToUse.change = Math.max(0, actualCashReceived - totalsToUse.total);
        
        console.log('DATOS EFECTIVO CALCULADOS:', {
          efectivoRecibido: actualCashReceived,
          cambio: totalsToUse.change,
          total: totalsToUse.total
        });
      } else if (invoiceData.paymentDetails) {
        // Si ya tenemos detalles de pago en la factura, usarlos
        totalsToUse.cashReceived = invoiceData.paymentDetails.received;
        totalsToUse.change = invoiceData.paymentDetails.change;
      }
      
      // Configurar los datos completos para el modal de impresión
      const printData = {
        ...invoiceData,
        receiptNumber,
        isCredit,
        clientName,
        date: currentDate,
        // Asegurar que tenemos el método de pago correcto
        paymentMethod: invoiceData.paymentMethod || paymentMethod,
        // Añadir información del cajero actual si está disponible
        cashierName: localStorage.getItem('currentUser') 
          ? JSON.parse(localStorage.getItem('currentUser')).name 
          : 'No identificado',
        // Asegurar que la información de pago esté incluida
        paymentDetails: paymentDetailsToUse,
        // Incluir los totales correctos
        totals: totalsToUse,
        // Incluir directamente el monto de efectivo para evitar dependencias
        actualCashReceived: isCredit ? 0 : actualCashReceived,
        // Incluir si se aplica impuesto
        applyTax: invoiceData.applyTax !== undefined ? invoiceData.applyTax : applyTax,
        taxAmount: totalsToUse.tax
      };
      
      // Guardar los datos de la factura actual para el modal
      setCurrentInvoice(printData);
      
      // Para forzar un valor en el estado local y asegurar que se use en el componente de impresión
      // Solo actualizar el efectivo si no es una compra fiada
      if (!isCredit) {
        setCashReceived(actualCashReceived.toString());
      } else {
        // Para compras fiadas, limpiar cualquier valor de efectivo
        setCashReceived('');
      }
      
      // Registrar por consola los detalles relevantes
      console.log('Datos de impresión preparados:', {
        receiptNumber,
        isCredit,
        clientName,
        paymentMethod: printData.paymentMethod || paymentMethod,
        paymentDetails: printData.paymentDetails,
        totals: totalsToUse,
        actualCashReceived: isCredit ? 0 : actualCashReceived
      });
      
      // Comprobar configuración de impresión automática
      const shouldPrintAutomatically = printConfig.autoPrint;
      
      if (shouldPrintAutomatically) {
        // Abrir el modal de confirmación
        setPrintModalOpen(true);
      } else {
        // Ir directamente a la vista previa
        setPreviewModalOpen(true);
      }
      
      return true;
    } catch (error) {
      console.error('Error al preparar impresión:', error);
      setError('Error al preparar la impresión. Intente nuevamente.');
      return false;
    }
  };

  // Función para procesar el pago
  const processPayment = async () => {
    // RESTRICCIÓN: Solo permitir procesar pago si hay un turno de caja abierto.
    // Si el estado local es null, consultar el servidor antes de rechazar
    // (puede haber un turno abierto que el estado local no refleja).
    let activeShift = currentShift;
    if (!activeShift) {
      try {
        const data = await cashRegisterApi.getCurrentShift();
        if (data.hasOpenShift && data.shift) {
          activeShift = data.shift;
          setCurrentShift(data.shift); // actualizar estado local
        }
      } catch (fetchErr) {
        console.error('Error al verificar turno:', fetchErr);
      }
    }
    if (!activeShift) {
      setError('DEBE ABRIR CAJA ANTES DE REALIZAR UNA VENTA');
      setCashRegisterOpen(true);
      return;
    }

    let invoiceData = null;
    const { subtotal, tax, total, change, cashReceived: cashAmount } = calculateTotals();

    const isCredit = paymentMethod === 'credit';
    
    // Validación específica por método de pago
    if (!paymentMethod && !isCredit) {
      setError('Seleccione un método de pago');
      return;
    }
    
    if (paymentMethod === 'cash' && cashAmount < total) {
      setError('El monto recibido es insuficiente');
      return;
    }
    
    // Verificar referencia para transferencias bancarias
    if (paymentMethod === 'bank_transfer' && !paymentDetails.transactionId) {
      setError('Ingrese el número de referencia de la transferencia');
      return;
    }

    if (cart.length === 0) {
      setError('El carrito está vacío');
      return;
    }

    setLoading(true);
    setError('');
    setStatusMessage('');
    
    try {
      // Verificar token antes de continuar
      const token = getAuthToken();
      
      if (!token) {
        console.warn('Intentando procesar pago sin token explícito.');
      } else {
        console.log('Procesando pago con token:', token.substring(0, 15) + '...');
      }
      
      // Adaptar el formato de datos para que coincida con lo esperado por el backend
      invoiceData = {
        customer: {
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          address: customer.address || ''
        },
        // Campos para compra fiada
        isCredit: isCredit,
        clienteId: isCredit ? paymentDetails.clientId : null,
        clientInfo: isCredit ? {
          id: paymentDetails.clientId,
          name: paymentDetails.clientName
        } : null,
        items: cart.map(item => {
          const itemData = {
            product: item._id,
            quantity: item.quantity,
            price: item.salePrice || item.price,
            name: item.name,
            subtotal: item.weightInfo 
              ? (item.weightInfo.value * item.weightInfo.pricePerUnit) 
              : (item.quantity * (item.salePrice || item.price))
          };

          // Si es un producto por peso, añadimos la información del peso
          if (item.weightInfo) {
            itemData.weightInfo = {
              value: item.weightInfo.value,
              unit: item.weightInfo.unit,
              pricePerUnit: item.weightInfo.pricePerUnit
            };
          }
          
          return itemData;
        }),
        // Convertir 'card' a 'credit_card' y 'bank_transfer' para coincidir con el modelo del backend
        paymentMethod: paymentMethod === 'card' ? 'credit_card' : paymentMethod === 'bank_transfer' ? 'bank_transfer' : paymentMethod || 'credit',
        
        // IMPORTANTE: Configurar correctamente los detalles de pago según el método
        paymentDetails: isCredit 
          ? { // Detalles para pago a crédito
              clientId: paymentDetails.clientId,
              clientName: paymentDetails.clientName,
              // No incluir received o change en compras a crédito
            } 
          : paymentMethod === 'cash' 
            ? { // Detalles para pago en efectivo
                received: cashAmount,
                change: change
              } 
            : paymentMethod === 'bank_transfer'
              ? { // Detalles para transferencia bancaria
                  transactionId: paymentDetails.cardNumber || '',  // Usar el número de referencia
                  amount: paymentDetails.transferAmount || total
                }
              : paymentMethod === 'credit_card'
                ? { // Detalles para tarjeta de crédito
                    cardLastFour: paymentDetails.cardNumber?.slice(-4) || '0000',
                    authorizationCode: paymentDetails.authorizationCode || '',
                    transactionId: paymentDetails.transactionId || ''
                  }
                : paymentDetails, // Otros métodos de pago
            
        subtotal,
        taxAmount: tax,
        total,
        date: new Date().toISOString(),
        isDelivery: isDelivery,
        deliveryInfo: isDelivery ? deliveryInfo : null
      };

      console.log('Enviando datos de factura:', invoiceData);
      
      // Usar la API centralizada en lugar de axios directo
      const response = await invoiceApi.create(invoiceData);
      
      console.log('Respuesta del servidor:', response);
      
      if (response && (response._id || response.id)) {
        console.log('Factura creada exitosamente:', response);
        
        // Mostrar mensaje específico según el tipo de venta
        if (invoiceData.isCredit) {
          setStatusMessage(`Compra fiada procesada exitosamente para ${paymentDetails.clientName}`);
        } else {
          setStatusMessage('Venta procesada exitosamente');
        }
        
        // Generar número de recibo
        const receiptNumber = `FAC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${(response._id || response.id || '').substring(0, 4)}`;
        
        // Armar datos completos de la factura para impresión
        setCurrentInvoice({
          // Detalles del cliente e ítems
          customer: invoiceData.customer,
          items: invoiceData.items,
          // Totales calculados
          totals: { subtotal, tax, total, change },
          paymentMethod: invoiceData.paymentMethod || paymentMethod,
          // Número de factura
          receiptNumber,
          // Indicador de crédito
          isCredit: invoiceData.isCredit,
          // Nombre de cliente en compras fiadas
          clientName: invoiceData.isCredit ? paymentDetails.clientName : 'Cliente General',
          // Efectivo recibido si aplica
          actualCashReceived: invoiceData.isCredit ? 0 : cashAmount,
          // Agregar estos campos para que InvoicePreviewModal pueda accederlos directamente
          cashReceived: invoiceData.isCredit ? 0 : cashAmount,
          change: change,
          // Añadir indicador de si se aplica impuesto
          applyTax: applyTax,
          taxAmount: tax,
          paymentDetails: {
            ...paymentDetails,
            received: invoiceData.isCredit ? 0 : cashAmount,
            change: change
          }
        });
        
        // Open confirmation modal for print
        setPrintModalOpen(true);
      } else {
        setError('Error: No se recibió confirmación completa de la factura');
        console.error('Respuesta incompleta del servidor:', response);
      }
    } catch (err) {
      console.error('Error completo al procesar la venta:', err);
      
      if (err.response) {
        console.error('Detalles del error del servidor:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        
        // Log de datos enviados para diagnóstico
        console.error('Datos enviados al servidor:', {
          paymentMethod: invoiceData.paymentMethod,
          paymentDetails: invoiceData.paymentDetails,
          isCredit: invoiceData.isCredit
        });
        
        if (err.response.status === 401) {
          setError('Error de autenticación. Verifica tu sesión o actualiza la página.');
        } else if (err.response.status === 400) {
          setError(`Error: ${err.response.data?.message || 'Error de validación'}`);
        } else if (err.response.status === 404) {
          setError(`Error: ${err.response.data?.message || 'Recurso no encontrado'}`);
        } else if (err.response.status === 500) {
          setError(`Error interno del servidor: ${err.response.data?.message || 'Contacte al administrador'}`);
        } else {
          setError(`Error al procesar el pago: ${err.response.data?.message || err.message}`);
        }
      } else {
        setError(`Error al procesar el pago: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Handler para cerrar el modal sin imprimir
  const handleCloseModal = () => {
    setPrintModalOpen(false);
    
    // Limpiar completamente el estado del carrito y la compra
    setCart([]);
    setPaymentMethod('');
    setCashReceived('');
    setCurrentProduct(null);
    setQuantity(1);
    setManualQuantity('');
    setSearchTerm('');
    
    // También resetear la selección de cliente fiado
    if (setSelectedClient) {
      setSelectedClient(null);
    }
    
    // Resetear los detalles de pago
    setPaymentDetails({
      cardNumber: '',
      authorizationCode: '',
      transactionId: '',
      clientId: null,
      clientName: null
    });
    
    // Resetear delivery
    setIsDelivery(false);
    setDeliveryInfo({ address: '', notes: '', messengerName: '' });

    // Resetear el estado de la factura actual
    setCurrentInvoice(null);
  };

  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    authorizationCode: '',
    transactionId: ''
  });

  const handleViewInvoice = () => {
    setPreviewModalOpen(true);
  };

  // Manejador para abrir modales de configuración de impresión o negocio
  const handleOpenSettings = (type = 'business') => {
    if (type === 'business') {
      setSettingsModalOpen(true);
    } else if (type === 'print') {
      setConfigModalOpen(true);
    }
  };

  // Add the missing handleSaveSettings function
  const handleSaveSettings = (newBusinessInfo) => {
    // Update the state with the new business info
    setBusinessInfo(newBusinessInfo);
    
    // Save to localStorage
    try {
      localStorage.setItem('business_invoice_config', JSON.stringify(newBusinessInfo));
      setStatusMessage('Configuración del negocio guardada correctamente');
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (error) {
      console.error('Error al guardar la configuración del negocio:', error);
      setError('No se pudo guardar la configuración. Intente nuevamente.');
    }
    
    // Close the settings modal
    setSettingsModalOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 w-full h-full">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #print-invoice-container, #print-invoice-container * { visibility: visible !important; }
        #print-invoice-container { position: absolute; top: 0; left: 0; width: 100%; }
      }`}</style>

      {/* Mensajes de estado/error */}
      {error && (
        <div className="fixed top-4 right-4 max-w-sm p-4 bg-red-100 border border-red-300 rounded shadow-lg z-50 flex items-start gap-2">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={20} />
          <div>
            <h4 className="font-semibold text-red-700">Error</h4>
            <p className="text-red-600">{error}</p>
          </div>
          <button 
            className="ml-auto text-gray-500 hover:text-gray-700"
            onClick={() => setError('')}
          >
            <X size={16} />
          </button>
        </div>
      )}


      
      {statusMessage && (
        <div className="fixed top-4 right-4 max-w-sm p-4 bg-green-100 border border-green-300 rounded shadow-lg z-50 flex items-start gap-2">
          <div className="text-green-600">{statusMessage}</div>
          <button 
            className="ml-auto text-gray-500 hover:text-gray-700"
            onClick={() => setStatusMessage('')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Sección de búsqueda y producto actual */}
      <div className="w-full md:w-3/5 flex flex-col min-h-0">
        {/* Título y botón activar lista productos */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Nueva Factura</h2>
            {(user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'encargado') && (
              <button
                onClick={() => setCashRegisterOpen(true)}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 text-sm font-bold ${
                  currentShift ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse'
                }`}
              >
                <span style={{ fontSize: '1.2rem' }}>🏧</span>
                <span>{currentShift ? 'Caja Abierta' : 'Abrir Caja'}</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setShowProductList(!showProductList)}
            className="bg-gray-800 text-white px-3 py-1.5 rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Package className="w-4 h-4" />
            <span>activar lista productos</span>
          </button>
        </div>

        {/* SOLUCIÓN: Reemplazar el input de búsqueda original por el componente BuscarProduct */}
        <div className="flex-shrink-0">
          <BuscarProduct
            onAddToCart={(product) => {
              if (product.weightInfo) {
                setCart(prevCart => [...prevCart, product]);
              } else {
                addToCart(product, product.quantity || 1);
              }
              setCurrentProduct(null);
              setSearchTerm('');
            }}
          />
        </div>

        {/* Lista de productos */}
        <ProductListDisplay
          isVisible={showProductList}
          onAddToCart={(product) => {
            // Si es un producto por peso, ya viene con weightInfo
            if (product.weightInfo) {
              setCart(prevCart => [...prevCart, product]);
            } else {
              // Para productos normales, usar la función addToCart existente
              addToCart(product, product.quantity || 1);
            }
            setCurrentProduct(null);
            setSearchTerm('');
          }}
        />

        {currentProduct && (
          <motion.div
          key={currentProduct._id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 border rounded shadow-sm"
        >
          {/* Mostrar interfaz diferente basado en si es producto por peso o no */}
          {currentProduct.unitType === 'peso' ? (
            <ProductWeightDisplay 
              product={currentProduct} 
              onAddToCart={(product) => {
                setCart(prevCart => [...prevCart, product]);
                setCurrentProduct(null);
                setSearchTerm('');
              }}
            />
          ) : (
            <>
              <h3 className="font-semibold">{currentProduct.name}</h3>
              <p className="text-sm text-gray-600">{currentProduct.description}</p>
              <p className="text-lg font-bold mt-2">
                ${parseFloat(currentProduct.salePrice || 0).toFixed(2)}
              </p>
              
              <div className="flex items-center gap-2 mt-4 w-full">
                <button
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700"
                  onClick={() => {
                    const cur = parseFloat(manualQuantity || quantity) || 1;
                    const next = Math.max(0.001, parseFloat((cur - 1).toFixed(3)));
                    setManualQuantity(String(next));
                    setQuantity(next);
                  }}
                >
                  <Minus size={18} />
                </button>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-20 text-center border border-gray-300 rounded-lg px-2 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={manualQuantity || quantity}
                  onChange={handleManualQuantityChange}
                  onKeyDown={handleQuantityKeyDown}
                  placeholder="Cant."
                />
                <button
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700"
                  onClick={() => {
                    const cur = parseFloat(manualQuantity || quantity) || 0;
                    const next = parseFloat((cur + 1).toFixed(3));
                    setManualQuantity(String(next));
                    setQuantity(next);
                  }}
                >
                  <Plus size={18} />
                </button>
                <button
                  ref={addToCartButtonRef}
                  className="flex-1 h-10 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => addToCart(currentProduct, parseFloat(manualQuantity || quantity))}
                >
                  Agregar al carrito
                </button>
              </div>
            </>
          )}
        </motion.div>
        )}
      </div>

      {/* Carrito, totales, método de pago - Usando el componente CarritoCompra */}
      <div className="w-full md:w-2/5">
        <CarritoCompra
          cart={cart}
          updateQuantity={updateQuantity}
          removeFromCart={removeFromCart}
          applyTax={applyTax}
          setApplyTax={setApplyTax}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          cashReceived={cashReceived}
          setCashReceived={setCashReceived}
          paymentDetails={paymentDetails}
          setPaymentDetails={setPaymentDetails}
          loading={loading}
          processPayment={processPayment}
          isDelivery={isDelivery}
          setIsDelivery={setIsDelivery}
          deliveryInfo={deliveryInfo}
          setDeliveryInfo={setDeliveryInfo}
        />



        {/* Botón para abrir gestor de impresoras - Solo visible para superadmin y admin */}
        {(user?.role === 'superadmin' || user?.role === 'admin') && (
          <div className="mt-4">
            <button
              onClick={() => setPrinterManagerOpen(true)}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Configurar Impresoras</span>
            </button>
          </div>
        )}


        {/* Modal de confirmación de impresión */}
        <PrintConfirmationModal
          isOpen={printModalOpen}
          onClose={handleCloseModal}
          onConfirm={handlePrint}
          onViewInvoice={handleViewInvoice}
          onConfigInvoice={() => handleOpenSettings('business')}
          invoiceNumber={currentInvoice?.receiptNumber || ''}
        />
      </div>

      {/* Modal de configuración */}
      <InvoicePreviewModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        onPrint={() => {}}
        invoiceData={currentInvoice}
        businessInfo={businessInfo}
        printConfig={printConfig}
        onSave={handleOpenSettings}
      />
      
      {/* Modal de vista previa */}
      <InvoicePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        onPrint={handlePrint}
        invoiceData={currentInvoice}
        businessInfo={businessInfo}
      />

      {/* Modal de configuración del negocio */}
      <BusinessInfoSettings
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onSave={handleSaveSettings}
        businessInfo={businessInfo}
      />

      {/* Gestor de Impresoras Inteligente */}
      <PrinterManager
        isOpen={printerManagerOpen}
        onClose={() => setPrinterManagerOpen(false)}
      />
      
      {/* Modal de Caja */}
      {cashRegisterOpen && (
        <CashRegisterModal 
          isOpen={cashRegisterOpen} 
          onClose={() => setCashRegisterOpen(false)}
          currentShift={currentShift}
          setCurrentShift={setCurrentShift}
        />
      )}
    </div>
  );
};

export default POSSystem;