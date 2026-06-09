// Controller para productos al por mayor (productosAlXMayor)
import { Product } from '../models/Product.js';
import { getDb } from '../config/database.js';

export const getProductos = async (req, res) => {
  try {
    const products = await Product.find({ unitType: 'paquete' });
    res.json({ data: await products });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getProductoById = async (req, res) => {
  try {
    const q = await Product.findById(req.params.id);
    const p = await q;
    if (!p) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(p);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createProducto = async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, createdBy: req.user?._id || req.user?.id });
    res.status(201).json(product);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateProducto = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const u = await updated;
    if (!u) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(u);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteProducto = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Producto eliminado' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getProductosByProveedor = async (req, res) => {
  try {
    const products = await Product.find({ providerId: req.params.providerId });
    res.json({ data: await products });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getProductosBajoStock = async (req, res) => {
  try {
    const products = await Product.find({ alertActive: true });
    res.json({ data: await products });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getProductosAlXMayor = getProductos;
