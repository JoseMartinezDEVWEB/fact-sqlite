import { BaseModel } from '../config/database.js';

class CreditPurchaseModel extends BaseModel {
  constructor() { super('credit_purchases'); }

  _toDoc(row) {
    const doc = super._toDoc(row);
    if (!doc) return null;
    if (typeof doc.items === 'string') {
      try { doc.items = JSON.parse(doc.items); } catch { doc.items = []; }
    }
    return doc;
  }
}

export const CreditPurchase = new CreditPurchaseModel();
