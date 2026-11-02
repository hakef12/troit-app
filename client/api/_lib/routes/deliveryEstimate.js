import { Router } from 'express';
import { getDeliveryFee, getRoadKm } from '../deliveryPricing.js';
import { ah } from '../asyncHandler.js';
import { deliveryWithVat } from '../vat.js';

const RESTAURANT_LAT = process.env.RESTAURANT_LAT || '';
const RESTAURANT_LNG = process.env.RESTAURANT_LNG || '';

const router = Router();

// Vista previa del costo de envio para el checkout, sin exponer la clave de
// OpenRouteService al navegador (el calculo real siempre lo hace el servidor
// de nuevo al confirmar el pedido).
router.get('/', ah(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !RESTAURANT_LAT || !RESTAURANT_LNG) {
    return res.json({ km: null, fee: 0, feeWithVat: 0 });
  }
  const km = await getRoadKm(Number(RESTAURANT_LAT), Number(RESTAURANT_LNG), lat, lng);
  const fee = getDeliveryFee(km);
  res.json({ km, fee, feeWithVat: deliveryWithVat(fee) });
}));

export default router;
