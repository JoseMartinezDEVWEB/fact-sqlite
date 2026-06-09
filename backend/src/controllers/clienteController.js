import Cliente from '../models/Cliente.js';
import { getDb } from '../config/database.js';

export const getClientes = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const skip = (parseInt(page)-1) * parseInt(limit);
    const clientes = await Cliente.find(filter, { sort: { createdAt: -1 }, skip, limit: parseInt(limit) });
    const list = await clientes;
    const total = await Cliente.countDocuments(filter);
    res.json({ data: list, total, page: parseInt(page), totalPages: Math.ceil(total/parseInt(limit)) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getClienteById = async (req, res) => {
  try {
    const q = await Cliente.findById(req.params.id);
    const cliente = await q;
    if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createCliente = async (req, res) => {
  try {
    const cliente = await Cliente.create({ ...req.body, createdBy: req.user?._id || req.user?.id });
    res.status(201).json(cliente);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateCliente = async (req, res) => {
  try {
    const updated = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const u = await updated;
    if (!u) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json(u);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteCliente = async (req, res) => {
  try {
    await Cliente.findByIdAndDelete(req.params.id);
    res.json({ message: 'Cliente eliminado' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getClientesStats = async (req, res) => {
  try {
    const db = getDb();
    const total = db.prepare(`SELECT COUNT(*) as c FROM clientes WHERE role = 'cliente'`).get().c;
    const debtStats = db.prepare(`
      SELECT COUNT(DISTINCT cliente_id) as c, COALESCE(SUM(total), 0) as t
      FROM invoices
      WHERE is_credit = 1 AND credit_status != 'paid' AND status != 'cancelled' AND cliente_id IS NOT NULL
    `).get();
    const withDebt = debtStats.c;
    const totalDebt = debtStats.t;
    const cuentasVendidas = db.prepare(`SELECT COALESCE(SUM(cuentas_vendidas),0) as t FROM clientes`).get().t;
    res.json({
      success: true,
      total,
      withDebt,
      totalDebt,
      cuentasVendidas,
      // Compatibilidad con el frontend:
      totalClientes: total,
      cuentasPendientes: totalDebt,
      totalPendientesCount: withDebt
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const searchClientes = async (req, res) => {
  try {
    const term = req.query.q || req.query.term || req.query.search || '';
    if (!term) return res.json({ data: [] });
    const db = getDb();
    const rows = db.prepare(
      `SELECT * FROM clientes WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR rnc_cedula LIKE ? LIMIT 20`
    ).all(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
    res.json({ data: rows.map(r => Cliente._toDoc(r)) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getClientesDeuda = async (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT c.id, c.name, c.email, c.phone, c.role, c.rnc_cedula, c.tipo_negocio, c.created_at,
        COALESCE((
          SELECT SUM(i.total) FROM invoices i
          WHERE i.cliente_id = c.id AND i.is_credit = 1
            AND i.credit_status != 'paid' AND i.status != 'cancelled'
        ), 0) AS cuentas_pendientes,
        (
          SELECT COUNT(*) FROM invoices i
          WHERE i.cliente_id = c.id AND i.is_credit = 1
            AND i.credit_status != 'paid' AND i.status != 'cancelled'
        ) AS facturas_pendientes
      FROM clientes c
      WHERE c.role = 'cliente'
        AND EXISTS (
          SELECT 1 FROM invoices i
          WHERE i.cliente_id = c.id AND i.is_credit = 1
            AND i.credit_status != 'paid' AND i.status != 'cancelled'
        )
      ORDER BY cuentas_pendientes DESC
    `).all();
    const list = rows.map(r => {
      const doc = Cliente._toDoc(r);
      if (doc) {
        doc.totalDeuda = doc.cuentasPendientes;
      }
      return doc;
    });
    res.json({ success: true, data: list, clientes: list });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const saldarDeuda = async (req, res) => {
  try {
    const clienteId = req.params.id || req.body.clienteId;
    if (!clienteId) return res.status(400).json({ success: false, message: 'Se requiere el ID del cliente' });
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE invoices SET credit_status = 'paid', updated_at = ?
      WHERE cliente_id = ? AND is_credit = 1 AND credit_status != 'paid' AND status != 'cancelled'
    `).run(now, clienteId);
    await Cliente.findByIdAndUpdate(clienteId, { cuentasPendientes: 0 });
    res.json({ success: true, message: 'Deuda saldada' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const abonarDeuda = async (req, res) => {
  try {
    const clienteId = req.params.id || req.body.clienteId;
    const monto = parseFloat(req.body.montoAbono || req.body.amount || 0);
    if (!clienteId) return res.status(400).json({ success: false, message: 'Se requiere el ID del cliente' });
    if (monto <= 0)  return res.status(400).json({ success: false, message: 'El monto debe ser mayor a 0' });

    const db = getDb();
    const now = new Date().toISOString();

    // Marcar facturas como pagadas de más antigua a más nueva hasta cubrir el abono
    let remaining = monto;
    const pendingInvoices = db.prepare(`
      SELECT id, total FROM invoices
      WHERE cliente_id = ? AND is_credit = 1 AND credit_status != 'paid' AND status != 'cancelled'
      ORDER BY created_at ASC
    `).all(clienteId);

    for (const inv of pendingInvoices) {
      if (remaining <= 0) break;
      if (remaining >= inv.total) {
        db.prepare(`UPDATE invoices SET credit_status = 'paid', updated_at = ? WHERE id = ?`).run(now, inv.id);
        remaining -= inv.total;
      } else {
        break;
      }
    }

    // Calcular deuda real restante desde las facturas
    const nuevaDeuda = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as t FROM invoices
      WHERE cliente_id = ? AND is_credit = 1 AND credit_status != 'paid' AND status != 'cancelled'
    `).get(clienteId).t;

    await Cliente.findByIdAndUpdate(clienteId, { cuentasPendientes: nuevaDeuda });
    res.json({ success: true, message: 'Abono registrado', nuevaDeuda });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
