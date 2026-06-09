import { newInvoice } from '../models/newInvoice.js';
import { getDb } from '../config/database.js';

export const getSales = async (req, res) => {
  try {
    const invoices = await newInvoice.find({ status: 'completed' });
    const list = await invoices;
    res.json({ data: list });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSalesSummary = async (req, res) => {
  try {
    const db = getDb();
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0,0,0,0); end.setHours(23,59,59,999);

    const row = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled'`).get(start.toISOString(), end.toISOString());
    res.json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
