import { BaseModel } from '../config/database.js';

class PurchaseOrderModel extends BaseModel {
  constructor() { super('purchase_orders'); }

  _toDoc(row) {
    const doc = super._toDoc(row);
    if (!doc) return null;
    if (typeof doc.items === 'string') {
      try { doc.items = JSON.parse(doc.items); } catch { doc.items = []; }
    }
    return doc;
  }

  _toRow(data) {
    const row = super._toRow(data);
    if (data.items && Array.isArray(data.items)) {
      row.items_json = JSON.stringify(data.items);
      delete row.items;
    }
    if (data.provider) { row.provider_id = data.provider; delete row.provider; }
    return row;
  }
}

export const PurchaseOrder = new PurchaseOrderModel();
