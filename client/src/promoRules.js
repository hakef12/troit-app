// Copia de server/src/promoRules.js (mismo patrón que deliveryPricing.js): esto es
// solo para mostrar una vista previa en el checkout. El servidor vuelve a calcular
// todo desde cero y es la única fuente de verdad para el cobro real.
export function computePromoDiscount(promo, items) {
  if (!promo || !promo.rule_type) return 0;

  switch (promo.rule_type) {
    case 'bundle_price': {
      const matching = items.filter((i) => i.id === promo.rule_product_id);
      const qty = matching.reduce((sum, i) => sum + i.qty, 0);
      if (!matching.length || qty < promo.rule_quantity) return 0;
      const unitPrice = matching[0].price;
      const bundles = Math.floor(qty / promo.rule_quantity);
      const normalPrice = bundles * promo.rule_quantity * unitPrice;
      const promoPrice = bundles * promo.rule_price;
      return Math.max(0, normalPrice - promoPrice);
    }
    case 'category_half_second': {
      const units = [];
      for (const i of items) {
        if (i.category === promo.rule_category) {
          for (let n = 0; n < i.qty; n++) units.push(i.price);
        }
      }
      units.sort((a, b) => b - a);
      let discount = 0;
      for (let idx = 1; idx < units.length; idx += 2) discount += units[idx] * 0.5;
      return discount;
    }
    case 'category_fixed_price': {
      let discount = 0;
      for (const i of items) {
        if (i.category === promo.rule_category && i.price > promo.rule_price) {
          discount += (i.price - promo.rule_price) * i.qty;
        }
      }
      return discount;
    }
    default:
      return 0;
  }
}
