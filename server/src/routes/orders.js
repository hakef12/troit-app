import { Router } from 'express';
import db, { transaction } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { haversineKm, getDeliveryFee } from '../deliveryPricing.js';
import { computePromoDiscount } from '../promoRules.js';
import { ah } from '../asyncHandler.js';

const router = Router();
const POINTS_PER_UNIT = Number(process.env.POINTS_PER_UNIT || 1000);
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '';
const RESTAURANT_ADDRESS = process.env.RESTAURANT_ADDRESS || '';
const RESTAURANT_LAT = process.env.RESTAURANT_LAT || '';
const RESTAURANT_LNG = process.env.RESTAURANT_LNG || '';

function formatMoney(n) {
  return `$${Number(n).toFixed(2)}`;
}

function mapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function buildWhatsappMessage({ order, items, user }) {
  const lines = [];
  lines.push(`*Nuevo pedido #${order.id}*`);
  lines.push('');
  lines.push(`Cliente: ${user.name}`);
  if (order.delivery_type === 'pickup') {
    lines.push('Entrega: Retiro en el local');
    lines.push(`Local: ${RESTAURANT_ADDRESS}`);
    if (RESTAURANT_LAT && RESTAURANT_LNG) lines.push(`Ubicación: ${mapsLink(RESTAURANT_LAT, RESTAURANT_LNG)}`);
  } else {
    lines.push('Entrega: A domicilio');
    lines.push(`Dirección: ${order.address}`);
    if (order.lat != null && order.lng != null) lines.push(`Ubicación: ${mapsLink(order.lat, order.lng)}`);
  }
  lines.push('');
  lines.push('Productos:');
  for (const it of items) {
    lines.push(`- ${it.qty}x ${it.name} (${formatMoney(it.price)} c/u) = ${formatMoney(it.price * it.qty)}`);
  }
  lines.push('');
  lines.push(`Subtotal: ${formatMoney(order.subtotal)}`);
  if (order.promo_discount > 0) lines.push(`Promo del día (${order.promo_title}): -${formatMoney(order.promo_discount)}`);
  if (order.discount > 0) lines.push(`Descuento cupón: -${formatMoney(order.discount)}`);
  if (order.delivery_fee > 0) {
    const kmText = order.delivery_km != null ? ` (${order.delivery_km.toFixed(1)} km)` : '';
    lines.push(`Envío${kmText}: ${formatMoney(order.delivery_fee)}`);
  }
  lines.push(`*Total: ${formatMoney(order.total)}*`);
  lines.push('');
  lines.push(`Método de pago: ${order.payment_method === 'transferencia' ? 'Transferencia bancaria' : 'Efectivo'}`);
  lines.push(`Puntos ganados con este pedido: ${order.points_earned}`);
  return lines.join('\n');
}

