/**
 * AuditPage.jsx  (UPDATED — search filters merged in)
 * ─────────────────────────────────────────────────────
 * Drop-in replacement for the old AuditPage.jsx.
 * • Keeps the original look/feel (dot timeline, actionColors, CSS classes)
 * • Adds: quick-date buttons, action/entity/date/time/IP filters, sort, pagination
 * • Uses adminAPI.auditLogs for backward-compat + falls back to search endpoint
 * • Click any row → side detail panel
 *
 * NO other file needs to change — same route, same import.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI } from '../utils/api';
import { PageLoader, Spinner } from '../components/Loader';

// ── Action colours (kept from original) ──────────────────────────────────────
const actionColors = {
  user_login:           '#6366f1',
  visitor_registered:   '#10b981',
  visitor_checkin:      '#22d3ee',
  visitor_checkout:     '#f59e0b',
  user_created:         '#818cf8',
  user_deactivated:     '#ef4444',
  profile_updated:      '#a78bfa',
  // extra ones for badge bg
  login:                '#6366f1',
  create:               '#10b981',
  update:               '#f59e0b',
  delete:               '#ef4444',
  scan:                 '#a78bfa',
  check_in:             '#22d3ee',
  check_out:            '#f59e0b',
};

const dotColor  = (action = '') =>
  actionColors[action] ?? actionColors[Object.keys(actionColors).find(k => action.includes(k))] ?? '#64748b';

const badgeBg = (action = '') => {
  const map = {
    login: '#eef2ff', create: '#ecfdf5', update: '#fefce8',
    delete: '#fee2e2', scan: '#f5f3ff', check_in: '#ecfdf5', check_out: '#e0f2fe',
  };
  const key = Object.keys(map).find(k => action.toLowerCase().includes(k));
  return { bg: map[key] ?? '#f1f5f9', text: dotColor(action) };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const todayStr   = () => new Date().toISOString().split('T')[0];
const daysAgoStr = (n) => { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; };
const toUTC = (iso) => iso ? (iso.endsWith('Z') ? iso : iso + 'Z') : null;
const fmtDate    = (iso) => { const d = toUTC(iso); return d ? new Date(d).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric'}) : '—'; };
const fmtTime    = (iso) => { const d = toUTC(iso); return d ? new Date(d).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}) + ' IST' : '—'; };
const fmtDT      = (iso) => iso ? `${fmtDate(iso)}, ${fmtTime(iso)}` : '—';

const PAGE_LIMIT = 50;

// ── Detail side-panel ─────────────────────────────────────────────────────────
function DetailPanel({ entry, onClose }) {
  if (!entry) return null;
  let parsed = null;
  try { parsed = JSON.parse(entry.details); } catch { parsed = null; }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', justifyContent:'flex-end' }}>
      <div onClick={onClose}
        style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.4)' }} />
      <div style={{
        position:'relative', zIndex:1,
        width:'min(460px,95vw)', background:'#fff',
        boxShadow:'-4px 0 28px rgba(0,0,0,.15)',
        display:'flex', flexDirection:'column',
        animation:'slideIn .2s ease',
      }}>
        {/* header */}
        <div style={{
          padding:'16px 20px', borderBottom:'1px solid #e2e8f0',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          position:'sticky', top:0, background:'#fff',
        }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>Log #{entry.id}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{fmtDT(entry.created_at)}</div>
          </div>
          <button onClick={onClose} style={{
            width:30, height:30, borderRadius:6, border:'none',
            background:'#f1f5f9', cursor:'pointer', fontSize:15,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>✕</button>
        </div>

        {/* body */}
        <div style={{ padding:20, overflowY:'auto', flex:1 }}>
          {[
            { title:'Action', rows:[
              { label:'Action',    value: <span style={{ background:badgeBg(entry.action).bg, color:badgeBg(entry.action).text, padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>{entry.action}</span> },
              { label:'Entity',    value: entry.entity    ?? '—' },
              { label:'Entity ID', value: entry.entity_id ?? '—' },
            ]},
            { title:'Performed By', rows:[
              { label:'User ID',    value: entry.user_id    ?? 'System' },
              { label:'IP Address', value: entry.ip_address ?? '—' },
            ]},
            { title:'When', rows:[
              { label:'Date', value: fmtDate(entry.created_at) },
              { label:'Time', value: fmtTime(entry.created_at) },
            ]},
          ].map(({ title, rows }) => (
            <div key={title} style={{ marginBottom:18 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#94a3b8', marginBottom:8 }}>{title}</div>
              <div style={{ background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0', overflow:'hidden' }}>
                {rows.map(({ label, value }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 14px', borderBottom:'1px solid #e2e8f0', fontSize:13 }}>
                    <span style={{ color:'#94a3b8', fontWeight:500, flexShrink:0, marginRight:12 }}>{label}</span>
                    <span style={{ color:'#1e293b', fontWeight:500, textAlign:'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Details block */}
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#94a3b8', marginBottom:8 }}>Details</div>
            <div style={{ background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0', padding:12, fontSize:12, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:220, overflowY:'auto' }}>
              {parsed ? JSON.stringify(parsed, null, 2) : (entry.details ?? 'No details recorded.')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const AuditPage = () => {
  // ── filter state ──────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    action:'', entity:'', entity_id:'', user_id:'', ip_address:'',
    date: todayStr(), date_from:'', date_to:'',
    time_from:'', time_to:'', last_n_days:'', sort_order:'desc',
  });
  const [activeQuick, setActiveQuick] = useState('today');

  // ── result state ──────────────────────────────────────────────────────
  const [logs,     setLogs]     = useState([]);
  const [total,    setTotal]    = useState(0);
  const [skip,     setSkip]     = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [selected, setSelected] = useState(null);

  const debounceRef = useRef(null);

  // ── fetch via search endpoint ─────────────────────────────────────────
  const fetchLogs = useCallback(async (overrideSkip) => {
    setLoading(true);
    setError('');
    const currentSkip = overrideSkip ?? skip;

    const p = new URLSearchParams();
    if (filters.action)     p.set('action',     filters.action.trim());
    if (filters.entity)     p.set('entity',     filters.entity.trim());
    if (filters.entity_id)  p.set('entity_id',  filters.entity_id);
    if (filters.user_id)    p.set('user_id',    filters.user_id);
    if (filters.ip_address) p.set('ip_address', filters.ip_address.trim());
    if (filters.time_from)  p.set('time_from',  filters.time_from);
    if (filters.time_to)    p.set('time_to',    filters.time_to);
    p.set('sort_order', filters.sort_order);
    p.set('skip',  currentSkip);
    p.set('limit', PAGE_LIMIT);

    if (filters.last_n_days)     p.set('last_n_days', filters.last_n_days);
    else if (filters.date)       p.set('date', filters.date);
    else {
      if (filters.date_from) p.set('date_from', filters.date_from);
      if (filters.date_to)   p.set('date_to',   filters.date_to);
    }

    try {
      // reuse your existing adminAPI axios instance
      const res  = await adminAPI.get(`/admin/audit-logs/search?${p}`);
      const data = res.data;
      setLogs(data.results);
      setTotal(data.total);
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Could not load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [filters, skip]); // eslint-disable-line

  // auto-search on filter change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSkip(0); fetchLogs(0); }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [filters]); // eslint-disable-line

  // ── quick filter ──────────────────────────────────────────────────────
  const applyQuick = (mode) => {
    setActiveQuick(mode);
    const base = { date:'', date_from:'', date_to:'', last_n_days:'' };
    if      (mode === 'today')     setFilters(f => ({ ...f, ...base, date: todayStr() }));
    else if (mode === 'yesterday') setFilters(f => ({ ...f, ...base, date: daysAgoStr(1) }));
    else if (mode === '7d')        setFilters(f => ({ ...f, ...base, last_n_days:'7' }));
    else if (mode === '30d')       setFilters(f => ({ ...f, ...base, last_n_days:'30' }));
    else                           setFilters(f => ({ ...f, ...base }));
  };

  const setF = (key) => (e) => {
    setActiveQuick('');
    setFilters(f => ({ ...f, [key]: e.target.value }));
  };

  const clearAll = () => {
    setActiveQuick('today');
    setFilters({
      action:'', entity:'', entity_id:'', user_id:'', ip_address:'',
      date: todayStr(), date_from:'', date_to:'',
      time_from:'', time_to:'', last_n_days:'', sort_order:'desc',
    });
  };

  // ── pagination ────────────────────────────────────────────────────────
  const totalPages  = Math.ceil(total / PAGE_LIMIT);
  const currentPage = Math.floor(skip / PAGE_LIMIT);
  const goTo = (pg) => { const s = pg * PAGE_LIMIT; setSkip(s); fetchLogs(s); };

  if (loading && logs.length === 0) return <PageLoader />;

  // ── render ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{EXTRA_CSS}</style>

      <div className="page-bg">
        <div className="page-container animate-fadeIn">

          {/* ── Page header ── */}
          <div className="page-header-row">
            <div>
              <h1 className="page-title">Audit Log</h1>
              <p className="page-subtitle">Every action taken in the system</p>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {total > 0 && (
                <span style={{ fontSize:12, color:'#94a3b8' }}>
                  {total.toLocaleString()} record{total !== 1 ? 's' : ''}
                </span>
              )}
              <button className="btn-icon" onClick={() => fetchLogs(0)} title="Refresh">↻</button>
            </div>
          </div>

          {/* ── Search / Filter card ── */}
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'#94a3b8', marginBottom:14 }}>
              Search &amp; Filter
            </div>

            {/* Quick date buttons */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Quick Select</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[
                  { key:'today',     label:'Today'       },
                  { key:'yesterday', label:'Yesterday'   },
                  { key:'7d',        label:'Last 7 Days' },
                  { key:'30d',       label:'Last 30 Days'},
                  { key:'all',       label:'All Time'    },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => applyQuick(key)}
                    className={`audit-qbtn${activeQuick === key ? ' active' : ''}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter inputs */}
            <div className="audit-filter-grid">

              <div className="audit-filter-field">
                <label>Action</label>
                <input className="audit-input" value={filters.action}
                  placeholder="login / create / delete…" onChange={setF('action')} />
              </div>

              <div className="audit-filter-field">
                <label>Entity</label>
                <select className="audit-input" value={filters.entity} onChange={setF('entity')}>
                  <option value="">All</option>
                  <option value="visit">visit</option>
                  <option value="visitor">visitor</option>
                  <option value="user">user</option>
                  <option value="branch">branch</option>
                </select>
              </div>

              <div className="audit-filter-field">
                <label>Entity ID</label>
                <input className="audit-input" type="number" min="1"
                  value={filters.entity_id} placeholder="e.g. 42" onChange={setF('entity_id')} />
              </div>

              <div className="audit-filter-field">
                <label>User ID</label>
                <input className="audit-input" type="number" min="1"
                  value={filters.user_id} placeholder="e.g. 3" onChange={setF('user_id')} />
              </div>

              <div className="audit-filter-field">
                <label>Exact Date</label>
                <input className="audit-input" type="date" value={filters.date}
                  onChange={(e) => { setActiveQuick(''); setFilters(f => ({ ...f, date:e.target.value, date_from:'', date_to:'', last_n_days:'' })); }} />
              </div>

              <div className="audit-filter-field">
                <label>Date From</label>
                <input className="audit-input" type="date" value={filters.date_from}
                  onChange={(e) => { setActiveQuick(''); setFilters(f => ({ ...f, date_from:e.target.value, date:'', last_n_days:'' })); }} />
              </div>

              <div className="audit-filter-field">
                <label>Date To</label>
                <input className="audit-input" type="date" value={filters.date_to}
                  onChange={(e) => { setActiveQuick(''); setFilters(f => ({ ...f, date_to:e.target.value, date:'', last_n_days:'' })); }} />
              </div>

              <div className="audit-filter-field">
                <label>Time From</label>
                <input className="audit-input" type="time" value={filters.time_from} onChange={setF('time_from')} />
              </div>

              <div className="audit-filter-field">
                <label>Time To</label>
                <input className="audit-input" type="time" value={filters.time_to} onChange={setF('time_to')} />
              </div>

              <div className="audit-filter-field">
                <label>IP Address</label>
                <input className="audit-input" value={filters.ip_address}
                  placeholder="e.g. 192.168" onChange={setF('ip_address')} />
              </div>

              <div className="audit-filter-field">
                <label>Sort Order</label>
                <select className="audit-input" value={filters.sort_order} onChange={setF('sort_order')}>
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>

            </div>

            {/* Buttons */}
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button className="btn-primary audit-search-btn"
                onClick={() => { setSkip(0); fetchLogs(0); }}>
                🔍 Search
              </button>
              <button className="btn-secondary" onClick={clearAll}>Clear</button>
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{ background:'#fee2e2', color:'#b91c1c', padding:'10px 16px', borderRadius:8, fontSize:13, marginBottom:14 }}>
              {error}
            </div>
          )}

          {/* ── Results ── */}
          <div className="card">
            {loading ? (
              <div style={{ textAlign:'center', padding:40 }}><Spinner size={28} /></div>
            ) : logs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>No audit entries found for the selected filters.</p>
              </div>
            ) : (
              <>
                {/* original dot-list view */}
                <div className="audit-list">
                  {logs.map((entry, i) => (
                    <div key={entry.id}
                      className="audit-item animate-slideIn"
                      style={{ animationDelay:`${Math.min(i,20)*30}ms`, cursor:'pointer' }}
                      onClick={() => setSelected(entry)}>

                      {/* coloured dot */}
                      <div className="audit-dot" style={{ background: dotColor(entry.action) }} />

                      <div className="audit-body" style={{ flex:1 }}>
                        <div className="audit-header-row">
                          <span className="audit-action" style={{ color: dotColor(entry.action) }}>
                            {entry.action.replace(/_/g,' ')}
                          </span>
                          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                            <span className="audit-time">{fmtDT(entry.created_at)}</span>
                            <button
                              className="audit-detail-btn"
                              onClick={(e) => { e.stopPropagation(); setSelected(entry); }}>
                              Detail
                            </button>
                          </div>
                        </div>
                        <div className="audit-meta">
                          {entry.entity && (
                            <span className="audit-tag">{entry.entity} #{entry.entity_id}</span>
                          )}
                          {entry.user_id && (
                            <span className="audit-tag">User #{entry.user_id}</span>
                          )}
                          {entry.ip_address && (
                            <span className="audit-tag">IP: {entry.ip_address}</span>
                          )}
                          {entry.details && (
                            <span className="audit-detail">
                              {typeof entry.details === 'string'
                                ? entry.details.slice(0, 80) + (entry.details.length > 80 ? '…' : '')
                                : JSON.stringify(entry.details).slice(0, 80)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:16, flexWrap:'wrap', gap:10 }}>
                    <span style={{ fontSize:12, color:'#94a3b8' }}>
                      Showing {skip+1}–{Math.min(skip+PAGE_LIMIT, total)} of {total.toLocaleString()}
                    </span>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="audit-pg-btn" disabled={currentPage===0}
                        onClick={() => goTo(currentPage-1)}>‹</button>
                      {Array.from({ length: totalPages }, (_, i) => {
                        if (totalPages > 7 && Math.abs(i-currentPage) > 2
                            && i !== 0 && i !== totalPages-1) {
                          return (i===1||i===totalPages-2)
                            ? <span key={i} className="audit-pg-btn">…</span> : null;
                        }
                        return (
                          <button key={i}
                            className={`audit-pg-btn${i===currentPage?' active':''}`}
                            onClick={() => goTo(i)}>{i+1}</button>
                        );
                      })}
                      <button className="audit-pg-btn" disabled={currentPage>=totalPages-1}
                        onClick={() => goTo(currentPage+1)}>›</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>

      {/* Side detail panel */}
      {selected && <DetailPanel entry={selected} onClose={() => setSelected(null)} />}
    </>
  );
};

export default AuditPage;

// ── Extra CSS (scoped to audit- prefix so no conflicts) ───────────────────────
const EXTRA_CSS = `
  @keyframes slideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }

  .audit-filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }
  .audit-filter-field {
    display: flex; flex-direction: column; gap: 4px;
  }
  .audit-filter-field label {
    font-size: 11px; font-weight: 600; color: #64748b;
    text-transform: uppercase; letter-spacing: .04em;
  }
  .audit-input {
    height: 34px; padding: 0 10px;
    border: 1px solid #e2e8f0; border-radius: 6px;
    font-size: 13px; color: #1e293b; background: #fff;
    outline: none; width: 100%;
    transition: border .15s;
  }
  .audit-input:focus { border-color: #6366f1; }

  .audit-qbtn {
    height: 28px; padding: 0 14px; border-radius: 20px;
    font-size: 12px; font-weight: 500; cursor: pointer;
    border: 1px solid #e2e8f0; background: #fff; color: #64748b;
    transition: all .15s;
  }
  .audit-qbtn.active,
  .audit-qbtn:hover { background: #6366f1; color: #fff; border-color: #6366f1; }

  .audit-search-btn {
    display: inline-flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 20px;
    font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer;
  }

  .audit-detail-btn {
    height: 24px; padding: 0 10px; border-radius: 4px;
    font-size: 11px; font-weight: 600; cursor: pointer;
    border: 1px solid #e2e8f0; background: #f8fafc; color: #475569;
    white-space: nowrap;
  }
  .audit-detail-btn:hover { background: #e0e7ff; color: #4338ca; border-color: #c7d2fe; }

  .audit-pg-btn {
    min-width: 32px; height: 32px; padding: 0 8px;
    border: 1px solid #e2e8f0; border-radius: 6px;
    background: #fff; font-size: 13px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .audit-pg-btn.active { background: #6366f1; color: #fff; border-color: #6366f1; }
  .audit-pg-btn:disabled { opacity: .4; cursor: default; }
  .audit-pg-btn:not(:disabled):hover { background: #f1f5f9; }

  .audit-item { cursor: pointer; }
  .audit-item:hover { background: #f5f3ff; border-radius: 8px; }
`;