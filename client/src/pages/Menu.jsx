import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import mascotReading from '../assets/mascot-reading-menu.png';
import mascotSticker from '../assets/mascot-sticker.png';
import Carousel from '../components/Carousel.jsx';
import DraggableSticker from '../components/DraggableSticker.jsx';
import DraggableLottie from '../components/DraggableLottie.jsx';
import overwhelmedMindAnim from '../assets/lottie/overwhelmed-mind.json';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function formatMoney(n) {
  return `$${Number(n).toFixed(2)}`;
}

export default function Menu() {
  const [products, setProducts] = useState([]);
  const [promos, setPromos] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [storeStatus, setStoreStatus] = useState(null);
  const [category, setCategory] = useState('Todas');
  const { addItem, items } = useCart();
  const [justAdded, setJustAdded] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  function toggleDescription(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    api
      .getProducts()
      .then((data) => setProducts(data.products))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    api.getPromos().then((data) => setPromos(data.promos)).catch(() => {});
    api.getBanners().then((data) => setBanners(data.banners)).catch(() => {});
    api.getStoreInfo().then((data) => setStoreStatus(data.status)).catch(() => {});
  }, []);

  const todayPromo = useMemo(() => promos.find((p) => p.day_of_week === new Date().getDay()), [promos]);

  const carouselItems = useMemo(() => {
    const promoSlides = promos
      .filter((p) => p.image_url)
      .map((p) => ({ src: p.image_url, alt: `${DAYS[p.day_of_week]}: ${p.title}`, caption: DAYS[p.day_of_week] }));
    const bannerSlides = banners
      .filter((b) => b.image_url)
      .map((b) => ({ src: b.image_url, alt: b.title || 'Promoción', caption: b.title || '' }));
    return [...promoSlides, ...bannerSlides];
  }, [promos, banners]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['Todas', ...set];
  }, [products]);

  const visible = category === 'Todas' ? products : products.filter((p) => p.category === category);

  const qtyInCart = (id) => items.find((it) => it.id === id)?.qty || 0;

  return (
    <div className="page">
      <Carousel items={carouselItems} />

      <div className="hero">
        <div className="hero-text">
          <h1>Nuestro Menú</h1>
          <p className="subtitle">Suma puntos con cada compra y canjéalos por cupones.</p>
        </div>
        <img src={mascotReading} alt="Mascota leyendo el menú" className="hero-mascot" />
      </div>

      {error && <div className="alert error">{error}</div>}
      {storeStatus && !storeStatus.open && (
        <div className="alert error store-closed">
          🔒 {storeStatus.message} Puedes ver el menú, pero por ahora no se pueden hacer pedidos.
        </div>
      )}
      {loading && <div className="page-loading">Cargando menú…</div>}

      {todayPromo && (
        <div className="promo-banner">
          <span className="promo-tag">🔥 Promo de hoy</span>
          {todayPromo.image_url ? (
            <img src={todayPromo.image_url} alt={todayPromo.title} />
          ) : (
            <div className="promo-banner-text">
              <h3>{todayPromo.title}</h3>
            </div>
          )}
          {todayPromo.description && <p className="promo-condition">{todayPromo.description}</p>}
        </div>
      )}

      <div className="category-tabs-row">
        <div className="category-tabs">
          {categories.map((c) => (
            <button key={c} className={c === category ? 'tab active' : 'tab'} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <DraggableSticker src={mascotSticker} />
      <DraggableLottie animationData={overwhelmedMindAnim} />

      <div className="product-grid">
        {visible.map((p) => (
          <div className={`product-card ${p.sold_out ? 'sold-out' : ''}`} key={p.id}>
            <div className="product-image">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} />
              ) : (
                <div className="product-image-placeholder">🍕</div>
              )}
              {p.sold_out ? (
                <span className="sold-out-badge">Agotado</span>
              ) : (
                <button
                  type="button"
                  className="add-fab"
                  aria-label={`Agregar ${p.name}`}
                  onClick={() => {
                    addItem(p);
                    setJustAdded(p.id);
                    setTimeout(() => setJustAdded(null), 900);
                  }}
                >
                  {justAdded === p.id ? '✓' : '+'}
                  {qtyInCart(p.id) > 0 && <span className="fab-badge">{qtyInCart(p.id)}</span>}
                </button>
              )}
            </div>
            <div className="product-info">
              <h3>{p.name}</h3>
              {p.description && (
                <>
                  <p
                    className={`product-desc ${expandedIds.has(p.id) ? 'expanded' : ''}`}
                    onClick={() => toggleDescription(p.id)}
                  >
                    {p.description}
                  </p>
                  {p.description.length > 55 && (
                    <button type="button" className="desc-toggle" onClick={() => toggleDescription(p.id)}>
                      {expandedIds.has(p.id) ? 'Ver menos' : 'Ver más'}
                    </button>
                  )}
                </>
              )}
              <span className="price">{formatMoney(p.price)}</span>
            </div>
          </div>
        ))}
        {!loading && visible.length === 0 && <p>No hay productos en esta categoría.</p>}
      </div>
    </div>
  );
}
