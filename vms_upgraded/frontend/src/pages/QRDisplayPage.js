import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const purposeLabels = {
  meeting: 'Meeting', delivery: 'Delivery',
  interview: 'Interview', maintenance: 'Maintenance', other: 'Other',
};

const QRDisplayPage = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const visit     = location.state?.visit;

  const [timeLeft, setTimeLeft] = useState('');
  const [pulse,    setPulse]    = useState(false);

  useEffect(() => {
    if (!visit) { navigate('/register'); return; }

    // Countdown timer
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

    // Pulse animation every 3 seconds
    const p = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 3000);

    return () => { clearInterval(t); clearInterval(p); };
  }, [visit, navigate]);

  if (!visit) return null;

  const handlePrint = () => window.print();
  const handleRegisterAnother = () => navigate('/register');

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
            <img
              src={visit.qr_image}
              alt="Visitor QR Code"
              className="qr-image"
            />
            <div className="qr-scan-line" />
          </div>

          {/* Visitor details */}
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

          {/* Token */}
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
          <button className="btn-secondary" onClick={handlePrint}>🖨 Print QR</button>
          <button className="btn-primary" onClick={handleRegisterAnother}>+ Register Another</button>
        </div>
      </div>
    </div>
  );
};

export default QRDisplayPage;
