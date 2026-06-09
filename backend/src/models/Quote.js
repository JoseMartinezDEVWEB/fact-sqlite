import { BaseModel } from '../config/database.js';

class QuoteModel extends BaseModel {
  constructor() { super('quotes'); }

  _toDoc(row) {
    const doc = super._toDoc(row);
    if (!doc) return null;
    if (typeof doc.items === 'string') {
      try { doc.items = JSON.parse(doc.items); } catch { doc.items = []; }
    }
    return doc;
  }
}

export const Quote = new QuoteModel();
