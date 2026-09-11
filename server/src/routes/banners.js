import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

router.get('/', (req, res) => {
  const all = req.query.all === '1';
  const rows = all
    ? db.prepare('SELECT * FROM banners ORDER BY sort_order, id').all()
    : db.prepare('SELECT * FROM banners WHERE active = 1 ORDER BY sort_order, id').all();
  res.json({ banners: rows });
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { title, image_url, sort_order } = req.body || {};
  if (!image_url) return res.status(400).json({ error: 'La imagen es obligatoria' });
  const info = db
    .prepare('INSERT INTO banners (title, image_url, sort_order, active) VALUES (?, ?, ?, 1)')
    .run(title || '', image_url, Number(sort_order) || 0);
  const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ banner });
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const { title, image_url, sort_order, active } = req.body || {};
  const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Banner no encontrado' });
  db.prepare(
    `UPDATE banners SET title = COALESCE(?, title), image_url = COALESCE(?, image_url),
     sort_order = COALESCE(?, sort_order), active = COALESCE(?, active) WHERE id = ?`
  ).run(
    title ?? null,
    image_url ?? null,
    sort_order != null ? Number(sort_order) : null,
    active != null ? (active ? 1 : 0) : null,
    req.params.id
  );
  const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  res.json({ banner });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Banner no encontrado' });
  db.prepare('UPDATE banners SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
