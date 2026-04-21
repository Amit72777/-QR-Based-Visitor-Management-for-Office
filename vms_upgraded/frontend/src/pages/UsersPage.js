import React, { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import { Spinner } from '../components/Loader';
import useToast from '../hooks/useToast';
import { Toast } from '../components/Loader';

const roles = ['guard', 'admin', 'super_admin'];
const roleColors = { guard: '#f59e0b', admin: '#6366f1', super_admin: '#10b981' };

const UsersPage = () => {
  const [users,    setUsers]    = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const { toast, show, hide }   = useToast();

  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    role: 'guard', branch_id: '', department: '', phone: '',
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [uRes, bRes] = await Promise.all([adminAPI.users(), adminAPI.branches()]);
      setUsers(uRes.data);
      setBranches(bRes.data);
    } catch (e) {
      show('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.branch_id) payload.branch_id = parseInt(payload.branch_id);
      else delete payload.branch_id;
      if (!payload.phone)      delete payload.phone;
      if (!payload.department) delete payload.department;
      await adminAPI.createUser(payload);
      show('User created successfully!');
      setShowForm(false);
      setForm({ full_name:'', email:'', password:'', role:'guard', branch_id:'', department:'', phone:'' });
      fetchAll();
    } catch (err) {
      show(err.response?.data?.detail || 'Failed to create user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate user "${name}"?`)) return;
    try {
      await adminAPI.deleteUser(id);
      show(`User "${name}" deactivated`);
      fetchAll();
    } catch {
      show('Failed to deactivate user', 'error');
    }
  };

  return (
    <div className="page-bg">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
      <div className="page-container animate-fadeIn">

        <div className="page-header-row">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">{users.length} users registered</p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Add User'}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="card animate-slideIn">
            <h3 className="card-title">Create New User</h3>
            <form onSubmit={handleCreate}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.full_name}
                    onChange={e => set('full_name', e.target.value)} required placeholder="Rahul Sharma" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={form.email}
                    onChange={e => set('email', e.target.value)} required placeholder="rahul@company.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input className="form-input" type="password" value={form.password}
                    onChange={e => set('password', e.target.value)} required placeholder="Min 8 characters" />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <select className="form-input" value={form.branch_id} onChange={e => set('branch_id', e.target.value)}>
                    <option value="">Select branch...</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" value={form.department}
                    onChange={e => set('department', e.target.value)} placeholder="Security / IT / HR" />
                </div>
              </div>
              <button type="submit" className="btn-primary btn-flex" disabled={saving}>
                {saving ? <Spinner size={18} color="#fff" /> : 'Create User'}
              </button>
            </form>
          </div>
        )}

        {/* Users table */}
        <div className="card">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Spinner size={40} />
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No users yet. Create your first user above.</p>
            </div>
          ) : (
            <div className="users-table">
              <div className="table-header">
                <span>Name</span><span>Email</span>
                <span>Role</span><span>Branch</span>
                <span>Status</span><span>Action</span>
              </div>
              {users.map((u, i) => (
                <div key={u.id} className="table-row animate-slideIn"
                     style={{ animationDelay: `${i * 40}ms` }}>
                  <div>
                    <div className="visitor-name">{u.full_name}</div>
                    <div className="visitor-phone">{u.department || '—'}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>{u.email}</div>
                  <div>
                    <span style={{
                      background: `${roleColors[u.role]}20`, color: roleColors[u.role],
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    }}>
                      {u.role}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>{u.branch_id || '—'}</div>
                  <div>
                    <span style={{
                      background: u.is_active ? '#05261540' : '#2d0a0a',
                      color: u.is_active ? '#4ade80' : '#f87171',
                      padding: '3px 10px', borderRadius: 20, fontSize: 11,
                    }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    {u.is_active && (
                      <button className="btn-danger-sm" onClick={() => handleDelete(u.id, u.full_name)}>
                        Deactivate
                      </button>
                    )}
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

export default UsersPage;
