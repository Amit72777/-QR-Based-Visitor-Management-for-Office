import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { Spinner } from '../components/Loader';

const ResetPasswordPage = () => {
  const [searchParams]          = useSearchParams();
  const token                   = searchParams.get('token');
  const navigate                = useNavigate();

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]               = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState(false);

  if (!token) {
    return (
      <div className="auth-bg">
        <div className="auth-card animate-fadeIn" style={{ textAlign: 'center' }}>
          <div className="logo-icon">⬡</div>
          <h2 style={{ color: '#dc2626', marginTop: 12 }}>Invalid Link</h2>
          <p style={{ color: '#64748b' }}>
            This reset link is invalid or missing a token.
          </p>
          <Link to="/forgot-password" className="btn-primary"
            style={{ display: 'inline-block', marginTop: 16 }}>
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({ token, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. The link may have expired.');
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
          <p className="auth-subtitle">Set New Password</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div className="alert" style={{
              background: '#dcfce7', border: '1px solid #86efac',
              color: '#166534', borderRadius: 8, padding: '12px 16px', marginBottom: 20
            }}>
              ✅ Password reset successfully!
            </div>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              Redirecting to login page in 3 seconds...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16,
                  }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="alert alert-error animate-shake">
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" className="btn-primary btn-full" disabled={loading}>
              {loading ? <Spinner size={20} color="#fff" /> : 'Reset Password'}
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

export default ResetPasswordPage;