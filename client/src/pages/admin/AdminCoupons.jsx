import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const EMPTY = { title: '', description: '', points_cost: '', discount_type: 'fixed', discount_value: '' };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.getCoupons(true).then((data) => setCoupons(data.coupons));
  }
  useEffect(load, []);

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      title: c.title,
      description: c.description || '',
      points_cost: c.points_cost,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, points_cost: Number(form.points_cost), discount_value: Number(form.discount_value) };
      if (editingId) {
        await api.updateCoupon(editingId, payload);
      } else {
        await api.createCoupon(payload);
      }
      cancelEdit();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(c) {
    if (c.active) {
      await api.deleteCoupon(c.id);
    } else {
      await api.updateCoupon(c.id, { active: true });
    }
    load();
  }

  return (
    <div>
      <h2>{editingId ? 'Editar cupón' : 'Nuevo cupón'}</h2>
      {error && <div className="alert error">{error}</div>}
      <form className="card form" onSubmit={handleSubmit}>
        <label>
          Título
          <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </label>
        <label>
          Descripción
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </label>
        <label>
          Costo en puntos
          <input type="number" min="1" required value={form.points_cost} onChange={(e) => setForm((f) => ({ ...f, points_cost: e.target.value }))} />
        </label>
        <label>
          Tipo de descuento
          <select value={form.discount_type} onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}>
            <option value="fixed">Monto fijo ($)</option>
            <option value="percentage">Porcentaje (%)</option>
          </select>
        </label>
        <label>
          Valor del descuento
          <input type="number" min="0" step="0.01" required value={form.discount_value} onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))} />
        </label>
        <div className="form-actions">
          <button className="btn" type="submit">
            {editingId ? 'Guardar cambios' : 'Crear cupón'}
          </button>
          {editingId && (
            <button className="btn secondary" type="button" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <h2>Cupones</h2>
      <div className="admin-table">
        {coupons.map((c) => (
          <div className={`admin-row ${c.active ? '' : 'inactive'}`} key={c.id}>
            <div>
              <strong>{c.title}</strong>
              <div className="muted small">{c.points_cost} pts</div>
            </div>
            <span>{c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${Number(c.discount_value).toFixed(2)}`}</span>
            <span>{c.active ? 'Activo' : 'Inactivo'}</span>
            <div className="row-actions">
              <button className="link-btn" onClick={() => startEdit(c)}>
                Editar
              </button>
              <button className="link-btn danger" onClick={() => toggleActive(c)}>
                {c.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
