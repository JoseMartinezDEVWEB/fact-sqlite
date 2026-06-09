import { CreditPurchase } from '../models/CreditPurchase.js';
import { getDb } from '../config/database.js';

export const getCreditPurchases = async (req, res) => {
  try {
    const cp = await CreditPurchase.find({});
    res.json({ data: await cp });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getCreditPurchaseById = async (req, res) => {
  try {
    const q = await CreditPurchase.findById(req.params.id);
    const cp = await q;
    if (!cp) return res.status(404).json({ message: 'Compra a crédito no encontrada' });
    res.json(cp);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createCreditPurchase = async (req, res) => {
  try {
    const cp = await CreditPurchase.create({ ...req.body, createdBy: req.user?._id });
    const created = await cp;
    // Actualizar deuda del proveedor
    if (created && created.supplierId && created.total) {
      const db = getDb();
      const now = new Date().toISOString();
      db.prepare(`UPDATE suppliers SET current_debt = COALESCE(current_debt, 0) + ?, updated_at = ? WHERE id = ?`)
        .run(created.total, now, created.supplierId);
    }
    res.status(201).json(created);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateCreditPurchase = async (req, res) => {
  try {
    const updated = await CreditPurchase.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const u = await updated;
    if (!u) return res.status(404).json({ message: 'Compra a crédito no encontrada' });
    res.json(u);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteCreditPurchase = async (req, res) => {
  try {
    const q = await CreditPurchase.findById(req.params.id);
    const cp = await q;
    if (cp && cp.supplierId && cp.balanceDue > 0) {
      // Restar el balance pendiente de la deuda del proveedor
      const db = getDb();
      const now = new Date().toISOString();
      db.prepare(`UPDATE suppliers SET current_debt = MAX(0, COALESCE(current_debt, 0) - ?), updated_at = ? WHERE id = ?`)
        .run(cp.balanceDue, now, cp.supplierId);
    }
    await CreditPurchase.findByIdAndDelete(req.params.id);
    res.json({ message: 'Compra a crédito eliminada' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const addPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const q = await CreditPurchase.findById(req.params.id);
    const cp = await q;
    if (!cp) return res.status(404).json({ message: 'Compra no encontrada' });
    const paid = parseFloat(amount);
    const newBalance = Math.max(0, (cp.balanceDue || 0) - paid);
    const amountPaid = (cp.amountPaid || 0) + paid;
    const isPaid = newBalance <= 0;
    await CreditPurchase.findByIdAndUpdate(req.params.id, { balanceDue: newBalance, amountPaid, isPaid });

    // Restar el pago de la deuda del proveedor
    if (cp.supplierId) {
      const db = getDb();
      const now = new Date().toISOString();
      db.prepare(`UPDATE suppliers SET current_debt = MAX(0, COALESCE(current_debt, 0) - ?), updated_at = ? WHERE id = ?`)
        .run(paid, now, cp.supplierId);
    }

    res.json({ message: 'Pago registrado', balanceDue: newBalance });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getCreditPurchaseStats = async (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(balance_due),0) as totalPending FROM credit_purchases WHERE is_paid = 0`).get();
    res.json({ count: row.count, totalPending: row.totalPending });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
