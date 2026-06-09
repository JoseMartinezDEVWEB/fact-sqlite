/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { productApi, categoryApi, supplierApi } from '../../config/apis';
import ProductForm from '../../components/ProductForm';
import { ProductTable } from '../../components/ProductoTable';
import ProductosSummary from '../../components/ProductosSummary';
import ExcelImportModal from '../../components/ExcelImportModal';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import { excelImportService } from '../../services/excelImportService';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';

const Productos = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const canImport    = isSuperAdmin; // solo superadmin importa
  // Estado principal
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formLoading, setFormLoading] = useState(false); // Estado separado para el formulario
  const [providers, setProviders] = useState([]);
  
  // Estado de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showUnitProducts, setShowUnitProducts] = useState(true);
  
  // Estado de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Mostrar 10 productos por página
  
  // Estado de notificaciones
  const [notification, setNotification] = useState({ 
    show: false, 
    message: '', 
    type: 'success' 
  });

  // Mostrar notificación con auto-cierre
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false }), 3000);
  }, []);

  // Filtrar productos - usando useMemo para optimizar
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        product.name?.toLowerCase().includes(term) ||
        (product.barcode && product.barcode.toLowerCase().includes(term)) ||
        (product.unitBarcode && product.unitBarcode.toLowerCase().includes(term));

      const matchesCategory = !selectedCategory ||
        product.category?._id === selectedCategory ||
        String(product.categoryId) === String(selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Manejar cambio de página
  const handlePageChange = (newPage) => {
    // Asegurarse de que la página está dentro de los límites válidos
    const maxPage = Math.ceil(filteredProducts.length / pageSize);
    const validPage = Math.max(1, Math.min(newPage, maxPage));
    
    setCurrentPage(validPage);
    
    // Opcional: hacer scroll hacia arriba de la tabla
    window.scrollTo({
      top: document.getElementById('products-table-top')?.offsetTop || 0,
      behavior: 'smooth'
    });
  };

  // Manejar cambio de elementos por página
  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    setPageSize(newSize);
    setCurrentPage(1); // Volver a la primera página al cambiar el tamaño
  };

  // Cargar datos - usando useCallback para optimizar
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Verificar que haya un token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('No hay sesión activa. Por favor, inicia sesión nuevamente.', 'error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
      
      console.log('Cargando productos con showUnitProducts:', showUnitProducts);

      // Modificar la llamada API para obtener todos los productos
      // Si tu API soporta paginación en el servidor, podrías usarla aquí
      const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
        productApi.getAll(showUnitProducts),
        categoryApi.getAll(),
        supplierApi.getAll()
      ]);
  
      console.log('Products Response:', productsRes.data);
      
      // Normalizar: el backend devuelve { status, data: { products: [...], total } }
      // Axios envuelve en response.data, por lo que la cadena es:
      //   response.data  →  { status, data: { products, total } }
      //   response.data.data.products  →  el array real
      const raw = productsRes.data;
      const productsData = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data?.products)
          ? raw.data.products
          : Array.isArray(raw?.products)
            ? raw.products
            : [];

      const catRaw = categoriesRes.data;
      const categoriesData = Array.isArray(catRaw)
        ? catRaw
        : Array.isArray(catRaw?.data)
          ? catRaw.data
          : Array.isArray(catRaw?.data?.data)
            ? catRaw.data.data
            : [];
  
      setProducts(productsData);
      setCategories(categoriesData);
      
      const supRaw = suppliersRes;
      const providersData = Array.isArray(supRaw)
        ? supRaw
        : Array.isArray(supRaw?.data)
          ? supRaw.data
          : [];
      setProviders(providersData);
      
      // Resetear a la primera página cuando se cargan nuevos datos
      setCurrentPage(1);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      
      // Manejar diferentes tipos de errores
      if (error.response) {
        // El servidor respondió con un código de error
        if (error.response.status === 401) {
          showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
          setTimeout(() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }, 2000);
        } else if (error.response.status === 403) {
          showNotification('No tienes permisos para acceder a esta sección.', 'error');
        } else {
          showNotification(`Error al cargar los datos: ${error.response.data?.message || 'Error del servidor'}`, 'error');
        }
      } else if (error.request) {
        // La solicitud se hizo pero no se recibió respuesta
        showNotification('No se pudo conectar con el servidor. Verifica tu conexión a internet.', 'error');
      } else {
        // Error en la configuración de la solicitud
        showNotification(`Error al cargar los datos: ${error.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showNotification, showUnitProducts]);

  // Cargar datos al montar el componente y cuando cambia el filtro de unidades
  useEffect(() => {
    fetchData();
  }, [fetchData, showUnitProducts]);

  // Handlers para acciones de productos
  const handleCreate = () => {
    setSelectedProduct(null);
    setModalOpen(true);
  };

  // Handler para abrir el modal de importación de Excel
  const handleOpenImportModal = () => {
    setImportModalOpen(true);
  };

  // Eliminar todos los productos (solo superadmin)
  const handleDeleteAllProducts = async () => {
    setDeletingAll(true);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch('/api/products/delete-all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Error al eliminar');
      showNotification(`${data.data?.deletedCount || 0} productos eliminados correctamente`, 'success');
      setDeleteAllConfirm(false);
      // Recargar lista
      await fetchData();
    } catch (err) {
      showNotification(err.message || 'Error al eliminar productos', 'error');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleDelete = async (product) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      setLoading(true);
      try {
        await productApi.delete(product._id);
        showNotification('Producto eliminado exitosamente');
        await fetchData(); // Recargar datos después de eliminar
      } catch (error) {
        console.error('Error al eliminar producto:', error);
        showNotification('Error al eliminar el producto', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handler para importar productos desde Excel
  const handleImportProducts = async (file, options) => {
    setLoading(true);

    try {
      // Usar el servicio de importación de Excel
      const result = await excelImportService.importExcelFile(file, options);

      if (result.success) {
        showNotification(result.message || 'Productos importados correctamente', 'success');
        // Recargar la lista inmediatamente
        await fetchData();
      } else {
        showNotification(result.message || 'Error al importar productos', 'error');
      }

      // Normalizar: el modal espera { imported, total, skipped, errors, products } al nivel raíz
      const actualData = result?.data?.data || result?.data || {};
      return { ...actualData, success: result.success, message: result.message };
    } catch (error) {
      console.error('Error en la importación:', error);
      
      // Manejar diferentes tipos de errores
      if (error.response) {
        // El servidor respondió con un código de error
        if (error.response.status === 401) {
          showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
          setTimeout(() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }, 2000);
        } else if (error.response.status === 403) {
          showNotification('No tienes permisos para importar productos. Contacta al administrador.', 'error');
        } else {
          showNotification(`Error en la importación: ${error.response?.data?.message || error.message || 'Error del servidor'}`, 'error');
        }
      } else if (error.request) {
        // La solicitud se hizo pero no se recibió respuesta
        showNotification('No se pudo conectar con el servidor. Verifica tu conexión a internet.', 'error');
      } else {
        // Error en la configuración de la solicitud
        showNotification(`Error en la importación: ${error.message}`, 'error');
      }
      
      return {
        success: false,
        message: error.message || 'Error al importar productos'
      };
    } finally {
      setLoading(false);
    }
  };

  // Descargar listado de productos como Excel (solo superadmin)
  const handleDownloadProducts = useCallback(() => {
    if (!products.length) { alert('No hay productos para descargar.'); return; }

    const rows = products.map(p => ({
      'Nombre':          p.name       || '',
      'Código de Barras':p.barcode    || '',
      'Tipo':            p.unitType   || 'unidad',
      'Categoría':       p.category?.name || p.categoryId || '',
      'Proveedor':       p.provider   || '',
      'Stock':           p.quantity   ?? 0,
      'Stock Mínimo':    p.minStock   ?? 10,
      'Precio Compra':   p.purchasePrice ?? 0,
      'Precio Venta':    p.salePrice  ?? 0,
      'Descripción':     p.description || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');

    // Ajustar anchos de columnas
    ws['!cols'] = [
      { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
      { wch: 8  }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 30 }
    ];

    const fecha = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, `productos_${fecha}.xlsx`);
    showNotification(`${products.length} productos exportados correctamente`, 'success');
  }, [products, showNotification]);

  // Función para cerrar el modal de forma segura
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedProduct(null);
    setFormLoading(false);
  }, []);

  const handleSubmit = async (data) => {
    setFormLoading(true);
    
    try {
      // Verificar si hay una imagen para enviar
      const hasImage = data.image && data.image instanceof File;
      
      // Si hay imagen, usar FormData, sino usar JSON normal
      let response;
      let formattedData;
      
      if (hasImage) {
        // Crear FormData para enviar con imagen
        const formData = new FormData();
        
        // Agregar la imagen
        formData.append('image', data.image);
        
        // Agregar los demás campos
        const fieldsToInclude = [
          'name', 'barcode', 'unitType', 'quantity', 'minStock',
          'purchasePrice', 'salePrice', 'category', 'description',
          'weightUnit', 'minWeight', 'packageWeight', 'pricePerUnit',
          'weightUnitBarcode', 'unitsPerPackage', 'unitBarcode',
          'isWeightPackage', 'packageType', 'packageContentType',
          'provider', 'creditPurchase'
        ];
        
        fieldsToInclude.forEach(field => {
          const val = data[field];
          if (val !== undefined && val !== null && val !== '') {
            formData.append(field, typeof val === 'object' ? JSON.stringify(val) : val);
          }
        });
        
        // Asegurar que los campos numéricos sean números
        ['purchasePrice', 'salePrice', 'quantity', 'minStock', 'packageWeight', 'pricePerUnit', 'unitsPerPackage'].forEach(field => {
          if (formData.has(field)) {
            formData.set(field, parseFloat(formData.get(field)));
          }
        });
        
        if (selectedProduct) {
          response = await productApi.updateWithImage(selectedProduct._id, formData);
          showNotification('Producto actualizado exitosamente');
        } else {
          response = await productApi.createWithImage(formData);
          showNotification('Producto creado exitosamente');
        }
      } else {
        // Enviar como JSON normal (sin imagen o solo actualizando URL existente)
        formattedData = {
          ...data,
          purchasePrice: parseFloat(data.purchasePrice),
          salePrice: parseFloat(data.salePrice),
          quantity: parseFloat(data.quantity),
          minStock: parseFloat(data.minStock)
        };
        
        // Si es un producto por peso, asegurarse de enviar los campos específicos
        if (data.unitType === 'peso') {
          formattedData.weightUnit = data.weightUnit;
          formattedData.minWeight = parseFloat(data.minWeight);
          
          // Si tiene packageWeight (caso del saco de arroz)
          if (data.packageWeight) {
            formattedData.packageWeight = parseFloat(data.packageWeight);
            // También guardar el precio por unidad (precio por libra)
            if (data.pricePerUnit) {
              formattedData.pricePerUnit = parseFloat(data.pricePerUnit);
            } else if (data.salePrice && data.packageWeight) {
              // Calcular el precio por unidad si no se proporcionó directamente
              formattedData.pricePerUnit = parseFloat(
                (data.salePrice / data.packageWeight).toFixed(2)
              );
            }
          }
        }
        
        // Si es un producto tipo paquete, asegurarse de enviar los campos específicos
        if (data.unitType === 'paquete') {
          // Asegurarse de que packageWeight sea un número
          if (data.packageWeight) {
            formattedData.packageWeight = parseFloat(data.packageWeight);
          }
          
          // Asegurarse de incluir el tipo de paquete
          if (data.packageType) {
            formattedData.packageType = data.packageType;
          }
          
          // Incluir el tipo de contenido del paquete
          if (data.packageContentType) {
            formattedData.packageContentType = data.packageContentType;
            
            // Generar etiqueta para la unidad derivada dependiendo del tipo de contenido
            formattedData.derivedUnitLabel = data.packageContentType === 'peso' ? 
              data.weightUnit || 'lb' : // Si es por peso, usar la unidad de peso (libra por defecto)
              'unidad'; // Si es por unidades, simplemente llamarlo "unidad"
            
            // Generar etiqueta para mostrar en listados
            formattedData.packageUnitLabel = `${data.packageType || 'Paquete'} de ${data.packageContentType === 'peso' ? 'Peso' : 'Unidades'}`;
          }
          
          // unitsPerPackage es OBLIGATORIO para productos tipo paquete
          // Si no existe, usamos el peso del paquete o un valor predeterminado
          formattedData.unitsPerPackage = data.unitsPerPackage 
            ? parseFloat(data.unitsPerPackage)
            : data.packageWeight 
              ? parseFloat(data.packageWeight)
              : 1; // Valor por defecto
          
          // Calcular el precio por unidad derivada si no está especificado
          if (!data.pricePerUnit && data.salePrice && data.packageWeight && data.packageContentType === 'peso') {
            formattedData.pricePerUnit = parseFloat((data.salePrice / data.packageWeight).toFixed(2));
          } else if (data.pricePerUnit) {
            formattedData.pricePerUnit = parseFloat(data.pricePerUnit);
          }
          
          // Generar automáticamente un código de barras para la unidad derivada si no existe
          if (!data.unitBarcode && data.barcode) {
            // Para unidades derivadas, añadir un prefijo al código original
            formattedData.unitBarcode = `${data.barcode.substring(0, 4)}${data.packageContentType === 'peso' ? 'P' : 'U'}`;
          }
        }
        
        // Eliminar campos indefinidos o con valores vacíos
        Object.keys(formattedData).forEach(key => {
          if (
            formattedData[key] === undefined || 
            formattedData[key] === null || 
            formattedData[key] === ''
          ) {
            delete formattedData[key];
          }
        });
        
        console.log('Enviando datos:', JSON.stringify(formattedData, null, 2));
        
        if (selectedProduct) {
          response = await productApi.update(selectedProduct._id, formattedData);
          showNotification('Producto actualizado exitosamente');
        } else {
          response = await productApi.create(formattedData);
          showNotification('Producto creado exitosamente');
        }
      }
      
      console.log('Respuesta exitosa del servidor:', response);
      
      // Cerrar modal y recargar datos
      closeModal();
      await fetchData();
      
    } catch (error) {
      console.error('Error detallado de la API:', error);
      
      // Mostrar información detallada del error para depuración
      if (error.response) {
        console.error('Datos de respuesta del error:', error.response.data);
        console.error('Estado HTTP:', error.response.status);
        console.error('Cabeceras:', error.response.headers);
        
        if (error.response.data && error.response.data.errors) {
          console.error('Errores específicos:', error.response.data.errors);
          showNotification(`Error: ${Object.values(error.response.data.errors).join(', ')}`, 'error');
        } else {
          showNotification(`Error al guardar: ${error.response.data.message || 'Error desconocido'}`, 'error');
        }
      } else if (error.request) {
        console.error('No se recibió respuesta:', error.request);
        showNotification('No se pudo conectar con el servidor', 'error');
      } else {
        console.error('Error de configuración:', error.message);
        showNotification(`Error: ${error.message}`, 'error');
      }
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div id="productos-header" className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Productos</h1>
        <div className="flex space-x-2">
          {/* Botones solo para superadmin */}
          {isSuperAdmin && (
            <>
              <button
                id="btn-eliminar-todos"
                onClick={() => setDeleteAllConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md flex items-center"
                title="Eliminar todos los productos de la base de datos"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar Todos
              </button>
              <button
                id="btn-importar-excel"
                onClick={handleOpenImportModal}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center"
                title="Importar productos desde un archivo Excel"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Importar Excel
              </button>
              <button
                id="btn-descargar-productos"
                onClick={handleDownloadProducts}
                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md flex items-center"
                title="Descargar listado completo de productos"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar Productos
              </button>
            </>
          )}
          <button
            id="btn-nuevo-producto"
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Resumen de productos */}
      <div className="mb-6">
        <ProductosSummary products={products} />
      </div>

      {/* Filtros y controles */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Volver a la primera página al buscar
            }}
            className="p-2 pl-10 border rounded-md w-full"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1); // Volver a la primera página al filtrar
          }}
          className="p-2 border rounded-md"
        >
          <option value="">Todas las categorías</option>
          {categories.map(category => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
        
        {/* Selector de cantidad por página */}
        <select
          value={pageSize}
          onChange={handlePageSizeChange}
          className="p-2 border rounded-md"
        >
          <option value="5">5 por página</option>
          <option value="10">10 por página</option>
          <option value="20">20 por página</option>
          <option value="50">50 por página</option>
          <option value="100">100 por página</option>
        </select>
      </div>
      
      {/* Control para mostrar/ocultar unidades individuales */}
      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          id="showUnitProducts"
          checked={showUnitProducts}
          onChange={(e) => {
            setShowUnitProducts(e.target.checked);
            setCurrentPage(1); // Volver a la primera página al cambiar el filtro
            fetchData(); // Recargar los datos con el nuevo filtro
          }}
          className="mr-2 h-5 w-5 text-blue-600"
        />
        <label htmlFor="showUnitProducts" className="text-sm font-medium text-gray-700">
          Mostrar productos que son unidades individuales dentro de paquetes
        </label>
      </div>

      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-[9999] ${
              notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
            } text-white`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ancla para scroll automático */}
      <div id="products-table-top"></div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <ProductTable
          products={filteredProducts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      )}

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-5xl md:max-w-6xl lg:max-w-7xl xl:max-w-8xl max-h-[90vh] overflow-auto"
            >
              <div className="p-4 sm:p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {selectedProduct ? 'Editar Producto' : 'Crear Producto'}
                </h2>
                <ProductForm
                  onSubmit={handleSubmit}
                  initialData={selectedProduct}
                  categories={categories}
                  providers={providers}
                  onClose={() => setModalOpen(false)}
                  loading={formLoading}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Modal de confirmación: Eliminar todos los productos */}
      {deleteAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 rounded-full p-2">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5C2.57 18.333 3.532 20 5.072 20z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">¿Eliminar todos los productos?</h3>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              Esta acción <strong>eliminará permanentemente</strong> todos los productos de la base de datos.
            </p>
            <p className="text-red-600 text-sm font-medium mb-6">
              ⚠️ Esta acción no se puede deshacer. El historial de facturas no se verá afectado.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteAllConfirm(false)}
                disabled={deletingAll}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAllProducts}
                disabled={deletingAll}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-60"
              >
                {deletingAll ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  'Sí, eliminar todos'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de importación de Excel */}
      <ExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportProducts}
      />

      {/* Overlay de carga para operaciones de formulario */}
      <LoadingOverlay 
        isVisible={formLoading}
        message="Guardando producto..."
        zIndex={60}
      />

      {/* Overlay de carga para operaciones generales */}
      <LoadingOverlay 
        isVisible={loading && !formLoading}
        message="Cargando datos..."
        zIndex={50}
      />
    </div>
  );
};

export default Productos;