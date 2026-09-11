import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const EMPTY = { day_of_week: '1', title: '', description: '', image_url: '' };

export default function AdminPromos() {
  const [promos, setPromos] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  function load() {
    api.getPromos(true).then((data) => setPromos(data.promos));
  }
  useEffect(load, []);

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      day_of_week: String(p.day_of_week),
      title: p.title,
      description: p.description || '',
      image_url: p.image_url || '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      setForm((f) => ({ ...f, image_url: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, day_of_week: Number(form.day_of_week) };
      if (editingId) {
        await api.updatePromo(editingId, payload);
      } else {
        await api.createPromo(payload);
      }
      cancelEdit();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(p) {
    if (p.active) {
      await api.deletePromo(p.id);
    } else {
      await api.updatePromo(p.id, { active: true });
    }
    load();
  }

  return (
    <div>
      <h2>{editingId ? 'Editar promo' : 'Nueva promo del día'}</h2>
      {error && <div className="alert error">{error}</div>}
      <form className="card form" onSubmit={handleSubmit}>
        <label>
          Día de la semana
          <select value={form.day_of_week} onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))}>
            {DAYS.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          Título
          <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ej: 2 Hot Chicken por $13.99" />
        </label>
        <label>
          Descripción / condiciones
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Ej: Válido solo para la Detroit Hot Chicken" />
        </label>
        <label>
          Imagen del flyer
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageChange} disabled={uploading} />
        </label>
        {uploading && <p className="muted small">Subiendo imagen…</p>}
        {form.image_url && (
          <div className="image-preview">
            <img src={form.image_url} alt="Vista previa" />
            <button type="button" className="link-btn danger" onClick={() => setForm((f) => ({ ...f, image_url: '' }))}>
              Quitar imagen
            </button>
          </div>
        )}
        <div className="form-actions">
          <button className="btn" type="submit" disabled={uploading}>
            {editingId ? 'Guardar cambios' : 'Crear promo'}
          </button>
          {editingId && (
            <button className="btn secondary" type="button" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <h2>Promos configuradas</h2>
      <div className="admin-table">
        {promos.map((p) => (
          <div className={`admin-row ${p.active ? '' : 'inactive'}`} key={p.id}>
            <div className="admin-row-product">
              {p.image_url ? (
                <img className="admin-thumb" src={p.image_url} alt={p.title} />
              ) : (
                <div className="admin-thumb admin-thumb-empty">🔥</div>
              )}
              <div>
                <strong>{p.title}</strong>
                <div className="muted small">{DAYS[p.day_of_week]}</div>
              </div>
            </div>
            <span>{p.description}</span>
            <span>{p.active ? 'Activa' : 'Inactiva'}</span>
            <div className="row-actions">
              <button className="link-btn" onClick={() => startEdit(p)}>
                Editar
              </button>
              <button className="link-btn danger" onClick={() => toggleActive(p)}>
                {p.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
        {promos.length === 0 && <p className="muted">Todavía no hay promos cargadas.</p>}
      </div>
    </div>
  );
}
