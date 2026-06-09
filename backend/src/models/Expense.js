import { BaseModel } from '../config/database.js';

class ExpenseModel extends BaseModel {
  constructor() { super('expenses'); }

  async getTodayExpenses() {
    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);
    const rows = this._db().prepare(
      `SELECT * FROM expenses WHERE date >= ? AND date <= ?`
    ).all(start.toISOString(), end.toISOString());
    return rows.map(r => this._toDoc(r));
  }

  async getTodayDeductibleTotal() {
    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);
    const row = this._db().prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ? AND deduct_from_sales = 1 AND deduction_period = 'day'`
    ).get(start.toISOString(), end.toISOString());
    return row ? row.total : 0;
  }
}

const Expense = new ExpenseModel();

// Statics compatibility
Expense.getTodayExpenses = async () => {
  const today = new Date();
  const start = new Date(today); start.setHours(0, 0, 0, 0);
  const end = new Date(today); end.setHours(23, 59, 59, 999);
  return Expense.find({ date: { $gte: start.toISOString(), $lte: end.toISOString() } });
};

export default Expense;
