import { Router } from 'express';
import db, { transaction } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

router.get('/', (req, res) => {
  const all = req.query.all === '1';
  const rows = all
    ? db.prepare('SELECT * FROM coupons ORDER BY points_cost').all()
    : db.prepare('SELECT * FROM coupons WHERE active = 1 ORDER BY points_cost').all();
  res.json({ coupons: rows });
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { title, description, points_cost, discount_type, discount_value } = req.body || {};
  if (!title || points_cost == null || discount_value == null) {
    return res.status(400).json({ error: 'Título, costo en puntos y valor de descuento son obligatorios' });
  }
  const info = db
    .prepare(
      `INSERT INTO coupons (title, description, points_cost, discount_type, discount_value, active)
       VALUES (?, ?, ?, ?, ?, 1)`
    )
    .run(title, description || '', Number(points_cost), discount_type === 'percentage' ? 'percentage' : 'fixed', Number(discount_value));
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ coupon });
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const { title, description, points_cost, discount_type, discount_value, active } = req.body || {};
  const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Cupón no encontrado' });
  db.prepare(
    `UPDATE coupons SET title = COALESCE(?, title), description = COALESCE(?, description),
     points_cost = COALESCE(?, points_cost), discount_type = COALESCE(?, discount_type),
     discount_value = COALESCE(?, discount_value), active = COALESCE(?, active) WHERE id = ?`
  ).run(
    title ?? null,
    description ?? null,
    points_cost != null ? Number(points_cost) : null,
    discount_type === 'percentage' || discount_type === 'fixed' ? discount_type : null,
    discount_value != null ? Number(discount_value) : null,
    active != null ? (active ? 1 : 0) : null,
    req.params.id
  );
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  res.json({ coupon });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Cupón no encontrado' });
  db.prepare('UPDATE coupons SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Canjear un cupón con puntos
router.post('/:id/redeem', requireAuth, (req, res) => {
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ? AND active = 1').get(req.params.id);
  if (!coupon) return res.status(404).json({ error: 'Cupón no encontrado' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (user.points < coupon.points_cost) {
    return res.status(400).json({ error: 'No tienes puntos suficientes para canjear este cupón' });
  }

  const redeem = () => transaction(() => {
    db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(coupon.points_cost, user.id);
    const info = db
      .prepare('INSERT INTO redemptions (user_id, coupon_id, points_spent, used) VALUES (?, ?, ?, 0)')
      .run(user.id, coupon.id, coupon.points_cost);
    return info.lastInsertRowid;
  });

  const redemptionId = redeem();
  const redemption = db.prepare('SELECT * FROM redemptions WHERE id = ?').get(redemptionId);
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.status(201).json({ redemption, points: updatedUser.points });
});

// Cupones canjeados por el usuario, sin usar todavía (disponibles para aplicar en un pedido)
router.get('/redemptions/mine', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT r.*, c.title, c.description, c.discount_type, c.discount_value
       FROM redemptions r JOIN coupons c ON c.id = r.coupon_id
       WHERE r.user_id = ? ORDER BY r.redeemed_at DESC`
    )
    .all(req.userId);
  res.json({ redemptions: rows });
});

export default router;
