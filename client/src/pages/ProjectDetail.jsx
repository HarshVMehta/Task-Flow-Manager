import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import api from '../services/api';

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', priority: 'MEDIUM', dueDate: '', assignedTo: '',
  });
  const [selectedMember, setSelectedMember] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data.data.project);
    } catch (err) {
      toast.error('Failed to load project.');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/users');
      setUsers(res.data.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchUsers();
  }, [id]);

  // --- Task operations ---
  const openCreateTask = () => {
    setEditTask(null);
    setTaskForm({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assignedTo: '' });
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      assignedTo: task.assignedTo || '',
    });
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      toast.error('Task title is required.');
      return;
    }
    setSubmitting(true);
    try {
      if (editTask) {
        await api.put(`/tasks/${editTask.id}`, taskForm);
        toast.success('Task updated!');
      } else {
        await api.post(`/tasks/project/${id}`, taskForm);
        toast.success('Task created!');
      }
      setShowTaskModal(false);
      fetchProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Task deleted.');
      fetchProject();
    } catch (err) {
      toast.error('Delete failed.');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      toast.success('Status updated!');
      fetchProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    }
  };

  // --- Member operations ---
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      toast.error('Select a member to add.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/projects/${id}/members`, { userId: selectedMember });
      toast.success('Member added!');
      setShowMemberModal(false);
      setSelectedMember('');
      fetchProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from this project?`)) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      toast.success('Member removed.');
      fetchProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  // --- Helpers ---
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
  };

  const isOverdue = (date, status) => {
    if (!date || status === 'DONE') return false;
    const due = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const statusLabel = (status) => {
    const map = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
    return map[status] || status;
  };

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  const columns = [
    { key: 'TODO', label: 'To Do', icon: 'TD' },
    { key: 'IN_PROGRESS', label: 'In Progress', icon: 'IP' },
    { key: 'DONE', label: 'Done', icon: 'DN' },
  ];

  // Existing member IDs (to filter out in add-member dropdown)
  const memberIds = new Set(project?.members?.map((m) => m.userId));
  const availableUsers = users.filter((u) => u.role === 'MEMBER' && !memberIds.has(u.id));

  return (
    <div className="project-detail-page" id="project-detail-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/projects')}>{'< Back'}</button>
          <h1 className="page-title">{project?.name}</h1>
          {project?.description && (
            <p className="page-subtitle">{project.description}</p>
          )}
        </div>
        <div className="header-actions">
          {isAdmin && (
            <>
              <button className="btn btn-ghost" onClick={() => setShowMemberModal(true)} id="btn-add-member">
                Add Member
              </button>
              <button className="btn btn-primary" onClick={openCreateTask} id="btn-create-task">
                + New Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* Members strip */}
      <div className="members-strip" id="members-strip">
        <span className="members-label">Team:</span>
        <div className="members-avatars">
          {project?.members?.map((m) => (
            <div key={m.userId} className="member-chip" title={m.user.name}>
              <span className="member-avatar-small">
                {m.user.name?.charAt(0)?.toUpperCase()}
              </span>
              <span className="member-name-small">{m.user.name}</span>
              {isAdmin && m.userId !== project.ownerId && (
                <button
                  className="member-remove"
                  onClick={() => handleRemoveMember(m.userId, m.user.name)}
                  title="Remove"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Kanban columns */}
      <div className="kanban-board" id="kanban-board">
        {columns.map((col) => {
          const tasks = project?.tasks?.filter((t) => t.status === col.key) || [];
          return (
            <div key={col.key} className="kanban-column">
              <div className="kanban-column-header">
                <span className="kanban-column-title">
                  <span className="kanban-code">{col.icon}</span>
                  <span>{col.label}</span>
                </span>
                <span className="kanban-count">{tasks.length}</span>
              </div>
              <div className="kanban-cards">
                {tasks.length === 0 ? (
                  <div className="kanban-empty">No tasks</div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`task-card ${isOverdue(task.dueDate, task.status) ? 'task-card-overdue' : ''}`}
                      id={`task-${task.id}`}
                    >
                      <div className="task-card-top">
                        <span className={`priority-dot priority-${task.priority.toLowerCase()}`} />
                        <span className={`priority-label priority-${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                        {isAdmin && (
                          <div className="task-card-actions">
                            <button className="btn-icon-sm" onClick={() => openEditTask(task)} title="Edit">Edit</button>
                            <button className="btn-icon-sm" onClick={() => handleDeleteTask(task.id)} title="Delete">Del</button>
                          </div>
                        )}
                      </div>
                      <h4 className="task-card-title">{task.title}</h4>
                      {task.description && (
                        <p className="task-card-desc">{task.description}</p>
                      )}
                      <div className="task-card-bottom">
                        <div className="task-card-meta">
                          {task.dueDate && (
                            <span className={`task-due ${isOverdue(task.dueDate, task.status) ? 'task-due-overdue' : ''}`}>
                              Due: {formatDate(task.dueDate)}
                            </span>
                          )}
                          {task.assignee && (
                            <span className="task-assignee-chip">
                              {task.assignee.name?.charAt(0)} {task.assignee.name}
                            </span>
                          )}
                        </div>
                        {/* Status dropdown for member's own tasks or admin */}
                        {(isAdmin || task.assignedTo === user.id) && (
                          <select
                            className="status-select"
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                          </select>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Create/Edit Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={editTask ? 'Edit Task' : 'Create Task'}
      >
        <form onSubmit={handleTaskSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="task-title">Title *</label>
            <input
              type="text"
              id="task-title"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="Task title"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              placeholder="Optional description..."
              rows={3}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="task-due">Due Date</label>
              <input
                type="date"
                id="task-due"
                value={taskForm.dueDate}
                min={todayIso}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="task-assignee">Assign To</label>
            <select
              id="task-assignee"
              value={taskForm.assignedTo}
              onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
            >
              <option value="">Unassigned</option>
              {project?.members?.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name} ({m.user.email})
                </option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="btn-spinner" /> : editTask ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        title="Add Team Member"
      >
        <form onSubmit={handleAddMember} className="modal-form">
          <div className="form-group">
            <label htmlFor="member-select">Select Member</label>
            {availableUsers.length > 0 ? (
              <select
                id="member-select"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
              >
                <option value="">Choose a member...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            ) : (
              <p className="form-help">No available members. Create member accounts from the Members page first.</p>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowMemberModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !selectedMember}>
              {submitting ? <span className="btn-spinner" /> : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectDetail;
