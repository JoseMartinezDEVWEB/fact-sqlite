import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import Business from '../models/businessModel.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'No se proporcionó token de autenticación' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userQ = await User.findById(decoded.userId || decoded.id);
    const u = await userQ;
    if (!u) {
      return res.status(401).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    let businessId = u.business;
    if (!businessId) {
      const bQ = await Business.findOne({});
      const b = await bQ;
      if (b) businessId = b._id;
    }

    req.user = { _id: u._id, id: u.id, username: u.username, email: u.email, role: u.role, businessId };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ status: 'error', message: 'Token inválido', error: error.message });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Token expirado', error: error.message });
    }
    res.status(500).json({ status: 'error', message: 'Error en la autenticación', error: error.message });
  }
};

export const checkRole = (roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ status: 'error', message: 'Usuario no autenticado' });
  if (!Array.isArray(roles)) roles = [roles];
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ status: 'error', message: 'No tienes permiso para realizar esta acción' });
  }
  next();
};

export const authenticate = authMiddleware;
export const protect = authMiddleware;
export const restrictTo = checkRole;
