import { newInvoice } from '../models/newInvoice.js';
import { Product } from '../models/Product.js';
import Cliente from '../models/Cliente.js';
import { getDb } from '../config/database.js';

export const createInvoice = async (req, res) => {
  try {
    const { items, customer, paymentMethod, paymentDetails, subtotal, taxAmount, total,
      isCredit, clienteId, clientInfo, isDelivery, deliveryInfo } = req.body;

    // Validar stock
    for (const item of items) {
      const productQ = await Product.findById(item.product);
      const product = await productQ;
      if (!product) return res.status(404).json({ message: `Producto no encontrado: ${item.product}` });

      if (product.unitType === 'peso' && item.weightInfo) {
        if (product.quantity < item.weightInfo.value) {
          return res.status(400).json({ message: `Stock insuficiente para: ${product.name}` });
        }
      } else {
        if (product.quantity < item.quantity) {
          return res.status(400).json({ message: `Stock insuficiente para: ${product.name}` });
        }
      }
    }

    const invoiceData = {
      cashier: req.user?.id || null,
      customer,
      items: items.map(item => ({
        product: item.product,
        name: item.name,
        quantity: item.quantity,
        price: item.price || item.salePrice,
        subtotal: item.subtotal,
        weightInfo: item.weightInfo || undefined
      })),
      paymentMethod, paymentDetails,
      subtotal: parseFloat(subtotal) || 0,
      taxAmount: parseFloat(taxAmount) || 0,
      total: parseFloat(total) || 0,
      business: req.user?.businessId || null,
      isDelivery: isDelivery || false,
      deliveryInfo: isDelivery ? deliveryInfo : undefined
    };

    if (isCredit) {
      if (!clienteId) return res.status(400).json({ message: 'Se requiere un cliente para compra fiada' });
      const clienteQ = await Cliente.findById(clienteId);
      const cliente = await clienteQ;
      if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' });

      invoiceData.isCredit = true;
      invoiceData.clienteId = clienteId;
      invoiceData.clientInfo = clientInfo || { id: clienteId, name: cliente.name };
      invoiceData.creditStatus = 'pending';

      await Cliente.findByIdAndUpdate(clienteId, { $inc: { cuentasPendientes: total } });
    }

    const savedInvoice = await newInvoice._insertOne(invoiceData);

    // Actualizar stock
    for (const item of items) {
      try {
        const productQ = await Product.findById(item.product);
        const product = await productQ;
        if (!product) continue;

        if (product.unitType === 'peso' && item.weightInfo) {
          await Product.findByIdAndUpdate(product.id, { $inc: { quantity: -item.weightInfo.value } });
        } else if (product.unitType === 'paquete' && product.unitProductId && product.packageWeight > 0) {
          const unitQ = await Product.findById(product.unitProductId);
          const unitProduct = await unitQ;
          if (unitProduct && unitProduct.unitType === 'peso') {
            const totalWeight = item.quantity * product.packageWeight;
            await Product.findByIdAndUpdate(product.id, { $inc: { quantity: -item.quantity } });
            await Product.findByIdAndUpdate(unitProduct.id, { $inc: { quantity: -totalWeight } });
          } else {
            await Product.findByIdAndUpdate(product.id, { $inc: { quantity: -item.quantity } });
          }
        } else if (product.isUnitOfPackage && product.parentPackageId) {
          const pkgQ = await Product.findById(product.parentPackageId);
          const pkg = await pkgQ;
          if (pkg && pkg.unitsPerPackage > 0) {
            const fraction = item.quantity / pkg.unitsPerPackage;
            await Product.findByIdAndUpdate(pkg.id, { $inc: { quantity: -fraction } });
            await Product.findByIdAndUpdate(product.id, { $inc: { quantity: -item.quantity } });
          }
        } else {
          await Product.findByIdAndUpdate(product.id, { $inc: { quantity: -item.quantity } });
        }
      } catch (e) {
        console.error('Error actualizando stock:', e);
      }
    }

    res.status(201).json(savedInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Error al crear la factura', error: error.message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const { customer, startDate, endDate, status, paymentMethod, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (customer) filter['customer.name'] = { $regex: customer, $options: 'i' };
    if (startDate && endDate) filter.createdAt = { $gte: new Date(startDate).toISOString(), $lte: new Date(endDate).toISOString() };
    else if (startDate) filter.createdAt = { $gte: new Date(startDate).toISOString() };
    else if (endDate) filter.createdAt = { $lte: new Date(endDate).toISOString() };
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (req.query.isDelivery !== undefined) filter.isDelivery = req.query.isDelivery === 'true';
    if (req.query.paymentStatus === 'pending') { filter.isCredit = true; filter.creditStatus = 'pending'; }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const db = getDb();
    let sql = 'SELECT * FROM invoices';
    const conditions = [];
    const params = [];

    if (filter['customer.name']) {
      conditions.push('customer_name LIKE ?'); params.push(`%${filter['customer.name'].$regex}%`);
    }
    if (filter.createdAt) {
      if (filter.createdAt.$gte && filter.createdAt.$lte) {
        conditions.push('created_at >= ? AND created_at <= ?');
        params.push(filter.createdAt.$gte, filter.createdAt.$lte);
      } else if (filter.createdAt.$gte) {
        conditions.push('created_at >= ?'); params.push(filter.createdAt.$gte);
      } else if (filter.createdAt.$lte) {
        conditions.push('created_at <= ?'); params.push(filter.createdAt.$lte);
      }
    }
    if (filter.status) { conditions.push('status = ?'); params.push(filter.status); }
    if (filter.paymentMethod) { conditions.push('payment_method = ?'); params.push(filter.paymentMethod); }
    if (filter.isDelivery !== undefined) { conditions.push('is_delivery = ?'); params.push(filter.isDelivery ? 1 : 0); }
    if (filter.isCredit) { conditions.push('is_credit = 1'); }
    if (filter.creditStatus) { conditions.push('credit_status = ?'); params.push(filter.creditStatus); }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC';

    const totalRow = db.prepare(`SELECT COUNT(*) as c FROM invoices${conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''}`).get(...params);
    const total = totalRow ? totalRow.c : 0;

    sql += ` LIMIT ${parseInt(limit)} OFFSET ${skip}`;
    const rows = db.prepare(sql).all(...params);
    const invoices = rows.map(r => newInvoice._toDoc(r));

    res.json({ data: invoices, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)), totalItems: total });
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({ message: 'Error al obtener facturas', error: error.message });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoiceQ = await newInvoice.findById(req.params.id);
    const invoice = await invoiceQ;
    if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la factura', error: error.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const updated = await newInvoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const u = await updated;
    if (!u) return res.status(404).json({ message: 'Factura no encontrada' });
    res.json(u);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la factura', error: error.message });
  }
};

