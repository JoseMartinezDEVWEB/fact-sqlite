import { Category } from '../models/Category.js';

export const getCategories = async (req, res) => {
  try {
    const cats = await Category.find({});
    const list = await cats;
    res.json({ status: 'success', data: list });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
    const cat = await Category.create({ name, description });
    res.status(201).json({ status: 'success', data: cat });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ status: 'error', message: 'Ya existe una categoría con ese nombre' });
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const c = await cat;
    if (!c) return res.status(404).json({ status: 'error', message: 'Categoría no encontrada' });
    res.json({ status: 'success', data: c });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getCategory = async (req, res) => {
  try {
    const q = await Category.findById(req.params.id);
    const cat = await q;
    if (!cat) return res.status(404).json({ status: 'error', message: 'Categoría no encontrada' });
    res.json({ status: 'success', data: cat });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ status: 'error', message: 'Categoría no encontrada' });
    res.json({ status: 'success', message: 'Categoría eliminada' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
