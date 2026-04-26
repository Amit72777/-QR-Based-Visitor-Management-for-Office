/**
 * ScannerPage — QR code scanner for guards.
 * v2.1 fix: visitor photo shown on scan result card.
 */
import React, { useState, useRef, useEffect } from 'react';
import { visitAPI } from '../utils/api';
import { Spinner }  from '../components/Loader';

let Html5QrcodeScanner = null;
try {
  ({ Html5QrcodeScanner } = require('html5-qrcode'));
} catch (_) {}

// ── Helper: extract photo src from scan result ────────────────────────────────
const getPhotoSrc = (result) => {
  if (!result) return null;
  // scan result may have visitor_photo_data or visitor_photo
  const raw = result.visitor_photo_data || result.visitor_photo || null;
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;
  return `data:image/jpeg;base64,${raw}`;
};

const ScannerPage = () => {
  const [tab,         setTab]         = useState('scan');
  const [scanning,    setScanning]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');
  const [manualToken, setManualToken] = useState('');
  const [imgError,    setImgError]    = useState(false);

  const scannerRef = useRef(null);
  const cooldown   = useRef(false);

  const startScanner = () => {
    if (!Html5QrcodeScanner) {
      setError('QR scanner library not installed. Use manual entry or run: npm install html5-qrcode');
      return;
    }
    stopScanner();
    const scanner = new Html5QrcodeScanner('qr-reader', { fps:10, qrbox:250, aspectRatio:1.0 }, false);
    scanner.render(
      (decodedText) => { if (!cooldown.current) handleScan(decodedText); },
      () => {}
    );
    scannerRef.current = scanner;
    setScanning(true);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => { return () => stopScanner(); }, []); // eslint-disable-line

  const handleScan = async (token) => {
    if (!token || cooldown.current) return;
    cooldown.current = true;
    setTimeout(() => { cooldown.current = false; }, 3000);
    stopScanner();
    setLoading(true);
    setError('');
    setResult(null);
    setImgError(false);
    try {
      const res = await visitAPI.scan(token.trim());
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Scan failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualToken.trim()) handleScan(manualToken.trim());
  };

  const reset = () => {
    setResult(null);
    setError('');
    setManualToken('');
    setImgError(false);
    cooldown.current = false;
  };

  const switchTab = (t) => { stopScanner(); reset(); setTab(t); };

  const isCheckIn  = result?.action === 'checked_in'  || result?.action === 'check_in';
  const isCheckOut = result?.action === 'checked_out' || result?.action === 'check_out';
  const photoSrc   = getPhotoSrc(result);

  return (
    <div className="page-bg">
      <div className="scanner-container animate-fadeIn">

        <div className="page-header">
          <div className="page-icon">📷</div>
          <h1 className="page-title">QR Scanner</h1>
          <p className="page-subtitle">Scan visitor QR code to check in or check out</p>
        </div>

        <div className="tab-switcher">
          <button className={`tab-btn ${tab==='scan'?'active':''}`} onClick={() => switchTab('scan')}>
            📷 Camera Scan
          </button>
          <button className={`tab-btn ${tab==='manual'?'active':''}`} onClick={() => switchTab('manual')}>
            ⌨ Manual Entry
          </button>
        </div>

        {/* Camera scan tab */}
        {tab==='scan' && !result && !loading && (
          <div className="scanner-card">
            <div id="qr-reader" style={{ width:'100%', display: scanning ? 'block' : 'none' }} />
            {!scanning && (
              <div className="scanner-idle">
                <div className="scanner-idle-icon animate-bounce">⬡</div>
                <h2>Ready to Scan</h2>
                <p>Tap the button below to activate the camera</p>
                <button className="btn-primary mt-20" onClick={startScanner}>Start Camera</button>
              </div>
            )}
            {scanning && (
              <button className="btn-secondary mt-20" onClick={stopScanner}>Stop Camera</button>
            )}
            {error && (
              <div className="alert alert-error mt-20 animate-shake">
                <span>⚠</span> {error}
                <button className="alert-close" onClick={() => setError('')}>×</button>
              </div>
            )}
          </div>
        )}

        {/* Manual entry tab */}
        {tab==='manual' && !result && !loading && (
          <div className="card animate-slideIn">
            <form onSubmit={handleManualSubmit}>
              <div className="form-group">
                <label className="form-label">Enter QR Token</label>
                <input
                  className="form-input font-mono"
                  value={manualToken}
                  onChange={e => setManualToken(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  autoFocus
                />
                <p className="hint-text">Paste the token shown under the visitor's QR code</p>
              </div>
              {error && (
                <div className="alert alert-error animate-shake"><span>⚠</span> {error}</div>
              )}
              <button type="submit" className="btn-primary btn-full" disabled={!manualToken.trim()}>
                Process Token
              </button>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card scan-loading animate-fadeIn">
            <Spinner size={52} color="#6366f1" />
            <p>Processing QR code...</p>
          </div>
        )}

        {/* Result card */}
        {result && (
          <div className={`result-card ${isCheckIn ? 'result-checkin' : 'result-checkout'} animate-bounceIn`}>

            {/* ── Visitor Photo ── */}
            {photoSrc && !imgError ? (
              <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                <img
                  src={photoSrc}
                  alt="Visitor"
                  onError={() => setImgError(true)}
                  style={{
                    width:        88,
                    height:       88,
                    borderRadius: '50%',
                    objectFit:    'cover',
                    border:       `4px solid ${isCheckIn ? '#22c55e' : '#f59e0b'}`,
                    boxShadow:    '0 2px 14px rgba(0,0,0,0.18)',
                  }}
                />
              </div>
            ) : (
              <div className="result-icon-wrap">
                <div className={`result-big-icon ${isCheckIn ? 'icon-in' : 'icon-out'}`}>
                  {isCheckIn ? '✓' : '⬆'}
                </div>
              </div>
            )}

            <div className={`result-badge ${isCheckIn ? 'badge-in' : 'badge-out'}`}>
              {isCheckIn ? 'CHECKED IN' : 'CHECKED OUT'}
            </div>

            <h2 className="result-name">{result.visitor_name}</h2>
            <p className="result-phone">{result.visitor_phone}</p>

            <div className="result-grid">
              {result.host_name && (
                <div className="result-item">
                  <span className="result-item-label">Meeting</span>
                  <span className="result-item-value">{result.host_name}</span>
                </div>
              )}
              <div className="result-item">
                <span className="result-item-label">Purpose</span>
                <span className="result-item-value" style={{ textTransform:'capitalize' }}>
                  {result.purpose}
                </span>
              </div>
              <div className="result-item">
                <span className="result-item-label">Time</span>
                <span className="result-item-value">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {result.duration_mins && (
                <div className="result-item">
                  <span className="result-item-label">Visit Duration</span>
                  <span className="result-item-value">{result.duration_mins} min</span>
                </div>
              )}
            </div>

            <button className="btn-primary btn-full mt-20" onClick={reset}>
              Scan Next Visitor
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ScannerPage;