import { BaseModel } from '../config/database.js';

class CategoryModel extends BaseModel {
  constructor() { super('categories'); }
}

export const Category = new CategoryModel();
