import { getDb } from '../config/database.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import fs from 'fs';

const GENERAL_CATEGORY_NAME = 'Productos Generales';

// ─── Categoría por defecto ────────────────────────────────────────────
const ensureGeneralCategory = async () => {
  const q   = await Category.findOne({ name: GENERAL_CATEGORY_NAME });
  let cat   = await q;
  if (!cat) {
    cat = await Category.create({
      name: GENERAL_CATEGORY_NAME,
      description: 'Categoría por defecto para productos importados desde Excel'
    });
  }
  return cat;
};

// ─── Normalización de texto ───────────────────────────────────────────
const norm = (s) =>
  String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_.]/g, '').trim();

// ─── Keywords para detectar la fila de encabezados ───────────────────
const HEADER_KEYWORDS = [
  'nombre', 'name', 'descripcion', 'description', 'producto',
  'sku', 'codigo', 'barcode', 'clave',
  'costo', 'cost', 'precio', 'price',
  'cantidad', 'quantity'
];

// ─── Variantes de nombre de columna → campo ──────────────────────────
const COL_MAP = {
  name:          ['nombre', 'name', 'descripcion', 'description', 'producto', 'articulo', 'item', 'detalle', 'desc'],
  barcode:       ['sku', 'codigo', 'barcode', 'cod', 'codbar', 'ref', 'referencia', 'clave', 'ean', 'codigoproducto', 'codigodebarras', 'barras'],
  purchasePrice: ['costo', 'cost', 'precio_compra', 'preciocompra', 'costo_unitario', 'p.compra', 'pcompra', 'compra'],
  salePrice:     ['precio', 'price', 'precio_venta', 'precioventa', 'pvp', 'venta', 'p.venta', 'pventa'],
  quantity:      ['cantidad', 'quantity', 'qty', 'existencia', 'existencias', 'stock', 'inventario'],
  unitType:      ['tipo', 'type', 'unidad', 'unit', 'tipo_unidad'],
  minStock:      ['stockminimo', 'min_stock', 'minstock', 'stockmin', 'minimo'],
};

// ─── Detectar si una columna tiene valores que parecen códigos EAN ────
// Un código de barras es una cadena de 8+ dígitos numéricos
const columnLooksLikeBarcode = (rows, idx, sampleSize = 10) => {
  const vals = rows.slice(0, sampleSize)
    .map(r => String(r[idx] ?? '').trim())
    .filter(v => v !== '');
  if (vals.length === 0) return false;
  const numericLong = vals.filter(v => /^\d{7,}$/.test(v));
  return numericLong.length / vals.length >= 0.6;
};

// ─── Detectar si una columna tiene texto real (nombres de productos) ──
const columnLooksLikeName = (rows, idx, sampleSize = 10) => {
  const vals = rows.slice(0, sampleSize)
    .map(r => String(r[idx] ?? '').trim())
    .filter(v => v !== '');
  if (vals.length === 0) return false;
  const textual = vals.filter(v => /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(v));
  return textual.length / vals.length >= 0.5;
};

// ─── Encontrar TODOS los índices que coinciden con un campo ──────────
const findAllCandidates = (normHeaders, field) => {
  const candidates = [];
  const variants = COL_MAP[field];
  for (let i = 0; i < normHeaders.length; i++) {
    const h = normHeaders[i];
    if (variants.some(v => h === norm(v) || h.includes(norm(v)))) {
      candidates.push(i);
    }
  }
  return candidates;
};

// ─── Detectar fila de encabezados ────────────────────────────────────
const findHeaderRow = (rows) => {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const hits = row.map(norm).filter(v => HEADER_KEYWORDS.some(k => v.includes(k)));
    if (hits.length >= 2) return i;
  }
  return 0;
};

