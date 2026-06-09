import Business from '../models/businessModel.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createBusiness = async (req, res) => {
  try {
    const existing = await Business.findOne({});
    const ex = await existing;
    if (ex) return res.status(400).json({ message: 'Ya existe un negocio registrado' });
    const business = await Business.create({ ...req.body, ownerId: req.user?._id });
    res.status(201).json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBusinesses = async (req, res) => {
  try {
    const q = await Business.findOne({});
    const b = await q;
    res.json(b ? [b] : []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBusinessInfo = async (req, res) => {
  try {
    const q = await Business.findOne({});
    const b = await q;
    const data = b || { name: 'Mi Negocio', currency: 'DOP', taxRate: 0.18 };
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveBusinessInfo = async (req, res) => {
  try {
    let imageData = {};
    if (req.file) {
      imageData = { logoUrl: `/uploads/${req.file.filename}`, logoPublicId: req.file.filename };
    }

    // Mapear campos del frontend → columnas de la BD
    const { name, taxId, rnc, address, phone, email, website, comments } = req.body;
    const data = {
      name:     name     || undefined,
      rnc:      taxId    || rnc || undefined,   // frontend envía taxId, BD tiene rnc
      address:  address  || undefined,
      phone:    phone    || undefined,
      email:    email    || undefined,
      website:  website  || undefined,
      comments: comments || undefined,
      ...imageData
    };
    // Eliminar claves undefined para no sobreescribir con vacíos
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

    const existing = await Business.findOne({});
    const ex = await existing;

    if (ex) {
      const updated = await Business.findByIdAndUpdate(ex.id, data, { new: true });
      const u = await updated;
      return res.json({ success: true, data: u });
    }
    const created = await Business.create({ ...data, ownerId: req.user?._id });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Alias para compatibilidad
export const getBusiness = getBusinessInfo;
export const updateBusiness = saveBusinessInfo;
