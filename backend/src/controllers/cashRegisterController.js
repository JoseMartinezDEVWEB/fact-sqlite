import { CashRegisterShift } from '../models/CashRegisterShift.js';
import { getDb } from '../config/database.js';

export const openShift = async (req, res) => {
  try {
    const { openingAmount } = req.body;
    // Verificar si ya hay un turno abierto
    const existing = await CashRegisterShift.findOne({ cashierId: req.user._id, status: 'open' });
    const ex = await existing;
    if (ex) return res.status(400).json({ message: 'Ya tienes un turno abierto' });

    const shift = await CashRegisterShift.create({ cashierId: req.user._id, openingAmount: parseFloat(openingAmount) || 0, status: 'open', openedAt: new Date().toISOString() });
    res.status(201).json(shift);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const closeShift = async (req, res) => {
  try {
    const { closingAmount } = req.body;
    const q = await CashRegisterShift.findById(req.params.id);
    const shift = await q;
    if (!shift) return res.status(404).json({ message: 'Turno no encontrado' });

    const updated = await CashRegisterShift.findByIdAndUpdate(req.params.id, { closingAmount: parseFloat(closingAmount) || 0, status: 'closed', closedAt: new Date().toISOString() }, { new: true });
    const u = await updated;
    res.json(u);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCurrentShift = async (req, res) => {
  try {
    const q = await CashRegisterShift.findOne({ cashierId: req.user._id, status: 'open' });
    const shift = await q;
    res.json(shift || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getShifts = async (req, res) => {
  try {
    const shifts = await CashRegisterShift.find({});
    const list = await shifts;
    res.json({ data: list });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
