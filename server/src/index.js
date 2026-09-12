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
import uploadRoutes from './routes/uploads.js';
import promoRoutes from './routes/promos.js';
import bannerRoutes from './routes/banners.js';
import gameRoutes from './routes/game.js';
import { initDb } from './db.js';
import { ensureBucket, uploadFile } from './supabaseStorage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Imagenes semilla del repo (promos, fotos reales) que suben a Supabase Storage
// en cada arranque (upsert, no pisa nada distinto y no hace falta disco persistente).
async function seedUploadAssets() {
  const seedDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(seedDir)) return;
  const mimeByExt = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  for (const file of fs.readdirSync(seedDir)) {
    const ext = path.extname(file).toLowerCase();
    if (!mimeByExt[ext]) continue;
    const buffer = fs.readFileSync(path.join(seedDir, file));
    await uploadFile(file, buffer, mimeByExt[ext]);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

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

async function start() {
  await ensureBucket();
  await seedUploadAssets();
  await initDb();
  app.listen(PORT, () => {
    console.log(`API de fidelización escuchando en http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
