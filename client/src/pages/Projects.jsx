import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import api from '../services/api';

const Projects = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.data.projects);
    } catch (err) {
      toast.error('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const openCreate = () => {
    setEditProject(null);
    setForm({ name: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (project) => {
    setEditProject(project);
    setForm({ name: project.name, description: project.description || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Project name is required.');
      return;
    }
    setSubmitting(true);
    try {
      if (editProject) {
        await api.put(`/projects/${editProject.id}`, form);
        toast.success('Project updated!');
      } else {
        await api.post('/projects', form);
        toast.success('Project created!');
      }
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete project "${name}"? This will remove all tasks in this project.`)) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted.');
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="projects-page" id="projects-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            {isAdmin ? 'Manage your team projects' : 'Projects you are part of'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate} id="btn-create-project">
            + New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="empty-state" id="empty-projects">
          <h3>No projects yet</h3>
          <p>{isAdmin ? 'Create your first project to get started.' : 'You haven\'t been added to any projects yet.'}</p>
          {isAdmin && (
            <button className="btn btn-primary" onClick={openCreate}>
              + Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="project-grid" id="project-grid">
          {projects.map((project) => (
            <Link
              to={`/projects/${project.id}`}
              key={project.id}
              className="project-card"
              id={`project-${project.id}`}
            >
              <div className="project-card-header">
                <h3 className="project-name">{project.name}</h3>
                {isAdmin && project.ownerId === user.id && (
                  <div className="project-actions" onClick={(e) => e.preventDefault()}>
                    <button
                      className="btn-icon"
                      onClick={(e) => { e.preventDefault(); openEdit(project); }}
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      className="btn-icon btn-icon-danger"
                      onClick={(e) => { e.preventDefault(); handleDelete(project.id, project.name); }}
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <p className="project-desc">
                {project.description || 'No description'}
              </p>
              <div className="project-card-footer">
                <span className="project-stat">
                  Members: {project._count?.members || 0}
                </span>
                <span className="project-stat">
                  Tasks: {project._count?.tasks || 0}
                </span>
              </div>
              <div className="project-owner">
                Created by {project.owner?.name}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editProject ? 'Edit Project' : 'Create Project'}
      >
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="project-name">Project Name *</label>
            <input
              type="text"
              id="project-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Website Redesign"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="project-desc">Description</label>
            <textarea
              id="project-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional project description..."
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="btn-spinner" /> : editProject ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Projects;
