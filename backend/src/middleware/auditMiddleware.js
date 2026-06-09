import { AuditLog } from '../models/AuditLog.js';

export const auditMiddleware = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (userId && ['POST','PUT','DELETE','PATCH'].includes(req.method)) {
      await AuditLog.create({
        userId,
        action: req.method,
        resource: req.path,
        resourceId: req.params.id || null,
        ip: req.ip
      });
    }
  } catch (e) {
    // No fallar si el audit falla
  }
  next();
};
