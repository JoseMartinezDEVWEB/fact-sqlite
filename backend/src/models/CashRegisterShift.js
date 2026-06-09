import { BaseModel } from '../config/database.js';

class CashRegisterShiftModel extends BaseModel {
  constructor() { super('cash_register_shifts'); }

  // La tabla usa opened_at en lugar de created_at
  async find(filter = {}, opts = {}) {
    if (!opts.sort) opts = { ...opts, sort: { openedAt: -1 } };
    return super.find(filter, opts);
  }
}

export const CashRegisterShift = new CashRegisterShiftModel();
