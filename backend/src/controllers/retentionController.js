import { Retention } from '../models/Retention.js';

export const getRetentions = async (req, res) => {
  try {
    const retentions = await Retention.find({});
    res.json({ data: await retentions });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getRetentionById = async (req, res) => {
  try {
    const q = await Retention.findById(req.params.id);
    const r = await q;
    if (!r) return res.status(404).json({ message: 'Retención no encontrada' });
    res.json(r);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createRetention = async (req, res) => {
  try {
    const retention = await Retention.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json(retention);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateRetention = async (req, res) => {
  try {
    const updated = await Retention.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const u = await updated;
    if (!u) return res.status(404).json({ message: 'Retención no encontrada' });
    res.json(u);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteRetention = async (req, res) => {
  try {
    await Retention.findByIdAndDelete(req.params.id);
    res.json({ message: 'Retención eliminada' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const processRetention = async (req, res) => {
  try {
    await Retention.findByIdAndUpdate(req.params.id, { status: 'processed' });
    res.json({ message: 'Retención procesada' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const cancelRetention = async (req, res) => {
  try {
    await Retention.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    res.json({ message: 'Retención cancelada' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getRetentionsByInvoice = async (req, res) => {
  try {
    const retentions = await Retention.find({ invoiceId: req.params.invoiceId });
    res.json({ data: await retentions });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const generateRetentionPdf = async (req, res) => {
  res.json({ message: 'PDF no implementado en modo SQLite' });
};
