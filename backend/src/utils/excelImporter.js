import xlsx from 'xlsx';
import fs from 'fs';
import { Product } from '../models/Product.js';

/**
 * Convierte un archivo Excel a un array de objetos JSON según la estructura del modelo de Producto
 * @param {string} filePath - Ruta del archivo Excel
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.saveToFile - Indica si se debe guardar el resultado en un archivo JSON
 * @param {string} options.outputFile - Nombre del archivo JSON de salida (si saveToFile es true)
 * @param {string} options.defaultCategory - ID de categoría por defecto (opcional)
 * @param {string} options.defaultUnitType - Tipo de unidad por defecto ('unidad', 'peso', 'paquete')
 * @param {Object} options.userId - ID del usuario que realiza la importación
 * @returns {Array} - Array de objetos JSON con los productos
 */
export const convertExcelToProductsJSON = async (filePath, options = {}) => {
  try {
    // Opciones por defecto
    const defaultOptions = {
      saveToFile: false,
      outputFile: 'productos.json',
      defaultCategory: null,
      defaultUnitType: 'unidad',
      userId: null
    };

    // Combinar opciones por defecto con las proporcionadas
    const config = { ...defaultOptions, ...options };

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo ${filePath} no existe`);
    }

    // Cargar el archivo Excel
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convertir a JSON
    const rawData = xlsx.utils.sheet_to_json(sheet, { raw: true });

    // Procesar los datos para adaptarlos al modelo de Producto
    const productos = rawData.map(row => {
      const keys = Object.keys(row);

      // Si la fila contiene "Total", eliminar esa columna
      if (keys.length > 0 && keys.includes('Total')) {
        delete row['Total'];
      }

      // Crear objeto de producto según el modelo
      const producto = {
        name: row.name || row.nombre || row.Nombre || '',
        barcode: row.barcode || row.codigo || row.Codigo || row.Barcode || '',
        quantity: row.quantity || row.cantidad || row.Cantidad || 0,
        salePrice: row.salePrice || row.precioVenta || row['Precio Venta'] || 0,
        purchasePrice: row.purchasePrice || row.precioCompra || row['Precio Compra'] || 0,
        minStock: row.minStock || row.stockMinimo || row['Stock Minimo'] || 10,
        unitType: row.unitType || row.tipoUnidad || row['Tipo Unidad'] || config.defaultUnitType,
        description: row.description || row.descripcion || row.Descripcion || '',
      };

      // Agregar categoría si se proporciona
      if (config.defaultCategory) {
        producto.category = config.defaultCategory;
      }

      // Agregar usuario que crea el producto
      if (config.userId) {
        producto.createdBy = config.userId;
      }

      return producto;
    });

    // Guardar en archivo JSON si se solicita
    if (config.saveToFile) {
      fs.writeFileSync(config.outputFile, JSON.stringify(productos, null, 2));
      console.log(`✅ Archivo JSON generado correctamente: ${config.outputFile}`);
    }

    return productos;
  } catch (error) {
    console.error('Error al convertir Excel a JSON:', error);
    throw error;
  }
};

/**
 * Importa productos desde un archivo Excel a la base de datos
 * @param {string} filePath - Ruta del archivo Excel
 * @param {Object} options - Opciones de configuración
 * @returns {Object} - Resultado de la importación
 */
export const importProductsFromExcel = async (filePath, options = {}) => {
  try {
    // Obtener los productos en formato JSON
    const productos = await convertExcelToProductsJSON(filePath, options);

    // Resultados de la importación
    const results = {
      total: productos.length,
      imported: 0,
      skipped: 0,
      errors: [],
      products: []
    };

    // Validar y guardar cada producto
    for (const producto of productos) {
      try {
        // Validar campos requeridos
        if (!producto.name || !producto.unitType) {
          results.skipped++;
          results.errors.push({
            product: producto.name || 'Sin nombre',
            error: 'Faltan campos requeridos (nombre o tipo de unidad)'
          });
          continue;
        }

        // Verificar si ya existe un producto con el mismo código de barras
        if (producto.barcode) {
          const existingProduct = await Product.findOne({ barcode: producto.barcode });
          if (existingProduct) {
            results.skipped++;
            results.errors.push({
              product: producto.name,
              barcode: producto.barcode,
              error: 'Ya existe un producto con este código de barras'
            });
            continue;
          }
        }

        // Crear el nuevo producto
        const newProduct = new Product(producto);
        await newProduct.save();

        // Actualizar resultados
        results.imported++;
        results.products.push({
          id: newProduct._id,
          name: newProduct.name,
          barcode: newProduct.barcode
        });
      } catch (error) {
        results.skipped++;
        results.errors.push({
          product: producto.name || 'Sin nombre',
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error al importar productos:', error);
    throw error;
  }
};
