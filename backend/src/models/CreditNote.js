import { BaseModel } from '../config/database.js';

class CreditNoteModel extends BaseModel {
  constructor() { super('credit_notes'); }
}

export const CreditNote = new CreditNoteModel();
