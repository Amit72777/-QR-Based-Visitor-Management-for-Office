import React from 'react';

export const Spinner = ({ size = 32, color = '#6366f1' }) => (
  <div
    style={{
      width: size, height: size,
      border: `3px solid rgba(255,255,255,0.1)`,
      borderTop: `3px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      display: 'inline-block',
    }}
  />
);

export const PageLoader = () => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', gap: 16,
  }}>
    <Spinner size={48} />
    <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading...</p>
  </div>
);

export const Toast = ({ message, type = 'success', onClose }) => {
  const colors = {
    success: { bg: '#052e16', border: '#16a34a', text: '#4ade80' },
    error:   { bg: '#2d0a0a', border: '#dc2626', text: '#f87171' },
    info:    { bg: '#0c1a2e', border: '#3b82f6', text: '#60a5fa' },
  };
  const c = colors[type] || colors.info;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 12, padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'slideUp 0.3s ease',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      maxWidth: 360,
    }}>
      <span style={{ fontSize: 20 }}>
        {type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}
      </span>
      <span style={{ color: c.text, fontSize: 14, flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: '#64748b',
                 cursor: 'pointer', fontSize: 18, padding: 0 }}
      >×</button>
    </div>
  );
};
