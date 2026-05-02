import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import api from '../services/api';

const Members = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data.users);
    } catch (err) {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Name and email are required.');
      return;
    }
    if (form.password && form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/users', form);
      toast.success(form.password ? 'Member account created!' : 'Member added to your team.');
      setShowModal(false);
      setForm({ name: '', email: '', password: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (memberId, name) => {
    if (!window.confirm(`Remove ${name} from your team?`)) return;
    try {
      await api.delete(`/users/${memberId}`);
      toast.success('Member removed from team.');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  const admins = users.filter((u) => u.role === 'ADMIN');
  const members = users.filter((u) => u.role === 'MEMBER');

  return (
    <div className="members-page" id="members-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">
            {users.length} user{users.length !== 1 ? 's' : ''} in your workspace
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} id="btn-create-member">
          + Add Member
        </button>
      </div>

      {/* Admins section */}
      <div className="member-section">
        <h3 className="section-title">Administrators ({admins.length})</h3>
        <div className="member-grid">
          {admins.map((u) => (
            <div key={u.id} className="member-card" id={`member-${u.id}`}>
              <div className="member-avatar-large">
                {u.name?.charAt(0)?.toUpperCase()}
              </div>
              <h4 className="member-card-name">{u.name}</h4>
              <p className="member-card-email">{u.email}</p>
              <span className="role-badge role-admin">Admin</span>
            </div>
          ))}
        </div>
      </div>

      {/* Members section */}
      <div className="member-section">
        <h3 className="section-title">Members ({members.length})</h3>
        {members.length === 0 ? (
          <div className="empty-state-mini">
            <p>No members yet. Add your first team member!</p>
          </div>
        ) : (
          <div className="member-grid">
            {members.map((u) => (
              <div key={u.id} className="member-card" id={`member-${u.id}`}>
                <div className="member-actions">
                  <button
                    className="member-remove-btn"
                    type="button"
                    onClick={() => handleRemove(u.id, u.name)}
                  >
                    Remove
                  </button>
                </div>
                <div className="member-avatar-large">
                  {u.name?.charAt(0)?.toUpperCase()}
                </div>
                <h4 className="member-card-name">{u.name}</h4>
                <p className="member-card-email">{u.email}</p>
                <span className="role-badge role-member">Member</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Member Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Member Account"
      >
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="auth-note" style={{ marginBottom: '1rem' }}>
            <span className="note-icon">i</span>
            <span>Provide a password to onboard a member. If the member already works on one of your projects, you can leave it blank to sync them.</span>
          </div>
          <div className="form-group">
            <label htmlFor="member-name">Full Name *</label>
            <input
              type="text"
              id="member-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Doe"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="member-email">Email *</label>
            <input
              type="email"
              id="member-email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jane@company.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="member-password">Password</label>
            <input
              type="text"
              id="member-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min. 6 characters"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="btn-spinner" /> : 'Create Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Members;
