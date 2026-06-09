import { BaseModel } from '../config/database.js';

class LicenseModel extends BaseModel {
  constructor() { super('licenses'); }

  _toDoc(row) {
    const doc = super._toDoc(row);
    if (!doc) return null;
    doc.key = doc.keyValue; // compatibilidad
    return doc;
  }

  _toRow(data) {
    const row = super._toRow(data);
    if (data.key) { row.key_value = data.key; delete row.key; }
    return row;
  }
}

export const License = new LicenseModel();
