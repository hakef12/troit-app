import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { requireAuth, requireAdmin } from '../auth.js';
import { uploadFile } from '../supabaseStorage.js';
import { ah } from '../asyncHandler.js';

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(new Error('Formato de imagen no soportado (usa JPG, PNG, WEBP o GIF)'));
    }
    cb(null, true);
  },
});

const router = Router();

router.post('/', requireAuth, requireAdmin, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    next();
  });
}, ah(async (req, res) => {
  const ext = ALLOWED_TYPES[req.file.mimetype] || path.extname(req.file.originalname) || '';
  const filename = `${crypto.randomUUID()}${ext}`;
  const url = await uploadFile(filename, req.file.buffer, req.file.mimetype);
  res.status(201).json({ url });
}));

export default router;
