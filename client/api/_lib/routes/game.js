import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { ah } from '../asyncHandler.js';

const router = Router();

const GAME_POINTS_UNIT = Number(process.env.GAME_POINTS_UNIT || 2000);
const GAME_DAILY_POINTS_CAP = Number(process.env.GAME_DAILY_POINTS_CAP || 20);
const MAX_PLAUSIBLE_SCORE = 200000; // resguardo contra valores absurdos

function today() {
  return new Date().toISOString().slice(0, 10);
}

router.post('/score', requireAuth, ah(async (req, res) => {
  const score = Math.floor(Number(req.body?.score));
  if (!Number.isFinite(score) || score < 0) {
    return res.status(400).json({ error: 'Puntaje inválido' });
  }
  const clampedScore = Math.min(score, MAX_PLAUSIBLE_SCORE);
  const earned = Math.floor(clampedScore / GAME_POINTS_UNIT);

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  const pointsToday = user.game_points_date === today() ? user.game_points_today : 0;
  const remaining = Math.max(0, GAME_DAILY_POINTS_CAP - pointsToday);
  const awarded = Math.min(earned, remaining);

  if (awarded > 0) {
    await db.prepare('UPDATE users SET points = points + ?, game_points_today = ?, game_points_date = ? WHERE id = ?').run(
      awarded,
      pointsToday + awarded,
      today(),
      req.userId
    );
  }

  const updated = await db.prepare('SELECT points FROM users WHERE id = ?').get(req.userId);
  res.json({ awarded, points: updated.points, dailyCapReached: awarded < earned });
}));

export default router;
