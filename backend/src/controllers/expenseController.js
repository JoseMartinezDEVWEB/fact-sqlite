import Expense from '../models/Expense.js';
import { getDb } from '../config/database.js';

export const getExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category, page = 1, limit = 20 } = req.query;
    const db = getDb();
    const conditions = [], params = [];

    // Usar date() para manejar ambos formatos: 'YYYY-MM-DD HH:MM:SS' y ISO 'YYYY-MM-DDTHH:...'
    if (startDate) { conditions.push("date(date) >= date(?)"); params.push(startDate.slice(0,10)); }
    if (endDate)   { conditions.push("date(date) <= date(?)"); params.push(endDate.slice(0,10)); }
    if (category)  { conditions.push('category = ?'); params.push(category); }

    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const total = db.prepare(`SELECT COUNT(*) as c FROM expenses${where}`).get(...params).c;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const rows = db.prepare(`SELECT * FROM expenses${where} ORDER BY date DESC LIMIT ${limit} OFFSET ${skip}`).all(...params);
    const expenses = rows.map(r => Expense._toDoc(r));

    res.json({ data: expenses, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    const data = { ...req.body, userId: req.user?._id || req.user?.id };
    if (!data.name || !data.amount) return res.status(400).json({ message: 'Nombre y monto son requeridos' });
    const expense = await Expense.create(data);
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const u = await updated;
    if (!u) return res.status(404).json({ message: 'Gasto no encontrado' });
    res.json(u);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Gasto no encontrado' });
    res.json({ message: 'Gasto eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExpense = async (req, res) => {
  try {
    const q = await Expense.findById(req.params.id);
    const expense = await q;
    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExpenseSummary = async (req, res) => {
  try {
    const db = getDb();
    const todayDate  = new Date().toISOString().slice(0, 10);        // '2026-05-31'
    const monthDate  = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    // date() extrae solo YYYY-MM-DD — funciona con 'YYYY-MM-DD HH:MM:SS' y 'YYYY-MM-DDTHH:MM:SS.mmmZ'
    const todayTotal = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE date(date) >= date(?)`).get(todayDate).t;
    const monthTotal = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE date(date) >= date(?)`).get(monthDate).t;
    res.json({ today: todayTotal, month: monthTotal });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMonthlyExpenses = async (req, res) => {
  try {
    const db = getDb();
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    const start = new Date(y, m-1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    const rows = db.prepare(`SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC`).all(start.toISOString(), end.toISOString());
    res.json({ data: rows.map(r => Expense._toDoc(r)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTodayExpenses = async (req, res) => {
  try {
    const db = getDb();
    const todayDate = new Date().toISOString().slice(0, 10);
    const rows = db.prepare(`SELECT * FROM expenses WHERE date(date) = date(?)`).all(todayDate);
    res.json({ data: rows.map(r => Expense._toDoc(r)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
