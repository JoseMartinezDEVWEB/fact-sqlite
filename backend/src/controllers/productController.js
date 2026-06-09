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

      // Nombre de la unidad derivada
      const weightUnit = productData.weightUnit || 'lb';
      const unitName = isContentWeight
        ? `${productData.name} (por ${weightUnit})`
        : `${productData.name} (unidad)`;

      const unitBarcode = productData.unitBarcode ||
        (productData.barcode ? `${productData.barcode.substring(0, 6)}U` : null);

      const unitData = {
        name: unitName,
        barcode: unitBarcode || null,
        unitType: isContentWeight ? 'peso' : 'unidad',
        ...(isContentWeight ? { weightUnit, minWeight: 0.01 } : {}),
        quantity: unitsQty,
        minStock: parseFloat(productData.minStock) || 10,
        purchasePrice: parseFloat(productData.purchasePrice) || 0,
        salePrice: unitSalePrice,
        pricePerUnit: unitSalePrice,
        categoryId: productData.category || productData.categoryId || null,
        providerId: productData.provider || productData.providerId || null,
        description: productData.description || null,
        isUnitOfPackage: true,
        parentPackageId: packageId,
        createdBy: productData.createdBy,
        alertActive: unitsQty <= (parseFloat(productData.minStock) || 10),
      };

      unitProduct = await Product.create(unitData);
      const unitId = unitProduct.id || unitProduct._id;

      // Enlazar el paquete con su unidad
      if (unitId) {
        const db = getDb();
        db.prepare(`UPDATE products SET unit_product_id = ? WHERE id = ?`).run(unitId, packageId);
        product.unitProductId = unitId;
      }
    }
    // ─────────────────────────────────────────────────────────────────

    // ─── Registrar compra a crédito y actualizar deuda del proveedor ───
    const cp = productData.creditPurchase;
    const supplierId = productData.provider || productData.providerId || null;
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
    }
    // ──────────────────────────────────────────────────────────────────

    res.status(201).json({ status: 'success', data: { product, unitProduct } });
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

    if (updateData.quantity !== undefined) {
      const qty = parseFloat(updateData.quantity);
      const productQ = await Product.findById(req.params.id);
      const product = await productQ;
      const minStock = product ? parseFloat(product.minStock) || 10 : 10;
      updateData.alertActive = qty <= minStock;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    const updated = await product;
    if (!updated) return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });

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
    const alertActive = newQty <= (product.minStock || 10);
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
