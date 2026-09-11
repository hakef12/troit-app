import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/', { replace: true });
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
        await loginWithGoogle(credential);
        navigate('/', { replace: true });
      } catch (err) {
        setError(err.message);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loginWithGoogle]
  );

  return (
    <div className="page narrow">
      <h1>Crear cuenta</h1>
      <form className="card form" onSubmit={handleSubmit}>
        {error && <div className="alert error">{error}</div>}
        <label>
          Nombre completo
          <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
        </label>
        <label>
          Email
          <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
        </label>
        <label>
          Contraseña
          <input type="password" required minLength={6} value={form.password} onChange={(e) => update('password', e.target.value)} />
        </label>
        <label>
          Teléfono
          <input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Opcional" />
        </label>
        <label>
          Dirección
          <input value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Opcional, se puede completar al pedir" />
        </label>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Creando cuenta…' : 'Registrarme'}
        </button>
        <GoogleSignInButton onCredential={handleGoogleCredential} />
      </form>
      <p className="muted">
        ¿Ya tienes cuenta? <Link to="/login">Ingresa aquí</Link>
      </p>
    </div>
  );
}
