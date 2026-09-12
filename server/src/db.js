import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// En produccion (Render) DATA_DIR apunta al disco persistente; en local queda
// dentro de server/ como antes.
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..');
const db = new DatabaseSync(path.join(DATA_DIR, 'data.sqlite'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  role TEXT NOT NULL DEFAULT 'cliente',
  points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  category TEXT,
  image_url TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed' o 'percentage'
  discount_value REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  coupon_id INTEGER NOT NULL REFERENCES coupons(id),
  points_spent INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  order_id INTEGER,
  redeemed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  items_json TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL, -- 'efectivo' o 'transferencia'
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente',
  points_earned INTEGER NOT NULL DEFAULT 0,
  redemption_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivery_type TEXT NOT NULL DEFAULT 'delivery', -- 'delivery' o 'pickup'
  lat REAL,
  lng REAL,
  delivery_fee REAL NOT NULL DEFAULT 0,
  delivery_km REAL
);

CREATE TABLE IF NOT EXISTS promos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_of_week INTEGER NOT NULL, -- 0=domingo, 1=lunes, ... 6=sábado (igual que Date.getDay())
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('orders', 'delivery_type', "TEXT NOT NULL DEFAULT 'delivery'");
ensureColumn('orders', 'lat', 'REAL');
ensureColumn('orders', 'lng', 'REAL');
ensureColumn('orders', 'delivery_fee', 'REAL NOT NULL DEFAULT 0');
ensureColumn('orders', 'delivery_km', 'REAL');
ensureColumn('users', 'google_id', 'TEXT');

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@restaurante.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare(
      `INSERT INTO users (name, email, password_hash, role, points) VALUES (?, ?, ?, 'admin', 0)`
    ).run('Administrador', adminEmail, hash);
  }

  const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  if (productCount === 0) {
    const insert = db.prepare(
      `INSERT INTO products (name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?)`
    );
    const items = [
      // Pizzas — masa de 48 horas, borde de queso caramelizado
      ['La Reina Detroit', 'Mozzarella · pomodoro · grana padano · albahaca fresca', 7.5, 'Pizzas', ''],
      ['La Honey Pepperoni', 'Signature pepperoni · a elección: miel picante o miel normal', 8.5, 'Pizzas', ''],
      ['Detroit Hot Chicken', 'Pollo frito · salsa buffalo · cebollín · base de queso derretido', 9.0, 'Pizzas', ''],
      ["Pesto 'N Crunch", 'Pesto casero · albóndigas · pistacho · pimientos escabechados', 9.0, 'Pizzas', ''],
      ['Cheeseburger', 'Salsa de whiskey · carne molida · pepino pickle · cebolla caramelizada', 9.0, 'Pizzas', ''],
      // Sides
      ['Detroit Fried Chicken', 'Chicken tenders · papas fritas · 1 salsa a elección', 5.5, 'Sides', ''],
      ['Meatballs & Fries', 'Albóndigas · papas fritas · 1 salsa a elección', 5.5, 'Sides', ''],
      ['Papas Dijon', 'Pepperoni crocante · mayonesa dijon · grana padano', 5.5, 'Sides', ''],
      ['Papas Fritas', '1 salsa a elección', 3.0, 'Sides', ''],
      // Combos (para 1 a 6 personas)
      ['El Propio', 'Para 1 · Detroit Hot Chicken · Papas Dijon · bebida', 12.75, 'Combos', ''],
      ['Dúo Troit', 'Para 2 · Honey Pepperoni · Hot Chicken · 2 bebidas', 15.5, 'Combos', ''],
      ['La Gallada', 'Para 3 · Honey Pepperoni · Reina Detroit · Fried Chicken · 3 bebidas', 19.49, 'Combos', ''],
      ['Troit Box XL', 'Para 6 · 2 Reinas · Honey Pepperoni · Hot Chicken · 2 Fried Chicken · 4 bebidas', 36.59, 'Combos', ''],
      // Combos grupales
      ['Panas Box', 'Para 3 · 2 Reinas Detroit · Pesto \'N Crunch · Meatballs & Fried · 3 bebidas', 25.75, 'Combos Grupales', ''],
      ['La Manada', 'Para 4 · 2 Detroit Hot Chicken · 2 Reina Detroit · 4 bebidas', 27.99, 'Combos Grupales', ''],
      // Bebidas
      ['Coca-Cola Original', '', 1.25, 'Bebidas', ''],
      ['Coca-Cola Zero', '', 1.25, 'Bebidas', ''],
      ['Sprite', '', 1.25, 'Bebidas', ''],
      ['Fuze Tea', '', 1.25, 'Bebidas', ''],
    ];
    for (const item of items) insert.run(...item);
  }

  const couponCount = db.prepare('SELECT COUNT(*) AS c FROM coupons').get().c;
  if (couponCount === 0) {
    const insert = db.prepare(
      `INSERT INTO coupons (title, description, points_cost, discount_type, discount_value) VALUES (?, ?, ?, ?, ?)`
    );
    insert.run('10% de descuento', 'Descuento del 10% sobre el total de tu pedido', 50, 'percentage', 10);
    insert.run('$5 de descuento', 'Descuento fijo de $5.00 en tu pedido', 80, 'fixed', 5);
    insert.run('Bebida gratis', 'Descuento equivalente a una bebida', 15, 'fixed', 1.25);
  }

  const promoCount = db.prepare('SELECT COUNT(*) AS c FROM promos').get().c;
  if (promoCount === 0) {
    const insert = db.prepare(
      `INSERT INTO promos (day_of_week, title, description, image_url) VALUES (?, ?, ?, ?)`
    );
    insert.run(1, '2 Reinas por $11.99', 'Válido en todas las pizzas individuales', '/uploads/promo-lunes.jpg');
    insert.run(2, '2da pizza a mitad de precio (-50%)', 'Válido en todas las pizzas individuales', '/uploads/promo-martes.jpg');
    insert.run(3, '2 Hot Chicken por $13.99', 'Válido solo para la Detroit Hot Chicken', '/uploads/promo-miercoles.jpg');
    insert.run(4, 'Todas las pizzas a $7.50', 'Válido en todas las pizzas individuales', '/uploads/promo-jueves.jpg');
  }
}

seed();

export default db;
