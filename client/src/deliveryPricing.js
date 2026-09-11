// Espejo de server/src/deliveryPricing.js — solo para mostrar una vista previa en el checkout.
// El precio final siempre lo calcula el servidor.
const TIERS = [
  { maxKm: 1, fee: 2.5 },
  { maxKm: 2.9, fee: 3.0 },
  { maxKm: 4.9, fee: 3.5 },
  { maxKm: 5.9, fee: 4.0 },
  { maxKm: 7.9, fee: 4.5 },
  { maxKm: 8.5, fee: 5.0 },
  { maxKm: 9.9, fee: 5.5 },
  { maxKm: 10.9, fee: 6.0 },
  { maxKm: 13.9, fee: 6.5 },
  { maxKm: 15.9, fee: 7.0 },
  { maxKm: 17.9, fee: 7.5 },
  { maxKm: 20.9, fee: 8.0 },
  { maxKm: 23.9, fee: 9.0 },
];
const FEE_BEYOND_MAX = 10.0;

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getDeliveryFee(km) {
  const tier = TIERS.find((t) => km <= t.maxKm);
  return tier ? tier.fee : FEE_BEYOND_MAX;
}
