import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    name: process.env.RESTAURANT_NAME || 'Local',
    address: process.env.RESTAURANT_ADDRESS || '',
    lat: Number(process.env.RESTAURANT_LAT || 0),
    lng: Number(process.env.RESTAURANT_LNG || 0),
  });
});

export default router;