router.post('/', requireAuth, ah(async (req, res) => {
  const { items, address, payment_method, redemption_id, delivery_type, lat, lng } = req.body || {};

  const deliveryType = delivery_type === 'pickup' ? 'pickup' : 'delivery';

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El pedido debe tener al menos un producto' });
  }
  if (deliveryType === 'delivery' && (!address || !address.trim())) {
    return res.status(400).json({ error: 'La dirección es obligatoria para envío a domicilio' });
  }
  if (!['efectivo', 'transferencia'].includes(payment_method)) {
    return res.status(400).json({ error: 'Método de pago inválido (debe ser efectivo o transferencia)' });
  }

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);

  // Resolver productos y precios desde la base de datos (nunca confiar en el precio del cliente)
  const resolvedItems = [];
  let subtotal = 0;
  for (const it of items) {
    const product = await db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(it.product_id);
    if (!product) return res.status(400).json({ error: `Producto ${it.product_id} no disponible` });
    const qty = Math.max(1, Number(it.qty) || 1);
    resolvedItems.push({ id: product.id, name: product.name, price: product.price, qty, category: product.category });
    subtotal += product.price * qty;
  }

  // Promo del día (según la fecha del servidor, nunca la del cliente): se aplica sola
  // si el carrito cumple la condición de esa promo — no hace falta código ni cupón.
  const todayPromo = await db.prepare('SELECT * FROM promos WHERE day_of_week = ? AND active = 1').get(new Date().getDay());
  const promoDiscount = Math.round(computePromoDiscount(todayPromo, resolvedItems) * 100) / 100;
  const afterPromo = Math.max(0, subtotal - promoDiscount);

  // Aplicar cupón canjeado, si corresponde (sobre lo que queda después de la promo)
  let discount = 0;
  let redemption = null;
  if (redemption_id) {
    redemption = await db
      .prepare(
        `SELECT r.*, c.discount_type, c.discount_value, c.title FROM redemptions r
         JOIN coupons c ON c.id = r.coupon_id WHERE r.id = ? AND r.user_id = ? AND r.used = 0`
      )
      .get(redemption_id, req.userId);
    if (!redemption) return res.status(400).json({ error: 'El cupón seleccionado no está disponible' });
    discount = redemption.discount_type === 'percentage'
      ? Math.round(afterPromo * redemption.discount_value) / 100
      : Math.min(redemption.discount_value, afterPromo);
  }

  const foodTotal = Math.max(0, afterPromo - discount);
  const pointsEarned = Math.floor(foodTotal / POINTS_PER_UNIT);

  // Calcular el costo de envío según distancia al local (tarifario del delivery)
  let deliveryFee = 0;
  let deliveryKm = null;
  const customerLat = deliveryType === 'delivery' && lat != null ? Number(lat) : null;
  const customerLng = deliveryType === 'delivery' && lng != null ? Number(lng) : null;
  if (deliveryType === 'delivery' && customerLat != null && customerLng != null && RESTAURANT_LAT && RESTAURANT_LNG) {
    deliveryKm = haversineKm(Number(RESTAURANT_LAT), Number(RESTAURANT_LNG), customerLat, customerLng);
    deliveryFee = getDeliveryFee(deliveryKm);
  }

  const total = Math.round((foodTotal + deliveryFee) * 100) / 100;

  const orderId = await transaction(async () => {
    const info = await db
      .prepare(
        `INSERT INTO orders (user_id, items_json, subtotal, discount, total, payment_method, address, status, points_earned, redemption_id, delivery_type, lat, lng, delivery_fee, delivery_km, promo_id, promo_title, promo_discount)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.userId,
        JSON.stringify(resolvedItems),
        subtotal,
        discount,
        total,
        payment_method,
        deliveryType === 'pickup' ? RESTAURANT_ADDRESS : address.trim(),
        pointsEarned,
        redemption ? redemption.id : null,
        deliveryType,
        customerLat,
        customerLng,
        deliveryFee,
        deliveryKm,
        promoDiscount > 0 ? todayPromo.id : null,
        promoDiscount > 0 ? todayPromo.title : null,
        promoDiscount
      );
    await db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(pointsEarned, req.userId);
    if (redemption) {
      await db.prepare('UPDATE redemptions SET used = 1, order_id = ? WHERE id = ?').run(info.lastInsertRowid, redemption.id);
    }
    return info.lastInsertRowid;
  });

  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const updatedUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);

  const message = buildWhatsappMessage({ order, items: resolvedItems, user: updatedUser });
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  res.status(201).json({
    order,
    points: updatedUser.points,
    whatsappUrl,
    whatsappMessage: message,
  });
}));

router.get('/mine', requireAuth, ah(async (req, res) => {
  const rows = await db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json({ orders: rows.map((o) => ({ ...o, items: JSON.parse(o.items_json) })) });
}));

router.get('/', requireAuth, requireAdmin, ah(async (req, res) => {
  const rows = await db
    .prepare(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone FROM orders o
       JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC`
    )
    .all();
  res.json({ orders: rows.map((o) => ({ ...o, items: JSON.parse(o.items_json) })) });
}));

router.put('/:id/status', requireAuth, requireAdmin, ah(async (req, res) => {
  const { status } = req.body || {};
  const allowed = ['pendiente', 'confirmado', 'en preparación', 'entregado', 'cancelado'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
  const existing = await db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Pedido no encontrado' });

  await transaction(async () => {
    // Al cancelar un pedido, se revierten los puntos que había ganado y se
    // libera el cupón canjeado (si usó uno) para que pueda volver a usarlo.
    // Al destantar la cancelación, se vuelven a aplicar ambos efectos.
    if (status === 'cancelado' && existing.status !== 'cancelado') {
      await db.prepare('UPDATE users SET points = GREATEST(points - ?, 0) WHERE id = ?').run(existing.points_earned, existing.user_id);
      if (existing.redemption_id) {
        await db.prepare('UPDATE redemptions SET used = 0, order_id = NULL WHERE id = ?').run(existing.redemption_id);
      }
    } else if (status !== 'cancelado' && existing.status === 'cancelado') {
      await db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(existing.points_earned, existing.user_id);
      if (existing.redemption_id) {
        await db.prepare('UPDATE redemptions SET used = 1, order_id = ? WHERE id = ?').run(existing.id, existing.redemption_id);
      }
    }
    await db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  });

  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json({ order: { ...order, items: JSON.parse(order.items_json) } });
}));

export default router;
