import { useState } from 'react';
import AdminProducts from './AdminProducts.jsx';
import AdminCoupons from './AdminCoupons.jsx';
import AdminOrders from './AdminOrders.jsx';
import AdminPromos from './AdminPromos.jsx';
import AdminBanners from './AdminBanners.jsx';
import AdminStore from './AdminStore.jsx';

const TABS = [
  { id: 'orders', label: 'Pedidos' },
  { id: 'store', label: 'Horario y estado' },
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
      {tab === 'store' && <AdminStore />}
      {tab === 'products' && <AdminProducts />}
      {tab === 'coupons' && <AdminCoupons />}
      {tab === 'promos' && <AdminPromos />}
      {tab === 'banners' && <AdminBanners />}
    </div>
  );
}
