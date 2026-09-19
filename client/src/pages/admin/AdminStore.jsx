import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
// Se muestra de lunes a domingo, pero el índice (0 = domingo) es el que guarda el servidor
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_SCHEDULE = Array.from({ length: 7 }, () => ({ enabled: true, open: '12:00', close: '22:00' }));

const MODES = [
  { id: 'auto', title: 'Automático', desc: 'Abre y cierra solo según el horario de abajo.' },
  { id: 'closed', title: 'Cerrado ahora', desc: 'No se reciben pedidos hasta que lo cambies, sin importar el horario.' },
  { id: 'open', title: 'Abierto ahora', desc: 'Se reciben pedidos aunque esté fuera del horario.' },
];

export default function AdminStore() {
  const [mode, setMode] = useState('auto');
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [hasSchedule, setHasSchedule] = useState(true);
  const [closedMessage, setClosedMessage] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function applyInfo(info) {
    setStatus(info.status);
    setMode(info.settings.mode);
    setClosedMessage(info.settings.closedMessage || '');
    setHasSchedule(Boolean(info.settings.schedule));
    setSchedule(info.settings.schedule || DEFAULT_SCHEDULE);
  }

  useEffect(() => {
    api
      .getStoreInfo()
      .then(applyInfo)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function updateDay(index, patch) {
    setSaved(false);
    setSchedule((s) => s.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  async function handleSave() {
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const info = await api.updateStoreSettings({ mode, schedule, closedMessage: closedMessage.trim() });
      applyInfo(info);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-loading">Cargando…</div>;

  return (
    <div>
      <h2>Estado del local</h2>
      {status && (
        <div className={`alert ${status.open ? 'success' : 'error'}`}>
          {status.open ? '🟢 Recibiendo pedidos ahora.' : `🔴 No se reciben pedidos ahora. ${status.message}`}
        </div>
      )}
      {!hasSchedule && (
        <div className="alert error">
          Todavía no guardaste un horario, así que el local recibe pedidos a cualquier hora. Ajusta los días de abajo y guarda.
        </div>
      )}
      {error && <div className="alert error">{error}</div>}

      <div className="card form">
        <label>Recepción de pedidos</label>
        <div className="mode-options">
          {MODES.map((m) => (
            <label key={m.id} className={`mode-option ${mode === m.id ? 'active' : ''}`}>
              <input
                type="radio"
                name="orders-mode"
                checked={mode === m.id}
                onChange={() => {
                  setMode(m.id);
                  setSaved(false);
                }}
              />
              <span>
                <strong>{m.title}</strong>
                <span className="muted small">{m.desc}</span>
              </span>
            </label>
          ))}
        </div>

        {mode === 'closed' && (
          <label>
            Mensaje para el cliente (opcional)
            <input
              value={closedMessage}
              maxLength={200}
              onChange={(e) => {
                setClosedMessage(e.target.value);
                setSaved(false);
              }}
              placeholder="Ej: Hoy cerramos por mantenimiento. ¡Volvemos mañana!"
            />
          </label>
        )}
      </div>

      <h2>Horario semanal</h2>
      <p className="muted small">Hora de Ecuador (Guayaquil). Si el cierre es menor que la apertura (ej. 18:00 a 01:00), cuenta como cierre de madrugada.</p>
      <div className="card form">
        {DISPLAY_ORDER.map((i) => {
          const d = schedule[i];
          return (
            <div className="schedule-row" key={i}>
              <label className="schedule-day">
                <input type="checkbox" checked={d.enabled} onChange={(e) => updateDay(i, { enabled: e.target.checked })} />
                {DAY_NAMES[i]}
              </label>
              {d.enabled ? (
                <div className="schedule-times">
                  <input type="time" value={d.open} onChange={(e) => updateDay(i, { open: e.target.value })} required />
                  <span>a</span>
                  <input type="time" value={d.close} onChange={(e) => updateDay(i, { close: e.target.value })} required />
                </div>
              ) : (
                <span className="muted small">Cerrado todo el día</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="form-actions">
        <button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {saved && <span className="muted small">✓ Guardado</span>}
      </div>
    </div>
  );
}
