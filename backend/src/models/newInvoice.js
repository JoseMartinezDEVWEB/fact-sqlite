import { BaseModel, getDb } from '../config/database.js';
import { randomUUID } from 'crypto';

class InvoiceModel extends BaseModel {
  constructor() { super('invoices'); }

  _toDoc(row) {
    const doc = super._toDoc(row);
    if (!doc) return null;

    // Reconstruir customer object
    doc.customer = {
      name: doc.customerName || 'Consumidor Final',
      email: doc.customerEmail || null,
      phone: doc.customerPhone || null,
      address: doc.customerAddress || null,
      taxId: doc.customerTaxId || null
    };

    // Cargar items desde tabla invoice_items
    const db = getDb();
    const itemRows = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY rowid').all(doc.id);
    doc.items = itemRows.map(ir => ({
      _id: ir.id,
      product: ir.product_id,
      name: ir.product_name,
      quantity: ir.quantity,
      price: ir.price,
      subtotal: ir.subtotal,
      weightInfo: (ir.weight_value != null) ? {
        value: ir.weight_value,
        unit: ir.weight_unit,
        pricePerUnit: ir.weight_price_per_unit
      } : undefined
    }));

    // Reconstruir paymentDetails
    doc.paymentDetails = {
      cardLastFour: doc.paymentCardLastFour || null,
      transactionId: doc.paymentTransactionId || null,
      authorizationCode: doc.paymentAuthCode || null
    };

    // Reconstruir deliveryInfo
    doc.deliveryInfo = {
      address: doc.deliveryAddress || null,
      notes: doc.deliveryNotes || null,
      messengerName: doc.deliveryMessenger || null
    };

    // Reconstruir clientInfo
    doc.clientInfo = {
      id: doc.clienteId || null,
      name: doc.clientInfoName || null
    };

    return doc;
  }

  _toRow(data) {
    const row = {};
    row.id = data.id || data._id || null;
    row.receipt_number = data.receiptNumber || null;
    row.business_id = data.business || data.businessId || null;
    row.date_time = data.dateTime || new Date().toISOString();
    row.cashier_id = data.cashier || null;
    row.customer_name = (data.customer && data.customer.name) ? data.customer.name : (data.customerName || 'Consumidor Final');
    row.customer_email = (data.customer && data.customer.email) || data.customerEmail || null;
    row.customer_phone = (data.customer && data.customer.phone) || data.customerPhone || null;
    row.customer_address = (data.customer && data.customer.address) || data.customerAddress || null;
    row.customer_tax_id = (data.customer && data.customer.taxId) || data.customerTaxId || null;
    row.payment_method = data.paymentMethod || 'cash';
    row.payment_card_last_four = (data.paymentDetails && data.paymentDetails.cardLastFour) || null;
    row.payment_transaction_id = (data.paymentDetails && data.paymentDetails.transactionId) || null;
    row.payment_auth_code = (data.paymentDetails && data.paymentDetails.authorizationCode) || null;
    row.subtotal = data.subtotal || 0;
    row.tax_rate = data.taxRate || 0.18;
    row.tax_amount = data.taxAmount || 0;
    row.total = data.total || 0;
    row.status = data.status || 'completed';
    row.is_credit = data.isCredit ? 1 : 0;
    row.cliente_id = data.clienteId || null;
    row.client_info_name = (data.clientInfo && data.clientInfo.name) || null;
    row.credit_status = data.creditStatus || 'pending';
    row.is_delivery = data.isDelivery ? 1 : 0;
    row.delivery_address = (data.deliveryInfo && data.deliveryInfo.address) || null;
    row.delivery_notes = (data.deliveryInfo && data.deliveryInfo.notes) || null;
    row.delivery_messenger = (data.deliveryInfo && data.deliveryInfo.messengerName) || null;
    row.created_at = data.createdAt || new Date().toISOString();
    return row;
  }

  async _insertOne(data) {
    const db = getDb();
    const row = this._toRow(data);
    if (!row.id) row.id = randomUUID();

    // Generar receipt_number si no existe
    if (!row.receipt_number) {
      const count = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
      const d = new Date();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      row.receipt_number = `FAC-${d.getFullYear()}${mm}-${String(count + 1).padStart(4, '0')}`;
    }

    const cols = Object.keys(row);
    const vals = Object.values(row);
    db.prepare(`INSERT INTO invoices (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...vals);

    // Insertar items en tabla separada
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        db.prepare(`INSERT INTO invoice_items (id, invoice_id, product_id, product_name, quantity, price, subtotal, weight_value, weight_unit, weight_price_per_unit) VALUES (?,?,?,?,?,?,?,?,?,?)`)
          .run(
            randomUUID(), row.id,
            item.product || null,
            item.name || null,
            item.quantity || 0,
            item.price || 0,
            item.subtotal || 0,
            item.weightInfo ? item.weightInfo.value : null,
            item.weightInfo ? item.weightInfo.unit : null,
            item.weightInfo ? item.weightInfo.pricePerUnit : null
          );
      }
    }

    const saved = db.prepare('SELECT * FROM invoices WHERE id = ?').get(row.id);
    return this._toDoc(saved);
  }

  async findByIdAndUpdate(id, update, opts = {}) {
    const result = await super.findByIdAndUpdate(id, update, opts);
    return result;
  }
}

export const newInvoice = new InvoiceModel();
