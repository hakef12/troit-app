import pg from 'pg';
import bcrypt from 'bcryptjs';
import { AsyncLocalStorage } from 'node:async_hooks';
import { publicUrl } from './supabaseStorage.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const als = new AsyncLocalStorage();

function toPgQuery(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function raw(sql, params = []) {
  const client = als.getStore();
  if (client) return client.query(sql, params);
  return pool.query(sql, params);
}

// Envoltorio compatible con la API sincrónica de better-sqlite3 (prepare().get/all/run)
// que ya usan las rutas, pero async por dentro contra Postgres. Esto permite mantener
// las mismas consultas con "?" y agregar simplemente `await` en cada llamada.
export function prepare(sql) {
  const pgSql = toPgQuery(sql);
  const isInsert = /^\s*insert/i.test(sql) && !/returning/i.test(sql);
  const insertSql = isInsert ? `${pgSql} RETURNING id` : pgSql;
  return {
    async get(...params) {
      const { rows } = await raw(pgSql, params);
      return rows[0];
    },
    async all(...params) {
      const { rows } = await raw(pgSql, params);
      return rows;
    },
    async run(...params) {
      const { rows, rowCount } = await raw(insertSql, params);
      return { lastInsertRowid: rows[0]?.id, changes: rowCount };
    },
  };
}

export async function exec(sql) {
  await raw(sql);
}

export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await als.run(client, fn);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const db = { prepare, exec };
export default db;

async function ensureSchema() {
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      phone TEXT,
      address TEXT,
      role TEXT NOT NULL DEFAULT 'cliente',
      points INTEGER NOT NULL DEFAULT 0,
      game_points_today INTEGER NOT NULL DEFAULT 0,
      game_points_date TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT,
      image_url TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      points_cost INTEGER NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'fixed',
      discount_value REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS redemptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      coupon_id INTEGER NOT NULL REFERENCES coupons(id),
      points_spent INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      order_id INTEGER,
      redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      items_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente',
      points_earned INTEGER NOT NULL DEFAULT 0,
      redemption_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      delivery_type TEXT NOT NULL DEFAULT 'delivery',
      lat REAL,
      lng REAL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      delivery_km REAL
    );

    CREATE TABLE IF NOT EXISTS promos (
      id SERIAL PRIMARY KEY,
      day_of_week INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS banners (
      id SERIAL PRIMARY KEY,
      title TEXT,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function seed() {
  const { c: userCount } = (await prepare('SELECT COUNT(*)::int AS c FROM users').get()) || { c: 0 };
  if (userCount === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@restaurante.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(adminPassword, 10);
    await prepare(
      `INSERT INTO users (name, email, password_hash, role, points) VALUES (?, ?, ?, 'admin', 0)`
    ).run('Administrador', adminEmail, hash);
  }

  const { c: productCount } = (await prepare('SELECT COUNT(*)::int AS c FROM products').get()) || { c: 0 };
  if (productCount === 0) {
    const insert = prepare(
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
    for (const item of items) await insert.run(...item);
  }

  const { c: couponCount } = (await prepare('SELECT COUNT(*)::int AS c FROM coupons').get()) || { c: 0 };
  if (couponCount === 0) {
    const insert = prepare(
      `INSERT INTO coupons (title, description, points_cost, discount_type, discount_value) VALUES (?, ?, ?, ?, ?)`
    );
    await insert.run('10% de descuento', 'Descuento del 10% sobre el total de tu pedido', 50, 'percentage', 10);
    await insert.run('$5 de descuento', 'Descuento fijo de $5.00 en tu pedido', 80, 'fixed', 5);
    await insert.run('Bebida gratis', 'Descuento equivalente a una bebida', 15, 'fixed', 1.25);
  }

  const { c: promoCount } = (await prepare('SELECT COUNT(*)::int AS c FROM promos').get()) || { c: 0 };
  if (promoCount === 0) {
    const insert = prepare(
      `INSERT INTO promos (day_of_week, title, description, image_url) VALUES (?, ?, ?, ?)`
    );
    await insert.run(1, '2 Reinas por $11.99', 'Válido en todas las pizzas individuales', publicUrl('promo-lunes.jpg'));
    await insert.run(2, '2da pizza a mitad de precio (-50%)', 'Válido en todas las pizzas individuales', publicUrl('promo-martes.jpg'));
    await insert.run(3, '2 Hot Chicken por $13.99', 'Válido solo para la Detroit Hot Chicken', publicUrl('promo-miercoles.jpg'));
    await insert.run(4, 'Todas las pizzas a $7.50', 'Válido en todas las pizzas individuales', publicUrl('promo-jueves.jpg'));
  }
}

export async function initDb() {
  await ensureSchema();
  await seed();
}
