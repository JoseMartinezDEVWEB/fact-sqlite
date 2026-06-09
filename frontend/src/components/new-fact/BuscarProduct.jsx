/* eslint-disable react/prop-types */
 
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../config/apis';
import { Search, ShoppingCart, Minus, Plus, Scale, Package, X } from 'lucide-react';

// Variable para permitir depuración global
window.debugBuscarProduct = (enabled = true) => {
  console.log('Depuración de BuscarProduct ' + (enabled ? 'activada' : 'desactivada'));
  window._debugBuscarProduct = enabled;
};

const BuscarProduct = ({ onAddToCart }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [foundProducts, setFoundProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [quantityStr, setQuantityStr] = useState('1');
  const [weightValue, setWeightValue] = useState('');
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  const searchInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const weightInputRef = useRef(null);

  // Auto-focus con delay para esperar que el DOM esté listo
  useEffect(() => {
    const t = setTimeout(() => searchInputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  // Captura global de teclas para scanner de código de barras:
  // si se presiona un carácter imprimible y el foco no está en ningún input, enfocar búsqueda
  useEffect(() => {
    const trapBarcode = (e) => {
      const tag = document.activeElement?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (!inInput && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', trapBarcode);
    return () => document.removeEventListener('keydown', trapBarcode);
  }, []);

  // Cuando se cierra la tarjeta de producto, volver a enfocar búsqueda
  useEffect(() => {
    if (!selectedProduct) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [selectedProduct]);

  // Función para buscar productos (evitando el error 500)
  const fetchProducts = useCallback(async (term) => {
    try {
      setLoading(true);
      setError('');
      
      // Verificar si es un código de barras (solo números)
      const isBarcode = /^\d+$/.test(term.trim());
      
      if (isBarcode) {
        try {
          const response = await api.get(`/products/barcode/${term.trim()}`);
          // Formato: { status, data: { product: {...} } }
          const product = response.data?.data?.product || response.data?.product || response.data;
          if (product && product.id) {
            setFoundProducts([product]);
            setSelectedProduct(product);
            setQuantity(1);
            setLoading(false);
            return;
          }
        } catch (barcodeError) {
          console.warn('Error al buscar por código de barras:', barcodeError);
        }
      }

      // Obtener todos los productos y filtrar en el cliente
      try {
        const allProductsResponse = await api.get('/products?limit=500');

        // Formato: { status: 'success', data: { products: [...], total, ... } }
        let allProducts = [];
        const d = allProductsResponse.data;
        if (Array.isArray(d)) {
          allProducts = d;
        } else if (d?.data?.products && Array.isArray(d.data.products)) {
          allProducts = d.data.products;         // ← formato actual del backend
        } else if (d?.products && Array.isArray(d.products)) {
          allProducts = d.products;
        } else if (d?.data && Array.isArray(d.data)) {
          allProducts = d.data;
        }
        
        // Filtrar productos localmente
        const searchTermLower = term.trim().toLowerCase();
        const filteredProducts = allProducts.filter(product => 
          product.name?.toLowerCase().includes(searchTermLower)
        );
        
        setFoundProducts(filteredProducts);
        
        // Si solo hay un producto, seleccionarlo automáticamente
        if (filteredProducts.length === 1) {
          setSelectedProduct(filteredProducts[0]);
          setQuantity(1);
        }
      } catch (err) {
        console.error('Error al obtener productos:', err);
        setError('No se pudieron cargar los productos. Intente nuevamente.');
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setError(`Error al buscar productos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Efecto para búsqueda en tiempo real
  useEffect(() => {
    if (searchTerm && searchTerm.trim().length >= 2) {
      const debounceTimeout = setTimeout(() => {
        fetchProducts(searchTerm);
      }, 300);
      
      return () => clearTimeout(debounceTimeout);
    } else if (searchTerm.trim() === '') {
      setFoundProducts([]);
    }
  }, [searchTerm, fetchProducts]);

  // Calcular precio al cambiar el peso
  useEffect(() => {
    if (selectedProduct && selectedProduct.unitType === 'peso' && weightValue) {
      const weight = parseFloat(weightValue);
      if (!isNaN(weight)) {
        // Determinar el precio por unidad de peso
        const hasPackageWeight = selectedProduct.packageWeight && selectedProduct.packageWeight > 0;
        const pricePerUnit = selectedProduct.pricePerUnit || 
          (hasPackageWeight ? selectedProduct.salePrice / selectedProduct.packageWeight : selectedProduct.salePrice);
        
        const price = weight * pricePerUnit;
        setCalculatedPrice(price);
      }
    }
  }, [weightValue, selectedProduct]);

  // Gestionar teclas globales específicas
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Escape para cerrar tarjeta de producto
      if (e.key === 'Escape' && selectedProduct) {
        closeProductCard();
      }
      
      // Enfocar búsqueda con /
      if (e.key === '/' && !e.target.tagName.match(/INPUT|TEXTAREA/i)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedProduct]);

  // Manejar eventos de teclado para el input de búsqueda
  const handleSearchKeyDown = (e) => {
    // Si se presiona Enter y hay un producto seleccionado
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedProduct) {
        // Agregar al carrito
        handleAddToCart();
      } else if (foundProducts.length > 0) {
        // Seleccionar el primer producto de la lista
        setSelectedProduct(foundProducts[0]);
        setQuantity(1);
      } else if (searchTerm.trim().length >= 2) {
        // Realizar búsqueda
        fetchProducts(searchTerm);
      }
    }
    
    // Si se presiona Escape, limpiar búsqueda
    if (e.key === 'Escape') {
      setSearchTerm('');
      setSelectedProduct(null);
    }
  };

  // Manejar eventos específicos para el input de cantidad
  const handleQuantityKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddToCart();
    }
    
    if (e.key === ' ') {
      e.preventDefault();
      setQuantity(prev => prev + 1);
    }
    
    if (e.key === 'Escape') {
      setSelectedProduct(null);
      searchInputRef.current?.focus();
    }
  };

  // Manejar eventos específicos para el input de peso
  const handleWeightKeyDown = (e) => {
    if (e.key === 'Enter' && weightValue && parseFloat(weightValue) > 0) {
      e.preventDefault();
      handleAddToCart();
    }
    
    if (e.key === 'Escape') {
      setSelectedProduct(null);
      searchInputRef.current?.focus();
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const closeProductCard = () => {
    setSelectedProduct(null);
    setSearchTerm('');
    setFoundProducts([]);
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setQuantityStr('1');
    setWeightValue('');
    setCalculatedPrice(0);
    
    // Si es un producto por peso, enfocar el input de peso
    if (product.unitType === 'peso' && weightInputRef.current) {
      setTimeout(() => weightInputRef.current.focus(), 100);
    } else if (quantityInputRef.current) {
      // Si es un producto normal, enfocar el input de cantidad
      setTimeout(() => quantityInputRef.current.focus(), 100);
    }
  };

  const handleWeightChange = (e) => {
    const value = e.target.value;
    // Permitir solo números y punto decimal
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWeightValue(value);
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
    let productToAdd;
    
    if (selectedProduct.unitType === 'peso') {
      // Validar que se ingresó un peso válido
      if (!weightValue || isNaN(parseFloat(weightValue)) || parseFloat(weightValue) <= 0) {
        alert('Por favor ingrese un peso válido');
        if (weightInputRef.current) weightInputRef.current.focus();
        return;
      }
      
      const weight = parseFloat(weightValue);
      
      // Validar peso mínimo
      const minSellWeight = selectedProduct.minWeight || 0.01;
      if (weight < minSellWeight) {
        alert(`El peso mínimo es ${minSellWeight} ${selectedProduct.weightUnit || 'kg'}`);
        if (weightInputRef.current) weightInputRef.current.focus();
        return;
      }
      
      // Determinar el precio por unidad de peso
      const hasPackageWeight = selectedProduct.packageWeight && selectedProduct.packageWeight > 0;
      const pricePerUnit = selectedProduct.pricePerUnit || 
        (hasPackageWeight ? selectedProduct.salePrice / selectedProduct.packageWeight : selectedProduct.salePrice);
      
      // Crear objeto para producto por peso
      productToAdd = {
        ...selectedProduct,
        weightInfo: {
          value: weight,
          unit: selectedProduct.weightUnit || 'kg',
          pricePerUnit
        },
        calculatedPrice: weight * pricePerUnit
      };
    } else {
      // Producto normal con cantidad
      const qty = parseFloat(quantityStr) || quantity || 1;
      productToAdd = {
        ...selectedProduct,
        quantity: qty
      };
    }
    
    // Llamar a la función prop para añadir al carrito
    if (onAddToCart) {
      onAddToCart(productToAdd);
    } else {
      console.warn('onAddToCart no está definido');
      // Usar otras estrategias si onAddToCart no está disponible
      if (window.addToCartFunction) {
        window.addToCartFunction(productToAdd);
      } else {
        // Intento con evento personalizado
        const event = new CustomEvent('add-to-cart', { detail: { product: productToAdd } });
        window.dispatchEvent(event);
      }
    }
    
    // Mostrar mensaje toast
    const messageElement = document.createElement('div');
    messageElement.className = 'fixed bottom-4 right-4 bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded shadow-lg z-50';
    messageElement.innerHTML = `
      <div class="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <p>Producto agregado al carrito</p>
      </div>
    `;
    document.body.appendChild(messageElement);
    
    // Limpiar después de añadir
    setSelectedProduct(null);
    setQuantity(1);
    setQuantityStr('1');
    setWeightValue('');
    setCalculatedPrice(0);
    setSearchTerm('');
    setFoundProducts([]);
    
    // Eliminar mensaje después de 3 segundos
    setTimeout(() => {
      if (document.body.contains(messageElement)) {
        document.body.removeChild(messageElement);
      }
    }, 3000);
  };

  // Renderizar interfaz para producto por peso
  const renderWeightProduct = () => {
    if (!selectedProduct || selectedProduct.unitType !== 'peso') return null;

    const hasPackageWeight = selectedProduct.packageWeight && selectedProduct.packageWeight > 0;
    const pricePerUnit = selectedProduct.pricePerUnit ||
      (hasPackageWeight ? selectedProduct.salePrice / selectedProduct.packageWeight : selectedProduct.salePrice);
    const minSellWeight = selectedProduct.minWeight || 0.01;

    return (
      <div className="mt-4 border-t pt-4 relative">
        {/* Botón cerrar */}
        <button
          onClick={closeProductCard}
          className="absolute top-2 right-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-600 text-gray-500 transition-colors"
          title="Cerrar (Esc)"
        >
          <X size={16} />
        </button>
        <h3 className="font-bold text-lg pr-8">{selectedProduct.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center">
            <Scale size={14} className="mr-1" />
            Peso
          </span>
          <span className="text-gray-500 text-sm">
            Unidad: {selectedProduct.weightUnit || 'kg'}
          </span>
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          <div className="text-gray-700">
            <div className="font-medium">Precio por {selectedProduct.weightUnit || 'kg'}</div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold">${pricePerUnit.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-gray-700">
            <div className="font-medium">En inventario</div>
            <div className={selectedProduct.quantity <= (selectedProduct.minStock || 0) ? "text-red-600" : ""}>
              {selectedProduct.quantity} {selectedProduct.weightUnit || 'kg'}
            </div>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Cantidad ({selectedProduct.weightUnit || 'kg'})
            </label>
            <input
              type="text"
              placeholder={`Mínimo: ${minSellWeight}`}
              value={weightValue}
              onChange={handleWeightChange}
              onKeyDown={handleWeightKeyDown}
              ref={weightInputRef}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Precio Calculado
            </label>
            <div className="p-2 bg-gray-100 rounded-md border border-gray-300 font-medium">
              ${calculatedPrice.toFixed(2)}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleAddToCart}
          disabled={!weightValue || isNaN(parseFloat(weightValue)) || parseFloat(weightValue) < minSellWeight}
          className="mt-3 w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <ShoppingCart size={18} className="mr-2" />
          Agregar {weightValue && !isNaN(parseFloat(weightValue)) ? `${weightValue} ${selectedProduct.weightUnit || 'kg'}` : 'al carrito'}
        </button>
        
        {hasPackageWeight && (
          <div className="mt-3 p-2 bg-amber-50 rounded-md border border-amber-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">{selectedProduct.packageWeight} {selectedProduct.weightUnit || 'kg'}</span>
                <span className="text-gray-600 text-sm ml-1">por paquete</span>
              </div>
              <div className="font-bold text-lg">
                ${selectedProduct.salePrice.toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => {
                // Crear objeto para paquete completo
                const packageProduct = {
                  ...selectedProduct,
                  weightInfo: {
                    value: selectedProduct.packageWeight,
                    unit: selectedProduct.weightUnit || 'kg',
                    pricePerUnit,
                    isFullPackage: true
                  },
                  calculatedPrice: selectedProduct.salePrice
                };
                
                // Llamar a la función para agregar al carrito
                if (onAddToCart) {
                  onAddToCart(packageProduct);
                } else if (window.addToCartFunction) {
                  window.addToCartFunction(packageProduct);
                } else {
                  const event = new CustomEvent('add-to-cart', { detail: { product: packageProduct } });
                  window.dispatchEvent(event);
                }
                
                // Mostrar mensaje y limpiar
                const messageElement = document.createElement('div');
                messageElement.className = 'fixed bottom-4 right-4 bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded shadow-lg z-50';
                messageElement.innerHTML = `
                  <div class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <p>Paquete agregado al carrito</p>
                  </div>
                `;
                document.body.appendChild(messageElement);
                
                setTimeout(() => {
                  if (document.body.contains(messageElement)) {
                    document.body.removeChild(messageElement);
                  }
                }, 3000);
                
                setSelectedProduct(null);
                setSearchTerm('');
                searchInputRef.current?.focus();
              }}
              className="w-full mt-2 py-2 px-4 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center justify-center"
            >
              <Package size={18} className="mr-2" />
              Agregar paquete completo
            </button>
          </div>
        )}
      </div>
    );
  };

  // Renderizar producto normal
  const renderNormalProduct = () => {
    if (!selectedProduct || selectedProduct.unitType === 'peso') return null;

    return (
      <div className="mt-4 p-4 border rounded-md bg-gray-50 relative">
        {/* Botón cerrar */}
        <button
          onClick={closeProductCard}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-600 text-gray-500 transition-colors"
          title="Cerrar (Esc)"
        >
          <X size={16} />
        </button>

        <div className="flex justify-between items-start pr-8">
          <div>
            <h3 className="text-lg font-semibold">{selectedProduct.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{selectedProduct.description}</p>
            <p className="text-xl font-bold mt-1">
              ${Number(selectedProduct.price || selectedProduct.salePrice).toFixed(2)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {selectedProduct.isUnitOfPackage && (
              <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs flex items-center">
                <Package size={12} className="mr-1" />
                Unidad individual
              </span>
            )}
            <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-right">
              <p className="text-xs text-gray-500">Stock disponible:</p>
              <p className="text-base font-bold text-blue-700">
                {selectedProduct.quantity || 0}{' '}
                <span className="text-xs font-normal">
                  {selectedProduct.packageContentType === 'peso'
                    ? selectedProduct.weightUnit
                    : (selectedProduct.packageType || 'unidades')}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Control cantidad full-width */}
        <div className="flex items-center gap-2 mt-4 w-full">
          <button
            onClick={() => {
              const next = Math.max(0.001, parseFloat((quantity - 1).toFixed(3)));
              setQuantity(next);
              setQuantityStr(String(next));
            }}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700"
          >
            <Minus size={18} />
          </button>
          <input
            type="text"
            inputMode="decimal"
            value={quantityStr}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                setQuantityStr(val);
                const parsed = parseFloat(val);
                if (!isNaN(parsed) && parsed > 0) setQuantity(parsed);
              }
            }}
            onKeyDown={handleQuantityKeyDown}
            ref={quantityInputRef}
            className="w-20 h-11 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Cant."
          />
          <button
            onClick={() => {
              const next = parseFloat((quantity + 1).toFixed(3));
              setQuantity(next);
              setQuantityStr(String(next));
            }}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={handleAddToCart}
            className="flex-1 h-11 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingCart size={18} />
            Agregar al carrito
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full p-4 border rounded-lg">
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar producto o escanear código..."
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          ref={searchInputRef}
          className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
      </div>

      {error && (
        <div className="p-4 mt-4 text-red-700 bg-red-100 rounded-lg">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Mostrar el producto seleccionado */}
      {selectedProduct && (
        selectedProduct.unitType === 'peso' ? renderWeightProduct() : renderNormalProduct()
      )}

      {/* Mostrar lista de productos solo si hay resultados y no hay producto seleccionado */}
      {!selectedProduct && foundProducts.length > 0 && (
        <div className="space-y-2 mt-4">
          <h3 className="font-medium text-gray-700">Resultados de búsqueda:</h3>
          <div className="divide-y">
            {foundProducts.map((product, index) => (
              <div 
                key={product.id || product._id || index}
                className="py-2 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleProductClick(product)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <div className="flex items-center gap-2">
                      {product.unitType === 'peso' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center">
                          <Scale size={12} className="mr-1" />
                          Peso
                        </span>
                      )}
                      <p className="text-sm text-gray-500">
                        {product.description && product.description.length > 30 
                          ? product.description.substring(0, 30) + '...' 
                          : product.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">${Number(product.price || product.salePrice).toFixed(2)}</span>
                    <p className="text-xs text-gray-600">Stock: {product.quantity || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center p-4">
          <p>Buscando productos...</p>
        </div>
      )}
    </div>
  );
};

export default BuscarProduct;