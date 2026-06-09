import { CreditNote } from '../models/CreditNote.js';

export const getCreditNotes = async (req, res) => {
  try {
    const notes = await CreditNote.find({});
    const list = await notes;
    res.json({ data: list });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCreditNote = async (req, res) => {
  try {
    const note = await CreditNote.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCreditNote = async (req, res) => {
  try {
    const q = await CreditNote.findById(req.params.id);
    const n = await q;
    if (!n) return res.status(404).json({ message: 'Nota de crédito no encontrada' });
    res.json(n);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const processFiscalCreditNote = async (req, res) => {
  res.json({ message: 'Procesamiento fiscal no implementado en modo SQLite' });
};

export const cancelCreditNote = async (req, res) => {
  try {
    await CreditNote.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    res.json({ message: 'Nota de crédito cancelada' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateCreditNote = async (req, res) => {
  try {
    const updated = await CreditNote.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const u = await updated;
    if (!u) return res.status(404).json({ message: 'Nota de crédito no encontrada' });
    res.json(u);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