export const cancelInvoice = async (req, res) => {
  try {
    const invoiceQ = await newInvoice.findById(req.params.id);
    const invoice = await invoiceQ;
    if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });

    await newInvoice.findByIdAndUpdate(req.params.id, { status: 'cancelled' });

    // Restaurar stock
    for (const item of invoice.items || []) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
      }
    }
    res.json({ message: 'Factura cancelada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al cancelar la factura', error: error.message });
  }
};

export const getInvoiceStats = async (req, res) => {
  try {
    const db = getDb();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const todayStats = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE created_at >= ? AND status != 'cancelled'`).get(todayStr);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const monthStats = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM invoices WHERE created_at >= ? AND status != 'cancelled'`).get(monthStart);

    res.json({
      today: { count: todayStats.count, total: todayStats.total },
      month: { count: monthStats.count, total: monthStats.total }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCreditStatus = async (req, res) => {
  try {
    const { creditStatus, amountPaid } = req.body;
    const invoiceQ = await newInvoice.findById(req.params.id);
    const invoice = await invoiceQ;
    if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });

    await newInvoice.findByIdAndUpdate(req.params.id, { creditStatus });

    if (invoice.clienteId && amountPaid) {
      await Cliente.findByIdAndUpdate(invoice.clienteId, { $inc: { cuentasPendientes: -parseFloat(amountPaid) } });
    }

    res.json({ message: 'Estado de crédito actualizado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
