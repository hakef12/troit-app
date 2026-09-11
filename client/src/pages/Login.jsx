import { useCallback, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LottieIcon from '../components/LottieIcon.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import computerAnim from '../assets/lottie/computer.json';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function goAfterLogin(user) {
    const redirectTo = location.state?.from || (user.role === 'admin' ? '/admin' : '/');
    navigate(redirectTo, { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      goAfterLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleCredential = useCallback(
    async (credential) => {
      setError('');
      try {
        const user = await loginWithGoogle(credential);
        goAfterLogin(user);
      } catch (err) {
        setError(err.message);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loginWithGoogle]
  );

  return (
    <div className="page narrow">
      <h1>Ingresar</h1>
      <form className="card form" onSubmit={handleSubmit}>
        {error && <div className="alert error">{error}</div>}
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Contraseña
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
        <GoogleSignInButton onCredential={handleGoogleCredential} />
      </form>
      <p className="muted">
        ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
      </p>
      <p className="muted small">Admin de prueba: admin@restaurante.com / admin123</p>
      <div className="device-note">
        <LottieIcon animationData={computerAnim} size={40} />
        <span className="muted small">Funciona en tu celular, tablet o computadora — sin instalar nada.</span>
      </div>
    </div>
  );
}
