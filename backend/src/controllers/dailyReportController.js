import { DailyReport } from '../models/DailyReport.js';
import { getDb } from '../config/database.js';

export const getDailyReports = async (req, res) => {
  try {
    const reports = await DailyReport.find({});
    const list = await reports;
    res.json({ data: list });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDailyReport = async (req, res) => {
  try {
    const db = getDb();
    const date = req.body.date || new Date().toISOString().split('T')[0];
    const existing = db.prepare('SELECT * FROM daily_reports WHERE date = ?').get(date);
    if (existing) {
      const { DailyReport: DR } = await import('../models/DailyReport.js');
      const updated = await DR.findByIdAndUpdate(existing.id, req.body, { new: true });
      const u = await updated;
      return res.json(u);
    }
    const report = await DailyReport.create({ ...req.body, date });
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const closeDailyReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const updated = await DailyReport.findByIdAndUpdate(reportId, { status: 'closed', ...req.body }, { new: true });
    const u = await updated;
    if (!u) return res.status(404).json({ message: 'Reporte no encontrado' });
    res.json(u);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addExpense = async (req, res) => {
  try {
    res.json({ message: 'Gasto registrado', data: req.body });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCurrentDayReport = async (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const report = db.prepare('SELECT * FROM daily_reports WHERE date = ?').get(today);
    if (!report) {
      return res.json({ date: today, salesTotal: 0, expensesTotal: 0, balance: 0, invoiceCount: 0 });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
