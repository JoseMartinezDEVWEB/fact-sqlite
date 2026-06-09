import { getDb } from '../config/database.js';
import { newInvoice } from '../models/newInvoice.js';
import Expense from '../models/Expense.js';

export const getDailyReport = async (req, res) => {
  try {
    const db = getDb();
    const d = req.query.date ? new Date(req.query.date) : new Date();
    d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const dDate = d.toISOString().slice(0,10);
    const nextDate = next.toISOString().slice(0,10);
    const invoices = db.prepare(`SELECT * FROM invoices WHERE date(created_at) >= date(?) AND date(created_at) < date(?) AND status != 'cancelled'`).all(dDate, nextDate);
    const expenses = db.prepare(`SELECT * FROM expenses WHERE date(date) >= date(?) AND date(date) < date(?)`).all(dDate, nextDate);
    const totalSales = invoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    res.json({
      date: d.toISOString().split('T')[0],
      totalSales, totalExpenses,
      balance: totalSales - totalExpenses,
      invoiceCount: invoices.length,
      invoices: invoices.map(r => newInvoice._toDoc(r)),
      expenses: expenses.map(r => Expense._toDoc(r))
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const db = getDb();
    const y = parseInt(req.query.year) || new Date().getFullYear();
    const m = parseInt(req.query.month) || new Date().getMonth() + 1;
    const start = new Date(y, m-1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    const invoices = db.prepare(`SELECT * FROM invoices WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled'`).all(start.toISOString(), end.toISOString());
    const expenses = db.prepare(`SELECT * FROM expenses WHERE date >= ? AND date <= ?`).all(start.toISOString(), end.toISOString());
    const totalSales = invoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    res.json({ year: y, month: m, totalSales, totalExpenses, balance: totalSales - totalExpenses, invoiceCount: invoices.length });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getSalesReport = async (req, res) => {
  try {
    const db = getDb();
    const start = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(1));
    const end = req.query.endDate ? new Date(req.query.endDate) : new Date();
    start.setHours(0,0,0,0); end.setHours(23,59,59,999);
    const rows = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count, SUM(total) as total FROM invoices WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled' GROUP BY date(created_at) ORDER BY date ASC`).all(start.toISOString(), end.toISOString());
    res.json({ data: rows });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getExpensesReport = async (req, res) => {
  try {
    const db = getDb();
    const start = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(1));
    const end = req.query.endDate ? new Date(req.query.endDate) : new Date();
    start.setHours(0,0,0,0); end.setHours(23,59,59,999);
    const rows = db.prepare(`SELECT date(date) as date, category, SUM(amount) as total FROM expenses WHERE date >= ? AND date <= ? GROUP BY date(date), category ORDER BY date ASC`).all(start.toISOString(), end.toISOString());
    res.json({ data: rows });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getDebtsReport = async (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`SELECT c.name as clientName, SUM(i.total) as totalDebt FROM invoices i LEFT JOIN clientes c ON i.cliente_id = c.id WHERE i.is_credit = 1 AND i.credit_status != 'paid' GROUP BY i.cliente_id ORDER BY totalDebt DESC`).all();
    res.json({ data: rows });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getProductsReport = async (req, res) => {
  try {
    const db = getDb();
    const start = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(1));
    const end = req.query.endDate ? new Date(req.query.endDate) : new Date();
    start.setHours(0,0,0,0); end.setHours(23,59,59,999);
    const rows = db.prepare(`SELECT ii.product_name as name, SUM(ii.quantity) as totalQty, SUM(ii.subtotal) as totalRevenue FROM invoice_items ii JOIN invoices inv ON ii.invoice_id = inv.id WHERE inv.created_at >= ? AND inv.created_at <= ? AND inv.status != 'cancelled' GROUP BY ii.product_id, ii.product_name ORDER BY totalRevenue DESC LIMIT 50`).all(start.toISOString(), end.toISOString());
    res.json({ data: rows });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getBalanceReport = async (req, res) => {
  try {
    const db = getDb();
    const start = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(1));
    const end = req.query.endDate ? new Date(req.query.endDate) : new Date();
    start.setHours(0,0,0,0); end.setHours(23,59,59,999);
    const salesRow = db.prepare(`SELECT COALESCE(SUM(total),0) as t FROM invoices WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled'`).get(start.toISOString(), end.toISOString());
    const expRow = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE date >= ? AND date <= ?`).get(start.toISOString(), end.toISOString());
    res.json({ totalSales: salesRow.t, totalExpenses: expRow.t, balance: salesRow.t - expRow.t });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const clearReportCache = async (req, res) => {
  res.json({ message: 'Caché limpiado (sin caché en SQLite)' });
};
