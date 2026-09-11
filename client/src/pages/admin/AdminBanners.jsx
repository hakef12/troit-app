import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const EMPTY = { title: '', image_url: '', sort_order: '0' };

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  function load() {
    api.getBanners(true).then((data) => setBanners(data.banners));
  }
  useEffect(load, []);

  function startEdit(b) {
    setEditingId(b.id);
    setForm({ title: b.title || '', image_url: b.image_url, sort_order: String(b.sort_order) });
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
    if (!form.image_url) {
      setError('Subí una imagen antes de guardar');
      return;
    }
    try {
      const payload = { ...form, sort_order: Number(form.sort_order) || 0 };
      if (editingId) {
        await api.updateBanner(editingId, payload);
      } else {
        await api.createBanner(payload);
      }
      cancelEdit();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(b) {
    if (b.active) {
      await api.deleteBanner(b.id);
    } else {
      await api.updateBanner(b.id, { active: true });
    }
    load();
  }

  return (
    <div>
      <h2>{editingId ? 'Editar imagen' : 'Nueva imagen para el carrusel'}</h2>
      <p className="muted small">
        Estas imágenes rotan en el carrusel de arriba del menú, junto con las promos de la semana.
      </p>
      {error && <div className="alert error">{error}</div>}
      <form className="card form" onSubmit={handleSubmit}>
        <label>
          Título (opcional, se muestra como etiqueta sobre la imagen)
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ej: Nuevo local en Sauces" />
        </label>
        <label>
          Orden (menor número aparece primero)
          <input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
        </label>
        <label>
          Imagen
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
            {editingId ? 'Guardar cambios' : 'Agregar al carrusel'}
          </button>
          {editingId && (
            <button className="btn secondary" type="button" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <h2>Imágenes del carrusel</h2>
      <div className="admin-table">
        {banners.map((b) => (
          <div className={`admin-row ${b.active ? '' : 'inactive'}`} key={b.id}>
            <div className="admin-row-product">
              <img className="admin-thumb" src={b.image_url} alt={b.title || 'Banner'} />
              <div>
                <strong>{b.title || 'Sin título'}</strong>
                <div className="muted small">Orden: {b.sort_order}</div>
              </div>
            </div>
            <span></span>
            <span>{b.active ? 'Activa' : 'Inactiva'}</span>
            <div className="row-actions">
              <button className="link-btn" onClick={() => startEdit(b)}>
                Editar
              </button>
              <button className="link-btn danger" onClick={() => toggleActive(b)}>
                {b.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
        {banners.length === 0 && <p className="muted">Todavía no subiste imágenes para el carrusel.</p>}
      </div>
    </div>
  );
}
