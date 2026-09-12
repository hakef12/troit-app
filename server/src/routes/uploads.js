import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { requireAuth, requireAdmin } from '../auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// En produccion (Render) DATA_DIR apunta al disco persistente; en local queda
// dentro de server/ como antes.
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', '..');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname) || '';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(new Error('Formato de imagen no soportado (usa JPG, PNG, WEBP o GIF)'));
    }
    cb(null, true);
  },
});

const router = Router();

router.post('/', requireAuth, requireAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

export default router;
export { UPLOADS_DIR };
