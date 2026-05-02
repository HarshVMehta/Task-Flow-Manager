import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const MyTasks = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks/my');
      setTasks(res.data.data.tasks);
    } catch (err) {
      toast.error('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      toast.success('Status updated!');
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
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

  const filteredTasks = filter === 'ALL'
    ? tasks
    : filter === 'OVERDUE'
      ? tasks.filter((t) => isOverdue(t.dueDate, t.status))
      : tasks.filter((t) => t.status === filter);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="my-tasks-page" id="my-tasks-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs" id="filter-tabs">
        {[
          { key: 'ALL', label: 'All' },
          { key: 'TODO', label: 'To Do' },
          { key: 'IN_PROGRESS', label: 'In Progress' },
          { key: 'DONE', label: 'Done' },
          { key: 'OVERDUE', label: 'Overdue' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`filter-tab ${filter === tab.key ? 'filter-tab-active' : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
            {tab.key === 'OVERDUE' && (
              <span className="filter-count filter-count-danger">
                {tasks.filter((t) => isOverdue(t.dueDate, t.status)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <h3>{filter === 'ALL' ? 'No tasks assigned to you' : `No ${statusLabel(filter)} tasks`}</h3>
          <p>Tasks assigned to you will appear here.</p>
        </div>
      ) : (
        <div className="task-list" id="task-list">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`task-row ${isOverdue(task.dueDate, task.status) ? 'task-row-overdue' : ''}`}
              id={`task-row-${task.id}`}
            >
              <div className="task-row-left">
                <span className={`priority-dot priority-${task.priority.toLowerCase()}`} />
                <div className="task-row-info">
                  <h4 className="task-row-title">{task.title}</h4>
                  <div className="task-row-meta">
                    <Link to={`/projects/${task.projectId}`} className="task-project-tag">
                      Project: {task.project?.name}
                    </Link>
                    {task.dueDate && (
                      <span className={`task-due ${isOverdue(task.dueDate, task.status) ? 'task-due-overdue' : ''}`}>
                        Due: {formatDate(task.dueDate)}
                      </span>
                    )}
                    <span className={`priority-label priority-${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>
              <div className="task-row-right">
                <select
                  className="status-select"
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTasks;
