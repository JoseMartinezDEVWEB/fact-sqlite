import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

export function getDb() {
  if (!db) throw new Error('Base de datos no inicializada. Llama initDb() primero.');
  return db;
}

export function initDb(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  createTables(db);
  migrateDb(db);
  console.log(`Base de datos SQLite inicializada en: ${dbPath}`);
  return db;
}

function createTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cliente',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'cliente',
      address_street TEXT,
      address_city TEXT,
      address_state TEXT,
      address_zip TEXT,
      address_country TEXT,
      credito REAL DEFAULT 0,
      cuentas_pendientes REAL DEFAULT 0,
      cuentas_vendidas REAL DEFAULT 0,
      rnc_cedula TEXT,
      tipo_negocio TEXT,
      condiciones_pago TEXT DEFAULT 'inmediato',
      contacto_principal TEXT,
      notas_adicionales TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      barcode TEXT UNIQUE,
      unit_barcode TEXT,
      weight_unit_barcode TEXT,
      is_unit_of_package INTEGER DEFAULT 0,
      parent_package_id TEXT,
      unit_product_id TEXT,
      package_type TEXT,
      package_content_type TEXT DEFAULT 'unidad',
      is_weight_package INTEGER DEFAULT 0,
      qr_code TEXT,
      unit_type TEXT NOT NULL DEFAULT 'unidad',
      weight_unit TEXT DEFAULT 'lb',
      provider_id TEXT,
      credit_is_credit INTEGER DEFAULT 0,
      credit_payment_term TEXT DEFAULT '30dias',
      credit_due_date TEXT,
      credit_is_paid INTEGER DEFAULT 0,
      credit_payment_date TEXT,
      min_weight REAL DEFAULT 0.01,
      package_weight REAL DEFAULT 0,
      units_per_package REAL DEFAULT 1,
      quantity REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 10,
      purchase_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      price_per_unit REAL DEFAULT 0,
      category_id TEXT,
      description TEXT,
      image_url TEXT,
      image_public_id TEXT,
      alert_active INTEGER DEFAULT 0,
      last_alert_date TEXT,
      created_by TEXT NOT NULL,
      updated_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      receipt_number TEXT UNIQUE NOT NULL,
      business_id TEXT,
      date_time TEXT DEFAULT (datetime('now')),
      cashier_id TEXT,
      customer_name TEXT DEFAULT 'Consumidor Final',
      customer_email TEXT,
      customer_phone TEXT,
      customer_address TEXT,
      customer_tax_id TEXT,
      payment_method TEXT NOT NULL,
      payment_card_last_four TEXT,
      payment_transaction_id TEXT,
      payment_auth_code TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_rate REAL DEFAULT 0.18,
      tax_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'completed',
      is_credit INTEGER DEFAULT 0,
      cliente_id TEXT,
      client_info_name TEXT,
      credit_status TEXT DEFAULT 'pending',
      is_delivery INTEGER DEFAULT 0,
      delivery_address TEXT,
      delivery_notes TEXT,
      delivery_messenger TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      weight_value REAL,
      weight_unit TEXT,
      weight_price_per_unit REAL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL DEFAULT 0,
      category TEXT DEFAULT 'Otro',
      payment_method TEXT DEFAULT 'Efectivo',
      deduct_from_sales INTEGER DEFAULT 0,
      deduction_period TEXT DEFAULT 'day',
      receipt TEXT,
      date TEXT DEFAULT (datetime('now')),
      user_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS business (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Mi Negocio',
      rnc TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      logo_url TEXT,
      logo_public_id TEXT,
      owner_id TEXT,
      currency TEXT DEFAULT 'DOP',
      tax_rate REAL DEFAULT 0.18,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      receipt_number TEXT UNIQUE NOT NULL,
      customer_id TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      items_json TEXT NOT NULL DEFAULT '[]',
      subtotal REAL NOT NULL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      valid_until TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      provider_id TEXT,
      items_json TEXT NOT NULL DEFAULT '[]',
      subtotal REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      payment_status TEXT DEFAULT 'pending',
      payment_method TEXT,
      due_date TEXT,
      balance_due REAL DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS credit_purchases (
      id TEXT PRIMARY KEY,
      provider_id TEXT,
      items_json TEXT NOT NULL DEFAULT '[]',
      total REAL NOT NULL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      balance_due REAL NOT NULL DEFAULT 0,
      payment_term TEXT DEFAULT '30dias',
      due_date TEXT,
      is_paid INTEGER DEFAULT 0,
      payment_date TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS credit_notes (
      id TEXT PRIMARY KEY,
      invoice_id TEXT,
      reason TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      items_json TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cash_register_shifts (
      id TEXT PRIMARY KEY,
      cashier_id TEXT NOT NULL,
      opening_amount REAL NOT NULL DEFAULT 0,
      closing_amount REAL,
      sales_total REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      opened_at TEXT DEFAULT (datetime('now')),
      closed_at TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      resource_id TEXT,
      details_json TEXT,
      ip TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_reports (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
      sales_total REAL DEFAULT 0,
      expenses_total REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      invoice_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS licenses (
      id TEXT PRIMARY KEY,
      key_value TEXT UNIQUE NOT NULL,
      owner_email TEXT,
      owner_name TEXT,
      product TEXT,
      status TEXT DEFAULT 'active',
      expires_at TEXT,
      machine_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS retentions (
      id TEXT PRIMARY KEY,
      invoice_id TEXT,
      type TEXT,
      percentage REAL,
      amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_balances (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
      opening_balance REAL DEFAULT 0,
      closing_balance REAL DEFAULT 0,
      total_sales REAL DEFAULT 0,
      total_expenses REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS supplier_transactions (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('payment','debt')),
      amount REAL NOT NULL,
      date TEXT,
      notes TEXT,
      credit_purchase_id TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function migrateDb(db) {
  const alterStatements = [
    // business
    `ALTER TABLE business ADD COLUMN website TEXT`,
    `ALTER TABLE business ADD COLUMN comments TEXT`,
    // suppliers
    `ALTER TABLE suppliers ADD COLUMN business_name TEXT`,
    `ALTER TABLE suppliers ADD COLUMN ruc TEXT`,
    `ALTER TABLE suppliers ADD COLUMN contact_person TEXT`,
    `ALTER TABLE suppliers ADD COLUMN is_active INTEGER DEFAULT 1`,
    `ALTER TABLE suppliers ADD COLUMN current_debt REAL DEFAULT 0`,
    // cash_register_shifts - columnas para funcionalidad completa
    `ALTER TABLE cash_register_shifts ADD COLUMN created_at TEXT`,
    `ALTER TABLE cash_register_shifts ADD COLUMN updated_at TEXT`,
    `ALTER TABLE cash_register_shifts ADD COLUMN business_id TEXT`,
    `ALTER TABLE cash_register_shifts ADD COLUMN opened_by TEXT`,
    `ALTER TABLE cash_register_shifts ADD COLUMN closed_by TEXT`,
    `ALTER TABLE cash_register_shifts ADD COLUMN initial_amount REAL DEFAULT 0`,
    `ALTER TABLE cash_register_shifts ADD COLUMN cash_sales REAL DEFAULT 0`,
    `ALTER TABLE cash_register_shifts ADD COLUMN card_sales REAL DEFAULT 0`,
    `ALTER TABLE cash_register_shifts ADD COLUMN transfer_sales REAL DEFAULT 0`,
    `ALTER TABLE cash_register_shifts ADD COLUMN credit_sales REAL DEFAULT 0`,
    `ALTER TABLE cash_register_shifts ADD COLUMN expenses REAL DEFAULT 0`,
    `ALTER TABLE cash_register_shifts ADD COLUMN declared_amount REAL DEFAULT 0`,
    `ALTER TABLE cash_register_shifts ADD COLUMN closing_notes TEXT`,
    `ALTER TABLE cash_register_shifts ADD COLUMN difference REAL DEFAULT 0`,
    `ALTER TABLE suppliers ADD COLUMN updated_at TEXT`,
    // credit_purchases — columna supplier_id para compatibilidad
    `ALTER TABLE credit_purchases ADD COLUMN supplier_id TEXT`,
    `ALTER TABLE credit_purchases ADD COLUMN product_id TEXT`,
  ];
  for (const stmt of alterStatements) {
    try { db.exec(stmt); } catch (_) { /* columna ya existe */ }
  }
}

// =====================================================================
// BaseModel: clase base que emula la API de Mongoose para SQLite
// =====================================================================
export class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
  }

  _db() { return getDb(); }

  _uuid() { return randomUUID(); }

  // Convierte un row de SQLite a un objeto JS con _id y booleanos
  _toDoc(row) {
    if (!row) return null;
    const doc = {};
    for (const [key, val] of Object.entries(row)) {
      if (key === 'id') {
        doc.id = val;
        doc._id = val;
      } else if (key.endsWith('_json') || key === 'items_json') {
        const fieldName = key.replace('_json', '').replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        try { doc[fieldName] = val ? JSON.parse(val) : []; } catch { doc[fieldName] = []; }
      } else {
        // camelCase conversion
        const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        if (val === 1 || val === 0) {
          // Detectar columnas booleanas por nombre
          const boolCols = ['isUnitOfPackage','isWeightPackage','creditIsCredit','creditIsPaid',
            'isCredit','isDelivery','deductFromSales','alertActive','isActive','isPaid',
            'isWeightPackage','isUnitProduct','autoBlockExpired'];
          doc[camel] = boolCols.includes(camel) ? Boolean(val) : val;
        } else {
          doc[camel] = val;
        }
      }
    }
    // Agregar método save() para compatibilidad con Mongoose
    doc.save = async () => this.save(doc);
    return doc;
  }

  // Convierte un objeto JS a columnas de SQLite
  _toRow(data) {
    const row = {};
    const snakeKey = k => k.replace(/([A-Z])/g, '_$1').toLowerCase();

    for (const [key, val] of Object.entries(data)) {
      if (key === '_id' || key === 'save' || key === '__v') continue;

      if (key === 'id') {
        row['id'] = val;
        continue;
      }

      // Campos JSON embebidos (arrays/objetos)
      const jsonFields = ['items','taxes','refunds','returnedItems','paymentDetails','fiscalResponse',
        'address','creditPurchase','weightInfo','deliveryInfo','clientInfo'];

      if (jsonFields.includes(key) && (Array.isArray(val) || (val && typeof val === 'object'))) {
        row[snakeKey(key) + '_json'] = JSON.stringify(val);
        continue;
      }

      // Campos anidados que se aplanan (customer.name -> customer_name)
      if (key === 'customer' && val && typeof val === 'object') {
        row['customer_name'] = val.name || null;
        row['customer_email'] = val.email || null;
        row['customer_phone'] = val.phone || null;
        row['customer_address'] = val.address || null;
        row['customer_tax_id'] = val.taxId || null;
        continue;
      }

      row[snakeKey(key)] = typeof val === 'boolean' ? (val ? 1 : 0) : val;
    }
    return row;
  }

  // Construye cláusula WHERE a partir de un filtro estilo Mongoose
  _buildWhere(filter = {}) {
    const conditions = [];
    const params = [];

    const process = (key, val) => {
      const colName = key.replace(/([A-Z])/g, '_$1').toLowerCase();

      // Campos anidados con punto (customer.name)
      if (key.includes('.')) {
        const parts = key.split('.');
        if (parts[0] === 'customer') {
          const col = `customer_${parts[1].replace(/([A-Z])/g, '_$1').toLowerCase()}`;
          if (val && typeof val === 'object') {
            if (val.$regex) { conditions.push(`${col} LIKE ?`); params.push(`%${val.$regex}%`); }
          } else { conditions.push(`${col} = ?`); params.push(val); }
          return;
        }
      }

      if (key === '$or') {
        const orParts = val.map(sub => {
          const subConds = [];
          for (const [k, v] of Object.entries(sub)) {
            const c = k.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (v === null || v === undefined) { subConds.push(`(${c} IS NULL OR ${c} = '')`); }
            else if (v && typeof v === 'object' && v.$exists === false) { subConds.push(`(${c} IS NULL)`); }
            else { subConds.push(`${c} = ?`); params.push(v); }
          }
          return `(${subConds.join(' AND ')})`;
        });
        conditions.push(`(${orParts.join(' OR ')})`);
        return;
      }

      if (val === null || val === undefined) {
        conditions.push(`${colName} IS NULL`);
        return;
      }

      if (typeof val === 'object' && !Array.isArray(val)) {
        // Detectar combinaciones de rango: $gte/$gt + $lte/$lt
        const hasLower = '$gte' in val || '$gt' in val;
        const hasUpper = '$lte' in val || '$lt' in val;
        if (hasLower && hasUpper) {
          const lowerOp = '$gte' in val ? '>=' : '>';
          const upperOp = '$lte' in val ? '<=' : '<';
          conditions.push(`${colName} ${lowerOp} ? AND ${colName} ${upperOp} ?`);
          params.push('$gte' in val ? val.$gte : val.$gt, '$lte' in val ? val.$lte : val.$lt);
        } else if ('$gte' in val) {
          conditions.push(`${colName} >= ?`); params.push(val.$gte);
        } else if ('$gt' in val) {
          conditions.push(`${colName} > ?`); params.push(val.$gt);
        } else if ('$lte' in val) {
          conditions.push(`${colName} <= ?`); params.push(val.$lte);
        } else if ('$lt' in val) {
          conditions.push(`${colName} < ?`); params.push(val.$lt);
        } else if ('$regex' in val) {
          conditions.push(`${colName} LIKE ?`); params.push(`%${val.$regex}%`);
        } else if ('$ne' in val) {
          conditions.push(`${colName} != ?`); params.push(val.$ne);
        } else if ('$in' in val) {
          const placeholders = val.$in.map(() => '?').join(',');
          conditions.push(`${colName} IN (${placeholders})`);
          params.push(...val.$in);
        } else if ('$exists' in val) {
          conditions.push(val.$exists ? `${colName} IS NOT NULL` : `${colName} IS NULL`);
        } else if ('$nin' in val) {
          const placeholders = val.$nin.map(() => '?').join(',');
          conditions.push(`${colName} NOT IN (${placeholders})`);
          params.push(...val.$nin);
        }
        return;
      }

      if (typeof val === 'boolean') {
        conditions.push(`${colName} = ?`); params.push(val ? 1 : 0);
        return;
      }

      conditions.push(`${colName} = ?`); params.push(val);
    };

    for (const [key, val] of Object.entries(filter)) {
      process(key, val);
    }

    return {
      where: conditions.length ? conditions.join(' AND ') : '',
      params
    };
  }

  _buildSort(sort) {
    if (!sort || typeof sort !== 'object') return 'created_at DESC';
    return Object.entries(sort)
      .map(([k, v]) => `${k.replace(/([A-Z])/g, '_$1').toLowerCase()} ${v === -1 || v === 'desc' ? 'DESC' : 'ASC'}`)
      .join(', ');
  }

  async find(filter = {}, opts = {}) {
    const { where, params } = this._buildWhere(filter);
    let sql = `SELECT * FROM ${this.tableName}`;
    if (where) sql += ` WHERE ${where}`;
    if (opts.sort) sql += ` ORDER BY ${this._buildSort(opts.sort)}`;
    else sql += ` ORDER BY created_at DESC`;
    if (opts.limit) sql += ` LIMIT ${opts.limit}`;
    if (opts.skip) sql += ` OFFSET ${opts.skip}`;

    const rows = this._db().prepare(sql).all(...params);
    const docs = rows.map(r => this._toDoc(r));

    // Retornar objeto encadenable estilo Mongoose
    return this._chainable(docs, filter);
  }

  _chainable(data, filter = {}) {
    const self = this;
    let _sort = null, _skip = 0, _limit = null, _pops = [];

    const exec = async () => {
      if (_sort || _skip || _limit) {
        const { where, params } = self._buildWhere(filter);
        let sql = `SELECT * FROM ${self.tableName}`;
        if (where) sql += ` WHERE ${where}`;
        sql += ` ORDER BY ${_sort ? self._buildSort(_sort) : 'created_at DESC'}`;
        if (_limit) sql += ` LIMIT ${_limit}`;
        if (_skip) sql += ` OFFSET ${_skip}`;
        data = self._db().prepare(sql).all(...params).map(r => self._toDoc(r));
      }
      // Aplicar populate
      for (const pop of _pops) {
        data = await self._populate(data, pop.field, pop.select);
      }
      return data;
    };

    const q = {
      sort(s) { _sort = s; return q; },
      skip(n) { _skip = n; return q; },
      limit(n) { _limit = n; return q; },
      populate(field, select) { _pops.push({ field, select }); return q; },
      select() { return q; },
      lean() { return q; },
      then(resolve, reject) { return exec().then(resolve, reject); },
      catch(reject) { return exec().catch(reject); }
    };
    return q;
  }

  async _populate(docs, field, select) {
    if (!docs || !docs.length) return docs;
    const idField = field + 'Id';
    const colField = field.replace(/([A-Z])/g, '_$1').toLowerCase() + '_id';

    // Obtener todos los IDs únicos
    const ids = [...new Set(docs.map(d => d[idField] || d[colField]).filter(Boolean))];
    if (!ids.length) return docs;

    // Detectar la tabla referenciada
    const tableMap = {
      cashier: 'users', user: 'users', product: 'products',
      category: 'categories', cliente: 'clientes', provider: 'clientes',
      business: 'business', createdBy: 'users', updatedBy: 'users'
    };
    const refTable = tableMap[field] || field + 's';

    const placeholders = ids.map(() => '?').join(',');
    const refRows = this._db().prepare(`SELECT * FROM ${refTable} WHERE id IN (${placeholders})`).all(...ids);
    const refMap = {};
    for (const r of refRows) {
      const doc = this._toDoc(r);
      refMap[doc.id] = doc;
    }

    return docs.map(d => {
      const id = d[idField] || d[colField];
      if (id && refMap[id]) {
        d[field] = refMap[id];
      }
      return d;
    });
  }

  async findById(id) {
    if (!id) return null;
    const row = this._db().prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
    if (!row) return null;
    const doc = this._toDoc(row);
    // Agregar chainable populate
    const self = this;
    const pops = [];
    const q = {
      populate(field, select) { pops.push({ field, select }); return q; },
      lean() { return q; },
      select() { return q; },
      async then(resolve, reject) {
        try {
          let result = doc;
          if (pops.length) {
            let arr = [result];
            for (const p of pops) arr = await self._populate(arr, p.field, p.select);
            result = arr[0];
          }
          resolve(result);
        } catch(e) { reject(e); }
      },
      catch(reject) { return this.then(null, reject); }
    };
    return q;
  }

  async findOne(filter = {}) {
    const { where, params } = this._buildWhere(filter);
    let sql = `SELECT * FROM ${this.tableName}`;
    if (where) sql += ` WHERE ${where}`;
    sql += ' LIMIT 1';
    const row = this._db().prepare(sql).all(...params)[0];
    if (!row) return null;
    const doc = this._toDoc(row);
    // Chainable
    const self = this;
    const pops = [];
    const q = {
      populate(f) { pops.push(f); return q; },
      lean() { return q; },
      select() { return q; },
      async then(resolve, reject) {
        try {
          let r = doc;
          if (pops.length) {
            let arr = r ? [r] : [];
            for (const p of pops) arr = await self._populate(arr, p, null);
            r = arr[0] || null;
          }
          resolve(r);
        } catch(e) { reject(e); }
      },
      catch(reject) { return this.then(null, reject); }
    };
    return q;
  }

  async create(data) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(d => this._insertOne(d)));
    }
    return this._insertOne(data);
  }

  async _insertOne(data) {
    const row = this._toRow(data);
    if (!row.id) row.id = this._uuid();
    if (!row.created_at) row.created_at = new Date().toISOString();

    const cols = Object.keys(row);
    const vals = Object.values(row);
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${cols.join(', ')}) VALUES (${placeholders})`;

    try {
      this._db().prepare(sql).run(...vals);
      return this._toDoc(this._db().prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(row.id));
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        const field = err.message.split('.')[1] || 'campo';
        const error = new Error(`Duplicate key error: ${field}`);
        error.code = 11000;
        throw error;
      }
      throw err;
    }
  }

  async save(doc) {
    const existing = doc.id ? this._db().prepare(`SELECT id FROM ${this.tableName} WHERE id = ?`).get(doc.id) : null;
    if (existing) {
      return this.findByIdAndUpdate(doc.id, doc, { new: true });
    }
    return this._insertOne(doc);
  }

  async findByIdAndUpdate(id, update, opts = {}) {
    if (!id) return null;

    const setClauses = [];
    const params = [];
    const snakeKey = k => k.replace(/([A-Z])/g, '_$1').toLowerCase();

    // Convierte un objeto PARCIAL a columnas snake_case sin aplicar defaults.
    // Maneja los objetos anidados conocidos del dominio.
    const partialToRow = (data) => {
      const row = {};
      for (const [key, val] of Object.entries(data)) {
        if (key === '_id' || key === 'id' || key === 'save' || key === '__v') continue;
        if (val === undefined) continue;
        // Objetos anidados conocidos
        if (key === 'image' && val && typeof val === 'object') {
          row.image_url = val.url ?? null;
          row.image_public_id = val.publicId ?? null;
        } else if (key === 'creditPurchase' && val && typeof val === 'object') {
          row.credit_is_credit    = val.isCredit ? 1 : 0;
          row.credit_payment_term = val.paymentTerm || '30dias';
          row.credit_due_date     = val.dueDate    || null;
          row.credit_is_paid      = val.isPaid     ? 1 : 0;
          row.credit_payment_date = val.paymentDate || null;
        } else if (key === 'customer' && val && typeof val === 'object') {
          row.customer_name    = val.name    || 'Consumidor Final';
          row.customer_email   = val.email   || null;
          row.customer_phone   = val.phone   || null;
          row.customer_address = val.address || null;
          row.customer_tax_id  = val.taxId   || null;
        } else if (key === 'address' && val && typeof val === 'object') {
          row.address_street  = val.street  || null;
          row.address_city    = val.city    || null;
          row.address_state   = val.state   || null;
          row.address_zip     = val.zipCode || null;
          row.address_country = val.country || null;
        } else if (key === 'provider')     { row.provider_id      = val || null;
        } else if (key === 'category')     { row.category_id      = val || null;
        } else if (key === 'parentPackage'){ row.parent_package_id = val || null;
        } else if (key === 'unitProduct')  { row.unit_product_id  = val || null;
        } else if (key === 'createdBy')    { row.created_by  = val;
        } else if (key === 'updatedBy')    { row.updated_by  = val;
        } else {
          row[snakeKey(key)] = typeof val === 'boolean' ? (val ? 1 : 0) : val;
        }
      }
      return row;
    };

    // Manejar operadores de Mongoose
    if (update.$set) {
      const row = partialToRow(update.$set);
      for (const [col, val] of Object.entries(row)) {
        setClauses.push(`${col} = ?`); params.push(val);
      }
    }
    if (update.$inc) {
      for (const [field, val] of Object.entries(update.$inc)) {
        const col = snakeKey(field);
        setClauses.push(`${col} = COALESCE(${col}, 0) + ?`); params.push(val);
      }
    }

    // Si no hay operadores ($set/$inc/$push), interpretar el objeto como $set parcial
    if (!update.$set && !update.$inc && !update.$push) {
      const { _id, save, __v, ...cleanData } = update;
      const row = partialToRow(cleanData);
      for (const [col, val] of Object.entries(row)) {
        setClauses.push(`${col} = ?`); params.push(val);
      }
    }

    if (!setClauses.length) {
      return opts.new ? this.findById(id) : null;
    }

    setClauses.push(`updated_at = ?`);
    params.push(new Date().toISOString());
    params.push(id);

    this._db().prepare(`UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

    if (opts.new !== false) {
      return this.findById(id);
    }
    return null;
  }

  async findByIdAndDelete(id) {
    if (!id) return null;
    const doc = await this.findById(id);
    if (doc) this._db().prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return doc;
  }

  async deleteOne(filter = {}) {
    const { where, params } = this._buildWhere(filter);
    let sql = `DELETE FROM ${this.tableName}`;
    if (where) sql += ` WHERE ${where}`;
    this._db().prepare(sql).run(...params);
    return { deletedCount: 1 };
  }

  async deleteMany(filter = {}) {
    const { where, params } = this._buildWhere(filter);
    let sql = `DELETE FROM ${this.tableName}`;
    if (where) sql += ` WHERE ${where}`;
    const result = this._db().prepare(sql).run(...params);
    return { deletedCount: result.changes };
  }

  async countDocuments(filter = {}) {
    const { where, params } = this._buildWhere(filter);
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    if (where) sql += ` WHERE ${where}`;
    const row = this._db().prepare(sql).get(...params);
    return row ? row.count : 0;
  }

  async updateOne(filter, update, opts = {}) {
    const doc = await this.findOne(filter);
    if (!doc) return { modifiedCount: 0 };
    await this.findByIdAndUpdate(doc.id, update, {});
    return { modifiedCount: 1 };
  }

  async updateMany(filter, update) {
    const docs = await this.find(filter);
    const arr = await docs;
    for (const doc of arr) {
      await this.findByIdAndUpdate(doc.id, update, {});
    }
    return { modifiedCount: arr.length };
  }

  // Método para agregaciones simples (simplificado)
  async aggregate(pipeline) {
    return [];
  }
}
