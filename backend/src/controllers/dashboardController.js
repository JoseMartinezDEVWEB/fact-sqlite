import { getDb } from '../config/database.js';
import { newInvoice } from '../models/newInvoice.js';

const getDashboardData = async (req, res) => {
  try {
    const db = getDb();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const todayDate  = todayStr.slice(0,10);
    const monthDate  = monthStart.slice(0,10);
    const todayInv = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total, COALESCE(SUM(CASE WHEN is_credit=1 AND credit_status!='paid' THEN total ELSE 0 END),0) as pending FROM invoices WHERE date(created_at) >= date(?) AND status != 'cancelled'`).get(todayDate);
    const monthInv = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total, COALESCE(SUM(CASE WHEN is_credit=1 AND credit_status!='paid' THEN total ELSE 0 END),0) as pending FROM invoices WHERE date(created_at) >= date(?) AND status != 'cancelled'`).get(monthDate);
    const clientsRow = db.prepare(`SELECT COUNT(*) as total FROM clientes WHERE role = 'cliente'`).get();
    const pendingClients = db.prepare(`SELECT COUNT(*) as c FROM clientes WHERE cuentas_pendientes > 0`).get();
    const productsRow = db.prepare(`SELECT COUNT(*) as total FROM products`).get();
    const todayExpRow = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date(date) >= date(?)`).get(todayDate);
    const monthExpRow = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date(date) >= date(?)`).get(monthDate);

    const topProducts = db.prepare(`
      SELECT ii.product_name as name, SUM(ii.quantity) as count, SUM(ii.subtotal) as total
      FROM invoice_items ii JOIN invoices inv ON ii.invoice_id = inv.id
      WHERE inv.created_at >= ? AND inv.status != 'cancelled'
      GROUP BY ii.product_id, ii.product_name ORDER BY total DESC LIMIT 5
    `).all(todayStr);

    res.json({
      success: true,
      data: {
        ventasConfirmadasHoy: todayInv.total - todayInv.pending,
        totalFacturasHoy: todayInv.count,
        ventasPendientesHoy: todayInv.pending,
        ventasConfirmadasMes: monthInv.total - monthInv.pending,
        totalFacturasMes: monthInv.count,
        ventasPendientesMes: monthInv.pending,
        totalClientes: clientsRow.total,
        cuentasPendientes: pendingClients.c,
        cuentasVendidas: 0,
        productosCount: productsRow.total,
        serviciosCount: 0,
        topProducts: topProducts.map(p => ({ name: p.name, count: p.count, total: p.total })),
        gastosHoy: todayExpRow.total,
        gastosMes: monthExpRow.total,
        balanceHoy: (todayInv.total - todayInv.pending) - todayExpRow.total,
        balanceMes: (monthInv.total - monthInv.pending) - monthExpRow.total
      }
    });
  } catch (error) {
    console.error('Error en dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDetailedStats = async (req, res) => {
  try {
    const db = getDb();
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0,0,0,0); end.setHours(23,59,59,999);

    const invoices = db.prepare(`SELECT * FROM invoices WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled'`).all(start.toISOString(), end.toISOString());
    const total = invoices.reduce((s, i) => s + (i.total || 0), 0);
    res.json({ success: true, data: { invoiceCount: invoices.length, totalSales: total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTopProducts = async (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0,0,0,0); end.setHours(23,59,59,999);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const rows = db.prepare(`
      SELECT ii.product_id as id, ii.product_name as name, SUM(ii.quantity) as totalQuantity, SUM(ii.subtotal) as totalRevenue, COUNT(DISTINCT ii.invoice_id) as invoiceCount
      FROM invoice_items ii JOIN invoices inv ON ii.invoice_id = inv.id
      WHERE inv.created_at >= ? AND inv.created_at <= ? AND inv.status != 'cancelled'
      GROUP BY ii.product_id, ii.product_name ORDER BY totalRevenue DESC
      LIMIT ${limit} OFFSET ${skip}
    `).all(start.toISOString(), end.toISOString());

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDailySales = async (req, res) => {
  try {
    const db = getDb();
    const { days = 30, startDate, endDate, page = 1, limit = 10 } = req.query;

    let startD, endD;
    if (startDate && endDate) {
      startD = startDate;
      endD   = endDate;
    } else {
      const s = new Date();
      s.setDate(s.getDate() - parseInt(days));
      s.setHours(0, 0, 0, 0);
      startD = s.toISOString().slice(0, 10);
      endD   = new Date().toISOString().slice(0, 10);
    }

    const rows = db.prepare(`
      SELECT date(created_at) as fecha,
             COUNT(*)                       AS cantidadFacturas,
             COALESCE(SUM(total), 0)        AS totalVentas
      FROM invoices
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
        AND status != 'cancelled'
      GROUP BY date(created_at)
      ORDER BY fecha DESC
    `).all(startD, endD);

    // Paginación
    const pageN  = parseInt(page);
    const limitN = parseInt(limit);
    const total  = rows.length;
    const skip   = (pageN - 1) * limitN;
    const sales  = rows.slice(skip, skip + limitN);

    res.json({
      success: true,
      data: {
        sales,
        pagination: { page: pageN, limit: limitN, total, totalPages: Math.ceil(total / limitN) }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDailyCreditSales = async (req, res) => {
  try {
    const db = getDb();
    const today = new Date(); today.setHours(0,0,0,0);
    const rows = db.prepare(`SELECT * FROM invoices WHERE is_credit = 1 AND created_at >= ? ORDER BY created_at DESC`).all(today.toISOString());
    res.json({ success: true, data: rows.map(r => newInvoice._toDoc(r)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getClientCreditInvoices = async (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM invoices WHERE cliente_id = ? AND is_credit = 1 ORDER BY created_at DESC`).all(req.params.clientId);
    res.json({ success: true, data: rows.map(r => newInvoice._toDoc(r)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getInvoicesByDate = async (req, res) => {
  try {
    const db = getDb();
    const { date } = req.query;
    const d = date ? new Date(date) : new Date();
    d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const rows = db.prepare(`SELECT * FROM invoices WHERE created_at >= ? AND created_at < ? ORDER BY created_at DESC`).all(d.toISOString(), next.toISOString());
    res.json({ success: true, data: rows.map(r => newInvoice._toDoc(r)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export como objeto default para compatibilidad con la ruta
export default {
  getDashboardData,
  getDetailedStats,
  getTopProducts,
  getDailySales,
  getDailyCreditSales,
  getClientCreditInvoices,
  getInvoicesByDate
};

// También named exports
export { getDashboardData, getDetailedStats, getTopProducts, getDailySales };
