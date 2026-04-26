/**
 * VisitorsListPage.js
 * ───────────────────
 * Super Admin only — shows all registered visitors with:
 *   - Photo (circular, from photo_data)
 *   - Full name, phone, email, company
 *   - Total visits count
 *   - Click row → detail modal with all visit history
 */
import React, { useState, useEffect, useCallback } from 'react';
import { visitorAPI, visitAPI } from '../utils/api';
import { PageLoader, Spinner }  from '../components/Loader';

// ── Helper: get photo src ─────────────────────────────────────────────────────
const getPhoto = (v) => {
  if (!v) return null;
  const d = v.photo_data;
  if (!d) return null;
  if (d.startsWith('data:')) return d;
  return `data:image/jpeg;base64,${d}`;
};

// ── Avatar component ──────────────────────────────────────────────────────────
const Avatar = ({ visitor, size = 44 }) => {
  const [err, setErr] = useState(false);
  const src = getPhoto(visitor);
  const initials = visitor?.full_name
    ? visitor.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  if (src && !err) {
    return (
      <img
        src={src}
        alt={visitor.full_name}
        onError={() => setErr(true)}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', border: '2px solid var(--border, #e2e8f0)',
          flexShrink: 0, display: 'block',
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.36,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

// ── Visit status badge ────────────────────────────────────────────────────────
const statusStyle = {
  registered:  { bg: '#dbeafe', color: '#1e40af' },
  checked_in:  { bg: '#dcfce7', color: '#15803d' },
  checked_out: { bg: '#f1f5f9', color: '#334155' },
  expired:     { bg: '#fee2e2', color: '#b91c1c' },
};
const StatusBadge = ({ status }) => {
  const s = statusStyle[status] || statusStyle.expired;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {status?.replace('_', ' ')}
    </span>
  );
};

// ── Detail Modal ──────────────────────────────────────────────────────────────
const DetailModal = ({ visitor, onClose }) => {
  const [visits,  setVisits]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(false);
  const photo = getPhoto(visitor);

  useEffect(() => {
    if (!visitor) return;
    visitAPI.list({ skip: 0, limit: 50 })
      .then(r => {
        // filter by visitor_id
        const mine = r.data.filter(v =>
          v.visitor_id === visitor.id || v.visitor_name === visitor.full_name
        );
        setVisits(mine);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visitor]);

  if (!visitor) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--card-bg, #fff)',
        borderRadius: 14, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        animation: 'fadeIn .2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--border, #e2e8f0)',
          display: 'flex', alignItems: 'center', gap: 14,
          position: 'sticky', top: 0,
          background: 'var(--card-bg, #fff)', zIndex: 1,
        }}>
          <Avatar visitor={visitor} size={56} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{visitor.full_name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', marginTop: 2 }}>
              {visitor.phone}
              {visitor.email && ` · ${visitor.email}`}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 6, border: 'none',
            background: 'var(--bg-secondary, #f1f5f9)',
            cursor: 'pointer', fontSize: 16, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>

          {/* Photo big */}
          {photo && !err && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <img
                src={photo}
                alt={visitor.full_name}
                onError={() => setErr(true)}
                style={{
                  width: 120, height: 120, borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--primary, #6366f1)',
                  boxShadow: '0 4px 16px rgba(0,0,0,.15)',
                }}
              />
            </div>
          )}

          {/* Info rows */}
          <div style={{
            background: 'var(--bg-secondary, #f8fafc)',
            borderRadius: 10, overflow: 'hidden',
            border: '1px solid var(--border, #e2e8f0)',
            marginBottom: 20,
          }}>
            {[
              { label: 'Full Name',   value: visitor.full_name },
              { label: 'Phone',       value: visitor.phone },
              { label: 'Email',       value: visitor.email     || '—' },
              { label: 'Company',     value: visitor.company_name || '—' },
              { label: 'First Visit', value: visitor.created_at
                  ? new Date(visitor.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
                  : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: '1px solid var(--border, #e2e8f0)',
                fontSize: 13,
              }}>
                <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>{label}</span>
                <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Visit history */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-secondary, #94a3b8)', marginBottom: 10 }}>
            Visit History
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><Spinner size={24} /></div>
          ) : visits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary, #94a3b8)', fontSize: 13 }}>
              No visit records found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visits.map(v => (
                <div key={v.visit_id || v.id} style={{
                  background: 'var(--bg-secondary, #f8fafc)',
                  borderRadius: 8, padding: '10px 14px',
                  border: '1px solid var(--border, #e2e8f0)',
                  fontSize: 13,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <StatusBadge status={v.status} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)' }}>
                      {v.registered_at ? new Date(v.registered_at).toLocaleString('en-IN') : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                    {v.host_name && <span style={{ color: 'var(--text-secondary, #64748b)' }}>Host: <b>{v.host_name}</b></span>}
                    {v.purpose   && <span style={{ color: 'var(--text-secondary, #64748b)', textTransform: 'capitalize' }}>Purpose: <b>{v.purpose}</b></span>}
                    {v.duration_mins && <span style={{ color: 'var(--text-secondary, #64748b)' }}>Duration: <b>{v.duration_mins} min</b></span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const VisitorsListPage = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [skip,     setSkip]     = useState(0);
  const [total,    setTotal]    = useState(0);
  const LIMIT = 30;

  const fetchVisitors = useCallback(async (s = 0) => {
    setLoading(true);
    try {
      const res = await visitorAPI.list({ skip: s, limit: LIMIT });
      setVisitors(res.data);
      setTotal(res.data.length + s); // approximate
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVisitors(0); }, [fetchVisitors]);

  // Client-side filter
  const filtered = visitors.filter(v => {
    const q = search.toLowerCase();
    return (
      v.full_name?.toLowerCase().includes(q)  ||
      v.phone?.toLowerCase().includes(q)       ||
      v.email?.toLowerCase().includes(q)       ||
      v.company_name?.toLowerCase().includes(q)
    );
  });

  if (loading && visitors.length === 0) return <PageLoader />;

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:scale(.97); } to { opacity:1; transform:scale(1); } }
        .visitor-row:hover { background: var(--row-hover, #eff6ff) !important; cursor: pointer; }
      `}</style>

      <div className="page-bg">
        <div className="page-container animate-fadeIn">

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
            <div>
              <h1 className="page-title">Visitors</h1>
              <p className="page-subtitle">All registered visitors — photos, contact info & visit history</p>
            </div>
            <span style={{ fontSize:13, color:'var(--text-secondary, #94a3b8)' }}>
              {filtered.length} visitor{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Search bar */}
          <div className="card" style={{ padding:'12px 16px', marginBottom:16 }}>
            <input
              style={{
                width:'100%', height:38, padding:'0 14px',
                border:'1px solid var(--border, #e2e8f0)', borderRadius:8,
                fontSize:14, outline:'none',
                background:'var(--input-bg, #fff)',
                color:'var(--text-primary, #1e293b)',
              }}
              placeholder="🔍  Search by name, phone, email or company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {loading ? (
              <div style={{ textAlign:'center', padding:48 }}><Spinner size={32} /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p>{search ? 'No visitors match your search.' : 'No visitors registered yet.'}</p>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'var(--bg-secondary, #f8fafc)' }}>
                      {['Photo','Name','Phone','Email','Company','Registered',''].map(h => (
                        <th key={h} style={{
                          padding:'10px 14px', textAlign:'left',
                          fontSize:11, fontWeight:700, textTransform:'uppercase',
                          letterSpacing:'.05em', color:'var(--text-secondary, #94a3b8)',
                          borderBottom:'1px solid var(--border, #e2e8f0)', whiteSpace:'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v, i) => (
                      <tr
                        key={v.id}
                        className="visitor-row"
                        onClick={() => setSelected(v)}
                        style={{
                          borderBottom:'1px solid var(--border-light, #f1f5f9)',
                          background: i%2===0 ? 'transparent' : 'var(--row-alt, #fafbff)',
                          transition:'background .1s',
                        }}
                      >
                        {/* Photo */}
                        <td style={{ padding:'10px 14px' }}>
                          <Avatar visitor={v} size={40} />
                        </td>

                        {/* Name */}
                        <td style={{ padding:'10px 14px', fontWeight:600 }}>
                          {v.full_name}
                        </td>

                        {/* Phone */}
                        <td style={{ padding:'10px 14px', fontFamily:'monospace', color:'var(--text-secondary, #475569)' }}>
                          {v.phone}
                        </td>

                        {/* Email */}
                        <td style={{ padding:'10px 14px', color:'var(--text-secondary, #475569)' }}>
                          {v.email ? (
                            <a href={`mailto:${v.email}`}
                              onClick={e => e.stopPropagation()}
                              style={{ color:'#6366f1', textDecoration:'none' }}>
                              {v.email}
                            </a>
                          ) : <span style={{ color:'#cbd5e1' }}>—</span>}
                        </td>

                        {/* Company */}
                        <td style={{ padding:'10px 14px', color:'var(--text-secondary, #475569)' }}>
                          {v.company_name || <span style={{ color:'#cbd5e1' }}>—</span>}
                        </td>

                        {/* Date */}
                        <td style={{ padding:'10px 14px', color:'var(--text-secondary, #94a3b8)', whiteSpace:'nowrap', fontSize:12 }}>
                          {v.created_at
                            ? new Date(v.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
                            : '—'}
                        </td>

                        {/* Detail button */}
                        <td style={{ padding:'10px 14px' }}>
                          <button
                            onClick={e => { e.stopPropagation(); setSelected(v); }}
                            style={{
                              height:28, padding:'0 12px', borderRadius:6,
                              border:'1px solid var(--border, #e2e8f0)',
                              background:'var(--bg-secondary, #f8fafc)',
                              fontSize:11, fontWeight:600, cursor:'pointer',
                              color:'var(--text-secondary, #475569)',
                              whiteSpace:'nowrap',
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Load more */}
            {!loading && filtered.length >= LIMIT && search === '' && (
              <div style={{ textAlign:'center', padding:'16px 0', borderTop:'1px solid var(--border, #e2e8f0)' }}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    const newSkip = skip + LIMIT;
                    setSkip(newSkip);
                    visitorAPI.list({ skip: newSkip, limit: LIMIT })
                      .then(r => setVisitors(prev => [...prev, ...r.data]))
                      .catch(() => {});
                  }}
                >
                  Load More
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Detail modal */}
      {selected && <DetailModal visitor={selected} onClose={() => setSelected(null)} />}
    </>
  );
};

export default VisitorsListPage;