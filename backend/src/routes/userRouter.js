import express from 'express';
import {
  login, createUser, getUsers, createInitialAdmin, getUserInfo,
  updateUser, deleteUser, changePassword
} from '../controllers/userController.js';
import { authMiddleware, checkRole } from '../middleware/authmiddleware.js';

const router = express.Router();

// Autenticación pública
router.post('/login', login);
router.post('/register-admin', createInitialAdmin);

// Info del usuario autenticado
router.get('/users/info', authMiddleware, getUserInfo);

// Listar usuarios
router.get('/users', authMiddleware, checkRole(['admin', 'encargado', 'superadmin']), getUsers);

// Crear usuario
router.post('/users', authMiddleware, checkRole(['admin', 'encargado', 'superadmin']), createUser);

// Actualizar usuario
router.put('/users/:id', authMiddleware, checkRole(['admin', 'encargado', 'superadmin']), updateUser);

// Eliminar usuario (solo superadmin y admin)
router.delete('/users/:id', authMiddleware, checkRole(['superadmin', 'admin']), deleteUser);

// Cambiar contraseña propia
router.put('/users/:id/password', authMiddleware, changePassword);

export default router;