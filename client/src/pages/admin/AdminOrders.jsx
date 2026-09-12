import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const STATUSES = ['pendiente', 'confirmado', 'en preparación', 'entregado', 'cancelado'];

function formatMoney(n) {
  return `$${Number(n).toFixed(2)}`;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);

  function load() {
    api.allOrders().then((data) => setOrders(data.orders));
  }
  useEffect(load, []);

  async function updateStatus(id, status) {
    await api.updateOrderStatus(id, status);
    load();
  }

  return (
    <div>
      <h2>Pedidos</h2>
      <div className="admin-table orders">
        {orders.map((o) => (
          <div className="admin-row order-row" key={o.id}>
            <div>
              <strong>#{o.id}</strong> — {o.customer_name}
              <div className="muted small">{o.customer_phone}</div>
              <div className="muted small">
                {o.delivery_type === 'pickup' ? '🏪 Retiro en el local' : '🛵 A domicilio'} — {o.address}
                {o.delivery_type !== 'pickup' && o.lat != null && o.lng != null && (
                  <>
                    {' '}
                    <a href={`https://www.google.com/maps?q=${o.lat},${o.lng}`} target="_blank" rel="noopener noreferrer">
                      Ver en mapa
                    </a>
                  </>
                )}
              </div>
              <div className="muted small">{o.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}</div>
              {o.delivery_fee > 0 && (
                <div className="muted small">
                  Envío{o.delivery_km != null ? ` (${Number(o.delivery_km).toFixed(1)} km)` : ''}: {formatMoney(o.delivery_fee)}
                </div>
              )}
              {o.promo_discount > 0 && (
                <div className="muted small">
                  🔥 Promo aplicada ({o.promo_title}): −{formatMoney(o.promo_discount)}
                </div>
              )}
            </div>
            <span>{o.payment_method === 'transferencia' ? 'Transferencia' : 'Efectivo'}</span>
            <strong>{formatMoney(o.total)}</strong>
            <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ))}
        {orders.length === 0 && <p className="muted">Todavía no hay pedidos.</p>}
      </div>
    </div>
  );
}
