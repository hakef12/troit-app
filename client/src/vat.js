// Espejo de client/api/_lib/vat.js (solo para la vista previa del checkout).
// El servidor siempre recalcula; si cambias la tasa, cámbiala en los dos archivos.
export const VAT_RATE = 0.15;

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const baseFromGross = (gross) => round2(gross / (1 + VAT_RATE));

export function buildSummary({ items, promoDiscount, couponDiscount, deliveryFee }) {
  const lines = items.map((it) => ({ id: it.id, base: baseFromGross(it.price * it.qty) }));
  const itemsBase = round2(lines.reduce((s, l) => s + l.base, 0));
  const promoBase = baseFromGross(promoDiscount);
  const couponBase = baseFromGross(couponDiscount);
  const foodBase = round2(Math.max(0, itemsBase - promoBase - couponBase));
  const foodTotal = Math.max(0, round2(items.reduce((s, it) => s + it.price * it.qty, 0) - promoDiscount - couponDiscount));
  const deliveryGross = round2(deliveryFee * (1 + VAT_RATE));
  const total = round2(foodTotal + deliveryGross);
  const vat = round2(total - foodBase - deliveryFee);
  return { lines, itemsBase, promoBase, couponBase, total, vat };
}
