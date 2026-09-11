import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const EMPTY = { name: '', description: '', price: '', category: '', image_url: '' };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  function load() {
    api.getProducts(true).then((data) => setProducts(data.products));
  }
  useEffect(load, []);

  function startEdit(p) {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description || '', price: p.price, category: p.category || '', image_url: p.image_url || '' });
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
      const payload = { ...form, price: Number(form.price) };
      if (editingId) {
        await api.updateProduct(editingId, payload);
      } else {
        await api.createProduct(payload);
      }
      cancelEdit();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(p) {
    if (p.active) {
      await api.deleteProduct(p.id);
    } else {
      await api.updateProduct(p.id, { active: true });
    }
    load();
  }

  return (
    <div>
      <h2>{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>
      {error && <div className="alert error">{error}</div>}
      <form className="card form" onSubmit={handleSubmit}>
        <label>
          Nombre
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </label>
        <label>
          Descripción
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </label>
        <label>
          Precio
          <input type="number" min="0" step="0.01" required value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
        </label>
        <label>
          Categoría
          <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Ej: Pizzas" />
        </label>
        <label>
          Foto del producto
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
            {editingId ? 'Guardar cambios' : 'Crear producto'}
          </button>
          {editingId && (
            <button className="btn secondary" type="button" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <h2>Productos</h2>
      <div className="admin-table">
        {products.map((p) => (
          <div className={`admin-row ${p.active ? '' : 'inactive'}`} key={p.id}>
            <div className="admin-row-product">
              {p.image_url ? (
                <img className="admin-thumb" src={p.image_url} alt={p.name} />
              ) : (
                <div className="admin-thumb admin-thumb-empty">🍽️</div>
              )}
              <div>
                <strong>{p.name}</strong>
                <div className="muted small">{p.category || 'Sin categoría'}</div>
              </div>
            </div>
            <span>${Number(p.price).toFixed(2)}</span>
            <span>{p.active ? 'Activo' : 'Inactivo'}</span>
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
      </div>
    </div>
  );
}
