import { Supplier } from '../models/Supplier.js';
import { getDb } from '../config/database.js';
import { randomUUID } from 'crypto';

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
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM supplier_transactions WHERE supplier_id = ? ORDER BY created_at DESC'
    ).all(req.params.id);
    const mapped = rows.map(r => Supplier._toDoc(r));
    res.json({ data: mapped });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createSupplierTransaction = async (req, res) => {
  try {
    const { type, amount, notes, date } = req.body;
    if (!type || !['payment', 'debt'].includes(type)) {
      return res.status(400).json({ message: 'Tipo de transacción inválido. Use "payment" o "debt"' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
    }
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO supplier_transactions (id, supplier_id, type, amount, date, notes, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, type, amount, date || now, notes || null, req.user?._id || null, now);

    // Actualizar deuda del proveedor
    if (type === 'payment') {
      db.prepare(`UPDATE suppliers SET current_debt = MAX(COALESCE(current_debt, 0) - ?, 0), updated_at = ? WHERE id = ?`)
        .run(amount, now, req.params.id);
    } else {
      db.prepare(`UPDATE suppliers SET current_debt = COALESCE(current_debt, 0) + ?, updated_at = ? WHERE id = ?`)
        .run(amount, now, req.params.id);
    }

    const row = db.prepare('SELECT * FROM supplier_transactions WHERE id = ?').get(id);
    const doc = Supplier._toDoc(row);
    res.status(201).json({ message: 'Transacción registrada', data: doc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
