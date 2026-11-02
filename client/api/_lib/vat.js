// IVA de Ecuador. Los precios del menú ya lo incluyen; el tarifario del envío no.
export const VAT_RATE = 0.15;

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const baseFromGross = (gross) => round2(gross / (1 + VAT_RATE));

export const deliveryWithVat = (netFee) => round2(netFee * (1 + VAT_RATE));

// Desglose para el mensaje y la base de datos. Todo se redondea a centavos y el IVA
// se calcula como lo que falta para llegar al total, así las líneas siempre suman.
export function buildBreakdown({ items, promoDiscount, couponDiscount, deliveryFee }) {
  const lines = items.map((it) => ({ name: it.name, qty: it.qty, base: baseFromGross(it.price * it.qty) }));
  const promoBase = baseFromGross(promoDiscount);
  const couponBase = baseFromGross(couponDiscount);
  const itemsBase = round2(lines.reduce((s, l) => s + l.base, 0));
  const foodBase = round2(Math.max(0, itemsBase - promoBase - couponBase));
  const deliveryGross = deliveryWithVat(deliveryFee);
  return { lines, promoBase, couponBase, foodBase, deliveryFee, deliveryGross, itemsBase };
}
