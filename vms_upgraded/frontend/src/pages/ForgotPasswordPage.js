import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { Spinner } from '../components/Loader';

const ForgotPasswordPage = () => {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(email);
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="auth-card animate-fadeIn">
        <div className="auth-logo">
          <div className="logo-icon">⬡</div>
          <h1 className="auth-title">VisitorQR</h1>
          <p className="auth-subtitle">Reset Your Password</p>
        </div>

        {message ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div className="alert" style={{
              background: '#dcfce7', border: '1px solid #86efac',
              color: '#166534', borderRadius: 8, padding: '12px 16px', marginBottom: 20
            }}>
              ✅ {message}
            </div>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              Check your email inbox. The link expires in 30 minutes.
            </p>
            <Link to="/login" style={{ color: '#6366f1', fontWeight: 600 }}>
              ← Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <p style={{ color: '#64748b', marginBottom: 20, fontSize: 14 }}>
              Enter your registered email address and we'll send you a password reset link.
            </p>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="alert alert-error animate-shake">
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" className="btn-primary btn-full" disabled={loading}>
              {loading ? <Spinner size={20} color="#fff" /> : 'Send Reset Link'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login" style={{ color: '#6366f1' }}>← Back to Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;