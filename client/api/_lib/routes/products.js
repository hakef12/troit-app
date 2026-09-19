import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { ah } from '../asyncHandler.js';

const router = Router();

const CATEGORY_ORDER_SQL = `CASE category
  WHEN 'Pizzas' THEN 1
  WHEN 'Sides' THEN 2
  WHEN 'Combos' THEN 3
  WHEN 'Combos Grupales' THEN 4
  WHEN 'Bebidas' THEN 5
  ELSE 6
END, name`;

router.get('/', ah(async (req, res) => {
  const all = req.query.all === '1';
  const rows = all
    ? await db.prepare(`SELECT * FROM products ORDER BY ${CATEGORY_ORDER_SQL}`).all()
    : await db.prepare(`SELECT * FROM products WHERE active = 1 ORDER BY ${CATEGORY_ORDER_SQL}`).all();
  res.json({ products: rows });
}));

router.post('/', requireAuth, requireAdmin, ah(async (req, res) => {
  const { name, description, price, category, image_url } = req.body || {};
  if (!name || price == null) return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
  const info = await db
    .prepare('INSERT INTO products (name, description, price, category, image_url, active) VALUES (?, ?, ?, ?, ?, 1)')
    .run(name, description || '', Number(price), category || '', image_url || '');
  const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ product });
}));

router.put('/:id', requireAuth, requireAdmin, ah(async (req, res) => {
  const { name, description, price, category, image_url, active, sold_out } = req.body || {};
  const existing = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });
  await db.prepare(
    `UPDATE products SET name = COALESCE(?, name), description = COALESCE(?, description),
     price = COALESCE(?, price), category = COALESCE(?, category), image_url = COALESCE(?, image_url),
     active = COALESCE(?, active), sold_out = COALESCE(?, sold_out) WHERE id = ?`
  ).run(
    name ?? null,
    description ?? null,
    price != null ? Number(price) : null,
    category ?? null,
    image_url ?? null,
    active != null ? (active ? 1 : 0) : null,
    sold_out != null ? (sold_out ? 1 : 0) : null,
    req.params.id
  );
  const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({ product });
}));

router.delete('/:id', requireAuth, requireAdmin, ah(async (req, res) => {
  const existing = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });
  await db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

export default router;
