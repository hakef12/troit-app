import { Router } from 'express';
import { requireAuth, requireAdmin } from '../auth.js';
import { ah } from '../asyncHandler.js';
import { computeStatus, getSettings, saveSettings, validateSettings, STORE_TZ } from '../storeStatus.js';

const router = Router();

async function storePayload() {
  const settings = await getSettings();
  return {
    name: process.env.RESTAURANT_NAME || 'Local',
    address: process.env.RESTAURANT_ADDRESS || '',
    lat: Number(process.env.RESTAURANT_LAT || 0),
    lng: Number(process.env.RESTAURANT_LNG || 0),
    status: computeStatus(settings),
    settings: { mode: settings.mode, schedule: settings.schedule, closedMessage: settings.closedMessage },
    timezone: STORE_TZ,
  };
}

router.get('/', ah(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await storePayload());
}));

router.put('/settings', requireAuth, requireAdmin, ah(async (req, res) => {
  const { mode, schedule, closedMessage } = req.body || {};
  const problem = validateSettings({ mode, schedule, closedMessage });
  if (problem) return res.status(400).json({ error: problem });
  await saveSettings({ mode, schedule, closedMessage });
  res.json(await storePayload());
}));

export default router;
