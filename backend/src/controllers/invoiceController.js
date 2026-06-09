export { createInvoice, getInvoices, getInvoiceById, updateInvoice, cancelInvoice, getInvoiceStats, updateCreditStatus } from './newInvoiceController.js';

// Alias para compatibilidad
export { getInvoiceById as getInvoice } from './newInvoiceController.js';

import { newInvoice } from '../models/newInvoice.js';
import { Product } from '../models/Product.js';

export const addPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const q = await newInvoice.findById(req.params.id);
    const invoice = await q;
    if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
    const paid = parseFloat(amount);
    const newStatus = paid >= invoice.total ? 'paid' : 'partial';
    await newInvoice.findByIdAndUpdate(req.params.id, { creditStatus: newStatus });
    res.json({ message: 'Pago registrado' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const processFiscalInvoice = async (req, res) => {
  res.json({ message: 'Procesamiento fiscal no disponible en modo SQLite' });
};

export const processReturn = async (req, res) => {
  try {
    const q = await newInvoice.findById(req.params.id);
    const invoice = await q;
    if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
    await newInvoice.findByIdAndUpdate(req.params.id, { status: 'refunded' });
    res.json({ message: 'Devolución procesada' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
