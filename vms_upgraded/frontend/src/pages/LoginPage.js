import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Loader';

const LoginPage = () => {
  const [email, setEmail]       = useState('admin@company.com');
  const [password, setPassword] = useState('Admin@1234');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPass, setShowPass] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      // Redirect based on role
      if (data.user_role === 'guard') navigate('/scan', { replace: true });
      else navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      {/* Animated background blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="auth-card animate-fadeIn">
        <div className="auth-logo">
          <div className="logo-icon">⬡</div>
          <h1 className="auth-title">VisitorQR</h1>
          <p className="auth-subtitle">Visitor Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@company.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16,
                }}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

<div style={{ textAlign: 'right', marginTop: -8, marginBottom: 8 }}>
  <a href="/forgot-password" style={{ color: '#6366f1', fontSize: 13 }}>
    Forgot Password?
  </a>
</div>
          {error && (
            <div className="alert alert-error animate-shake">
              <span>⚠</span> {error}
            </div>
          )}

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? <Spinner size={20} color="#fff" /> : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <a href="/register-visitor" style={{ color: '#6366f1' }}>Register as Visitor</a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
