/**
 * AuditPage — super_admin only. Shows the full audit log.
 * Previously existed as a backend API but had no frontend page.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../utils/api';
import { PageLoader, Spinner } from '../components/Loader';

const actionColors = {
  user_login:          '#6366f1',
  visitor_registered:  '#10b981',
  visitor_checkin:     '#22d3ee',
  visitor_checkout:    '#f59e0b',
  user_created:        '#818cf8',
  user_deactivated:    '#ef4444',
  profile_updated:     '#a78bfa',
};

const AuditPage = () => {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 50;

  const fetchLogs = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const skip = reset ? 0 : page * LIMIT;
      const res  = await adminAPI.auditLogs({ skip, limit: LIMIT });
      const data = res.data;

      if (reset) {
        setLogs(data);
        setPage(1);
      } else {
        setLogs(prev => [...prev, ...data]);
        setPage(p => p + 1);
      }

      setHasMore(data.length === LIMIT);
    } catch {
      /* silently fail — non-critical UI */
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(true); }, []); // eslint-disable-line

  if (loading && logs.length === 0) return <PageLoader />;

  return (
    <div className="page-bg">
      <div className="page-container animate-fadeIn">

        <div className="page-header-row">
          <div>
            <h1 className="page-title">Audit Log</h1>
            <p className="page-subtitle">Every action taken in the system</p>
          </div>
          <button className="btn-icon" onClick={() => fetchLogs(true)} title="Refresh">
            ↻
          </button>
        </div>

        <div className="card">
          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No audit entries yet.</p>
            </div>
          ) : (
            <>
              <div className="audit-list">
                {logs.map((entry, i) => (
                  <div key={entry.id} className="audit-item animate-slideIn"
                       style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}>

                    {/* Coloured action dot */}
                    <div
                      className="audit-dot"
                      style={{ background: actionColors[entry.action] || '#64748b' }}
                    />

                    <div className="audit-body">
                      <div className="audit-header-row">
                        <span className="audit-action"
                              style={{ color: actionColors[entry.action] || '#94a3b8' }}>
                          {entry.action.replace(/_/g, ' ')}
                        </span>
                        <span className="audit-time">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="audit-meta">
                        {entry.entity && (
                          <span className="audit-tag">
                            {entry.entity} #{entry.entity_id}
                          </span>
                        )}
                        {entry.ip_address && (
                          <span className="audit-tag">IP: {entry.ip_address}</span>
                        )}
                        {entry.details && (
                          <span className="audit-detail">
                            {typeof entry.details === 'string'
                              ? entry.details
                              : JSON.stringify(entry.details)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <button
                    className="btn-secondary"
                    onClick={() => fetchLogs(false)}
                    disabled={loading}
                  >
                    {loading ? <Spinner size={18} /> : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default AuditPage;
