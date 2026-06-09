import express from 'express';
import { CashRegisterShift } from '../models/CashRegisterShift.js';
import { getDb } from '../config/database.js';
import { authMiddleware } from '../middleware/authmiddleware.js';
import Business from '../models/businessModel.js';

const router = express.Router();

const resolveBusinessId = async (req) => {
  if (req.user?.businessId) return req.user.businessId;
  const business = await Business.findOne({});
  const b = await business;
  return b?._id ?? b?.id ?? null;
};

// Abrir turno de caja
router.post('/open', authMiddleware, async (req, res) => {
  try {
    const { initialAmount } = req.body;
    const businessId = await resolveBusinessId(req);

    if (!businessId) {
      return res.status(400).json({ message: 'No se encontró un negocio configurado. Configure el negocio en Ajustes primero.' });
    }

    // Verificar si ya hay un turno abierto
    const openShifts = await CashRegisterShift.find({ businessId, status: 'open' });
    const openList = await openShifts;
    if (openList.length > 0) {
      return res.status(400).json({ message: 'Ya existe un turno abierto', shift: openList[0] });
    }

    const shift = await CashRegisterShift.create({
      businessId,
      openedBy: req.user._id || req.user.id,
      cashierId: req.user._id || req.user.id,
      initialAmount: parseFloat(initialAmount) || 0,
      openingAmount: parseFloat(initialAmount) || 0,
      status: 'open',
      openedAt: new Date().toISOString()
    });

    res.status(201).json({ message: 'Turno de caja abierto exitosamente', shift });
  } catch (error) {
    console.error('Error al abrir turno:', error);
    res.status(500).json({ message: 'Error al abrir turno', error: error.message });
  }
});

// Cerrar turno de caja
router.post('/close', authMiddleware, async (req, res) => {
  try {
    const { declaredAmount, closingNotes } = req.body;
    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'No se encontró un negocio configurado.' });

    const openShifts = await CashRegisterShift.find({ businessId, status: 'open' });
    const openList = await openShifts;
    if (!openList.length) return res.status(400).json({ message: 'No hay un turno de caja abierto' });

    const shift = openList[0];

    // Calcular ventas del turno usando SQL directo
    const db = getDb();
    const openedAt = shift.openedAt || shift.openedAt;
    const salesRows = db.prepare(
      `SELECT payment_method, COALESCE(SUM(total),0) as total, COUNT(*) as cnt
       FROM invoices WHERE created_at >= ? AND status = 'completed' GROUP BY payment_method`
    ).all(openedAt);

    let cashSales = 0, cardSales = 0, transferSales = 0, creditSales = 0;
    salesRows.forEach(row => {
      switch (row.payment_method) {
        case 'cash':          cashSales     = row.total; break;
        case 'credit_card':   cardSales     = row.total; break;
        case 'bank_transfer': transferSales = row.total; break;
        case 'credit':        creditSales   = row.total; break;
      }
    });

    const initialAmt = shift.initialAmount || shift.openingAmount || 0;
    const expenses   = shift.expenses || 0;
    const declared   = parseFloat(declaredAmount) || 0;
    const expectedCash = initialAmt + cashSales - expenses;
    const difference   = declared - expectedCash;

    const updated = await CashRegisterShift.findByIdAndUpdate(
      shift.id,
      {
        cashSales, cardSales, transferSales, creditSales,
        declaredAmount: declared,
        closingNotes: closingNotes || '',
        closedBy: req.user._id || req.user.id,
        closingAmount: declared,
        closedAt: new Date().toISOString(),
        status: 'closed',
        difference
      },
      { new: true }
    );
    const u = await updated;

    res.json({
      message: 'Turno de caja cerrado exitosamente',
      shift: u,
      summary: { initialAmount: initialAmt, cashSales, cardSales, transferSales, creditSales, expectedCash, declaredAmount: declared, difference }
    });
  } catch (error) {
    console.error('Error al cerrar turno:', error);
    res.status(500).json({ message: 'Error al cerrar turno', error: error.message });
  }
});

