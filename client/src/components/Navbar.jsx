import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import LottieIcon from './LottieIcon.jsx';
import starAnim from '../assets/lottie/star.json';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <div className="navbar-main">
        <Link to="/" className="brand">
          <span className="logo-word">Troit</span>
        </Link>
        <nav className="nav-links">
          <Link to="/">Menú</Link>
          <Link to="/coupons">Cupones</Link>
          {user && <Link to="/profile">Mi cuenta</Link>}
          {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
          <Link to="/checkout" className="cart-link">
            🛒 Carrito{count > 0 && <span className="badge">{count}</span>}
          </Link>
          {user ? (
            <>
              <span className="points-pill">
                <LottieIcon animationData={starAnim} size={20} />
                {user.points} pts
              </span>
              <button
                className="link-btn"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Salir
              </button>
            </>
          ) : (
            <Link to="/login">Ingresar</Link>
          )}
        </nav>
      </div>
      <div className="ticker">
        <div className="ticker-track">
          <span>GANA PUNTOS CON CADA COMPRA</span>
          <span>CANJÉALOS POR CUPONES</span>
          <span>PIDE Y CONFIRMA POR WHATSAPP</span>
          <span>GANA PUNTOS CON CADA COMPRA</span>
          <span>CANJÉALOS POR CUPONES</span>
          <span>PIDE Y CONFIRMA POR WHATSAPP</span>
        </div>
      </div>
    </header>
  );
}
