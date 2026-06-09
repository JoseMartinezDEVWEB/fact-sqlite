import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import Cliente from '../models/Cliente.js';
import { getDb } from '../config/database.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createProduct = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ status: 'error', message: 'Usuario no autenticado' });
    }
    if (!['admin', 'encargado', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'No tienes permisos para crear productos' });
    }

    const productData = { ...req.body };
    const requiredFields = ['name', 'unitType', 'purchasePrice', 'salePrice'];
    const missing = requiredFields.filter(f => !productData[f]);
    if (missing.length) return res.status(400).json({ status: 'error', message: 'Faltan campos requeridos', missingFields: missing });

    // Manejar imagen subida localmente
    if (req.file) {
      // El multer guarda en uploads/images/ — la URL debe reflejarlo
      productData.image = {
        url: `/uploads/images/${req.file.filename}`,
        publicId: req.file.filename
      };
    }

    productData.createdBy    = req.user._id || req.user.id;
    productData.quantity     = parseFloat(productData.quantity)      || 0;
    productData.minStock     = parseFloat(productData.minStock)      || 10;
    productData.purchasePrice= parseFloat(productData.purchasePrice) || 0;
    productData.salePrice    = parseFloat(productData.salePrice)     || 0;

    // Convertir campos que llegan como JSON string desde FormData
    if (typeof productData.creditPurchase === 'string') {
      try { productData.creditPurchase = JSON.parse(productData.creditPurchase); }
      catch (_) { delete productData.creditPurchase; }
    }
    // Normalizar booleanos que FormData convierte a strings
    const boolFields = ['isWeightPackage', 'isUnitOfPackage'];
    boolFields.forEach(f => {
      if (productData[f] === 'true') productData[f] = true;
      else if (productData[f] === 'false') productData[f] = false;
    });

    // ─── Validar proveedor si se especificó ──────────────────────────
    const supplierId = productData.provider || productData.providerId || null;
    if (supplierId) {
      const _db = getDb();
      const inClientes = _db.prepare('SELECT id, role FROM clientes WHERE id = ?').get(supplierId);
      const inSuppliers = _db.prepare('SELECT id FROM suppliers WHERE id = ?').get(supplierId);
      if (!inClientes && !inSuppliers) {
        return res.status(400).json({ status: 'error', message: 'El proveedor especificado no existe' });
      }
    }

    // ─── Validar categoría si se especificó ──────────────────────────
    const categoryId = productData.category || productData.categoryId || null;
    if (categoryId) {
      const _db = getDb();
      const cat = _db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
      if (!cat) {
        return res.status(400).json({ status: 'error', message: 'La categoría especificada no existe' });
      }
    }

    // ─── Validaciones específicas por tipo de unidad ──────────────────
    if (productData.unitType === 'peso') {
      if (!productData.weightUnit) {
        return res.status(400).json({ status: 'error', message: 'La unidad de peso es requerida para productos por peso' });
      }
    }
    if (productData.unitType === 'paquete') {
      const unitsQty = productData.packageContentType === 'peso'
        ? parseFloat(productData.packageWeight) || 0
        : parseFloat(productData.unitsPerPackage) || 0;
      if (unitsQty <= 0) {
        return res.status(400).json({ status: 'error', message: 'La cantidad de unidades/peso por paquete debe ser mayor a 0' });
      }
    }
    // ─────────────────────────────────────────────────────────────────

    // ─── Resolver categoryId y providerId consistentes ───────────────
    if (productData.category && !productData.categoryId) productData.categoryId = productData.category;
    if (productData.provider && !productData.providerId) productData.providerId = productData.provider;

    const product = await Product.create(productData);
    const packageId = product.id || product._id;

    // ─── Crear producto unidad derivada si es tipo paquete ───────────
    let unitProduct = null;
    if (productData.unitType === 'paquete' && packageId) {
      const isContentWeight = productData.packageContentType === 'peso';
      const unitsQty = isContentWeight
        ? parseFloat(productData.packageWeight) || 0
        : parseFloat(productData.unitsPerPackage) || 1;

      // Precio de venta de la unidad = precio total / cantidad de unidades
      const unitSalePrice = unitsQty > 0
        ? parseFloat((parseFloat(productData.salePrice) / unitsQty).toFixed(2))
        : parseFloat(productData.salePrice);

      const unitPurchasePrice = unitsQty > 0
        ? parseFloat((parseFloat(productData.purchasePrice) / unitsQty).toFixed(2))
        : parseFloat(productData.purchasePrice);

      // Nombre de la unidad derivada
      const weightUnit = productData.weightUnit || 'lb';
      const unitName = isContentWeight
        ? `${productData.name} (por ${weightUnit})`
        : `${productData.name} (unidad)`;

      const unitBarcode = productData.unitBarcode ||
        (productData.barcode ? `${productData.barcode.substring(0, 6)}U` : null);

      const totalStockQty = (parseFloat(productData.quantity) || 0) * unitsQty;

      const unitData = {
        name: unitName,
        barcode: unitBarcode || null,
        unitType: isContentWeight ? 'peso' : 'unidad',
        ...(isContentWeight ? { weightUnit, minWeight: 0.01 } : {}),
        quantity: totalStockQty,
        minStock: parseFloat(productData.minStock) || 10,
        purchasePrice: unitPurchasePrice,
        salePrice: unitSalePrice,
        pricePerUnit: unitSalePrice,
        categoryId: productData.category || productData.categoryId || null,
        providerId: productData.provider || productData.providerId || null,
        description: productData.description || null,
        isUnitOfPackage: true,
        parentPackageId: packageId,
        createdBy: productData.createdBy,
        alertActive: totalStockQty <= (parseFloat(productData.minStock) || 10),
      };

      unitProduct = await Product.create(unitData);
      const unitId = unitProduct.id || unitProduct._id;

      // Enlazar el paquete con su unidad
      if (unitId) {
        const _db = getDb();
        _db.prepare(`UPDATE products SET unit_product_id = ? WHERE id = ?`).run(unitId, packageId);
        product.unitProductId = unitId;
      }
    }
    // ─────────────────────────────────────────────────────────────────

    // ─── Crear producto derivado por peso si tiene weightUnitBarcode ──
    let weightUnitProduct = null;
    if (productData.unitType === 'peso' && productData.weightUnitBarcode && parseFloat(productData.packageWeight) > 0 && packageId) {
      const pw = parseFloat(productData.packageWeight);
      const totalStock = (parseFloat(productData.quantity) || 0) * pw;

      const weightSalePrice = parseFloat(productData.pricePerUnit) ||
        (parseFloat(productData.salePrice) > 0
          ? parseFloat((parseFloat(productData.salePrice) / pw).toFixed(2))
          : 0);

      const weightPurchasePrice = parseFloat(productData.purchasePrice) > 0
        ? parseFloat((parseFloat(productData.purchasePrice) / pw).toFixed(2))
        : 0;

      const weightUnitData = {
        name: `${productData.name} (por ${productData.weightUnit || 'lb'})`,
        barcode: productData.weightUnitBarcode,
        unitType: 'peso',
        quantity: totalStock,
        minStock: parseFloat(productData.minStock) || 10,
        purchasePrice: weightPurchasePrice,
        salePrice: weightSalePrice,
        pricePerUnit: weightSalePrice,
        weightUnit: productData.weightUnit || 'lb',
        minWeight: parseFloat(productData.minWeight) || 0.01,
        categoryId: productData.category || productData.categoryId || null,
        providerId: productData.provider || productData.providerId || null,
        description: productData.description || null,
        isUnitOfPackage: true,
        parentPackageId: packageId,
        createdBy: productData.createdBy,
        alertActive: totalStock <= (parseFloat(productData.minStock) || 10),
      };

      weightUnitProduct = await Product.create(weightUnitData);
      const wuId = weightUnitProduct.id || weightUnitProduct._id;

      if (wuId) {
        const _db = getDb();
        // Enlazar bidireccionalmente
        _db.prepare(`UPDATE products SET unit_product_id = ? WHERE id = ?`).run(wuId, packageId);
        product.unitProductId = wuId;
      }
    }
    // ─────────────────────────────────────────────────────────────────

    // ─── Registrar compra a crédito y actualizar deuda del proveedor ───
    const cp = productData.creditPurchase;
    if (cp && cp.isCredit && supplierId) {
      const db = getDb();
      const total = (productData.purchasePrice || 0) * (productData.quantity || 1);
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO credit_purchases
          (id, product_id, supplier_id, total, amount_paid, balance_due,
           payment_term, due_date, is_paid, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?, ?)
      `).run(
        randomUUID(),
        packageId,
        supplierId,
        total,
        total,
        cp.paymentTerm || '30dias',
        cp.dueDate || null,
        productData.createdBy || null,
        now,
        now
      );
      // Incrementar deuda del proveedor
      db.prepare(`
        UPDATE suppliers SET current_debt = COALESCE(current_debt, 0) + ?, updated_at = ? WHERE id = ?
      `).run(total, now, supplierId);
      // Registrar transacción en el historial del proveedor
      const cpId = randomUUID();
      db.prepare(`
        INSERT INTO supplier_transactions (id, supplier_id, type, amount, date, notes, credit_purchase_id, created_by, created_at)
        VALUES (?, ?, 'debt', ?, ?, ?, ?, ?, ?)
      `).run(
        cpId,
        supplierId,
        total,
        now,
        `Compra a crédito: ${productData.name} (${productData.quantity} x $${productData.purchasePrice})`,
        packageId,
        productData.createdBy || null,
        now
      );
    }
    // ──────────────────────────────────────────────────────────────────

    res.status(201).json({ status: 'success', data: { product, unitProduct, weightUnitProduct } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    const { search, category, unitType, page = 1, limit = 50, lowStock } = req.query;
    const filter = {};

    if (category) filter.categoryId = category;
    if (unitType) filter.unitType = unitType;
    if (lowStock === 'true') filter.alertActive = true;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.find(filter, { sort: { createdAt: -1 }, skip, limit: parseInt(limit) });
    const list = await products;
    const total = await Product.countDocuments(filter);

    // Poblar category y provider
    for (const p of list) {
      if (p.categoryId) {
        const catQ = await Category.findById(p.categoryId);
        const cat = await catQ;
        if (cat) p.category = cat;
      }
    }

    res.json({
      status: 'success',
      data: { products: list, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const productQ = await Product.findById(req.params.id);
    const product = await productQ;
    if (!product) return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });

    if (product.categoryId) {
      const catQ = await Category.findById(product.categoryId);
      product.category = await catQ;
    }

    res.json({ status: 'success', data: { product } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    if (!['admin', 'encargado', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'No tienes permisos para editar productos' });
    }

    const updateData = { ...req.body, updatedBy: req.user._id || req.user.id };

    if (req.file) {
      updateData.image = { url: `/uploads/images/${req.file.filename}`, publicId: req.file.filename };
    }

    // Convertir campos que llegan como JSON string desde FormData
    if (typeof updateData.creditPurchase === 'string') {
      try { updateData.creditPurchase = JSON.parse(updateData.creditPurchase); }
      catch (_) { delete updateData.creditPurchase; }
    }
    const boolFields = ['isWeightPackage', 'isUnitOfPackage'];
    boolFields.forEach(f => {
      if (updateData[f] === 'true') updateData[f] = true;
      else if (updateData[f] === 'false') updateData[f] = false;
    });

    // Leer el producto actual antes de modificar
    const currentQ = await Product.findById(req.params.id);
    const current = await currentQ;
    if (!current) return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });

    if (updateData.quantity !== undefined) {
      const qty = parseFloat(updateData.quantity);
      const minStock = parseFloat(current.minStock) || 10;
      updateData.alertActive = qty <= minStock;

      // ─── Sincronizar cantidad con el producto derivado (hijo) ───────
      if (current.unitProductId) {
        const isWeightParent = current.unitType === 'peso';
        const isPackageParent = current.unitType === 'paquete';
        let childQty = 0;

        if (isPackageParent) {
          const unitsQty = current.packageContentType === 'peso'
            ? parseFloat(current.packageWeight) || 0
            : parseFloat(current.unitsPerPackage) || 1;
          childQty = qty * unitsQty;
        } else if (isWeightParent) {
          const pw = parseFloat(current.packageWeight) || 0;
          childQty = pw > 0 ? qty * pw : qty;
        }

        if (childQty > 0) {
          const db = getDb();
          db.prepare(`UPDATE products SET quantity = ?, alert_active = ? WHERE id = ?`)
            .run(childQty, childQty <= (parseFloat(current.minStock) || 10), current.unitProductId);
        }
      }
      // ────────────────────────────────────────────────────────────────
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    const updated = await product;

    res.json({ status: 'success', data: { product: updated } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'No tienes permisos para eliminar productos' });
    }
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });
    res.json({ status: 'success', message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({ alertActive: true });
    const list = await products;
    res.json({ status: 'success', data: { products: list } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    const productQ = await Product.findById(req.params.id);
    const product = await productQ;
    if (!product) return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });

    const newQty = parseFloat(quantity);
    const minStockVal = parseFloat(product.minStock) || 10;
    const alertActive = newQty <= minStockVal;

    // Sincronizar con el hijo si existe
    if (product.unitProductId) {
      const isWeight = product.unitType === 'peso';
      const isPackage = product.unitType === 'paquete';
      let childQty = 0;

      if (isPackage) {
        const uq = product.packageContentType === 'peso'
          ? parseFloat(product.packageWeight) || 0
          : parseFloat(product.unitsPerPackage) || 1;
        childQty = newQty * uq;
      } else if (isWeight) {
        const pw = parseFloat(product.packageWeight) || 0;
        childQty = pw > 0 ? newQty * pw : newQty;
      }

      if (childQty > 0) {
        const db = getDb();
        db.prepare(`UPDATE products SET quantity = ?, alert_active = ? WHERE id = ?`)
          .run(childQty, childQty <= minStockVal, product.unitProductId);
      }
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, { quantity: newQty, alertActive }, { new: true });
    const u = await updated;
    res.json({ status: 'success', data: { product: u } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const q = await Product.findOne({ barcode });
    const product = await q;
    if (!product) {
      const q2 = await Product.findOne({ unitBarcode: barcode });
      const p2 = await q2;
      if (!p2) return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });
      return res.json({ status: 'success', data: { product: p2 } });
    }
    res.json({ status: 'success', data: { product } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