// Obtener turno actual
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.json({ hasOpenShift: false, shift: null });

    const openShifts = await CashRegisterShift.find({ businessId, status: 'open' });
    const openList = await openShifts;
    if (!openList.length) return res.json({ hasOpenShift: false, shift: null });

    const shift = openList[0];

    // Ventas en tiempo real
    const db = getDb();
    const openedAt = shift.openedAt;
    const salesRows = db.prepare(
      `SELECT payment_method, COALESCE(SUM(total),0) as total
       FROM invoices WHERE created_at >= ? AND status = 'completed' GROUP BY payment_method`
    ).all(openedAt);

    let cashSales = 0, cardSales = 0, transferSales = 0, creditSales = 0;
    salesRows.forEach(row => {
      switch (row.payment_method) {
        case 'cash':          cashSales     = row.total; break;
        case 'credit_card':   cardSales     = row.total; break;
        case 'bank_transfer': transferSales = row.total; break;
        case 'credit':        creditSales   = row.total; break;
      }
    });

    res.json({
      hasOpenShift: true,
      shift,
      currentSales: { cashSales, cardSales, transferSales, creditSales, totalSales: cashSales + cardSales + transferSales + creditSales }
    });
  } catch (error) {
    console.error('Error al obtener turno actual:', error);
    res.status(500).json({ message: 'Error al obtener turno actual', error: error.message });
  }
});

// Historial de turnos
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.json({ shifts: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });

    const db = getDb();
    const conditions = ['business_id = ?'];
    const params = [businessId];

    if (startDate && endDate) {
      conditions.push('opened_at >= ? AND opened_at <= ?');
      params.push(new Date(startDate).toISOString(), new Date(endDate).toISOString());
    }

    const where = conditions.join(' AND ');
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = db.prepare(`SELECT COUNT(*) as c FROM cash_register_shifts WHERE ${where}`).get(...params).c;
    const rows = db.prepare(`SELECT * FROM cash_register_shifts WHERE ${where} ORDER BY opened_at DESC LIMIT ${limit} OFFSET ${skip}`).all(...params);
    const shifts = rows.map(r => CashRegisterShift._toDoc(r));

    res.json({ shifts, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error al obtener historial', error: error.message });
  }
});

// Reporte diario
router.get('/daily-report', authMiddleware, async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.json({ shifts: [], totals: {} });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const db = getDb();
    const rows = db.prepare(
      `SELECT * FROM cash_register_shifts WHERE business_id = ? AND opened_at >= ? ORDER BY opened_at DESC`
    ).all(businessId, today.toISOString());
    const shifts = rows.map(r => CashRegisterShift._toDoc(r));

    let totalCash = 0, totalCard = 0, totalTransfer = 0, totalCredit = 0, totalExpenses = 0, totalInitial = 0, totalDeclared = 0;
    shifts.forEach(s => {
      totalCash     += s.cashSales     || 0;
      totalCard     += s.cardSales     || 0;
      totalTransfer += s.transferSales || 0;
      totalCredit   += s.creditSales   || 0;
      totalExpenses += s.expenses      || 0;
      totalInitial  += s.initialAmount || s.openingAmount || 0;
      totalDeclared += s.declaredAmount|| 0;
    });

    res.json({
      date: today,
      shifts,
      totals: {
        totalSales: totalCash + totalCard + totalTransfer + totalCredit,
        cashSales: totalCash, cardSales: totalCard, transferSales: totalTransfer, creditSales: totalCredit,
        expenses: totalExpenses, initialAmount: totalInitial, declaredAmount: totalDeclared,
        difference: totalDeclared - (totalInitial + totalCash - totalExpenses)
      }
    });
  } catch (error) {
    console.error('Error al obtener reporte diario:', error);
    res.status(500).json({ message: 'Error al obtener reporte diario', error: error.message });
  }
});

// Agregar gasto al turno actual
router.post('/expense', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    const businessId = await resolveBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'No se encontró un negocio configurado.' });

    const openShifts = await CashRegisterShift.find({ businessId, status: 'open' });
    const openList = await openShifts;
    if (!openList.length) return res.status(400).json({ message: 'No hay un turno de caja abierto' });

    const shift = openList[0];
    const newExpenses = (shift.expenses || 0) + (parseFloat(amount) || 0);
    const updated = await CashRegisterShift.findByIdAndUpdate(shift.id, { expenses: newExpenses }, { new: true });
    const u = await updated;

    res.json({ message: 'Gasto registrado', shift: u });
  } catch (error) {
    console.error('Error al registrar gasto:', error);
    res.status(500).json({ message: 'Error al registrar gasto', error: error.message });
  }
});

export default router;
