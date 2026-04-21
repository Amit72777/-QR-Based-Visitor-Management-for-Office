/**
 * ProfilePage — view and edit your own profile, change password.
 *
 * Accessible to all logged-in users via /profile.
 * Split into two cards: Profile Info and Change Password.
 */
import React, { useState, useEffect } from 'react';
import { authAPI }    from '../utils/api';
import { useAuth }    from '../context/AuthContext';
import { Spinner }    from '../components/Loader';
import useToast       from '../hooks/useToast';
import { Toast }      from '../components/Loader';

const roleColors = {
  guard:       '#f59e0b',
  admin:       '#6366f1',
  super_admin: '#10b981',
};

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { toast, show, hide } = useToast();

  // Profile form state — pre-filled from auth context
  const [profile, setProfile] = useState({
    full_name:  user?.user_name  || '',
    phone:      '',
    department: '',
  });

  // Password form state
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password:     '',
    confirm_password: '',
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading,      setPwLoading]      = useState(false);
  const [pwErrors,       setPwErrors]       = useState({});

  // Fetch fresh data from /auth/me on mount
  useEffect(() => {
    authAPI.me().then(res => {
      const u = res.data;
      setProfile({
        full_name:  u.full_name  || '',
        phone:      u.phone      || '',
        department: u.department || '',
      });
    }).catch(() => {});
  }, []);

  const setP  = (k, v) => setProfile(f => ({ ...f, [k]: v }));
  const setPw = (k, v) => { setPwForm(f => ({ ...f, [k]: v })); setPwErrors({}); };

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await authAPI.updateProfile({
        full_name:  profile.full_name.trim()  || undefined,
        phone:      profile.phone.trim()      || undefined,
        department: profile.department.trim() || undefined,
      });
      // Keep navbar name in sync
      updateUser({ user_name: res.data.full_name });
      show('Profile updated successfully!');
    } catch (err) {
      show(err.response?.data?.detail || 'Failed to update profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!pwForm.current_password)
      errors.current = 'Current password is required';
    if (!pwForm.new_password || pwForm.new_password.length < 8)
      errors.new = 'New password must be at least 8 characters';
    if (pwForm.new_password !== pwForm.confirm_password)
      errors.confirm = 'Passwords do not match';

    if (Object.keys(errors).length) { setPwErrors(errors); return; }

    setPwLoading(true);
    try {
      await authAPI.changePassword({
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      });
      show('Password changed successfully!');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      show(err.response?.data?.detail || 'Failed to change password', 'error');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="page-bg">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      <div className="page-container animate-fadeIn">

        {/* Header */}
        <div className="page-header">
          <div className="page-icon">👤</div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your account details</p>
        </div>

        {/* Role badge */}
        <div className="profile-role-banner" style={{ borderColor: roleColors[user?.user_role] }}>
          <span
            className="user-badge"
            style={{
              background: `${roleColors[user?.user_role]}20`,
              color:       roleColors[user?.user_role],
              fontSize:    14,
              padding:     '6px 16px',
            }}
          >
            {user?.user_role?.replace('_', ' ').toUpperCase()}
          </span>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            Account ID #{user?.user_id}
          </span>
        </div>

        {/* ── Profile info card ──────────────────────────────────── */}
        <div className="card">
          <h3 className="card-title">Personal Information</h3>
          <form onSubmit={handleProfileSave}>
            <div className="form-grid-2">

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={profile.full_name}
                  onChange={e => setP('full_name', e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-input"
                  value={user?.user_name || ''}
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                  title="Email cannot be changed"
                />
                <span className="hint-text">Email cannot be changed</span>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  value={profile.phone}
                  onChange={e => setP('phone', e.target.value)}
                  placeholder="9876543210"
                  type="tel"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  className="form-input"
                  value={profile.department}
                  onChange={e => setP('department', e.target.value)}
                  placeholder="e.g. Security, IT, HR"
                />
              </div>

            </div>

            <button
              type="submit"
              className="btn-primary btn-flex"
              disabled={profileLoading}
            >
              {profileLoading
                ? <><Spinner size={18} color="#fff" /> Saving...</>
                : '✓ Save Changes'
              }
            </button>
          </form>
        </div>

        {/* ── Change password card ───────────────────────────────── */}
        <div className="card">
          <h3 className="card-title">Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                className={`form-input ${pwErrors.current ? 'input-error' : ''}`}
                type="password"
                value={pwForm.current_password}
                onChange={e => setPw('current_password', e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              {pwErrors.current && <span className="error-text">{pwErrors.current}</span>}
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  className={`form-input ${pwErrors.new ? 'input-error' : ''}`}
                  type="password"
                  value={pwForm.new_password}
                  onChange={e => setPw('new_password', e.target.value)}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                />
                {pwErrors.new && <span className="error-text">{pwErrors.new}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  className={`form-input ${pwErrors.confirm ? 'input-error' : ''}`}
                  type="password"
                  value={pwForm.confirm_password}
                  onChange={e => setPw('confirm_password', e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
                {pwErrors.confirm && <span className="error-text">{pwErrors.confirm}</span>}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary btn-flex"
              disabled={pwLoading}
              style={{ background: 'var(--danger)' }}
            >
              {pwLoading
                ? <><Spinner size={18} color="#fff" /> Changing...</>
                : '🔒 Change Password'
              }
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
