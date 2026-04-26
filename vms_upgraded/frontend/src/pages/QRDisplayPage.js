import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate }   from 'react-router-dom';
import { Toast }                      from '../components/Loader';
import useToast                       from '../hooks/useToast';

const purposeLabels = {
  meeting: 'Meeting', delivery: 'Delivery',
  interview: 'Interview', maintenance: 'Maintenance', other: 'Other',
};

const QRDisplayPage = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const visit        = location.state?.visit;
  const emailSent    = location.state?.email_sent;
  const emailAddress = location.state?.email_address || '';

  const [timeLeft, setTimeLeft] = useState('');
  const [pulse,    setPulse]    = useState(false);
  const { toast, show, hide }   = useToast();

  // Countdown timer + pulse
  useEffect(() => {
    if (!visit) { navigate('/register'); return; }

    const update = () => {
      const exp  = new Date(visit.qr_expires);
      const now  = new Date();
      const diff = Math.max(0, Math.floor((exp - now) / 1000));
      const h    = Math.floor(diff / 3600);
      const m    = Math.floor((diff % 3600) / 60);
      const s    = diff % 60;
      setTimeLeft(`${h}h ${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`);
    };
    update();
    const t = setInterval(update, 1000);
    const p = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 3000);
    return () => { clearInterval(t); clearInterval(p); };
  }, [visit, navigate]);

  // Email toast — sirf tab dikhao jab visitor ne email diya ho
  useEffect(() => {
    if (!emailAddress) return;
    const timer = setTimeout(() => {
      if (emailSent) {
        show(`✉ QR sent to ${emailAddress}`, 'success', 5000);
      } else {
        show(`Email not sent — show QR on screen`, 'error', 5000);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [emailAddress, emailSent]); // eslint-disable-line

  if (!visit) return null;

  return (
    <div className="page-bg">
      <div className="qr-page-container animate-fadeIn">

        {/* Success header */}
        <div className="success-header">
          <div className="success-icon animate-bounce">✓</div>
          <h1>Registration Successful!</h1>
          <p>Show this QR code at the security desk</p>
        </div>

        {/* QR Card */}
        <div className="qr-card">
          <div className={`qr-wrapper ${pulse ? 'pulse' : ''}`}>
            <img src={visit.qr_image} alt="Visitor QR Code" className="qr-image" />
            <div className="qr-scan-line" />
          </div>

          <div className="visitor-info-grid">
            <div className="info-row">
              <span className="info-icon">👤</span>
              <div>
                <div className="info-label">Visitor</div>
                <div className="info-value">{visit.visitor?.full_name}</div>
              </div>
            </div>
            {visit.host_name && (
              <div className="info-row">
                <span className="info-icon">🤝</span>
                <div>
                  <div className="info-label">Meeting with</div>
                  <div className="info-value">{visit.host_name}</div>
                </div>
              </div>
            )}
            <div className="info-row">
              <span className="info-icon">📋</span>
              <div>
                <div className="info-label">Purpose</div>
                <div className="info-value">{purposeLabels[visit.purpose] || visit.purpose}</div>
              </div>
            </div>
            <div className="info-row">
              <span className="info-icon">⏱</span>
              <div>
                <div className="info-label">QR Valid For</div>
                <div className="info-value countdown">{timeLeft}</div>
              </div>
            </div>
          </div>

          <div className="token-display">
            <span className="token-label">Token</span>
            <code className="token-code">{visit.qr_token}</code>
          </div>
        </div>

        {/* Instructions */}
        <div className="instructions-card">
          <h3>What to do next</h3>
          <div className="steps-list">
            <div className="step-item">
              <div className="step-num">1</div>
              <span>Go to the security desk at the entrance</span>
            </div>
            <div className="step-item">
              <div className="step-num">2</div>
              <span>Show this QR code to the security guard</span>
            </div>
            <div className="step-item">
              <div className="step-num">3</div>
              <span>Guard will scan and complete your check-in</span>
            </div>
            <div className="step-item">
              <div className="step-num">4</div>
              <span>Scan again when leaving to check out</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="qr-actions">
          <button className="btn-secondary" onClick={() => window.print()}>🖨 Print QR</button>
          <button className="btn-primary"   onClick={() => navigate('/register')}>+ Register Another</button>
        </div>

      </div>

      {/* Email toast — existing Toast component use kiya */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  );
};

export default QRDisplayPage;
