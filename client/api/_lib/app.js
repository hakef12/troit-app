import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import couponRoutes from './routes/coupons.js';
import orderRoutes from './routes/orders.js';
import storeRoutes from './routes/store.js';
import uploadRoutes from './routes/uploads.js';
import promoRoutes from './routes/promos.js';
import bannerRoutes from './routes/banners.js';
import gameRoutes from './routes/game.js';
import deliveryEstimateRoutes from './routes/deliveryEstimate.js';
import { initDb } from './db.js';
import { ensureBucket } from './supabaseStorage.js';

const app = express();
app.use(cors());
app.use(express.json());

// La primera peticion que le toca a cada contenedor "frio" espera a que el
// bucket y las tablas esten listos; en las siguientes, la promesa ya esta
// resuelta asi que el await es practicamente instantaneo.
let readyPromise = null;
function ready() {
  if (!readyPromise) {
    readyPromise = Promise.all([ensureBucket(), initDb()]);
  }
  return readyPromise;
}
app.use((req, res, next) => {
  ready().then(() => next(), next);
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/store-info', storeRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/delivery-estimate', deliveryEstimateRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
