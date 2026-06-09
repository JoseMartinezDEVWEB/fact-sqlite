/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Scale, ShoppingBag, CreditCard, Search, X, Save, RotateCcw, Trash2 } from 'lucide-react';
import { useAutoSave } from '../hooks/useAutoSave';
import ProviderForm from '../components/formClientesProveedores/ProviderForm';

// Constantes para los tipos de unidad
 
const UNIT_TYPES = {
  UNIT: 'unidad',
  WEIGHT: 'peso',
  PACKAGE: 'paquete'
};

 
const WEIGHT_UNITS = {
  KG: 'kg',
  G: 'g',
  LB: 'lb',
  OZ: 'oz'
};

const PAYMENT_TERMS = [
  { value: '15dias', label: '15 días' },
  { value: '30dias', label: '30 días' },
  { value: '45dias', label: '45 días' },
  { value: '60dias', label: '60 días' },
  { value: 'otro', label: 'Otro' },
];

const ProductForm = ({ onSubmit, initialData, categories, providers, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    unitType: 'unidad',
    quantity: 0,
    minStock: 10,
    purchasePrice: 0,
    salePrice: 0,
    profitPercentage: 30, // Porcentaje de ganancia predeterminado (30%)
    category: '',
    description: '',
    // Campos adicionales para productos por peso
    weightUnit: 'lb',
    minWeight: 0.01,
    // Campo para saco de arroz (o productos similares)
    packageWeight: 0,
    pricePerUnit: 0,
    // Código de barras para unidad de peso (por libra, kilo, etc.)
    weightUnitBarcode: '',
    // Número de unidades por paquete
    unitsPerPackage: 1,
    // Código de barras para unidades individuales dentro del paquete
    unitBarcode: '',
    // Campos para productos peso-paquete
    isWeightPackage: false,
    packageType: '',
    // Tipo de contenido del paquete (unidades o peso)
    packageContentType: 'unidad',
    // Campos para proveedor y compra a crédito
    provider: '',
    creditPurchase: {
      isCredit: false,
      paymentTerm: '30dias',
      dueDate: null
    },
    // Campo para imagen del producto
    image: null,
    imagePreview: null,
    ...initialData
  });

  const [errors, setErrors] = useState({});
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(Date.now());
  const [isScanning, setIsScanning] = useState(false);
  const [isByWeight, setIsByWeight] = useState(initialData?.unitType === 'peso');
  const [isPackage, setIsPackage] = useState(initialData?.unitType === 'paquete');
  const [hasBulkPackage, setHasBulkPackage] = useState(
    Boolean(initialData?.packageWeight && initialData?.packageWeight > 0)
  );
  const [isPricePerUnitMode, setIsPricePerUnitMode] = useState(false);
  const [isCreditPurchase, setIsCreditPurchase] = useState(
    initialData?.creditPurchase?.isCredit || false
  );

  const [isProvidedBySupplier, setIsProvidedBySupplier] = useState(
    Boolean(initialData?.provider) || false
  );
  
  // Estado para controlar si se aplica automáticamente el porcentaje de ganancia
  const [autoApplyProfit, setAutoApplyProfit] = useState(true);
  // Estado para productos por peso que también son tipo paquete
  const [isWeightPackage, setIsWeightPackage] = useState(
    Boolean(initialData?.isWeightPackage) || false
  );
  const [packageType, setPackageType] = useState(
    initialData?.packageType || ''
  );

  // Autosave — filtrar campos no serializables (File, blob URLs)
  const autosaveData = useMemo(() => {
    const { image, imagePreview, ...clean } = formData;
    return clean;
  }, [formData]);

  const { hasSavedData, getSavedData, clearSave } = useAutoSave('productForm', autosaveData);

  const [showRestoreBanner, setShowRestoreBanner] = useState(false);

  useEffect(() => {
    if (hasSavedData && !initialData) {
      setShowRestoreBanner(true);
    }
  }, []);

  const handleRestoreDraft = () => {
    const saved = getSavedData();
    if (saved) {
      setFormData(prev => ({ ...prev, ...saved }));
      setShowRestoreBanner(false);
    }
  };

  const handleDiscardDraft = () => {
    clearSave();
    setShowRestoreBanner(false);
  };

  // Detectar si es un producto por peso o paquete
  useEffect(() => {
    setIsByWeight(formData.unitType === 'peso');
    // No mostrar la sección de configuración de paquete cuando el tipo es 'peso'
    setIsPackage(formData.unitType === 'paquete' && formData.unitType !== 'peso');
  }, [formData.unitType]);

  // Manejar entrada del scanner
  useEffect(() => {
    let keypressTimer;
    const handleBarcodeScan = (event) => {
      // Ignorar teclas de control
      if (event.key.length > 1 && event.key !== 'Enter') return;
      
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        setBarcodeBuffer('');
      }
      
      if (event.key === 'Enter') {
        if (barcodeBuffer) {
          setFormData(prev => ({ ...prev, barcode: barcodeBuffer }));
          setBarcodeBuffer('');
          setIsScanning(false);
        }
      } else {
        setBarcodeBuffer(prev => prev + event.key);
        setIsScanning(true);
        
        // Reiniciar el timer
        clearTimeout(keypressTimer);
        keypressTimer = setTimeout(() => {
          setIsScanning(false);
        }, 100);
      }
      
      setLastKeyTime(currentTime);
    };

    window.addEventListener('keydown', handleBarcodeScan);
    return () => {
      window.removeEventListener('keydown', handleBarcodeScan);
      clearTimeout(keypressTimer);
    };
  }, [barcodeBuffer, lastKeyTime]);

  // Calcular precio por unidad cuando cambia el precio total o el peso
  useEffect(() => {
    if (isPricePerUnitMode && isByWeight && hasBulkPackage) {
      // Si estamos en modo de precio por unidad, calculamos el precio total
      const pricePerUnit = parseFloat(formData.pricePerUnit) || 0;
      const packageWeight = parseFloat(formData.packageWeight) || 0;
      if (pricePerUnit > 0 && packageWeight > 0) {
        const totalPrice = pricePerUnit * packageWeight;
        setFormData(prev => ({
          ...prev,
          salePrice: parseFloat(totalPrice.toFixed(2))
        }));
      }
    } else if (isByWeight && hasBulkPackage) {
      // Si estamos en modo de precio total, calculamos el precio por unidad
      const totalPrice = parseFloat(formData.salePrice) || 0;
      const packageWeight = parseFloat(formData.packageWeight) || 0;
      if (totalPrice > 0 && packageWeight > 0) {
        const pricePerUnit = totalPrice / packageWeight;
        setFormData(prev => ({
          ...prev,
          pricePerUnit: parseFloat(pricePerUnit.toFixed(2))
        }));
      }
    }
  }, [formData.salePrice, formData.packageWeight, formData.pricePerUnit, isByWeight, hasBulkPackage, isPricePerUnitMode]);

  const validateForm = () => {
    console.log('Validando formulario...');
    let valid = true;
    let newErrors = {};

    // Validación de campos obligatorios
    if (!formData.name) {
      newErrors.name = 'El nombre es obligatorio';
      valid = false;
    }
    
    // Validación de código de barras
    if (!formData.barcode) {
      newErrors.barcode = 'El código de barras es obligatorio';
      valid = false;
    }
    
    // Validación del código de barras de unidades individuales (solo para productos tipo paquete)
    if (formData.unitType === 'paquete' && formData.unitBarcode) {
      // Eliminar espacios en blanco
      const trimmedUnitBarcode = formData.unitBarcode.trim();
      
      // Verificar que no esté vacío después de eliminar espacios
      if (trimmedUnitBarcode === '') {
        newErrors.unitBarcode = 'El código de barras de la unidad no puede estar vacío';
      } else {
        // Actualizar el valor del código de barras de la unidad sin espacios
        setFormData(prev => ({ ...prev, unitBarcode: trimmedUnitBarcode }));
      }
    }
    
    // Validaciones específicas para productos por peso
    if (formData.unitType === 'peso') {
      if (!formData.weightUnit) {
        newErrors.weightUnit = 'La unidad de peso es requerida';
      }
      
      if (hasBulkPackage && (formData.packageWeight <= 0 || !formData.packageWeight)) {
        newErrors.packageWeight = 'El peso del paquete debe ser mayor a 0';
      }
    }
    
    // Validaciones específicas para productos tipo paquete
    if (formData.unitType === 'paquete') {
      if (formData.packageContentType === 'unidad') {
        // Validar campos para paquetes con unidades
        if (!formData.unitsPerPackage || formData.unitsPerPackage <= 0) {
          newErrors.unitsPerPackage = 'El número de unidades por paquete debe ser mayor a 0';
        }
      } else if (formData.packageContentType === 'peso') {
        // Validar campos para paquetes con peso
        if (!formData.packageWeight || formData.packageWeight <= 0) {
          newErrors.packageWeight = 'El peso del paquete debe ser mayor a 0';
        }
        // Validar tipo de paquete cuando es por peso
        if (!formData.packageType) {
          newErrors.packageType = 'Debe seleccionar un tipo de paquete';
        }
      }
      
      // Validar precio por unidad para ambos tipos de paquete
      if (!formData.pricePerUnit || formData.pricePerUnit <= 0) {
        newErrors.pricePerUnit = 'El precio por unidad/peso debe ser mayor a 0';
      }
    }
  
    // Validaciones para compra a crédito y proveedor
    if (isProvidedBySupplier && isCreditPurchase) {
      if (!formData.creditPurchase.paymentTerm) {
        newErrors.paymentTerm = 'El término de pago es requerido para compras a crédito';
      }
      
      if (!formData.provider) {
        newErrors.provider = 'Se requiere un proveedor para compras a crédito';
      }
    }
    
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log('Errores de validación:', newErrors);
    console.log('Formulario válido:', isValid);
    return isValid;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = value;
    
    // Convertir valores numéricos
    if (type === 'number' || name === 'salePrice' || name === 'purchasePrice' || 
        name === 'quantity' || name === 'minStock' || name === 'packageWeight' || 
        name === 'pricePerUnit' || name === 'unitsPerPackage' || name === 'profitPercentage') {
      finalValue = value === '' ? '' : Number(value);
    } else if (type === 'checkbox') {
      finalValue = checked;
    }

    // Manejar cambio en checkbox de aplicar porcentaje automáticamente
    if (name === 'autoApplyProfit') {
      setAutoApplyProfit(checked);
      return;
    }

    if (name === 'creditPurchase.isCredit') {
      setIsCreditPurchase(checked);
      setFormData(prev => ({
        ...prev,
        creditPurchase: {
          ...prev.creditPurchase,
          isCredit: checked
        }
      }));
      return;
    }

    if (name === 'creditPurchase.paymentTerm') {
      setFormData(prev => ({
        ...prev,
        creditPurchase: {
          ...prev.creditPurchase,
          paymentTerm: value
        }
      }));
      return;
    }

    if (name === 'creditPurchase.dueDate') {
      setFormData(prev => ({
        ...prev,
        creditPurchase: {
          ...prev.creditPurchase,
          dueDate: value
        }
      }));
      return;
    }
    
    // Crear una copia del estado actual
    let updatedFormData = { ...formData, [name]: finalValue };

    // Lógica específica para packageContentType
    if (name === 'packageContentType') {
      updatedFormData = {
        ...updatedFormData,
        // Reiniciar campos al cambiar de tipo de contenido
        ...(finalValue === 'unidad' 
          ? { packageWeight: 0, weightUnit: 'lb' } 
          : { unitsPerPackage: 1 })
      };
    }
    
    // Si se cambia el precio de compra o el porcentaje de ganancia y está activado el cálculo automático
    if (autoApplyProfit && (name === 'purchasePrice' || name === 'profitPercentage')) {
      const purchasePrice = name === 'purchasePrice' ? finalValue : formData.purchasePrice;
      const profitPercentage = name === 'profitPercentage' ? finalValue : formData.profitPercentage;
      
      // Calcular el precio de venta basado en el precio de compra y el porcentaje
      if (purchasePrice > 0 && profitPercentage >= 0) {
        const profit = purchasePrice * (profitPercentage / 100);
        updatedFormData.salePrice = parseFloat((purchasePrice + profit).toFixed(2));
        
        // Si es un producto por paquete, actualizar el precio por unidad
        if (updatedFormData.unitType === 'paquete' && updatedFormData.unitsPerPackage > 0) {
          updatedFormData.pricePerUnit = parseFloat((updatedFormData.salePrice / updatedFormData.unitsPerPackage).toFixed(2));
        }
        // Si es un producto por peso, actualizar el precio por unidad de peso
        else if (updatedFormData.unitType === 'peso' && updatedFormData.packageWeight > 0) {
          updatedFormData.pricePerUnit = parseFloat((updatedFormData.salePrice / updatedFormData.packageWeight).toFixed(2));
        }
      }
    }
    
    // Si se cambia el precio por unidad o las unidades por paquete
    if (name === 'pricePerUnit' || name === 'unitsPerPackage' || name === 'packageWeight') {
      if (updatedFormData.unitType === 'paquete' && updatedFormData.unitsPerPackage > 0 && updatedFormData.pricePerUnit > 0) {
        // Actualizar el precio de venta del paquete completo
        updatedFormData.salePrice = parseFloat((updatedFormData.pricePerUnit * updatedFormData.unitsPerPackage).toFixed(2));
        
        // Si está activado el cálculo automático, actualizar el porcentaje de ganancia
        if (autoApplyProfit && updatedFormData.purchasePrice > 0) {
          const profit = updatedFormData.salePrice - updatedFormData.purchasePrice;
          updatedFormData.profitPercentage = parseFloat(((profit / updatedFormData.purchasePrice) * 100).toFixed(2));
        }
      }
      else if (updatedFormData.unitType === 'peso' && updatedFormData.packageWeight > 0 && updatedFormData.pricePerUnit > 0) {
        // Actualizar el precio de venta del paquete por peso
        updatedFormData.salePrice = parseFloat((updatedFormData.pricePerUnit * updatedFormData.packageWeight).toFixed(2));
        
        // Si está activado el cálculo automático, actualizar el porcentaje de ganancia
        if (autoApplyProfit && updatedFormData.purchasePrice > 0) {
          const profit = updatedFormData.salePrice - updatedFormData.purchasePrice;
          updatedFormData.profitPercentage = parseFloat(((profit / updatedFormData.purchasePrice) * 100).toFixed(2));
        }
      }
    }
    
    setFormData(updatedFormData);
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submit iniciado');
    
    // Validación adicional para el proveedor
    if (isProvidedBySupplier && !formData.provider && isCreditPurchase) {
      console.log('Error: Se requiere un proveedor para compras a crédito');
      setErrors(prev => ({
        ...prev,
        provider: 'Se requiere un proveedor para compras a crédito'
      }));
      return;
    }
    
    if (validateForm()) {
      // Preparar datos para enviar al servidor
      const submitData = { ...formData };
      
      // Asegurar que el código de barras esté correctamente formateado
      if (submitData.barcode) {
        submitData.barcode = submitData.barcode.trim();
        // Si después de limpiar está vacío, eliminar la propiedad
        if (submitData.barcode === '') {
          delete submitData.barcode;
        }
      }
      
      // Procesar el código de barras de unidades individuales para productos tipo paquete
      if (submitData.unitType === 'paquete' && submitData.unitBarcode) {
        submitData.unitBarcode = submitData.unitBarcode.trim();
        // Si después de limpiar está vacío, eliminar la propiedad
        if (submitData.unitBarcode === '') {
          delete submitData.unitBarcode;
        }
      } else if (submitData.unitType !== 'paquete') {
        // Si no es un producto tipo paquete, eliminar el campo unitBarcode
        delete submitData.unitBarcode;
      }
      
      // Procesar el código de barras de unidad de peso para productos por peso
      if (submitData.unitType === 'peso' && submitData.weightUnitBarcode) {
        submitData.weightUnitBarcode = submitData.weightUnitBarcode.trim();
        // Si después de limpiar está vacío, eliminar la propiedad
        if (submitData.weightUnitBarcode === '') {
          delete submitData.weightUnitBarcode;
        }
      } else if (submitData.unitType !== 'peso') {
        // Si no es un producto por peso, eliminar el campo weightUnitBarcode
        delete submitData.weightUnitBarcode;
      }
      
      // Manejar información del proveedor
      if (!isProvidedBySupplier) {
        submitData.provider = '';
        submitData.creditPurchase = {
          isCredit: false
        };
      }
      
      // Si no es un producto por peso, eliminar campos relacionados de peso
      if (submitData.unitType !== 'peso') {
        delete submitData.weightUnit;
        delete submitData.minWeight;
        
        if (submitData.unitType === 'paquete') {
          // Para productos tipo paquete, retenemos campos según el tipo de contenido
          if (submitData.packageContentType === 'unidad') {
            // Si el paquete contiene unidades, eliminamos peso pero mantenemos unidades
            delete submitData.packageWeight;
            // Aseguramos que unitsPerPackage sea un número
            submitData.unitsPerPackage = Number(submitData.unitsPerPackage);
            // Aseguramos que packageType tenga un valor válido
            if (!submitData.packageType) {
              submitData.packageType = 'paquete'; // Valor predeterminado
            }
          } else {
            // Si el paquete contiene peso, eliminamos unidades pero mantenemos peso
            delete submitData.unitsPerPackage;
            // Aseguramos que packageWeight sea un número
            submitData.packageWeight = Number(submitData.packageWeight);
            // Aseguramos que packageType tenga un valor válido
            if (!submitData.packageType) {
              submitData.packageType = 'saco'; // Valor predeterminado
            }
            // Aseguramos que weightUnit tenga un valor válido para contenido tipo peso
            if (!submitData.weightUnit) {
              submitData.weightUnit = 'lb'; // Valor predeterminado
            }
          }
        } else {
          // Si no es un paquete, eliminamos todos los campos relacionados
          delete submitData.packageWeight;
          delete submitData.unitsPerPackage;
          delete submitData.pricePerUnit;
        }
      }
      
      // Asegurarse de que los campos numéricos sean números
      ['purchasePrice', 'salePrice', 'quantity', 'minStock'].forEach(field => {
        if (submitData[field] !== undefined) {
          submitData[field] = Number(submitData[field]);
        }
      });
      
      // Si es un producto por peso, asegurarse de que los campos específicos sean números
      if (submitData.unitType === 'peso') {
        if (submitData.minWeight !== undefined) {
          submitData.minWeight = Number(submitData.minWeight);
        }
        
        if (hasBulkPackage && submitData.packageWeight !== undefined) {
          submitData.packageWeight = Number(submitData.packageWeight);
        } else {
          delete submitData.packageWeight;
        }
        
        // Agregar o eliminar campos relacionados con productos peso-paquete
        submitData.isWeightPackage = isWeightPackage;
        if (isWeightPackage && packageType) {
          submitData.packageType = packageType;
        } else {
          delete submitData.packageType;
          submitData.isWeightPackage = false;
        }
      }
  
      // Si no hay compra a crédito, limpiar esos campos
      if (!isCreditPurchase) {
        submitData.creditPurchase = {
          isCredit: false
        };
      } else {
        // Calcular fecha de vencimiento basada en el término de pago
        const dueDate = new Date();
        const term = submitData.creditPurchase.paymentTerm;
        
        if (term === '15dias') {
          dueDate.setDate(dueDate.getDate() + 15);
        } else if (term === '30dias') {
          dueDate.setDate(dueDate.getDate() + 30);
        } else if (term === '45dias') {
          dueDate.setDate(dueDate.getDate() + 45);
        } else if (term === '60dias') {
          dueDate.setDate(dueDate.getDate() + 60);
        }
        
        submitData.creditPurchase.dueDate = dueDate;
        submitData.creditPurchase.isPaid = false;
      }
      
      // Manejar imagen - eliminar campos de preview del submit
      delete submitData.imagePreview;
      
      clearSave();
      onSubmit(submitData);
    }
  };

  const handleTogglePriceMode = () => {
    setIsPricePerUnitMode(!isPricePerUnitMode);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, image: 'El archivo debe ser una imagen' }));
        return;
      }
      // Validar tamaño máximo (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'La imagen no puede exceder 5MB' }));
        return;
      }
      setFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file)
      }));
      setErrors(prev => ({ ...prev, image: '' }));
    }
  };

  const handleRemoveImage = () => {
    if (formData.imagePreview) {
      URL.revokeObjectURL(formData.imagePreview);
    }
    setFormData(prev => ({
      ...prev,
      image: null,
      imagePreview: null
    }));
  };

  return (
    <>
      {showRestoreBanner && (
        <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <RotateCcw size={22} className="text-amber-600" />
            <span className="text-amber-800 font-medium">Tienes un borrador guardado — ¿Restaurar?</span>
          </div>
          <div className="flex gap-2">
            <motion.button
              type="button"
              onClick={handleRestoreDraft}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Sí, restaurar
            </motion.button>
            <motion.button
              type="button"
              onClick={handleDiscardDraft}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium border-2 border-gray-300 hover:bg-gray-100 transition-colors flex items-center gap-1"
            >
              <Trash2 size={16} />
              Descartar
            </motion.button>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto p-6" style={{ maxHeight: "90vh", overflowY: "auto" }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 mb-5 bg-white p-4 rounded-xl shadow-sm border-2 border-gray-200 hover:shadow-md transition-all duration-200">
          <label className="block text-lg font-medium text-gray-800 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Nombre del Producto
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full p-4 text-lg border-2 rounded-lg ${errors.name ? 'border-red-500 focus:border-red-600' : 'border-blue-300 focus:border-blue-500'} focus:ring focus:ring-blue-200 focus:ring-opacity-50`}
            placeholder="Ingrese el nombre del producto"
            required
          />
          {errors.name && <span className="text-red-500 text-sm mt-2 block">{errors.name}</span>}
        </div>

        <div className="mb-5 relative bg-white p-4 rounded-xl shadow-sm border-2 border-gray-200 hover:shadow-md transition-all duration-200">
          <label className="block text-lg font-medium text-gray-800 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
              <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
              <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
            </svg>
            Código de Barras {isScanning && <span className="text-blue-500 ml-2 animate-pulse">Escaneando...</span>}
          </label>
          <div className="relative">
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              onBlur={(e) => {
                // Asegurar que el código de barras no esté vacío y sea un string
                if (e.target.value.trim() !== '') {
                  setFormData(prev => ({
                    ...prev,
                    barcode: e.target.value.trim()
                  }));
                }
              }}
              className={`w-full p-4 text-lg border-2 rounded-lg pl-10 ${isScanning ? 'border-blue-500 bg-blue-50' : errors.barcode ? 'border-red-500' : 'border-gray-300 focus:border-gray-500'} focus:ring focus:ring-gray-200 focus:ring-opacity-50`}
              placeholder="Escanee o ingrese código de barras"
              autoComplete="off"
            />
            <span className="absolute left-3 top-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </span>
          </div>
          {errors.barcode && <span className="text-red-500 text-sm mt-2 block">{errors.barcode}</span>}
          {barcodeBuffer && (
            <div className="mt-2 text-sm bg-blue-50 p-2 rounded-lg border border-blue-200 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Código detectado: <span className="font-mono font-medium ml-1">{barcodeBuffer}</span>
            </div>
          )}
        </div>
      </div>

      {/* Campo de Imagen del Producto */}
      <div className="mb-5 bg-white p-4 rounded-xl shadow-sm border-2 border-gray-200 hover:shadow-md transition-all duration-200">
        <label className="block text-lg font-medium text-gray-800 mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-pink-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          Imagen del Producto <span className="text-gray-400 text-sm font-normal ml-2">(Opcional)</span>
        </label>
        
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {/* Preview de imagen */}
          {(formData.imagePreview || initialData?.image?.url) && (
            <div className="relative flex-shrink-0">
              <img 
                src={formData.imagePreview || initialData?.image?.url} 
                alt="Preview" 
                className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Input de archivo */}
          <div className="flex-1 w-full">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-pink-50 file:text-pink-700
                hover:file:bg-pink-100
                file:transition-colors
              "
            />
            <p className="text-xs text-gray-400 mt-2">
              Formatos aceptados: JPG, PNG, GIF, WEBP. Tamaño máximo: 5MB
            </p>
            {errors.image && <span className="text-red-500 text-sm mt-1 block">{errors.image}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="mb-5 bg-white p-4 rounded-xl shadow-sm border-2 border-gray-200 hover:shadow-md transition-all duration-200">
          <label className="block text-lg font-medium text-gray-800 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            Tipo de Unidad
          </label>
          <div className="relative">
            <select
              name="unitType"
              value={formData.unitType}
              onChange={handleChange}
              className="w-full p-4 text-lg border-2 rounded-lg border-purple-300 focus:border-purple-500 focus:ring focus:ring-purple-200 focus:ring-opacity-50 appearance-none pl-4 pr-10"
            >
              <option value="unidad">Unidad</option>
              <option value="peso">Peso</option>
              <option value="paquete">Paquete</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
              <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-2 bg-purple-50 p-2 rounded-lg">
            Seleccione cómo se vende este producto
          </p>
          
          {/* Se eliminó la sección de checkbox "Este producto también es tipo paquete" */}
        </div>

        <div className="mb-5 bg-white p-4 rounded-xl shadow-sm border-2 border-gray-200 hover:shadow-md transition-all duration-200">
          <label className="block text-lg font-medium text-gray-800 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 000 2 1 1 0 000-2z" clipRule="evenodd" />
            </svg>
            {isByWeight 
              ? `Cantidad en Inventario` 
              : 'Cantidad en Inventario'}
          </label>
          <div className="relative">
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="0"
              step={isByWeight ? "0.01" : "1"}
              className="w-full p-4 text-lg border-2 rounded-lg border-green-300 focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
              placeholder={isByWeight ? "Ej: 10.5" : "Ej: 10"}
              required
            />
            {isByWeight && (
              <span className="absolute right-3 top-4 text-base font-medium text-gray-500">
                {isWeightPackage ? 'paquetes' : formData.weightUnit || 'lb'}
              </span>
            )}
          </div>
          <p className="text-xs text-green-600 mt-2 bg-green-50 p-2 rounded-lg">
            {isByWeight 
              ? isWeightPackage 
                ? 'Cantidad total disponible en paquetes' 
                : `Cantidad total disponible en ${formData.weightUnit || 'lb'}` 
              : 'Número de unidades disponibles en inventario'}
          </p>
        </div>  
      </div>

      {/* Campos específicos para productos por peso */}
      {isByWeight && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl mb-6 shadow-sm border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4 border-b border-blue-200 pb-3">
            <Scale size={22} className="text-blue-600" />
            <h3 className="font-semibold text-lg text-blue-800">Configuración de Producto por Peso</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
              <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Unidad de Peso
              </label>
              <select
                name="weightUnit"
                value={formData.weightUnit || 'lb'}
                onChange={handleChange}
                className="w-full p-4 text-lg border-2 rounded-lg border-blue-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              >
                <option value="kg">Kilogramos (kg)</option>
                <option value="g">Gramos (g)</option>
                <option value="lb">Libras (lb)</option>
                <option value="oz">Onzas (oz)</option>
              </select>
              <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg">
                Esta unidad se usará para todas las operaciones de peso
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
              <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                </svg>
                Peso Mínimo
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="minWeight"
                  value={formData.minWeight}
                  onChange={handleChange}
                  min="0.001"
                  step="0.001"
                  className="w-full p-4 text-lg border-2 rounded-lg border-blue-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="absolute right-3 top-4 text-base font-medium text-gray-500">{formData.weightUnit || 'lb'}</span>
              </div>
              <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg">
                Peso mínimo que se puede vender de este producto
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 col-span-2">
              <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
                  <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" />
                </svg>
                Código de Barras para Unidad de Peso
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="weightUnitBarcode"
                  value={formData.weightUnitBarcode}
                  onChange={handleChange}
                  className="w-full p-4 text-lg border-2 rounded-lg border-blue-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  placeholder={`Escanee o ingrese el código de barras para venta por ${formData.weightUnit || 'lb'}`}
                />
              </div>
              <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg">
                Este código se usará para crear un producto separado para vender por {formData.weightUnit || 'lb'}
              </p>
            </div>
          </div>
          
          {!isByWeight && (
            <div className="mt-6 p-5 bg-indigo-50 rounded-xl border-2 border-indigo-200 shadow-sm">
              <h4 className="font-medium text-indigo-800 mb-4 flex items-center border-b border-indigo-200 pb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                  <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Configuración de Paquete/Saco
              </h4>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100 mb-6">
                <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  Tipo de Contenido del Paquete
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    className={`flex items-center justify-center p-4 rounded-lg border-2 ${formData.packageContentType === 'unidad' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 bg-white text-gray-700'}`}
                    onClick={() => setFormData(prev => ({ ...prev, packageContentType: 'unidad' }))}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Unidades
                  </button>
                  <button
                    type="button"
                    className={`flex items-center justify-center p-4 rounded-lg border-2 ${formData.packageContentType === 'peso' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 bg-white text-gray-700'}`}
                    onClick={() => setFormData(prev => ({ ...prev, packageContentType: 'peso' }))}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                    Peso
                  </button>
                </div>
                <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">
                  Seleccione si el paquete contendrá unidades individuales o peso. Esto afectará cómo se manejan los productos derivados de este paquete.
                </p>
              </div>

              {/* Se eliminó el selector de unidad de peso duplicado */}
              
              {formData.packageContentType === 'peso' && (
                <>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100 mb-6">
                    <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                        <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                      </svg>
                      Tipo de Paquete
                    </label>
                    <select
                      name="packageType"
                      value={formData.packageType}
                      onChange={handleChange}
                      className="w-full p-4 text-lg border-2 rounded-lg border-teal-300 focus:border-teal-500 focus:ring focus:ring-teal-200 focus:ring-opacity-50"
                    >
                      <option value="">Seleccione un tipo</option>
                      <option value="saco">Saco</option>
                      <option value="envase">Envase</option>
                      <option value="frasco">Frasco</option>
                      <option value="bolsa">Bolsa</option>
                      <option value="caja">Caja</option>
                      <option value="faldon">Faldón</option>
                      <option value="otro">Otro</option>
                    </select>
                    {errors.packageType && <span className="text-red-500 text-sm mt-2 block">{errors.packageType}</span>}
                    <p className="text-xs text-teal-600 mt-2 bg-teal-50 p-2 rounded-lg">
                      Seleccione el tipo de contenedor que se utilizará para el producto por peso.
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100 mb-6">
                    <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                      </svg>
                      Unidad de Peso
                    </label>
                    <select
                      name="weightUnit"
                      value={formData.weightUnit || 'lb'}
                      onChange={handleChange}
                      className="w-full p-4 text-lg border-2 rounded-lg border-teal-300 focus:border-teal-500 focus:ring focus:ring-teal-200 focus:ring-opacity-50"
                    >
                      <option value="lb">Libra (lb)</option>
                      <option value="oz">Onza (oz)</option>
                      <option value="kg">Kilogramo (kg)</option>
                      <option value="gr">Gramo (gr)</option>
                    </select>
                    <p className="text-xs text-teal-600 mt-2 bg-teal-50 p-2 rounded-lg">
                      Seleccione la unidad de peso que se utilizará para este producto.
                    </p>
                  </div>
                </>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
                  <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                    {formData.packageContentType === 'unidad' ? 'Unidades por Paquete' : 'Peso del Paquete/Saco'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name={formData.packageContentType === 'unidad' ? 'unitsPerPackage' : 'packageWeight'}
                      value={formData.packageContentType === 'unidad' ? formData.unitsPerPackage : formData.packageWeight}
                      onChange={handleChange}
                      min="0.01"
                      step="0.01"
                      className={`w-full p-4 text-lg border-2 rounded-lg ${errors.packageWeight ? 'border-red-500' : 'border-indigo-300 focus:border-indigo-500'} focus:ring focus:ring-indigo-200 focus:ring-opacity-50`}
                      placeholder={formData.packageContentType === 'unidad' ? 'Ej: 24' : 'Ej: 100'}
                    />
                    <span className="absolute right-3 top-4 text-base font-medium text-gray-500">
                      {formData.packageContentType === 'unidad' ? 'unidades' : (formData.weightUnit || 'lb')}
                    </span>
                  </div>
                  {formData.packageContentType === 'unidad' ?
                    (errors.unitsPerPackage && <span className="text-red-500 text-sm mt-2 block">{errors.unitsPerPackage}</span>) :
                    (errors.packageWeight && <span className="text-red-500 text-sm mt-2 block">{errors.packageWeight}</span>)
                  }
                  <p className="text-xs text-indigo-600 mt-2 bg-indigo-50 p-2 rounded-lg">
                    {formData.packageContentType === 'unidad' 
                      ? 'Cantidad de unidades contenidas en el paquete' 
                      : 'Peso total del paquete o saco completo'}
                  </p>
                </div>
                
                

                <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
                  <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    {formData.packageContentType === 'unidad' 
                      ? 'Precio por Unidad' 
                      : `Precio por ${formData.weightUnit || 'lb'}`}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-4 text-lg font-medium text-gray-600">$</span>
                    <input
                      type="number"
                      name="pricePerUnit"
                      value={formData.pricePerUnit}
                      onChange={handleChange}
                      min="0.01"
                      step="0.01"
                      className="w-full p-4 pl-8 text-lg border-2 rounded-lg border-indigo-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      placeholder={formData.packageContentType === 'unidad' ? 'Precio por unidad' : `Precio por ${formData.weightUnit || 'lb'}`}
                    />
                  </div>
                  {errors.pricePerUnit && <span className="text-red-500 text-sm mt-2 block">{errors.pricePerUnit}</span>}
                  
                  <div className="mt-3 bg-indigo-50 p-3 rounded-lg">
                    <p className="text-sm text-indigo-700 font-medium">
                      Precio total del paquete: <span className="text-lg">
                      ${formData.packageContentType === 'unidad' 
                        ? ((formData.unitsPerPackage || 0) * (formData.pricePerUnit || 0)).toFixed(2)
                        : ((formData.packageWeight || 0) * (formData.pricePerUnit || 0)).toFixed(2)}
                      </span>
                    </p>
                    
                    {formData.purchasePrice > 0 && formData.pricePerUnit > 0 && (
                      (formData.packageContentType === 'unidad' && formData.unitsPerPackage > 0) || 
                      (formData.packageContentType === 'peso' && formData.packageWeight > 0)
                    ) && (
                      <p className="text-sm text-green-700 font-medium mt-2 bg-green-50 p-2 rounded-lg">
                        Rentabilidad: ${
                          formData.packageContentType === 'unidad' 
                            ? (((formData.unitsPerPackage * formData.pricePerUnit) - formData.purchasePrice)).toFixed(2)
                            : (((formData.packageWeight * formData.pricePerUnit) - formData.purchasePrice)).toFixed(2)
                        } 
                        <span className="ml-1 px-2 py-1 bg-green-100 rounded-md">
                          {
                            formData.packageContentType === 'unidad' 
                              ? (((formData.unitsPerPackage * formData.pricePerUnit) - formData.purchasePrice) / formData.purchasePrice * 100).toFixed(1)
                              : (((formData.packageWeight * formData.pricePerUnit) - formData.purchasePrice) / formData.purchasePrice * 100).toFixed(1)
                          }%
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección de configuración de paquete/saco movida al div de tipo de unidad en la parte superior */}
            </div>
          )}
        </div>
      )}
      
      {/* Campos específicos para productos tipo paquete */}
      {isPackage && (
        <div className="mt-6 p-5 bg-amber-50 rounded-xl border-2 border-amber-200 shadow-sm">
          <h4 className="font-medium text-amber-800 mb-4 flex items-center border-b border-amber-200 pb-2">
            <ShoppingBag size={20} className="mr-2 text-amber-600" />
            Configuración de Producto en Paquete
          </h4>
          
          {/* Botones para seleccionar tipo de contenido */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-amber-100">
            <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Tipo de Contenido del Paquete
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className={`flex items-center justify-center p-4 rounded-lg border-2 ${formData.packageContentType === 'unidad' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 bg-white text-gray-700'}`}
                onClick={() => setFormData(prev => ({ ...prev, packageContentType: 'unidad' }))}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Unidad
              </button>
              <button
                type="button"
                className={`flex items-center justify-center p-4 rounded-lg border-2 ${formData.packageContentType === 'peso' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 bg-white text-gray-700'}`}
                onClick={() => setFormData(prev => ({ ...prev, packageContentType: 'peso' }))}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                Peso
              </button>
            </div>
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">
              Seleccione si el paquete contendrá unidades individuales o peso.
            </p>
          </div>

          {/* Selector de unidad de peso - Solo visible cuando el tipo de contenido es peso */}
          {formData.packageContentType === 'peso' && (
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-amber-100">
              <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
                Unidad de Peso
              </label>
              <select
                name="weightUnit"
                value={formData.weightUnit || 'lb'}
                onChange={(e) => setFormData(prev => ({ ...prev, weightUnit: e.target.value }))}
                className="w-full p-4 text-lg border-2 rounded-lg border-amber-300 focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
              >
                <option value="lb">Libra (lb)</option>
                <option value="oz">Onza (oz)</option>
                <option value="kg">Kilogramo (kg)</option>
                <option value="gr">Gramo (gr)</option>
              </select>
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">
                Seleccione la unidad de peso que se utilizará para este producto.
              </p>
            </div>
          )}
          
          {/* Selector de tipo de paquete */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-amber-100">
            <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Tipo de Paquete
            </label>
            <select
              name="packageType"
              value={formData.packageType}
              onChange={(e) => setFormData(prev => ({ ...prev, packageType: e.target.value }))}
              className={`w-full p-4 text-lg border-2 rounded-lg ${errors.packageType ? 'border-red-500' : 'border-amber-300'} focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50 appearance-none`}
            >
              <option value="">Seleccione tipo de paquete</option>
              <option value="saco">Saco</option>
              <option value="caja">Caja</option>
              <option value="paquete">Paquete</option>
              <option value="faldo">Faldo</option>
              <option value="envase">Envase</option>
            </select>
            {errors.packageType ? (
              <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded-lg font-medium">
                {errors.packageType}
              </p>
            ) : (
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">
                Seleccione el tipo de paquete que se utilizará para el producto.
              </p>
            )}
          </div>
          
          {/* Campo para el peso del paquete */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-amber-100">
            <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V5z" clipRule="evenodd" />
              </svg>
              {formData.packageContentType === 'peso' ? 'Peso del Paquete' : 'Cantidad en el Paquete'}
            </label>
            <div className="flex items-center">
              <input
                type="number"
                step="0.01"
                min="0"
                name="packageWeight"
                value={formData.packageWeight}
                onChange={handleChange}
                className={`w-full p-4 text-lg border-2 rounded-lg ${errors.packageWeight ? 'border-red-500' : 'border-amber-300'} focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50 appearance-none`}
                placeholder="0.00"
                required
              />
              <span className="ml-2 font-medium text-gray-600">
                {formData.packageContentType === 'peso' ? 'lb' : 'unidades'}
              </span>
            </div>
            {errors.packageWeight ? (
              <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded-lg font-medium">
                {errors.packageWeight}
              </p>
            ) : (
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">
                {formData.packageContentType === 'peso' ? 
                  'Ingrese el peso total del paquete en libras.' : 
                  'Ingrese la cantidad de unidades contenidas en el paquete.'}
              </p>
            )}
          </div>
          
          {/* Campo para unidades por paquete - REQUERIDO por el backend */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-amber-100">
            <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 1a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm4-4a1 1 0 100 2h.01a1 1 0 100-2H13zM9 9a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zM7 8a1 1 0 000 2h.01a1 1 0 000-2H7z" clipRule="evenodd" />
              </svg>
              Unidades por Paquete
            </label>
            <div className="flex items-center">
              <input
                type="number"
                step="0.01"
                min="1"
                name="unitsPerPackage"
                value={formData.unitsPerPackage || (formData.packageContentType === 'peso' ? formData.packageWeight : '')}
                onChange={handleChange}
                className={`w-full p-4 text-lg border-2 rounded-lg ${errors.unitsPerPackage ? 'border-red-500' : 'border-amber-300'} focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50 appearance-none`}
                placeholder="1.00"
                required
              />
              <span className="ml-2 font-medium text-gray-600">
                {formData.packageContentType === 'peso' ? 'lb' : 'unidades'}
              </span>
            </div>
            {errors.unitsPerPackage ? (
              <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded-lg font-medium">
                {errors.unitsPerPackage}
              </p>
            ) : (
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">
                {formData.packageContentType === 'peso' ? 
                  'El número de libras por paquete. Campo obligatorio.' : 
                  'El número de unidades individuales por paquete. Campo obligatorio.'}
              </p>
            )}
          </div>

          {/* Campo para precio por unidad derivada (libra o unidad) */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-amber-100">
            <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-14a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 8.586V5z" clipRule="evenodd" />
              </svg>
              {`Precio por ${formData.packageContentType === 'peso' ? 'libra' : 'unidad'}`}
            </label>
            <div className="flex items-center">
              <input
                type="number"
                step="0.01"
                min="0"
                name="pricePerUnit"
                value={formData.pricePerUnit}
                onChange={handleChange}
                className="w-full p-4 text-lg border-2 rounded-lg border-amber-300 focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50 appearance-none"
                placeholder="0.00"
              />
              <span className="ml-2 font-medium text-gray-600">$</span>
            </div>
            {formData.salePrice && formData.packageWeight ? (
              <p className="text-xs text-teal-600 mt-2 bg-teal-50 p-2 rounded-lg">
                Precio calculado: ${(formData.salePrice / formData.packageWeight).toFixed(2)} por {formData.packageContentType === 'peso' ? 'libra' : 'unidad'}
              </p>
            ) : (
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">
                {`El precio por ${formData.packageContentType === 'peso' ? 'libra' : 'unidad'} se puede calcular automáticamente basado en el precio total y ${formData.packageContentType === 'peso' ? 'peso' : 'cantidad'}.`}
              </p>
            )}
          </div>
          
          {/* Campo para código de barras de la unidad derivada */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-amber-100">
            <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h12v12H4V4zm3 3a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 100 2h-6a1 1 0 100-2h6z" clipRule="evenodd" />
              </svg>
              {`Código de barras por ${formData.packageContentType === 'peso' ? 'libra' : 'unidad'}`}
            </label>
            <div className="flex items-center">
              <input
                type="text"
                name="unitBarcode"
                value={formData.unitBarcode}
                onChange={handleChange}
                className="w-full p-4 text-lg border-2 rounded-lg border-amber-300 focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50 appearance-none"
                placeholder="Código de barras opcional para unidades individuales"
              />
              <button
                type="button"
                className="ml-2 p-3 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-all"
                onClick={() => {
                  // Generar un código de barras para unidades derivadas basado en el código principal
                  if (formData.barcode) {
                    handleChange({
                      target: {
                        name: 'unitBarcode',
                        value: `${formData.barcode.substring(0, 4)}${formData.packageContentType === 'peso' ? 'P' : 'U'}`
                      }
                    });
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">
              {`Código de barras opcional para las ${formData.packageContentType === 'peso' ? 'libras' : 'unidades'} individuales. Se puede generar automáticamente.`}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-amber-100">
              <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z" />
                </svg>
                Unidades por Paquete
              </label>
              <input
                type="number"
                name="unitsPerPackage"
                value={formData.unitsPerPackage}
                onChange={handleChange}
                min="1"
                step="1"
                className={`w-full p-4 text-lg border-2 rounded-lg ${errors.unitsPerPackage ? 'border-red-500 focus:border-red-600' : 'border-amber-300 focus:border-amber-500'} focus:ring focus:ring-amber-200 focus:ring-opacity-50`}
                placeholder="Ej: 12 unidades"
              />
              {errors.unitsPerPackage && <span className="text-red-500 text-sm mt-2 block">{errors.unitsPerPackage}</span>}
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">
                Número de unidades individuales en cada paquete
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-amber-100">
              <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
                Código de Barras de la Unidad
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="unitBarcode"
                  value={formData.unitBarcode}
                  onChange={handleChange}
                  className={`w-full p-4 text-lg border-2 rounded-lg pl-10 ${errors.unitBarcode ? 'border-red-500' : 'border-amber-300 focus:border-amber-500'} focus:ring focus:ring-amber-200 focus:ring-opacity-50`}
                  placeholder="Código de barras de la unidad individual"
                  autoComplete="off"
                />
                <span className="absolute left-3 top-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1zM13 12a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1v-3a1 1 0 00-1-1h-3zm1 2v1h1v-1h-1z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
              {errors.unitBarcode && <span className="text-red-500 text-sm mt-2 block">{errors.unitBarcode}</span>}
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">
                Código de barras opcional para las unidades individuales dentro del paquete
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-amber-100">
              <label className="block text-base font-medium text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                Precio por Unidad Individual
              </label>
              <div className="relative">
                <span className="absolute left-4 top-4 text-lg font-medium text-gray-600">$</span>
                <input
                  type="number"
                  name="pricePerUnit"
                  value={formData.pricePerUnit}
                  onChange={handleChange}
                  min="0.01"
                  step="0.01"
                  className="w-full p-4 pl-8 text-lg border-2 rounded-lg border-amber-300 focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
                  placeholder="Precio por unidad individual"
                />
              </div>
              
              <div className="mt-3 bg-amber-50 p-3 rounded-lg">
                <p className="text-sm text-amber-700 font-medium">
                  Precio del paquete completo: <span className="text-lg">${((formData.unitsPerPackage || 0) * (formData.pricePerUnit || 0)).toFixed(2)}</span>
                </p>
                
                {formData.purchasePrice > 0 && formData.unitsPerPackage > 0 && formData.pricePerUnit > 0 && (
                  <p className="text-sm text-green-700 font-medium mt-2 bg-green-50 p-2 rounded-lg">
                    Rentabilidad: ${(((formData.unitsPerPackage * formData.pricePerUnit) - formData.purchasePrice)).toFixed(2)} 
                    <span className="ml-1 px-2 py-1 bg-green-100 rounded-md">
                      {(((formData.unitsPerPackage * formData.pricePerUnit) - formData.purchasePrice) / formData.purchasePrice * 100).toFixed(1)}%
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="mb-5 bg-white p-4 rounded-xl shadow-sm border-2 border-gray-200 hover:shadow-md transition-all duration-200">
          <label className="block text-lg font-medium text-gray-800 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
            Stock Mínimo
          </label>
          <div className="relative">
            <input
              type="number"
              name="minStock"
              value={formData.minStock}
              onChange={handleChange}
              min="0"
              step={isByWeight ? "0.01" : "1"}
              className={`w-full p-4 text-lg border-2 rounded-lg ${errors.minStock ? 'border-red-500 focus:border-red-600' : 'border-red-300 focus:border-red-500'} focus:ring focus:ring-red-200 focus:ring-opacity-50`}
              placeholder={isByWeight ? "Ej: 5.5" : "Ej: 5"}
            />
            {isByWeight && (
              <span className="absolute right-3 top-4 text-base font-medium text-gray-500">{formData.weightUnit || 'lb'}</span>
            )}
          </div>
          {errors.minStock && <span className="text-red-500 text-sm mt-2 block">{errors.minStock}</span>}
          <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded-lg">
            Cantidad mínima para alertas de inventario bajo
          </p>
        </div>

        <div className="mb-5 bg-white p-4 rounded-xl shadow-sm border-2 border-gray-200 hover:shadow-md transition-all duration-200 col-span-2">
          <label className="block text-lg font-medium text-gray-800 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            Categoría
          </label>
          <div className="relative">
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`w-full p-4 text-lg border-2 rounded-lg ${errors.category ? 'border-red-500 focus:border-red-600' : 'border-blue-300 focus:border-blue-500'} focus:ring focus:ring-blue-200 focus:ring-opacity-50 appearance-none pl-4 pr-10`}
              required
            >
              <option value="">Seleccionar categoría</option>
              {categories?.map(cat => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
              <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          {errors.category && <span className="text-red-500 text-sm mt-2 block">{errors.category}</span>}
          <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg">
            Seleccione la categoría a la que pertenece este producto
          </p>
        </div>
      </div>

      {/* Sección de Porcentaje de Ganancia y Precios */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-xl mb-8 shadow-md border-2 border-green-200">
        <div className="flex items-center gap-3 mb-5 border-b border-green-200 pb-4">
          <CreditCard size={26} className="text-green-600" />
          <h3 className="font-semibold text-xl text-green-800">Configuración de Precios y Ganancia</h3>
        </div>
        
        <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <input
            type="checkbox"
            id="autoApplyProfit"
            checked={autoApplyProfit}
            onChange={() => setAutoApplyProfit(!autoApplyProfit)}
            className="h-6 w-6 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="autoApplyProfit" className="text-lg font-medium text-gray-700 cursor-pointer select-none">
            Aplicar porcentaje de ganancia automáticamente
          </label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border-2 border-green-200 hover:shadow-md transition-all duration-200">
            <label className="block text-lg font-medium text-gray-800 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
              Precio de Compra
            </label>
            <div className="relative">
              <span className="absolute left-4 top-4 text-xl font-medium text-gray-600">$</span>
              <input
                type="number"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full p-4 pl-8 text-xl font-medium border-2 rounded-lg ${errors.purchasePrice ? 'border-red-500' : 'border-green-400 focus:border-green-500'} focus:ring focus:ring-green-200 focus:ring-opacity-50`}
                required
              />
            </div>
            {errors.purchasePrice && <span className="text-red-500 text-sm mt-2 block">{errors.purchasePrice}</span>}
            
            {isCreditPurchase && (
              <p className="text-sm text-amber-600 mt-2 flex items-center bg-amber-50 p-2 rounded-lg">
                <CreditCard size={16} className="mr-2" />
                Compra a crédito con plazo de {
                  formData.creditPurchase.paymentTerm === '15dias' ? '15 días' :
                  formData.creditPurchase.paymentTerm === '30dias' ? '30 días' :
                  formData.creditPurchase.paymentTerm === '45dias' ? '45 días' :
                  formData.creditPurchase.paymentTerm === '60dias' ? '60 días' : 'plazo variable'
                }
              </p>
            )}
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border-2 border-blue-200 hover:shadow-md transition-all duration-200">
            <label className="block text-lg font-medium text-gray-800 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              Porcentaje de Ganancia
            </label>
            <div className="relative">
              <input
                type="number"
                name="profitPercentage"
                value={formData.profitPercentage}
                onChange={handleChange}
                min="0"
                step="0.1"
                className="w-full p-4 pr-10 text-xl font-medium border-2 rounded-lg border-blue-400 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                placeholder="Ej: 30"
              />
              <span className="absolute right-4 top-4 text-xl font-medium text-gray-600">%</span>
            </div>
            <div className="mt-3 bg-blue-50 p-2 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">
                Ganancia: ${((formData.purchasePrice || 0) * (formData.profitPercentage || 0) / 100).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border-2 border-purple-200 hover:shadow-md transition-all duration-200">
            <label className="block text-lg font-medium text-gray-800 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
              {isByWeight && !hasBulkPackage 
                ? `Precio de Venta (por ${formData.weightUnit || 'lb'})` 
                : 'Precio de Venta'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-4 text-xl font-medium text-gray-600">$</span>
              <input
                type="number"
                name="salePrice"
                value={formData.salePrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full p-4 pl-8 text-xl font-medium border-2 rounded-lg ${errors.salePrice ? 'border-red-500' : 'border-purple-400 focus:border-purple-500'} focus:ring focus:ring-purple-200 focus:ring-opacity-50`}
                required
              />
            </div>
            {errors.salePrice && <span className="text-red-500 text-sm mt-2 block">{errors.salePrice}</span>}
            
            <div className="mt-3 bg-purple-50 p-2 rounded-lg">
              <p className="text-sm text-purple-700 font-medium">
                Rentabilidad: {((formData.salePrice - formData.purchasePrice) / formData.purchasePrice * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* La sección de categoría y stock mínimo ya está implementada arriba */}

      <div className="mb-8 bg-white p-5 rounded-xl shadow-sm border-2 border-teal-200 hover:shadow-md transition-all duration-200">
        <label className="block text-lg font-medium text-gray-800 mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
          </svg>
          Proveedor
        </label>
        
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="isProvidedBySupplier"
            checked={isProvidedBySupplier}
            onChange={() => setIsProvidedBySupplier(!isProvidedBySupplier)}
            className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
          />
          <label htmlFor="isProvidedBySupplier" className="text-base text-gray-700">
            Este producto es suministrado por un proveedor específico
          </label>
        </div>
        
        {isProvidedBySupplier && (
          <div className="space-y-4">
            <div className="relative">
              <select
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                className={`w-full p-4 text-lg border-2 rounded-lg ${errors.provider ? 'border-red-500 focus:border-red-600' : 'border-teal-300 focus:border-teal-500'} focus:ring focus:ring-teal-200 focus:ring-opacity-50 appearance-none pl-4 pr-10`}
              >
                <option value="">Seleccionar proveedor</option>
                {providers?.map(provider => (
                  <option key={provider._id} value={provider._id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            {errors.provider && <span className="text-red-500 text-sm block">{errors.provider}</span>}
            
            <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg">
              <input
                type="checkbox"
                id="isCreditPurchase"
                checked={isCreditPurchase}
                onChange={() => setIsCreditPurchase(!isCreditPurchase)}
                className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
              />
              <label htmlFor="isCreditPurchase" className="text-base text-teal-700">
                Compra a crédito
              </label>
            </div>
            
            {isCreditPurchase && (
              <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                <label className="block text-base font-medium text-teal-800 mb-2">
                  Plazo de pago
                </label>
                <select
                  name="creditPurchase.paymentTerm"
                  value={formData.creditPurchase.paymentTerm}
                  onChange={handleChange}
                  className="w-full p-3 text-base border-2 rounded-lg border-teal-300 focus:border-teal-500 focus:ring focus:ring-teal-200 focus:ring-opacity-50 appearance-none"
                >
                  {PAYMENT_TERMS.map(term => (
                    <option key={term.value} value={term.value}>
                      {term.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        
        <p className="text-xs text-teal-600 mt-4 bg-teal-50 p-2 rounded-lg">
          Seleccione el proveedor que suministra este producto para un mejor seguimiento de inventario
        </p>
      </div>

      <div className="mb-8 bg-white p-5 rounded-xl shadow-sm border-2 border-gray-200 hover:shadow-md transition-all duration-200">
        <label className="block text-lg font-medium text-gray-800 mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
          Descripción del Producto
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="5"
          className="w-full p-5 text-lg border-2 rounded-lg border-purple-300 focus:border-purple-500 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
          placeholder="Ingrese una descripción detallada del producto, características, beneficios, etc..."
        />
        <p className="text-xs text-purple-600 mt-2 bg-purple-50 p-2 rounded-lg">
          Una buena descripción ayuda a identificar mejor el producto y facilita las búsquedas
        </p>
      </div>

      <div className="flex justify-end space-x-5 pt-8 border-t-2 border-gray-200 mt-8 bg-gray-50 p-5 rounded-xl shadow-inner">
        <motion.button
          type="button"
          onClick={onClose}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 bg-white text-gray-700 rounded-xl font-medium text-lg flex items-center gap-2 border-2 border-gray-300 shadow-md hover:bg-gray-100 transition-all duration-200"
        >
          <X size={22} className="text-gray-600" />
          Cancelar
        </motion.button>
        
        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium text-lg flex items-center gap-2 border-2 border-blue-700 shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
        >
          <Save size={22} />
          Guardar Producto
        </motion.button>
      </div>
    </form>
    </>
  );
};

export default ProductForm;