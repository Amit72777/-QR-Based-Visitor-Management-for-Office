/**
 * CameraCapture — lets the user take a photo or upload one from their device.
 *
 * Props:
 *   onCapture(dataUrl) — called with a base64 data URI when image is ready
 *   onClear()          — called when the user removes the image
 */
import React, { useRef, useState, useCallback } from 'react';

const CameraCapture = ({ onCapture, onClear }) => {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);   // keep the stream so we can stop it
  const fileInputRef = useRef(null);

  const [mode,     setMode]     = useState('idle');   // idle | camera | preview
  const [preview,  setPreview]  = useState(null);     // data URI shown to user
  const [camError, setCamError] = useState('');

  // ── Start camera ─────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode('camera');
    } catch (err) {
      setCamError('Camera access denied. Please allow camera access or upload a photo instead.');
    }
  };

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ── Capture frame from video ──────────────────────────────────────────────
  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    canvas.width  = video.videoWidth  || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    setPreview(dataUrl);
    setMode('preview');
    onCapture(dataUrl);
  };

  // ── Handle file upload ────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only accept images
    if (!file.type.startsWith('image/')) {
      setCamError('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setPreview(dataUrl);
      setMode('preview');
      onCapture(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // ── Clear / retake ────────────────────────────────────────────────────────
  const clearPhoto = () => {
    stopCamera();
    setPreview(null);
    setMode('idle');
    setCamError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClear();
  };

  return (
    <div className="camera-capture">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {mode === 'idle' && (
        <div className="camera-idle">
          <div className="camera-placeholder">
            <span className="camera-icon">📷</span>
            <p>Add a photo (optional)</p>
          </div>
          <div className="camera-buttons">
            <button type="button" className="btn-camera" onClick={startCamera}>
              📷 Use Camera
            </button>
            <button type="button" className="btn-camera" onClick={() => fileInputRef.current?.click()}>
              📁 Upload Photo
            </button>
          </div>
          {camError && <p className="error-text">{camError}</p>}
        </div>
      )}

      {mode === 'camera' && (
        <div className="camera-live">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video"
          />
          <div className="camera-controls">
            <button type="button" className="btn-primary" onClick={capturePhoto}>
              📸 Capture
            </button>
            <button type="button" className="btn-secondary" onClick={clearPhoto}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'preview' && preview && (
        <div className="camera-preview">
          <img src={preview} alt="Visitor" className="preview-image" />
          <div className="camera-controls">
            <button type="button" className="btn-secondary btn-sm" onClick={clearPhoto}>
              ✕ Remove
            </button>
            <button type="button" className="btn-outline btn-sm" onClick={() => { clearPhoto(); setTimeout(startCamera, 100); }}>
              ↺ Retake
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input — triggered programmatically */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default CameraCapture;
