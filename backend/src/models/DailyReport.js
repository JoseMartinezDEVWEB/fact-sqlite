import { BaseModel } from '../config/database.js';

class DailyReportModel extends BaseModel {
  constructor() { super('daily_reports'); }
}

export const DailyReport = new DailyReportModel();
