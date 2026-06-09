import { BaseModel } from '../config/database.js';

class SupplierModel extends BaseModel {
  constructor() { super('suppliers'); }
}

export const Supplier = new SupplierModel();
