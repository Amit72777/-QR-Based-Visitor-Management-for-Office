/**
 * Navbar — top navigation bar.
 *
 * v2 additions:
 *   - Dark / Light mode toggle button (moon / sun icon)
 *   - Profile link for all logged-in users
 *   - Shows branch name for guards (so they know which desk they're on)
 */
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { user, logout, isRole } = useAuth();
  const { isDark, toggleTheme }  = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  const close    = ()     => setMenuOpen(false);

  // Each role sees only what they need
  const links = [
    { to: '/register',  label: '+ Register',  show: true },
    { to: '/scan',      label: '📷 Scan QR',   show: isRole('guard', 'admin', 'super_admin') },
    { to: '/dashboard', label: '📊 Dashboard', show: isRole('admin', 'super_admin') },
    { to: '/users',     label: '👥 Users',     show: isRole('super_admin') },
    { to: '/branches',  label: '🏢 Branches',  show: isRole('super_admin') },
    { to: '/visitors-list', label: '👤 Visitors', show: isRole('super_admin') },
    { to: '/audit',        label: '📋 Audit',     show: isRole('super_admin') },
  ].filter(l => l.show);

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="nav-brand">
        <span className="brand-icon">⬡</span>
        <span className="brand-text">VisitorQR</span>
      </div>

      {/* Links — hidden on mobile until hamburger is clicked */}
      <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
        {links.map(l => (
          <Link
            key={l.to}
            to={l.to}
            className={`nav-link ${isActive(l.to) ? 'active' : ''}`}
            onClick={close}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Right side — theme toggle + user info */}
      <div className="nav-user">
        {/* Dark / Light mode toggle */}
        <button
          className="btn-icon theme-toggle"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        <span className="user-badge">{user.user_role}</span>

        {/* Clicking the name goes to the profile page */}
        <Link to="/profile" className="user-name nav-profile-link" onClick={close}>
          {user.user_name}
        </Link>

        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Mobile hamburger */}
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Toggle menu"
      >
        {menuOpen ? '✕' : '☰'}
      </button>
    </nav>
  );
};

export default Navbar;