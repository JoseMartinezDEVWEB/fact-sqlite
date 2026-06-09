import { BaseModel } from '../config/database.js';

class BusinessModel extends BaseModel {
  constructor() { super('business'); }
}

const Business = new BusinessModel();
export default Business;
