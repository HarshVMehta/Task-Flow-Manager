import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data.data.stats);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const welcomeKey = `ttm_seen_welcome_${user.id}`;
    const seen = localStorage.getItem(welcomeKey);
    if (!seen) {
      setGreeting('Welcome');
      localStorage.setItem(welcomeKey, 'true');
    } else {
      setGreeting('Welcome back');
    }
  }, [user?.id]);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const isOverdue = (date) => {
    if (!date) return false;
    const due = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  return (
    <div className="dashboard-page" id="dashboard-page">
      {/* Welcome header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="page-subtitle">
            {isAdmin
              ? "Here's an overview of your team's progress"
              : "Here's a summary of your assigned work"}
          </p>
        </div>
        <span className={`role-badge role-${user?.role?.toLowerCase()}`}>
          {user?.role === 'ADMIN' ? 'Admin' : 'Member'}
        </span>
      </div>

      {/* Stat cards */}
      <div className="stats-grid" id="stats-grid">
        <div className="stat-card stat-card-accent">
          <div className="stat-icon">PR</div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalProjects || 0}</span>
            <span className="stat-label">Projects</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">TS</div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalTasks || 0}</span>
            <span className="stat-label">Total Tasks</span>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-icon">CP</div>
          <div className="stat-content">
            <span className="stat-value">{stats?.completionRate || 0}%</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>

        <div className={`stat-card ${stats?.overdueTasks > 0 ? 'stat-card-danger' : ''}`}>
          <div className="stat-icon">OD</div>
          <div className="stat-content">
            <span className="stat-value">{stats?.overdueTasks || 0}</span>
            <span className="stat-label">Overdue</span>
          </div>
        </div>

        {isAdmin && (
          <div className="stat-card">
            <div className="stat-icon">MB</div>
            <div className="stat-content">
              <span className="stat-value">{stats?.totalMembers || 0}</span>
              <span className="stat-label">Team Members</span>
            </div>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="dashboard-grid">
        {/* Status distribution */}
        <div className="dashboard-card" id="status-chart">
          <h3 className="card-title">Task Status</h3>
          <div className="chart-bars">
            {[
              { key: 'TODO', label: 'To Do', color: 'var(--status-todo)', count: stats?.statusCounts?.TODO || 0 },
              { key: 'IN_PROGRESS', label: 'In Progress', color: 'var(--status-progress)', count: stats?.statusCounts?.IN_PROGRESS || 0 },
              { key: 'DONE', label: 'Done', color: 'var(--status-done)', count: stats?.statusCounts?.DONE || 0 },
            ].map((bar) => {
              const total = (stats?.totalTasks || 1);
              const pct = Math.round((bar.count / total) * 100) || 0;
              return (
                <div key={bar.key} className="chart-bar-item">
                  <div className="bar-label">
                    <span>{bar.label}</span>
                    <span className="bar-count">{bar.count}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${pct}%`, backgroundColor: bar.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overdue tasks */}
        <div className="dashboard-card" id="overdue-list">
          <h3 className="card-title">
            Overdue Tasks
            {stats?.overdueTasks > 0 && (
              <span className="badge badge-danger">{stats.overdueTasks}</span>
            )}
          </h3>
          {stats?.overdueTasksList?.length > 0 ? (
            <div className="task-list-compact">
              {stats.overdueTasksList.map((task) => (
                <div key={task.id} className="task-item-compact task-overdue">
                  <div className="task-item-left">
                    <span className="task-dot task-dot-overdue" />
                    <div>
                      <span className="task-item-title">{task.title}</span>
                      <span className="task-item-meta">{task.project?.name}</span>
                    </div>
                  </div>
                  <div className="task-item-right">
                    <span className="task-date overdue-date">
                      {formatDate(task.dueDate)}
                    </span>
                    {task.assignee && (
                      <span className="task-assignee-mini">
                        {task.assignee.name?.charAt(0)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-mini">
              <p>No overdue tasks.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent tasks */}
      {isAdmin && (
        <div className="dashboard-card" id="project-progress">
          <div className="card-header-row">
            <h3 className="card-title">Project Progress</h3>
            <Link to="/projects" className="card-link">Manage projects</Link>
          </div>
          {stats?.projectProgress?.length > 0 ? (
            <div className="progress-list">
              {stats.projectProgress.map((project) => (
                <div key={project.projectId} className="progress-row">
                  <div className="progress-info">
                    <Link to={`/projects/${project.projectId}`} className="progress-title">
                      {project.projectName}
                    </Link>
                    <span className="progress-meta">
                      {project.completedTasks}/{project.totalTasks} done
                    </span>
                  </div>
                  <div className="progress-metrics">
                    <span className="progress-value">{project.completionRate}%</span>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${project.completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-mini">
              <p>No projects yet. Create your first project to see progress.</p>
            </div>
          )}
        </div>
      )}

      {/* Recent tasks */}
      <div className="dashboard-card" id="recent-tasks">
        <div className="card-header-row">
          <h3 className="card-title">Recent Tasks</h3>
          <Link to="/tasks" className="card-link">View all</Link>
        </div>
        {stats?.recentTasks?.length > 0 ? (
          <div className="task-list-compact">
            {stats.recentTasks.map((task) => (
              <div key={task.id} className="task-item-compact">
                <div className="task-item-left">
                  <span className={`task-dot task-dot-${task.status.toLowerCase().replace('_', '-')}`} />
                  <div>
                    <span className="task-item-title">{task.title}</span>
                    <span className="task-item-meta">{task.project?.name}</span>
                  </div>
                </div>
                <div className="task-item-right">
                  <span className={`status-pill status-${task.status.toLowerCase().replace('_', '-')}`}>
                    {task.status === 'TODO' ? 'To Do' : task.status === 'IN_PROGRESS' ? 'In Progress' : 'Done'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-mini">
            <p>No tasks yet. Create a project to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
