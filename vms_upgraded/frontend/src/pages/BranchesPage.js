/**
 * BranchesPage — super_admin can view and create office branches.
 * Previously this existed only as a backend API — now it has a UI.
 */
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { Spinner }  from '../components/Loader';
import useToast     from '../hooks/useToast';
import { Toast }    from '../components/Loader';

const BranchesPage = () => {
  const [branches, setBranches] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const { toast, show, hide }   = useToast();

  const [form, setForm] = useState({ name: '', city: '', address: '' });
  const set = (k, v)   => setForm(f => ({ ...f, [k]: v }));

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.branches();
      setBranches(res.data);
    } catch {
      show('Failed to load branches', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBranches(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { show('Branch name is required', 'error'); return; }
    setSaving(true);
    try {
      await adminAPI.createBranch({
        name:    form.name.trim(),
        city:    form.city.trim()    || undefined,
        address: form.address.trim() || undefined,
      });
      show('Branch created successfully!');
      setForm({ name: '', city: '', address: '' });
      setShowForm(false);
      fetchBranches();
    } catch (err) {
      show(err.response?.data?.detail || 'Failed to create branch', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-bg">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      <div className="page-container animate-fadeIn">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Office Branches</h1>
            <p className="page-subtitle">{branches.length} branch{branches.length !== 1 ? 'es' : ''} registered</p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕ Cancel' : '+ Add Branch'}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="card animate-slideIn">
            <h3 className="card-title">Create New Branch</h3>
            <form onSubmit={handleCreate}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Branch Name *</label>
                  <input className="form-input" value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="HQ / North Branch / Warehouse" required />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={form.city}
                    onChange={e => set('city', e.target.value)}
                    placeholder="Indore, Mumbai..." />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Address</label>
                  <input className="form-input" value={form.address}
                    onChange={e => set('address', e.target.value)}
                    placeholder="Full address (optional)" />
                </div>
              </div>
              <button type="submit" className="btn-primary btn-flex" disabled={saving}>
                {saving ? <><Spinner size={18} color="#fff" /> Creating...</> : 'Create Branch'}
              </button>
            </form>
          </div>
        )}

        {/* Branches list */}
        <div className="card">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Spinner size={40} />
            </div>
          ) : branches.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏢</div>
              <p>No branches yet. Create your first branch above.</p>
            </div>
          ) : (
            <div className="branch-grid">
              {branches.map((b, i) => (
                <div key={b.id} className="branch-card animate-slideIn"
                     style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="branch-header">
                    <span className="branch-icon">🏢</span>
                    <div>
                      <div className="branch-name">{b.name}</div>
                      <div className="branch-city">{b.city || '—'}</div>
                    </div>
                    <span className={`status-dot ${b.is_active ? 'dot-active' : 'dot-inactive'}`} />
                  </div>
                  {b.address && (
                    <p className="branch-address">{b.address}</p>
                  )}
                  <div className="branch-meta">
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                      ID #{b.id} · Created {new Date(b.created_at).toLocaleDateString()}
                    </span>
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

export default BranchesPage;
