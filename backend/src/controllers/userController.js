import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

const generateToken = (userId) =>
  jwt.sign({ userId, id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

// login → usado en ruta POST /api/auth/login
export const login = async (req, res) => {
  try {
    // El frontend puede enviar el campo como "username" o "email" (el input se llama email en el form)
    const { username, email, password } = req.body;
    const loginId = username || email; // aceptar cualquiera de los dos campos

    if (!loginId || !password)
      return res.status(400).json({ status: 'error', message: 'Usuario y contraseña son requeridos' });

    // Buscar por username primero, luego por email
    let userQ = await User.findOne({ username: loginId });
    let user = await userQ;

    if (!user) {
      userQ = await User.findOne({ email: loginId });
      user = await userQ;
    }

    if (!user) return res.status(401).json({ status: 'error', message: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ status: 'error', message: 'Credenciales inválidas' });

    const token = generateToken(user.id);
    const userData = { id: user.id, _id: user.id, username: user.username, email: user.email, role: user.role };

    // Respuesta en el formato que espera el frontend: { token, user } al nivel raíz
    res.json({ token, user: userData, status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// loginUser alias
export const loginUser = login;

// registerUser (POST /api/auth/register)
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ status: 'error', message: 'Todos los campos son requeridos' });

    const existingQ = await User.findOne({ email });
    const existing = await existingQ;
    if (existing) return res.status(400).json({ status: 'error', message: 'El email ya está registrado' });

    const user = await User.create({ username, email, password, role: role || 'cliente' });
    const token = generateToken(user.id);
    res.status(201).json({ status: 'success', data: { user: { id: user.id, username: user.username, email: user.email, role: user.role }, token } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// createUser → POST /api/auth/users (admin)
export const createUser = registerUser;

// getMe / getUserInfo → GET /api/auth/users/info
export const getUserInfo = async (req, res) => {
  try {
    const userQ = await User.findById(req.user._id || req.user.id);
    const user = await userQ;
    if (!user) return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    const { password, save, ...safeUser } = user;
    // Devolver username/role al nivel raíz para compatibilidad con el Drawer
    res.json({
      status:   'success',
      username: user.username,
      role:     user.role,
      id:       user.id,
      email:    user.email,
      data:     { user: safeUser }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMe = getUserInfo;

// getUsers → GET /api/auth/users (admin)
export const getUsers = async (req, res) => {
  try {
    const usersQ = await User.find({});
    const list = await usersQ;
    res.json({ status: 'success', data: list.map(u => { const { password, save, ...s } = u; return s; }) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// createInitialAdmin → POST /api/auth/register-admin (sin auth)
export const createInitialAdmin = async (req, res) => {
  try {
    const { User: UserModel } = await import('../models/User.js');
    const { getDb } = await import('../config/database.js');
    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE role IN ('admin','superadmin') LIMIT 1").get();
    if (existing) return res.status(400).json({ message: 'Ya existe un administrador' });

    const { username, email, password } = req.body;
    const user = await UserModel.create({ username: username || 'admin', email: email || 'admin@factura.com', password: password || 'admin123', role: 'superadmin' });
    res.status(201).json({ message: 'Admin creado', user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// updateUser → PUT /api/auth/users/:id
export const updateUser = async (req, res) => {
  try {
    const { username, email, role, password } = req.body;
    const update = {};
    if (username) update.username = username;
    if (email) update.email = email;
    if (role) update.role = role;
    if (password) update.password = await bcrypt.hash(password, 10);

    const userQ = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    const user = await userQ;
    if (!user) return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    const { password: pw, save, ...safeUser } = user;
    res.json({ status: 'success', data: { user: safeUser } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// deleteUser → DELETE /api/auth/users/:id
export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// changePassword → PUT /api/auth/users/:id/password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userQ = await User.findById(req.user._id);
    const user = await userQ;
    if (!user) return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ status: 'error', message: 'Contraseña actual incorrecta' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(user.id, { password: hashed });
    res.json({ status: 'success', message: 'Contraseña actualizada' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
