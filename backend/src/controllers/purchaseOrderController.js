import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { getDb } from '../config/database.js';

export const getPurchaseOrders = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find({});
    res.json({ data: await orders });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getPurchaseOrderById = async (req, res) => {
  try {
    const q = await PurchaseOrder.findById(req.params.id);
    const order = await q;
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
    res.json(order);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as c FROM purchase_orders').get().c;
    const d = new Date();
    const orderNumber = `OC-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}-${String(count+1).padStart(4,'0')}`;
    const order = await PurchaseOrder.create({ ...req.body, orderNumber, createdBy: req.user?._id });
    res.status(201).json(order);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updatePurchaseOrder = async (req, res) => {
  try {
    const updated = await PurchaseOrder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const u = await updated;
    if (!u) return res.status(404).json({ message: 'Orden no encontrada' });
    res.json(u);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const update = {};
    if (status) update.status = status;
    if (paymentStatus) update.paymentStatus = paymentStatus;
    await PurchaseOrder.findByIdAndUpdate(req.params.id, update);
    res.json({ message: 'Estado actualizado' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const addPaymentToPurchaseOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const q = await PurchaseOrder.findById(req.params.id);
    const order = await q;
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
    const newBalance = (order.balanceDue || order.total || 0) - parseFloat(amount);
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';
    await PurchaseOrder.findByIdAndUpdate(req.params.id, { balanceDue: Math.max(0, newBalance), paymentStatus: newStatus });
    res.json({ message: 'Pago registrado', balanceDue: Math.max(0, newBalance) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getPurchaseOrdersByProvider = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find({ providerId: req.params.id });
    res.json({ data: await orders });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getPendingPurchaseOrders = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find({ paymentStatus: { $ne: 'paid' } });
    res.json({ data: await orders });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deletePurchaseOrder = async (req, res) => {
  try {
    await PurchaseOrder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Orden eliminada' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
