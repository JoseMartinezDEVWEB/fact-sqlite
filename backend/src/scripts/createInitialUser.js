import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { initDb, getDb } from '../config/database.js';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', 'config.env') });

const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', '..', 'data', 'factura.db');

initDb(dbPath);
const db = getDb();

const existing = db.prepare("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1").get();
if (existing) {
  console.log('Superadmin ya existe');
  process.exit(0);
}

const password = await bcrypt.hash('superadmin', 10);
const id = randomUUID();
db.prepare("INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)").run(id, 'superadmin', 'superadmin@gmail.com', password, 'superadmin');
console.log('Superadmin creado: superadmin@gmail.com / superadmin');
process.exit(0);
