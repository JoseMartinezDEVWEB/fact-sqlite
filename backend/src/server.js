import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';

import { initDb } from './config/database.js';
import errorHandler from './middleware/errorHandler.js';
import timeout from './middleware/timeout.js';

import userRouter from './routes/userRouter.js';
import productRouter from './routes/productRouter.js';
import categoryRouter from './routes/categoryRoutes.js';
import businessRouter from './routes/businessRoutes.js';
import daliyReportRouter from './routes/dailyReportRoutes.js';
import invoiceRoutes from './routes/newInvoices.js';
import dashboardRouter from './routes/dashboard.js';
import expenseRoutes from './routes/expenseRoutes.js';
import clienteRoutes from './routes/clienteRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import creditPaymentRoutes from './routes/creditPaymentRoutes.js';
import creditNoteRoutes from './routes/creditNoteRoutes.js';
import quoteRoutes from './routes/quoteRoutes.js';
import retentionRoutes from './routes/retentionRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import creditPurchaseRoutes from './routes/creditPurchaseRoutes.js';
import healthRoutes from './routes/health.js';
import reportRoutes from './routes/reportRoutes.js';
import licenseRoutes from './routes/licenseRoutes.js';
import cashRegisterRoutes from './routes/cashRegisterRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

// ─── Inicializar SQLite ───────────────────────────────────────────────
// En Electron producción, los datos se guardan en userData
// En desarrollo, se guardan en backend/data/
let dbPath;
if (process.env.SQLITE_DB_FULL_PATH) {
  dbPath = process.env.SQLITE_DB_FULL_PATH;
} else {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  dbPath = path.join(dataDir, 'factura.db');
}

console.log(`Base de datos SQLite en: ${dbPath}`);
initDb(dbPath);

// ─── Crear superadmin si no existe ────────────────────────────────────
async function ensureSuperAdmin() {
  try {
    const { getDb } = await import('./config/database.js');
    const bcryptMod = await import('bcryptjs');
    const bcrypt = bcryptMod.default;
    const db = getDb();

    const TARGET_EMAIL = 'superadmin@gmail.com';
    const TARGET_USER  = 'superadmin';
    const TARGET_PASS  = 'superadmin';

    // Si ya existe el usuario correcto, no hacer nada
    const exactMatch = db.prepare("SELECT id FROM users WHERE email = ?").get(TARGET_EMAIL);
    if (exactMatch) {
      console.log('✅ Superadmin ya existe:', TARGET_EMAIL);
      return;
    }

    const hashed = bcrypt.hashSync(TARGET_PASS, 10);

    // Si existe otro superadmin (instalación anterior), actualizar sus credenciales
    const oldAdmin = db.prepare("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1").get();
    if (oldAdmin) {
      db.prepare("UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?")
        .run(TARGET_USER, TARGET_EMAIL, hashed, oldAdmin.id);
      console.log(`✅ Superadmin actualizado a: ${TARGET_EMAIL} / ${TARGET_PASS}`);
      return;
    }

    // Si no hay ningún superadmin, crear uno nuevo
    const { randomUUID } = await import('crypto');
    db.prepare("INSERT INTO users (id, username, email, password, role, created_at) VALUES (?,?,?,?,?,?)")
      .run(randomUUID(), TARGET_USER, TARGET_EMAIL, hashed, 'superadmin', new Date().toISOString());
    console.log(`✅ Superadmin creado: ${TARGET_EMAIL} / ${TARGET_PASS}`);
  } catch (e) {
    console.warn('⚠️ No se pudo crear/actualizar superadmin:', e.message);
  }
}

// ─── App Express ──────────────────────────────────────────────────────
const app = express();

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '50mb' }));

// Servir imágenes subidas
const uploadsPath = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));

// ─── Rutas API ────────────────────────────────────────────────────────
app.use('/api/auth', userRouter);
app.use('/api/products', productRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/business', businessRouter);
app.use('/api/daily-reports', daliyReportRouter);
app.use('/api/newinvoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/expenses', expenseRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/credit-payments', creditPaymentRoutes);
app.use('/api/credit-notes', creditNoteRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/retentions', retentionRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/credit-purchases', creditPurchaseRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/cash-register', cashRegisterRoutes);

// Endpoint impresoras (Electron las maneja via IPC, este es fallback HTTP)
app.get('/api/printers', (req, res) => {
  res.json([{ name: 'Impresora Predeterminada', isDefault: true }]);
});

// ─── Endpoints de compatibilidad que el frontend espera ──────────────
// El interceptor de Axios llama a esto cuando un token expira
// Devolvemos el mismo token re-firmado para evitar que borre la sesión
app.post('/auth/refresh-token', async (req, res) => {
  try {
    const { default: jwt } = await import('jsonwebtoken');
    const authHeader = req.headers.authorization;
    let token = req.body?.refreshToken || req.body?.token;

    // Intentar obtener el token del header si no viene en el body
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const newToken = jwt.sign(
          { userId: decoded.userId || decoded.id, id: decoded.userId || decoded.id },
          process.env.JWT_SECRET,
          { expiresIn: '30d' }
        );
        return res.json({ token: newToken, refreshToken: newToken });
      } catch {
        // Token inválido/expirado — emitir uno genérico para evitar borrar sesión
      }
    }
    // Sin token válido: devolver respuesta vacía (no 401 para no entrar en loop)
    res.json({ token: null });
  } catch {
    res.json({ token: null });
  }
});

// Validar token — el frontend lo llama para verificar sesión
app.get('/auth/validate', async (req, res) => {
  try {
    const { default: jwt } = await import('jsonwebtoken');
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ valid: false });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true });
  } catch {
    res.json({ valid: false });
  }
});

// Info del usuario desde token (fallback)
app.get('/auth/users/info', async (req, res) => {
  try {
    const { default: jwt } = await import('jsonwebtoken');
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'No autorizado' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { getDb } = await import('./config/database.js');
    const db = getDb();
    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(decoded.userId || decoded.id);
    if (!user) return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    res.json({ status: 'success', data: { user: { ...user, _id: user.id } } });
  } catch {
    res.status(401).json({ status: 'error', message: 'Token inválido' });
  }
});

// ─── Servir frontend ──────────────────────────────────────────────────
const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// ─── Manejo de errores ────────────────────────────────────────────────
app.use(timeout(30000));
app.use(errorHandler);
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ status: 'error', message: 'Error interno del servidor', error: process.env.NODE_ENV === 'development' ? err.message : {} });
});

// ─── Arrancar servidor ────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

process.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err); process.exit(1); });
process.on('unhandledRejection', (reason) => { console.error('Unhandled Rejection:', reason); process.exit(1); });

const server = app.listen(PORT, async () => {
  console.log(`✅ Servidor SQLite ejecutándose en puerto ${PORT}`);
  console.log(`Nombre de host: ${os.hostname()}`);

  await ensureSuperAdmin();

  const nets = Object.values(os.networkInterfaces()).flat().filter(n => n.family === 'IPv4' && !n.internal);
  if (nets.length) {
    nets.forEach(n => console.log(`  http://${n.address}:${PORT}`));
  }
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Puerto ${PORT} ya está en uso.`);
    process.exit(1);
  }
  console.error('Error al iniciar el servidor:', err);
});

const gracefulShutdown = () => {
  console.log('Cerrando servidor SQLite...');
  server.close(() => { console.log('Servidor cerrado.'); process.exit(0); });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
