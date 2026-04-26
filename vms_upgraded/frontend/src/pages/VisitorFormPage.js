/**
 * VisitorFormPage — 2-step visitor registration.
 * v2.2: Admin/SuperAdmin ke liye QR validity option add kiya.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate }          from 'react-router-dom';
import { visitorAPI, adminAPI } from '../utils/api';
import { Spinner }              from '../components/Loader';
import CameraCapture            from '../components/CameraCapture';
import { useAuth }              from '../context/AuthContext';

const purposes = [
  { value: 'meeting',     label: 'Meeting',     icon: '🤝' },
  { value: 'delivery',    label: 'Delivery',    icon: '📦' },
  { value: 'interview',   label: 'Interview',   icon: '💼' },
  { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { value: 'other',       label: 'Other',       icon: '📋' },
];

// QR validity options — only shown to admin/super_admin
const QR_VALIDITY_OPTIONS = [
  { value: '',         label: 'Default (from settings)',  icon: '⚙️' },
  { value: 'one_time', label: 'One Time Use Only',        icon: '1️⃣' },
  { value: 'hourly',   label: 'Custom Hours',             icon: '⏱' },
  { value: 'daily',    label: 'Daily (24 hours)',         icon: '📅' },
  { value: 'weekly',   label: 'Weekly (7 days)',          icon: '📆' },
  { value: 'monthly',  label: 'Monthly (30 days)',        icon: '🗓' },
];

const VisitorFormPage = () => {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const isAdmin    = user?.role === 'admin' || user?.role === 'super_admin';

  const [loading,        setLoading]        = useState(false);
  const [branches,       setBranches]       = useState([]);
  const [errors,         setErrors]         = useState({});
  const [step,           setStep]           = useState(1);
  const [photoData,      setPhotoData]      = useState(null);
  const [qrValidityType, setQrValidityType] = useState('');
  const [qrHours,        setQrHours]        = useState('');

  const [form, setForm] = useState({
    full_name: '', phone: '', email: '',
    company_name: '', host_name: '', purpose: 'meeting',
    branch_id: '', notes: '',
  });

  useEffect(() => {
    adminAPI.branches()
      .then(r => setBranches(r.data))
      .catch(() => {});
  }, []);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Name is required';
    if (!form.phone.trim())     e.phone     = 'Phone is required';
    if (form.phone && !/^\+?[\d\s\-()\\.]{8,15}$/.test(form.phone))
      e.phone = 'Enter a valid phone number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.branch_id) e.branch_id = 'Please select a branch';
    if (qrValidityType === 'hourly') {
      const h = parseInt(qrHours, 10);
      if (!qrHours || isNaN(h) || h < 1 || h > 8760)
        e.qrHours = 'Enter hours between 1 and 8760';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validateStep1()) setStep(2); };
  const handleBack = () => setStep(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone:     form.phone.trim(),
        purpose:   form.purpose,
        branch_id: parseInt(form.branch_id, 10),
      };

      if (form.email.trim())        payload.email        = form.email.trim();
      if (form.company_name.trim()) payload.company_name = form.company_name.trim();
      if (form.host_name.trim())    payload.host_name    = form.host_name.trim();
      if (form.notes.trim())        payload.notes        = form.notes.trim();
      if (photoData)                payload.photo_data   = photoData;

      // QR validity — only admin sends these
      if (isAdmin && qrValidityType) {
        payload.qr_validity_type = qrValidityType;
        if (qrValidityType === 'hourly' && qrHours)
          payload.qr_hours = parseInt(qrHours, 10);
      }

      const res = await visitorAPI.register(payload);

      navigate('/qr-display', {
        state: {
          visit:         res.data,
          email_sent:    res.data.email_sent,
          email_address: res.data.email_address,
        },
      });

    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d.msg).join(', ')
          : 'Registration failed. Please try again.';
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  // QR validity badge shown on step 2 for admin
  const validityLabel = QR_VALIDITY_OPTIONS.find(o => o.value === qrValidityType)?.label || 'Default';

  return (
    <div className="page-bg">
      <div className="page-container animate-fadeIn">

        <div className="page-header">
          <div className="page-icon">🏢</div>
          <h1 className="page-title">Visitor Registration</h1>
          <p className="page-subtitle">Fill in your details to get a QR entry pass</p>
        </div>

        {/* Step indicator */}
        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
            {step > 1 ? '✓' : '1'}
          </div>
          <div className={`step-line ${step > 1 ? 'done' : ''}`} />
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className="step-labels">
            <span className={step === 1 ? 'active-label' : ''}>Personal Info</span>
            <span className={step === 2 ? 'active-label' : ''}>Visit Details</span>
          </div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>

            {/* ── Step 1 — Personal Info ── */}
            {step === 1 && (
              <div className="animate-slideIn">
                <div className="form-group">
                  <label className="form-label">
                    Visitor Photo <span className="optional">(optional)</span>
                  </label>
                  <CameraCapture
                    onCapture={(dataUrl) => setPhotoData(dataUrl)}
                    onClear={()          => setPhotoData(null)}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Full Name <span className="required">*</span></label>
                    <input
                      className={`form-input ${errors.full_name ? 'input-error' : ''}`}
                      value={form.full_name}
                      onChange={e => set('full_name', e.target.value)}
                      placeholder="Ramesh Kumar"
                      autoFocus
                    />
                    {errors.full_name && <span className="error-text">{errors.full_name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number <span className="required">*</span></label>
                    <input
                      className={`form-input ${errors.phone ? 'input-error' : ''}`}
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      placeholder="9876543210"
                      type="tel"
                    />
                    {errors.phone && <span className="error-text">{errors.phone}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Email Address
                      <span className="optional"> (optional — QR will be emailed)</span>
                    </label>
                    <input
                      className={`form-input ${errors.email ? 'input-error' : ''}`}
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      placeholder="you@example.com"
                      type="email"
                    />
                    {errors.email && <span className="error-text">{errors.email}</span>}
                    {form.email && !errors.email && (
                      <span className="hint-text">✉ QR code will be sent to this email</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Company / Organization <span className="optional">(optional)</span>
                    </label>
                    <input
                      className="form-input"
                      value={form.company_name}
                      onChange={e => set('company_name', e.target.value)}
                      placeholder="ABC Corp"
                    />
                  </div>
                </div>

                <button type="button" className="btn-primary btn-full mt-20" onClick={handleNext}>
                  Continue →
                </button>
              </div>
            )}

            {/* ── Step 2 — Visit Details ── */}
            {step === 2 && (
              <div className="animate-slideIn">

                {/* Purpose */}
                <div className="form-group">
                  <label className="form-label">Purpose of Visit</label>
                  <div className="purpose-grid">
                    {purposes.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        className={`purpose-card ${form.purpose === p.value ? 'selected' : ''}`}
                        onClick={() => set('purpose', p.value)}
                      >
                        <span className="purpose-icon">{p.icon}</span>
                        <span className="purpose-label">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      Office Branch <span className="required">*</span>
                    </label>
                    <select
                      className={`form-input ${errors.branch_id ? 'input-error' : ''}`}
                      value={form.branch_id}
                      onChange={e => set('branch_id', e.target.value)}
                    >
                      <option value="">Select branch...</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name}{b.city ? ` — ${b.city}` : ''}
                        </option>
                      ))}
                    </select>
                    {errors.branch_id && <span className="error-text">{errors.branch_id}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Host / Person to Meet <span className="optional">(optional)</span>
                    </label>
                    <input
                      className="form-input"
                      value={form.host_name}
                      onChange={e => set('host_name', e.target.value)}
                      placeholder="Priya Sharma"
                    />
                  </div>
                </div>

                {/* ── QR Validity — ADMIN ONLY ─────────────────────────────── */}
                {isAdmin && (
                  <div className="form-group" style={{
                    background: 'linear-gradient(135deg, #f0f4ff, #e8f0fe)',
                    border: '1.5px solid #c7d2fe',
                    borderRadius: 10,
                    padding: '16px 18px',
                    marginBottom: 16,
                  }}>
                    <label className="form-label" style={{ color: '#4338ca', marginBottom: 10 }}>
                      🔐 QR Code Validity <span style={{ fontSize: 11, fontWeight: 400, color: '#6366f1' }}>(Admin Only)</span>
                    </label>

                    {/* Option pills */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      {QR_VALIDITY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setQrValidityType(opt.value); setQrHours(''); }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 20,
                            border: qrValidityType === opt.value
                              ? '2px solid #4f46e5'
                              : '1.5px solid #c7d2fe',
                            background: qrValidityType === opt.value ? '#4f46e5' : '#fff',
                            color: qrValidityType === opt.value ? '#fff' : '#4338ca',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all .15s',
                          }}
                        >
                          {opt.icon} {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom hours input — only for hourly */}
                    {qrValidityType === 'hourly' && (
                      <div style={{ marginTop: 8 }}>
                        <label className="form-label">Number of Hours</label>
                        <input
                          className={`form-input ${errors.qrHours ? 'input-error' : ''}`}
                          type="number"
                          min="1"
                          max="8760"
                          value={qrHours}
                          onChange={e => { setQrHours(e.target.value); setErrors(err => ({...err, qrHours: ''})); }}
                          placeholder="e.g. 48 (2 days)"
                          style={{ maxWidth: 220 }}
                        />
                        {errors.qrHours && <span className="error-text">{errors.qrHours}</span>}
                      </div>
                    )}

                    {/* Info badge */}
                    <div style={{ marginTop: 10, fontSize: 12, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>ℹ️</span>
                      {qrValidityType === ''        && 'Uses QR_EXPIRY_HOURS from .env settings'}
                      {qrValidityType === 'one_time' && 'QR becomes invalid after first check-out'}
                      {qrValidityType === 'hourly'   && `QR valid for ${qrHours || '?'} hour(s) from registration`}
                      {qrValidityType === 'daily'    && 'QR valid for 24 hours from registration'}
                      {qrValidityType === 'weekly'   && 'QR valid for 7 days from registration'}
                      {qrValidityType === 'monthly'  && 'QR valid for 30 days from registration'}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">
                    Additional Notes <span className="optional">(optional)</span>
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    placeholder="Any additional information..."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {errors.submit && (
                  <div className="alert alert-error">
                    <span>⚠</span> {errors.submit}
                  </div>
                )}

                <div className="btn-row">
                  <button type="button" className="btn-secondary" onClick={handleBack}>
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="btn-primary btn-flex"
                    disabled={loading}
                  >
                    {loading
                      ? <><Spinner size={18} color="#fff" /> Generating QR...</>
                      : '✦ Get QR Pass'
                    }
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
};

export default VisitorFormPage;