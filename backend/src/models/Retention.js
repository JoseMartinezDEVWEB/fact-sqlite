import { BaseModel } from '../config/database.js';

class RetentionModel extends BaseModel {
  constructor() { super('retentions'); }
}

export const Retention = new RetentionModel();
export default Retention;
