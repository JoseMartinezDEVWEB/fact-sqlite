import Cliente from '../models/Cliente.js';
import { Product } from '../models/Product.js';
import { getDb } from '../config/database.js';

export const getProviders = async (req, res) => {
  try {
    const providers = await Cliente.find({ role: 'proveedor' });
    res.json({ data: await providers });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getProviderById = async (req, res) => {
  try {
    const q = await Cliente.findById(req.params.id);
    const p = await q;
    if (!p) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json(p);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createProvider = async (req, res) => {
  try {
    const data = { ...req.body, role: 'proveedor', createdBy: req.user?._id };
    const provider = await Cliente.create(data);
    res.status(201).json(provider);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateProvider = async (req, res) => {
  try {
    const updated = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const u = await updated;
    if (!u) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json(u);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteProvider = async (req, res) => {
  try {
    await Cliente.findByIdAndDelete(req.params.id);
    res.json({ message: 'Proveedor eliminado' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getProviderProducts = async (req, res) => {
  try {
    const products = await Product.find({ providerId: req.params.id });
    const list = await products;
    res.json({ data: list });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const addProductToProvider = async (req, res) => {
  try {
    const { productId } = req.body;
    await Product.findByIdAndUpdate(productId, { providerId: req.params.id });
    res.json({ message: 'Producto asociado al proveedor' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
