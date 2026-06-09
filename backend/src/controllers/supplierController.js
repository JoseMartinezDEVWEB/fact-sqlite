import { Supplier } from '../models/Supplier.js';
import { getDb } from '../config/database.js';

export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({});
    res.json({ data: await suppliers });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getSupplierById = async (req, res) => {
  try {
    const q = await Supplier.findById(req.params.id);
    const s = await q;
    if (!s) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json(s);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createSupplier = async (req, res) => {
  try {
    const { name, businessName, ruc, email, phone, address, contactPerson, contact, notes, isActive } = req.body;
    const contactValue = contactPerson || contact || '';
    const data = { name, businessName, ruc, email, phone, address,
      contact: contactValue, contactPerson: contactValue, notes,
      isActive: isActive !== undefined ? Boolean(isActive) : true };
    Object.keys(data).forEach(k => (data[k] === undefined || data[k] === '') && delete data[k]);
    const supplier = await Supplier.create(data);
    res.status(201).json({ data: supplier });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateSupplier = async (req, res) => {
  try {
    const { name, businessName, ruc, email, phone, address, contactPerson, contact, notes, isActive } = req.body;
    const contactValue = contactPerson || contact;
    const data = { name, businessName, ruc, email, phone, address, notes };
    if (contactValue !== undefined) { data.contact = contactValue; data.contactPerson = contactValue; }
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    const updated = await Supplier.findByIdAndUpdate(req.params.id, data, { new: true });
    const u = await updated;
    if (!u) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json({ data: u });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteSupplier = async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: 'Proveedor eliminado' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const searchSuppliers = async (req, res) => {
  try {
    const term = req.query.q || req.query.term || req.query.search || '';
    if (!term) return res.json({ data: [] });
    const db = getDb();
    const rows = db.prepare(
      `SELECT * FROM suppliers WHERE name LIKE ? OR contact LIKE ? OR contact_person LIKE ? OR email LIKE ? LIMIT 20`
    ).all(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
    res.json({ data: rows.map(r => Supplier._toDoc(r)) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getSupplierStats = async (req, res) => {
  try {
    const db = getDb();
    const total    = db.prepare(`SELECT COUNT(*) as c FROM suppliers`).get().c;
    const active   = db.prepare(`SELECT COUNT(*) as c FROM suppliers WHERE is_active = 1 OR is_active IS NULL`).get().c;
    const inactive = total - active;
    const withDebt = db.prepare(`SELECT COUNT(*) as c FROM suppliers WHERE current_debt > 0`).get().c;
    res.json({ data: { total, active, inactive, withDebt, topDebtSuppliers: [] } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getSupplierTransactions = async (req, res) => {
  res.json({ data: [] });
};

export const createSupplierTransaction = async (req, res) => {
  res.status(201).json({ message: 'Transacción registrada', data: req.body });
};
