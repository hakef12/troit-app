import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

router.get('/', (req, res) => {
  const all = req.query.all === '1';
  const rows = all
    ? db.prepare('SELECT * FROM promos ORDER BY day_of_week').all()
    : db.prepare('SELECT * FROM promos WHERE active = 1 ORDER BY day_of_week').all();
  res.json({ promos: rows });
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { day_of_week, title, description, image_url } = req.body || {};
  const day = Number(day_of_week);
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return res.status(400).json({ error: 'Día de la semana inválido' });
  }
  if (!title) return res.status(400).json({ error: 'El título es obligatorio' });
  const info = db
    .prepare('INSERT INTO promos (day_of_week, title, description, image_url, active) VALUES (?, ?, ?, ?, 1)')
    .run(day, title, description || '', image_url || '');
  const promo = db.prepare('SELECT * FROM promos WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ promo });
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const { day_of_week, title, description, image_url, active } = req.body || {};
  const existing = db.prepare('SELECT * FROM promos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Promo no encontrada' });
  const day = day_of_week != null ? Number(day_of_week) : null;
  if (day != null && (!Number.isInteger(day) || day < 0 || day > 6)) {
    return res.status(400).json({ error: 'Día de la semana inválido' });
  }
  db.prepare(
    `UPDATE promos SET day_of_week = COALESCE(?, day_of_week), title = COALESCE(?, title),
     description = COALESCE(?, description), image_url = COALESCE(?, image_url),
     active = COALESCE(?, active) WHERE id = ?`
  ).run(
    day,
    title ?? null,
    description ?? null,
    image_url ?? null,
    active != null ? (active ? 1 : 0) : null,
    req.params.id
  );
  const promo = db.prepare('SELECT * FROM promos WHERE id = ?').get(req.params.id);
  res.json({ promo });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM promos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Promo no encontrada' });
  db.prepare('UPDATE promos SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
