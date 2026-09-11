import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import couponRoutes from './routes/coupons.js';
import orderRoutes from './routes/orders.js';
import storeRoutes from './routes/store.js';
import uploadRoutes, { UPLOADS_DIR } from './routes/uploads.js';
import promoRoutes from './routes/promos.js';
import bannerRoutes from './routes/banners.js';

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/store-info', storeRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/banners', bannerRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API de fidelización escuchando en http://localhost:${PORT}`);
});
