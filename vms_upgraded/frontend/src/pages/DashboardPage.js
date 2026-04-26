import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../utils/api';
import { PageLoader } from '../components/Loader';

const purposeColors = {
  meeting: '#6366f1', delivery: '#f59e0b',
  interview: '#10b981', maintenance: '#ef4444', other: '#64748b',
};

const StatusBadge = ({ status }) => {
  const cfg = {
    checked_in:  { bg: '#052e16', color: '#4ade80', label: 'Inside' },
    checked_out: { bg: '#1e1b4b', color: '#818cf8', label: 'Left' },
    registered:  { bg: '#0c1a2e', color: '#60a5fa', label: 'Pending' },
    expired:     { bg: '#2d0a0a', color: '#f87171', label: 'Expired' },
  };
  const c = cfg[status] || cfg.registered;
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
    }}>
      {c.label}
    </span>
  );
};

const StatCard = ({ label, value, icon, color, sub }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: `${color}20`, color }}>
      {icon}
    </div>
    <div className="stat-body">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  </div>
);

const MiniBar = ({ value, max, color }) => (
  <div style={{ background: '#1e293b', borderRadius: 4, height: 6, flex: 1 }}>
    <div style={{
      width: `${max ? (value / max) * 100 : 0}%`,
      height: '100%', borderRadius: 4, background: color,
      transition: 'width 0.8s ease',
    }} />
  </div>
);

/* ── Visitor Photo Component ─────────────────────────────────────────────────
   - photo_data hai toh circle image dikhao (clickable)
   - nahi hai toh grey avatar dikhao
   - Click karne pe fullscreen modal open hota hai
*/
const VisitorPhoto = ({ photoData, name }) => {
  const [open, setOpen] = useState(false);

  if (!photoData || photoData === 'db') {
    // No photo — grey avatar
    return (
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: '#1e293b', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: '#475569', flexShrink: 0,
        border: '2px solid #334155',
      }}>
        👤
      </div>
    );
  }

  return (
    <>
      {/* Circle thumbnail — click to open */}
      <img
        src={photoData}
        alt={name}
        onClick={() => setOpen(true)}
        title="Click to view photo"
        style={{
          width: 38, height: 38, borderRadius: '50%',
          objectFit: 'cover', cursor: 'pointer', flexShrink: 0,
          border: '2px solid #6366f1',
          transition: 'transform 0.2s',
        }}
        onMouseOver={e => e.target.style.transform = 'scale(1.15)'}
        onMouseOut={e  => e.target.style.transform = 'scale(1)'}
      />

      {/* Fullscreen modal */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <img
              src={photoData}
              alt={name}
              style={{
                maxWidth: '88vw', maxHeight: '78vh',
                borderRadius: 16, border: '4px solid #6366f1',
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              }}
            />
            <div style={{ color: '#e2e8f0', marginTop: 14, fontSize: 16, fontWeight: 600 }}>
              {name}
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                marginTop: 14, background: '#6366f1', color: '#fff',
                border: 'none', borderRadius: 8, padding: '8px 24px',
                cursor: 'pointer', fontSize: 14, fontWeight: 600,
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const toIST = (utcString) => {
  if (!utcString) return '—';
  try {
    const normalized = utcString.endsWith('Z') ? utcString : utcString + 'Z';
    return new Date(normalized).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return utcString; }
};

const toISTDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short' });
  } catch { return dateStr; }
};

const nowIST = () =>
  new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });

