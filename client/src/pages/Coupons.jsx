import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import TroitRunnerGame from '../components/TroitRunnerGame.jsx';

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const { user, refresh } = useAuth();

  function load() {
    api.getCoupons().then((data) => setCoupons(data.coupons));
    if (user) api.myRedemptions().then((data) => setRedemptions(data.redemptions));
  }

  useEffect(load, [user]);

  async function handleRedeem(coupon) {
    setError('');
    setMessage('');
    setBusyId(coupon.id);
    try {
      await api.redeemCoupon(coupon.id);
      setMessage(`Canjeaste "${coupon.title}". Puedes usarlo en tu próximo pedido.`);
      await refresh();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const available = redemptions.filter((r) => !r.used);
  const usedHistory = redemptions.filter((r) => r.used);

  return (
    <div className="page">
      <h1>Cupones</h1>
      <p className="subtitle">Canjea tus puntos por descuentos en tu próxima compra.</p>
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="product-grid">
        {coupons.map((c) => (
          <div className="product-card coupon-card" key={c.id}>
            <div className="product-info">
              <h3>{c.title}</h3>
              {c.description && <p className="product-desc">{c.description}</p>}
              <div className="product-footer">
                <span className="price">{c.points_cost} pts</span>
                {user ? (
                  <button className="btn small" disabled={busyId === c.id || user.points < c.points_cost} onClick={() => handleRedeem(c)}>
                    {busyId === c.id ? 'Canjeando…' : user.points < c.points_cost ? 'Puntos insuficientes' : 'Canjear'}
                  </button>
                ) : (
                  <span className="muted small">Inicia sesión para canjear</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2>🎮 Jugá con Troit</h2>
      <p className="muted small">Saltá los obstáculos con espacio (o tocando la pantalla).</p>
      <TroitRunnerGame />

      {user && available.length > 0 && (
        <>
          <h2>Mis cupones disponibles</h2>
          <ul className="list">
            {available.map((r) => (
              <li key={r.id} className="list-item">
                <strong>{r.title}</strong> — listo para usar en el checkout
              </li>
            ))}
          </ul>
        </>
      )}

      {user && usedHistory.length > 0 && (
        <>
          <h2>Historial de canjes</h2>
          <ul className="list muted">
            {usedHistory.map((r) => (
              <li key={r.id} className="list-item">
                {r.title} — usado en el pedido #{r.order_id}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
