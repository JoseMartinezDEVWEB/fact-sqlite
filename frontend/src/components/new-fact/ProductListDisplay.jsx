import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Scale } from 'lucide-react';
import api from '../../config/axiosConfig';
import './ProductListDisplay.css';

const ProductListDisplay = ({ onAddToCart, isVisible }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar productos cuando el componente se hace visible
  useEffect(() => {
    if (isVisible) {
      fetchProducts();
    }
  }, [isVisible]);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/products');
      let productsData = [];
      if (Array.isArray(response.data)) {
        productsData = response.data;
      } else if (response.data && Array.isArray(response.data.products)) {
        productsData = response.data.products;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        productsData = response.data.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data.products)) {
        productsData = response.data.data.products;
      }
      setProducts(productsData);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setError('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = (product) => {
    const productToAdd = {
      ...product,
      quantity: 1,
      weightInfo: product.unitType === 'peso' ? {
        weight: product.minWeight || 0.1,
        unit: product.weightUnit || 'lb'
      } : null
    };
    onAddToCart(productToAdd);
  };

  const getProductIcon = (product) => {
    if (product.unitType === 'peso') {
      return <Scale className="w-4 h-4" />;
    } else if (product.unitType === 'paquete') {
      return <Package className="w-4 h-4" />;
    }
    return <Package className="w-4 h-4" />;
  };

  const formatQuantity = (product) => {
    if (product.unitType === 'peso') {
      return `${product.quantity} ${product.weightUnit || 'lb'}`;
    } else if (product.unitType === 'paquete') {
      return `${product.quantity} ${product.packageType || 'paquetes'}`;
    }
    return `${product.quantity} unidades`;
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mt-4 p-3 sm:p-4 border-2 border-blue-300 rounded-lg bg-blue-50 overflow-y-auto product-list-container flex-1 min-h-0"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-blue-800">
            Lista de Productos Disponibles
          </h3>
          <span className="text-xs sm:text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            {products.length} productos
          </span>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-xs sm:text-sm text-gray-600">Cargando productos...</span>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-center py-3 sm:py-4 bg-red-50 rounded border border-red-200 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="product-grid">
            {products.map((product) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.random() * 0.1 }}
                className="bg-white rounded-lg border border-gray-200 shadow-sm product-card"
                onClick={() => handleAddProduct(product)}
              >
                {/* Área de imagen — ocupa el espacio disponible */}
                <div className="product-image-container">
                  {product.image?.url ? (
                    <img
                      src={product.image.url}
                      alt={product.name}
                      className="product-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="w-full h-full flex items-center justify-center text-gray-400"
                    style={{ display: product.image?.url ? 'none' : 'flex' }}
                  >
                    {getProductIcon(product)}
                  </div>
                  {product.quantity <= product.minStock && (
                    <div className="stock-low-indicator">Bajo Stock</div>
                  )}
                </div>

                {/* Información del producto — altura fija */}
                <div className="product-content">
                  <h4 className="product-name">{product.name}</h4>
                  <div className="flex items-center justify-between mb-1">
                    <span className="product-price">${parseFloat(product.salePrice || 0).toFixed(2)}</span>
                    <span className="product-quantity">{formatQuantity(product)}</span>
                  </div>
                  <button
                    className="w-full bg-blue-600 text-white rounded product-add-button font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                    onClick={(e) => { e.stopPropagation(); handleAddProduct(product); }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Package className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-xs sm:text-sm">No hay productos disponibles</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductListDisplay;
