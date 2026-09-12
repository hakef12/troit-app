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
import gameRoutes from './routes/game.js';

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// En Render, UPLOADS_DIR vive en el disco persistente (vacio en el primer deploy).
// Copiamos ahi las imagenes semilla del repo (promos, fotos reales) una sola vez,
// sin pisar nada que un admin ya haya subido despues.
const REPO_UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (path.resolve(REPO_UPLOADS_DIR) !== path.resolve(UPLOADS_DIR)) {
  for (const file of fs.readdirSync(REPO_UPLOADS_DIR)) {
    const dest = path.join(UPLOADS_DIR, file);
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(REPO_UPLOADS_DIR, file), dest);
  }
}

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API de fidelización escuchando en http://localhost:${PORT}`);
});
