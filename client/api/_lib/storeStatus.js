import db from './db.js';

export const STORE_TZ = 'America/Guayaquil';
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const MODES = ['auto', 'open', 'closed'];

export async function getSettings() {
  const rows = await db.prepare('SELECT key, value FROM settings').all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  let schedule = null;
  try {
    schedule = map.schedule ? JSON.parse(map.schedule) : null;
  } catch {
    schedule = null;
  }
  return {
    mode: MODES.includes(map.orders_mode) ? map.orders_mode : 'auto',
    schedule: Array.isArray(schedule) && schedule.length === 7 ? schedule : null,
    closedMessage: map.closed_message || '',
  };
}

export async function saveSettings({ mode, schedule, closedMessage }) {
  const upsert = (key, value) =>
    db
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value RETURNING key')
      .run(key, value);
  if (mode !== undefined) await upsert('orders_mode', mode);
  if (schedule !== undefined) await upsert('schedule', JSON.stringify(schedule));
  if (closedMessage !== undefined) await upsert('closed_message', closedMessage);
}

export function validateSettings({ mode, schedule, closedMessage }) {
  if (mode !== undefined && !MODES.includes(mode)) return 'Modo inválido';
  if (schedule !== undefined) {
    if (!Array.isArray(schedule) || schedule.length !== 7) return 'El horario debe tener los 7 días de la semana';
    for (const d of schedule) {
      if (typeof d?.enabled !== 'boolean') return 'Horario inválido';
      if (d.enabled && (!TIME_RE.test(d.open) || !TIME_RE.test(d.close))) return 'Las horas deben tener formato HH:MM';
    }
  }
  if (closedMessage !== undefined && (typeof closedMessage !== 'string' || closedMessage.length > 200)) {
    return 'El mensaje de cierre es demasiado largo (máximo 200 caracteres)';
  }
  return null;
}

function nowInStore(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    day: WEEKDAY_INDEX[get('weekday')],
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
  };
}

const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

function isWithinSchedule(schedule, day, minutes) {
  const today = schedule[day];
  if (today?.enabled) {
    const o = toMinutes(today.open);
    const c = toMinutes(today.close);
    if (c > o ? minutes >= o && minutes < c : minutes >= o) return true;
  }
  // Horario que cruza la medianoche (ej. 18:00 a 01:00) que empezó ayer
  const yesterday = schedule[(day + 6) % 7];
  if (yesterday?.enabled) {
    const o = toMinutes(yesterday.open);
    const c = toMinutes(yesterday.close);
    if (c <= o && minutes < c) return true;
  }
  return false;
}

function nextOpeningMessage(schedule, day, minutes) {
  for (let offset = 0; offset <= 7; offset += 1) {
    const d = (day + offset) % 7;
    const entry = schedule[d];
    if (!entry?.enabled) continue;
    if (offset === 0 && toMinutes(entry.open) <= minutes) continue;
    if (offset === 0) return `Hoy abrimos a las ${entry.open}.`;
    if (offset === 1) return `Mañana abrimos a las ${entry.open}.`;
    return `Abrimos el ${DAYS[d]} a las ${entry.open}.`;
  }
  return '';
}

export function computeStatus(settings, now = new Date()) {
  const { mode, schedule, closedMessage } = settings;
  if (mode === 'closed') {
    return { open: false, reason: 'manual', message: closedMessage || 'Por el momento no estamos recibiendo pedidos.' };
  }
  if (mode === 'open') return { open: true, reason: 'manual', message: '' };
  // Sin horario configurado todavía: no se bloquea nada hasta que el admin lo cargue
  if (!schedule) return { open: true, reason: 'no-schedule', message: '' };

  const { day, minutes } = nowInStore(now);
  if (isWithinSchedule(schedule, day, minutes)) return { open: true, reason: 'schedule', message: '' };

  const next = nextOpeningMessage(schedule, day, minutes);
  return { open: false, reason: 'schedule', message: `Estamos cerrados. ${next}`.trim() };
}

export async function getStoreStatus() {
  return computeStatus(await getSettings());
}
