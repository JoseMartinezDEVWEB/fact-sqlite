import { newInvoice } from '../models/newInvoice.js';
import Cliente from '../models/Cliente.js';
import { getDb } from '../config/database.js';

export const getCreditPayments = async (req, res) => {
  try {
    const invoices = await newInvoice.find({ isCredit: true });
    const list = await invoices;
    res.json({ data: list });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getPendingPayments = async (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM invoices WHERE is_credit = 1 AND credit_status != 'paid' ORDER BY created_at DESC`).all();
    res.json({ data: rows });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const processPayment = async (req, res) => {
  try {
    const { invoiceId, amount } = req.body;
    const q = await newInvoice.findById(invoiceId);
    const invoice = await q;
    if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
    const paid = parseFloat(amount);
    const newStatus = paid >= invoice.total ? 'paid' : 'partial';
    await newInvoice.findByIdAndUpdate(invoiceId, { creditStatus: newStatus });
    if (invoice.clienteId) {
      await Cliente.findByIdAndUpdate(invoice.clienteId, { $inc: { cuentasPendientes: -paid, cuentasVendidas: paid } });
    }
    res.json({ message: 'Pago procesado' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const markProductAsPaid = async (req, res) => {
  try {
    await newInvoice.findByIdAndUpdate(req.params.id, { creditStatus: 'paid' });
    res.json({ message: 'Marcado como pagado' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const markMultipleAsPaid = async (req, res) => {
  try {
    const { ids } = req.body;
    const db = getDb();
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE invoices SET credit_status = 'paid' WHERE id IN (${placeholders})`).run(...ids);
    res.json({ message: `${ids.length} facturas marcadas como pagadas` });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getCreditPaymentStats = async (req, res) => {
  try {
    const db = getDb();
    const total = db.prepare(`SELECT COALESCE(SUM(total),0) as t FROM invoices WHERE is_credit=1 AND credit_status!='paid'`).get().t;
    res.json({ totalPending: total });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
