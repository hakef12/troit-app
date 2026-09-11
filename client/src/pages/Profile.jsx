import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import LottieIcon from '../components/LottieIcon.jsx';
import starAnim from '../assets/lottie/star.json';

function formatMoney(n) {
  return `$${Number(n).toFixed(2)}`;
}

export default function Profile() {
  const { user, refresh } = useAuth();
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.myOrders().then((data) => setOrders(data.orders));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    await api.updateMe(form);
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="page">
      <h1>Mi cuenta</h1>

      <div className="card points-card">
        <span className="points-big">
          <LottieIcon animationData={starAnim} size={36} />
          {user.points} puntos
        </span>
        <p className="muted">Ganas puntos con cada compra y puedes canjearlos por cupones.</p>
      </div>

      <h2>Mis datos</h2>
      <form className="card form" onSubmit={handleSave}>
        {saved && <div className="alert success">Datos guardados</div>}
        <label>
          Nombre
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </label>
        <label>
          Teléfono
          <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </label>
        <label>
          Dirección
          <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
        </label>
        <button className="btn" type="submit">
          Guardar
        </button>
      </form>

      <h2>Mis pedidos</h2>
      {orders.length === 0 && <p className="muted">Todavía no hiciste ningún pedido.</p>}
      <ul className="list">
        {orders.map((o) => (
          <li key={o.id} className="list-item order-item">
            <div>
              <strong>Pedido #{o.id}</strong> — {new Date(o.created_at).toLocaleString('es-EC')}
              <div className="muted small">
                {o.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}
              </div>
            </div>
            <div className="order-meta">
              <span className={`status-pill status-${o.status.replace(/\s/g, '-')}`}>{o.status}</span>
              <strong>{formatMoney(o.total)}</strong>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
