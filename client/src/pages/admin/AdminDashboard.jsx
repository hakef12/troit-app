import { useState } from 'react';
import AdminProducts from './AdminProducts.jsx';
import AdminCoupons from './AdminCoupons.jsx';
import AdminOrders from './AdminOrders.jsx';
import AdminPromos from './AdminPromos.jsx';
import AdminBanners from './AdminBanners.jsx';

const TABS = [
  { id: 'orders', label: 'Pedidos' },
  { id: 'products', label: 'Productos' },
  { id: 'coupons', label: 'Cupones' },
  { id: 'promos', label: 'Promos del día' },
  { id: 'banners', label: 'Carrusel' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('orders');

  return (
    <div className="page">
      <h1>Panel de administración</h1>
      <div className="category-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'orders' && <AdminOrders />}
      {tab === 'products' && <AdminProducts />}
      {tab === 'coupons' && <AdminCoupons />}
      {tab === 'promos' && <AdminPromos />}
      {tab === 'banners' && <AdminBanners />}
    </div>
  );
}
