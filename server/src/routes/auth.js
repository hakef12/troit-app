import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import db from '../db.js';
import { signToken, requireAuth } from '../auth.js';
import { ah } from '../asyncHandler.js';

const router = Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    address: u.address,
    role: u.role,
    points: u.points,
  };
}

router.post('/register', ah(async (req, res) => {
  const { name, email, password, phone, address } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
  }
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });

  const hash = bcrypt.hashSync(password, 10);
  const info = await db
    .prepare(`INSERT INTO users (name, email, password_hash, phone, address, role, points) VALUES (?, ?, ?, ?, ?, 'cliente', 0)`)
    .run(name.trim(), email.toLowerCase().trim(), hash, phone || '', address || '');

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
}));

router.post('/login', ah(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son obligatorios' });

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
}));

// Login / registro con Google. El frontend manda el "credential" (ID token)
// que entrega Google Identity Services tras el consentimiento del usuario.
router.post('/google', ah(async (req, res) => {
  if (!googleClient) {
    return res.status(500).json({ error: 'El login con Google no está configurado en el servidor (falta GOOGLE_CLIENT_ID)' });
  }
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'Falta el token de Google' });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'Token de Google inválido' });
  }
  if (!payload?.email) return res.status(401).json({ error: 'Google no devolvió un email válido' });

  const email = payload.email.toLowerCase().trim();
  let user = await db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(payload.sub, email);

  if (!user) {
    const info = await db
      .prepare(`INSERT INTO users (name, email, password_hash, google_id, role, points) VALUES (?, ?, NULL, ?, 'cliente', 0)`)
      .run(payload.name || email, email, payload.sub);
    user = await db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  } else if (!user.google_id) {
    // Cuenta ya existía con email/contraseña: la vinculamos a Google también
    await db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(payload.sub, user.id);
    user = await db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
}));

router.get('/me', requireAuth, ah(async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user: publicUser(user) });
}));

router.put('/me', requireAuth, ah(async (req, res) => {
  const { name, phone, address } = req.body || {};
  await db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?')
    .run(name ?? null, phone ?? null, address ?? null, req.userId);
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  res.json({ user: publicUser(user) });
}));

export default router;
