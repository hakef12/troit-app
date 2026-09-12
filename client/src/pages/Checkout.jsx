import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api, reverseGeocode } from '../api.js';
import mascot from '../assets/mascot.svg';
import peaceHands from '../assets/mascot-peace-hands.png';
import AddressMap from '../components/AddressMap.jsx';
import { haversineKm, getDeliveryFee } from '../deliveryPricing.js';
import { computePromoDiscount } from '../promoRules.js';
import LottieIcon from '../components/LottieIcon.jsx';
import confettiAnim from '../assets/lottie/confetti.json';
import successCheckAnim from '../assets/lottie/success-check.json';
import fiatAnim from '../assets/lottie/fiat.json';
import walletAnim from '../assets/lottie/wallet.json';
import foodDeliveryAnim from '../assets/lottie/food-delivery.json';

const FALLBACK_CENTER = { lat: -34.6037, lng: -58.3816 };

function formatMoney(n) {
  return `$${Number(n).toFixed(2)}`;
}

export default function Checkout() {
  const { items, setQty, removeItem, total, clear } = useCart();
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const [deliveryType, setDeliveryType] = useState('delivery');
  const [address, setAddress] = useState(user?.address || '');
  const [coords, setCoords] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [redemptions, setRedemptions] = useState([]);
  const [selectedRedemption, setSelectedRedemption] = useState('');
  const [promos, setPromos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (user) {
      api.myRedemptions().then((data) => setRedemptions(data.redemptions.filter((r) => !r.used)));
      setAddress(user.address || '');
    }
  }, [user]);

  useEffect(() => {
    api.getPromos().then((data) => setPromos(data.promos)).catch(() => {});
  }, []);

  const todayPromo = useMemo(() => promos.find((p) => p.day_of_week === new Date().getDay()), [promos]);
  const promoDiscountPreview = useMemo(() => computePromoDiscount(todayPromo, items), [todayPromo, items]);
  const afterPromoPreview = Math.max(0, total - promoDiscountPreview);

  useEffect(() => {
    api
      .getStoreInfo()
      .then((data) => {
        setStoreInfo(data);
        setCoords((prev) => prev || { lat: data.lat, lng: data.lng });
      })
      .catch(() => setCoords((prev) => prev || FALLBACK_CENTER));
  }, []);

  const chosenRedemption = redemptions.find((r) => String(r.id) === String(selectedRedemption));
  const discountPreview = chosenRedemption
    ? chosenRedemption.discount_type === 'percentage'
      ? Math.round(afterPromoPreview * chosenRedemption.discount_value) / 100
      : Math.min(chosenRedemption.discount_value, afterPromoPreview)
    : 0;

  const deliveryKmPreview = useMemo(() => {
    if (deliveryType !== 'delivery' || !coords || !storeInfo) return null;
    return haversineKm(storeInfo.lat, storeInfo.lng, coords.lat, coords.lng);
  }, [deliveryType, coords, storeInfo]);
  const deliveryFeePreview = deliveryKmPreview != null ? getDeliveryFee(deliveryKmPreview) : 0;

  async function handlePickLocation(lat, lng) {
    setCoords({ lat, lng });
    const name = await reverseGeocode(lat, lng);
    if (name) setAddress(name);
  }

  async function handleConfirm() {
    setError('');
    if (deliveryType === 'delivery' && !address.trim()) {
      setError('Ingresa una dirección de entrega o selecciona una en el mapa');
      return;
    }
    if (items.length === 0) {
      setError('Tu carrito está vacío');
      return;
    }
    setLoading(true);
    try {
      const data = await api.createOrder({
        items: items.map((it) => ({ product_id: it.id, qty: it.qty })),
        address: deliveryType === 'delivery' ? address.trim() : undefined,
        delivery_type: deliveryType,
        lat: deliveryType === 'delivery' ? coords?.lat : undefined,
        lng: deliveryType === 'delivery' ? coords?.lng : undefined,
        payment_method: paymentMethod,
        redemption_id: selectedRedemption || undefined,
      });
      setResult(data);
      clear();
      await refresh();
      window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="page narrow">
        <h1>Carrito</h1>
        <p>
          Inicia sesión para completar tu pedido. <Link to="/login" state={{ from: '/checkout' }}>Ingresar</Link>
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="page narrow">
        <h1>¡Pedido enviado! 🎉</h1>
        <div className="confirm-visual">
          <LottieIcon animationData={confettiAnim} loop={false} size="100%" className="confetti-burst" />
          <img src={peaceHands} alt="¡Pedido confirmado!" className="confirm-mascot" />
          <LottieIcon animationData={successCheckAnim} loop={false} size={44} className="confirm-check" />
        </div>
        <div className="card">
          <p>
            Tu pedido <strong>#{result.order.id}</strong> fue registrado. Se abrió WhatsApp con el detalle para que lo confirmes
            enviando el mensaje.
          </p>
          {result.order.promo_discount > 0 && (
            <p>
              Promo del día aplicada ({result.order.promo_title}): <strong>−{formatMoney(result.order.promo_discount)}</strong>
            </p>
          )}
          {result.order.delivery_fee > 0 && (
            <p>
              Costo de envío
              {result.order.delivery_km != null ? ` (${result.order.delivery_km.toFixed(1)} km)` : ''}:{' '}
              <strong>{formatMoney(result.order.delivery_fee)}</strong>
            </p>
          )}
          <p>
            Total pagado: <strong>{formatMoney(result.order.total)}</strong>
          </p>
          <p>
            Ganaste <strong>{result.order.points_earned} puntos</strong>. Ahora tienes <strong>{result.points} puntos</strong>.
          </p>
          <a className="btn" href={result.whatsappUrl} target="_blank" rel="noopener noreferrer">
            Abrir WhatsApp de nuevo
          </a>
          <button className="btn secondary" onClick={() => navigate('/')}>
            Volver al menú
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page narrow">
      <h1>Tu pedido</h1>
      {error && <div className="alert error">{error}</div>}

      {items.length === 0 ? (
        <div className="empty-state">
          <img src={mascot} alt="Mascota de la pizzería" className="empty-mascot" />
          <p>
            Tu carrito está vacío. <Link to="/">Ir al menú</Link>
          </p>
        </div>
      ) : (
        <div className="card">
          {items.map((it) => (
            <div className="cart-row" key={it.id}>
              <span className="cart-name">{it.name}</span>
              <div className="qty-control">
                <button onClick={() => setQty(it.id, it.qty - 1)}>−</button>
                <span>{it.qty}</span>
                <button onClick={() => setQty(it.id, it.qty + 1)}>+</button>
              </div>
              <span className="cart-price">{formatMoney(it.price * it.qty)}</span>
              <button className="link-btn danger" onClick={() => removeItem(it.id)}>
                ✕
              </button>
            </div>
          ))}
          <div className="cart-total-row">
            <span>Subtotal</span>
            <strong>{formatMoney(total)}</strong>
          </div>
          {promoDiscountPreview > 0 && (
            <div className="cart-total-row discount">
              <span>Promo del día ({todayPromo.title})</span>
              <strong>−{formatMoney(promoDiscountPreview)}</strong>
            </div>
          )}
          {chosenRedemption && (
            <div className="cart-total-row discount">
              <span>Descuento ({chosenRedemption.title})</span>
              <strong>−{formatMoney(discountPreview)}</strong>
            </div>
          )}
          {deliveryType === 'delivery' && deliveryFeePreview > 0 && (
            <div className="cart-total-row">
              <span>Envío{deliveryKmPreview != null ? ` (${deliveryKmPreview.toFixed(1)} km)` : ''}</span>
              <strong>{formatMoney(deliveryFeePreview)}</strong>
            </div>
          )}
          <div className="cart-total-row final">
            <span>Total</span>
            <strong>
              {formatMoney(
                afterPromoPreview - discountPreview + (deliveryType === 'delivery' ? deliveryFeePreview : 0)
              )}
            </strong>
          </div>
        </div>
      )}

      <div className="card form">
        <label>Cómo lo quieres recibir</label>
        <div className="delivery-tabs">
          <button
            type="button"
            className={deliveryType === 'delivery' ? 'tab active' : 'tab'}
            onClick={() => setDeliveryType('delivery')}
          >
            <LottieIcon animationData={foodDeliveryAnim} size={26} /> A domicilio
          </button>
          <button
            type="button"
            className={deliveryType === 'pickup' ? 'tab active' : 'tab'}
            onClick={() => setDeliveryType('pickup')}
          >
            🏪 Retiro en el local
          </button>
        </div>

        {deliveryType === 'delivery' ? (
          <>
            <label>
              Dirección de entrega
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, número, referencia" />
            </label>
            <p className="muted small">Toca el mapa, arrastra el marcador o usa tu ubicación para fijar el punto exacto.</p>
            {coords && (
              <AddressMap lat={coords.lat} lng={coords.lng} onPick={handlePickLocation} interactive showLocateButton />
            )}
          </>
        ) : (
          <>
            <div className="pickup-info">
              <strong>{storeInfo?.name || 'Local'}</strong>
              <p className="muted small">{storeInfo?.address}</p>
            </div>
            {storeInfo && (
              <AddressMap lat={storeInfo.lat} lng={storeInfo.lng} interactive={false} showDirectionsLink />
            )}
          </>
        )}

        <label>Método de pago</label>
        <div className="radio-group">
          <label className="radio-option">
            <input type="radio" name="payment" checked={paymentMethod === 'efectivo'} onChange={() => setPaymentMethod('efectivo')} />
            <LottieIcon animationData={fiatAnim} size={28} />
            Efectivo
          </label>
          <label className="radio-option">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'transferencia'}
              onChange={() => setPaymentMethod('transferencia')}
            />
            <LottieIcon animationData={walletAnim} size={28} />
            Transferencia
          </label>
        </div>

        {redemptions.length > 0 && (
          <label>
            Usar un cupón canjeado (opcional)
            <select value={selectedRedemption} onChange={(e) => setSelectedRedemption(e.target.value)}>
              <option value="">Sin cupón</option>
              {redemptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
        )}

        <button className="btn" onClick={handleConfirm} disabled={loading || items.length === 0}>
          {loading ? 'Enviando…' : 'Confirmar pedido y enviar por WhatsApp'}
        </button>
      </div>
    </div>
  );
}
