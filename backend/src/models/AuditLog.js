import { BaseModel } from '../config/database.js';

class AuditLogModel extends BaseModel {
  constructor() { super('audit_logs'); }
}

export const AuditLog = new AuditLogModel();
