import { Quote } from '../models/Quote.js';
import { getDb } from '../config/database.js';
import { newInvoice } from '../models/newInvoice.js';

export const getQuotes = async (req, res) => {
  try {
    const quotes = await Quote.find({});
    res.json({ data: await quotes });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getQuoteById = async (req, res) => {
  try {
    const q = await Quote.findById(req.params.id);
    const quote = await q;
    if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });
    res.json(quote);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getQuote = getQuoteById;

export const createQuote = async (req, res) => {
  try {
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as c FROM quotes').get().c;
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const receiptNumber = `COT-${d.getFullYear()}${mm}-${String(count + 1).padStart(4, '0')}`;
    const data = { ...req.body, receiptNumber, createdBy: req.user?._id || req.user?.id };
    if (data.items) { data.itemsJson = JSON.stringify(data.items); }
    const quote = await Quote.create(data);
    res.status(201).json(quote);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateQuote = async (req, res) => {
  try {
    const updated = await Quote.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const u = await updated;
    if (!u) return res.status(404).json({ message: 'Cotización no encontrada' });
    res.json(u);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateQuoteStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await Quote.findByIdAndUpdate(req.params.id, { status });
    res.json({ message: 'Estado actualizado' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteQuote = async (req, res) => {
  try {
    await Quote.findByIdAndDelete(req.params.id);
    res.json({ message: 'Cotización eliminada' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const convertToInvoice = async (req, res) => {
  try {
    const q = await Quote.findById(req.params.id);
    const quote = await q;
    if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });
    await Quote.findByIdAndUpdate(req.params.id, { status: 'converted' });
    res.json({ message: 'Cotización marcada como convertida' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