// ─── Construir el mapa de columnas con detección inteligente ─────────
const buildSmartColumnIndex = (headers, dataRows) => {
  const norms = headers.map(norm);
  const idx   = {};

  // Obtener todos los candidatos para nombre y barcode
  const nameCandidates    = findAllCandidates(norms, 'name');
  const barcodeCandidates = findAllCandidates(norms, 'barcode');

  // --- Resolución inteligente de nombre vs barcode ---
  // Si hay columnas con header "Nombre" que tienen valores numéricos → son barcode
  const confirmedBarcodeIdx = new Set(barcodeCandidates);
  let   confirmedNameIdx    = -1;

  for (const ci of nameCandidates) {
    if (columnLooksLikeBarcode(dataRows, ci)) {
      // Esta columna "Nombre" tiene barcodes → usarla como barcode
      confirmedBarcodeIdx.add(ci);
    } else if (columnLooksLikeName(dataRows, ci) && confirmedNameIdx === -1) {
      confirmedNameIdx = ci;
    }
  }

  // Si no encontramos nombre entre los candidatos normales, buscar columna con texto real
  if (confirmedNameIdx === -1) {
    for (let i = 0; i < headers.length; i++) {
      if (!confirmedBarcodeIdx.has(i) && columnLooksLikeName(dataRows, i)) {
        confirmedNameIdx = i;
        break;
      }
    }
  }

  idx.name    = confirmedNameIdx;
  idx.barcode = confirmedBarcodeIdx.size > 0 ? Math.min(...confirmedBarcodeIdx) : -1;

  // Para los demás campos usar el primer candidato
  for (const field of ['purchasePrice', 'salePrice', 'quantity', 'unitType', 'minStock']) {
    idx[field] = findAllCandidates(norms, field)[0] ?? -1;
  }

  return idx;
};