const DashboardPage = () => {
  const [data,        setData]        = useState(null);
  const [report,      setReport]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [branches,    setBranches]    = useState([]);
  const [branchId,    setBranchId]    = useState('');
  const [activeTab,   setActiveTab]   = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const params = branchId ? { branch_id: branchId } : {};
      const [dashRes, reportRes] = await Promise.all([
        adminAPI.dashboard(params),
        adminAPI.report({ ...params, days: 7 }),
      ]);
      setData(dashRes.data);
      setReport(reportRes.data);
      setLastUpdated(nowIST());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    adminAPI.branches().then(r => setBranches(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return <PageLoader />;

  const maxDaily = report
    ? Math.max(...(report.daily_counts || []).map(d => d.count), 1)
    : 1;

  return (
    <div className="page-bg">
      <div className="dashboard-container animate-fadeIn">

        {/* Top bar */}
        <div className="dashboard-topbar">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              {lastUpdated ? `Last updated: ${lastUpdated} IST` : 'Loading...'}
              <span className="live-dot">●</span> Live
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select
              className="form-input"
              style={{ width: 180, height: 38 }}
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button className="btn-icon" onClick={fetchData} title="Refresh">↻</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-switcher">
          {['overview', 'inside', 'activity', 'report'].map(t => (
            <button
              key={t}
              className={`tab-btn ${activeTab === t ? 'active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {{ overview:'📊 Overview', inside:'🏢 Inside Now',
                 activity:'📋 Activity', report:'📈 Report' }[t]}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────── */}
        {activeTab === 'overview' && data && (
          <>
            <div className="stats-grid">
              <StatCard label="Currently Inside" value={data.currently_inside}
                icon="🏢" color="#6366f1" sub="visitors in building" />
              <StatCard label="Total Today" value={data.total_today}
                icon="📅" color="#10b981" sub="check-ins today" />
              <StatCard label="This Week" value={data.total_this_week}
                icon="📊" color="#f59e0b" sub="total this week" />
              <StatCard
                label="Avg Duration"
                value={data.avg_duration_mins > 0 ? `${data.avg_duration_mins}m` : '—'}
                icon="⏱" color="#ec4899" sub="average visit today"
              />
            </div>

            {Object.keys(data.purpose_breakdown || {}).length > 0 && (
              <div className="card">
                <h3 className="card-title">Today's Visit Purposes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  {Object.entries(data.purpose_breakdown).map(([purpose, count]) => (
                    <div key={purpose} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 90, fontSize: 13, color: '#94a3b8', textTransform: 'capitalize' }}>
                        {purpose}
                      </span>
                      <MiniBar value={count} max={data.total_today} color={purposeColors[purpose] || '#6366f1'} />
                      <span style={{ width: 30, textAlign: 'right', fontSize: 13, fontWeight: 600,
                                     color: purposeColors[purpose] || '#6366f1' }}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── INSIDE NOW ───────────────────────── */}
        {activeTab === 'inside' && (
          <div className="card">
            <h3 className="card-title">
              Visitors Inside Building
              <span className="badge-count">{data?.currently_inside_list?.length || 0}</span>
            </h3>
            {!data?.currently_inside_list?.length ? (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <p>No visitors inside right now</p>
              </div>
            ) : (
              <div className="visitor-table">
                <div className="table-header">
                  <span>Photo</span>
                  <span>Visitor</span>
                  <span>Purpose</span>
                  <span>Meeting</span>
                  <span>Check-in (IST)</span>
                  <span>Duration</span>
                </div>
                {data.currently_inside_list.map((v, i) => (
                  <div key={v.visit_id} className="table-row animate-slideIn"
                       style={{ animationDelay: `${i * 60}ms` }}>
                    {/* Photo column */}
                    <div>
                      <VisitorPhoto photoData={v.photo_data} name={v.visitor_name} />
                    </div>
                    <div>
                      <div className="visitor-name">{v.visitor_name}</div>
                      <div className="visitor-phone">{v.visitor_phone}</div>
                    </div>
                    <div style={{ textTransform: 'capitalize', color: purposeColors[v.purpose] }}>
                      {v.purpose}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 13 }}>{v.host_name || '—'}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {toIST(v.checked_in_at)}
                    </div>
                    <div className="duration-pill">{v.minutes_inside} min</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY ─────────────────────────── */}
        {activeTab === 'activity' && (
          <div className="card">
            <h3 className="card-title">Recent Activity</h3>
            {!data?.recent_activity?.length ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>No activity yet today</p>
              </div>
            ) : (
              <div className="activity-list">
                {data.recent_activity.map((v, i) => (
                  <div key={v.visit_id} className="activity-item animate-slideIn"
                       style={{ animationDelay: `${i * 50}ms` }}>
                    <div className={`activity-dot ${v.status === 'checked_in' ? 'dot-in' : 'dot-out'}`} />
                    <div className="activity-body" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* Photo + Name ek saath */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <VisitorPhoto photoData={v.photo_data} name={v.visitor_name} />
                          <span className="activity-name">{v.visitor_name}</span>
                        </div>
                        <StatusBadge status={v.status} />
                      </div>
                      <div className="activity-meta">
                        <span>{v.company || v.visitor_phone}</span>
                        {v.host_name && <span>→ {v.host_name}</span>}
                        <span style={{ textTransform: 'capitalize', color: purposeColors[v.purpose] }}>
                          {v.purpose}
                        </span>
                      </div>
                      <div className="activity-time">
                        {v.checked_in_at ? toIST(v.checked_in_at) + ' IST' : ''}
                        {v.checked_out_at ? ` → Out: ${toIST(v.checked_out_at)} IST` : ''}
                        {v.duration_mins  ? ` · ${v.duration_mins} min` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REPORT ───────────────────────────── */}
        {activeTab === 'report' && report && (
          <>
            <div className="card">
              <h3 className="card-title">
                Last 7 Days — Daily Visitor Count
                <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                  Total: {report.total_visits}
                </span>
              </h3>
              <div className="bar-chart">
                {report.daily_counts.length === 0 ? (
                  <div className="empty-state"><p>No data for this period</p></div>
                ) : (
                  report.daily_counts.map((d, i) => (
                    <div key={d.date} className="bar-col animate-barGrow"
                         style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="bar-value">{d.count}</div>
                      <div className="bar-fill" style={{
                        height: `${maxDaily ? (d.count / maxDaily) * 160 : 0}px`,
                        background: 'linear-gradient(to top, #6366f1, #818cf8)',
                      }} />
                      <div className="bar-label">{toISTDate(d.date)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {report.top_hosts.length > 0 && (
              <div className="card">
                <h3 className="card-title">Top Hosts This Week</h3>
                {report.top_hosts.map((h, i) => (
                  <div key={h.host_name} className="host-row" style={{ animationDelay: `${i * 60}ms` }}>
                    <span className="host-rank">{i + 1}</span>
                    <span className="host-name">{h.host_name}</span>
                    <MiniBar value={h.visits} max={report.top_hosts[0]?.visits || 1} color="#6366f1" />
                    <span className="host-count">{h.visits} visits</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default DashboardPage;