// ─── Controlador principal de importación ────────────────────────────
export const importProductsFromExcelFile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Usuario no autenticado' });
    }
    // Solo superadmin puede importar en masa
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ status: 'error', message: 'Solo el superadmin puede importar productos' });
    }
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No se ha subido ningún archivo Excel' });
    }

    const filePath = req.file.path;
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ status: 'error', message: 'El archivo no se pudo leer' });
    }

    const { default: xlsx } = await import('xlsx');
    const workbook = xlsx.readFile(filePath, { cellDates: false, raw: true });
    const ws       = workbook.Sheets[workbook.SheetNames[0]];
    const allRows  = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

    fs.unlink(filePath, err => err && console.error('Error borrando temp:', err));

    if (!allRows || allRows.length === 0) {
      return res.status(400).json({ status: 'error', message: 'El archivo está vacío' });
    }

    // Detectar encabezados
    const headerRowIndex = findHeaderRow(allRows);
    const headers        = allRows[headerRowIndex];
    const dataRows       = allRows.slice(headerRowIndex + 1).filter(r => r.some(v => String(v).trim() !== ''));

    // Construir mapa de columnas con detección inteligente por valores
    const colIdx = buildSmartColumnIndex(headers, dataRows);

    console.log(`✅ Encabezados detectados en fila ${headerRowIndex + 1}:`, headers.filter(Boolean).join(' | '));
    console.log('Mapeo final:', JSON.stringify(colIdx));

    if (colIdx.name === -1) {
      return res.status(400).json({
        status: 'error',
        message: `No se encontró la columna de nombres. Encabezados detectados: ${headers.filter(Boolean).join(', ')}`
      });
    }

    const category   = await ensureGeneralCategory();
    const categoryId = category.id || category._id;
    const userId     = req.user._id || req.user.id;
    const defaultUT  = (req.body?.defaultUnitType || 'unidad').toLowerCase();

    const results = { total: 0, imported: 0, skipped: 0, errors: [], products: [] };

    const getCellVal = (row, idx) =>
      idx !== undefined && idx >= 0 && idx < row.length ? row[idx] : '';

    for (const row of dataRows) {
      const hasAnyValue = row.some(v => String(v).trim() !== '');
      if (!hasAnyValue) continue;
      results.total++;

      try {
        const name          = String(getCellVal(row, colIdx.name) || '').trim();
        const barcode       = String(getCellVal(row, colIdx.barcode) || '').trim();
        const purchasePrice = parseFloat(getCellVal(row, colIdx.purchasePrice)) || 0;
        const salePrice     = parseFloat(getCellVal(row, colIdx.salePrice)) || 0;
        // La cantidad del Excel → minStock (como referencia del inventario anterior)
        const excelQty      = parseFloat(getCellVal(row, colIdx.quantity)) || 0;
        const rawUnitType   = String(getCellVal(row, colIdx.unitType) || defaultUT).toLowerCase().trim();
        const unitType      = ['unidad', 'peso', 'paquete'].includes(rawUnitType) ? rawUnitType : 'unidad';

        if (!name) {
          results.skipped++;
          results.errors.push({ product: `Fila vacía (${results.total})`, error: 'Nombre vacío — ignorada' });
          continue;
        }
        if (purchasePrice <= 0 && salePrice <= 0) {
          results.skipped++;
          results.errors.push({ product: name, error: 'Precio de compra y venta son 0' });
          continue;
        }

        const finalPurchase = purchasePrice > 0 ? purchasePrice : salePrice * 0.8;
        const finalSale     = salePrice > 0     ? salePrice     : purchasePrice * 1.25;
        // El minStock viene de la cantidad del Excel (referencia del inventario)
        const minStock      = excelQty > 0 ? excelQty : 10;

        if (barcode) {
          const existingQ = await Product.findOne({ barcode });
          const existing  = await existingQ;
          if (existing) {
            results.skipped++;
            results.errors.push({ product: name, barcode, error: `Código de barras duplicado: "${barcode}"` });
            continue;
          }
        }

        // Crear producto — quantity = Cantidad del Excel (stock real), minStock = 10
        const stockActual = excelQty > 0 ? excelQty : 0;
        const newProduct = await Product.create({
          name,
          barcode:       barcode || undefined,
          purchasePrice: finalPurchase,
          salePrice:     finalSale,
          unitType,
          minStock:      10,          // stock mínimo por defecto
          quantity:      stockActual, // ← Cantidad del Excel = stock actual
          categoryId,
          category:      categoryId,
          createdBy:     userId,
          alertActive:   stockActual <= 10
        });

        results.imported++;
        results.products.push({ id: newProduct.id, name: newProduct.name, barcode: newProduct.barcode || null });
      } catch (err) {
        results.skipped++;
        const nm = String(getCellVal(row, colIdx.name) || 'Sin nombre');
        results.errors.push({ product: nm, error: err.message });
      }
    }

    const msg = results.skipped > 0
      ? `${results.imported} de ${results.total} productos importados (${results.skipped} omitidos)`
      : `${results.imported} productos importados correctamente`;

    res.status(200).json({ status: 'success', message: msg, data: results });
  } catch (error) {
    console.error('Error al importar productos:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Error al importar productos' });
  }
};

// ─── Eliminar TODOS los productos (solo superadmin) ───────────────────
export const deleteAllProducts = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Usuario no autenticado' });
    }
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ status: 'error', message: 'Solo el superadmin puede eliminar todos los productos' });
    }

    const db = getDb();
    // Eliminar items de facturas relacionados primero
    const countInvoiceItems = db.prepare('SELECT COUNT(*) as c FROM invoice_items').get().c;
    // Eliminar todos los productos
    const result = db.prepare('DELETE FROM products').run();

    console.log(`✅ ${result.changes} productos eliminados por ${req.user.username}`);

    res.json({
      status: 'success',
      message: `Se eliminaron ${result.changes} productos de la base de datos`,
      data: { deletedCount: result.changes }
    });
  } catch (error) {
    console.error('Error al eliminar productos:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Error al eliminar productos' });
  }
};
