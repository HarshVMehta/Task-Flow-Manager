import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const initialIsMobile = typeof window !== 'undefined' ? window.innerWidth <= 960 : false;
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  const [sidebarOpen, setSidebarOpen] = useState(!initialIsMobile);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const mobile = window.innerWidth <= 960;
      setIsMobile((prev) => {
        if (prev !== mobile) {
          setSidebarOpen(!mobile);
        }
        return mobile;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'DB' },
    { path: '/projects', label: 'Projects', icon: 'PR' },
    { path: '/tasks', label: 'My Tasks', icon: 'TS' },
  ];

  // Admin-only items
  if (user?.role === 'ADMIN') {
    navItems.push({ path: '/members', label: 'Members', icon: 'MB' });
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className={`app-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`} id="app-layout">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} id="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">TF</span>
            <span className="logo-text">TaskFlow</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>x</button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'nav-item-active' : ''}`}
              onClick={() => isMobile && setSidebarOpen(false)}
              id={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className={`user-role role-${user?.role?.toLowerCase()}`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} id="btn-logout">
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Top bar */}
        <header className="topbar" id="topbar">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen((open) => !open)}
            id="hamburger-btn"
          >
            <span /><span /><span />
          </button>
          <div className="topbar-right">
            <span className="topbar-greeting">
              {user?.name} - {user?.role === 'ADMIN' ? 'Admin' : 'Member'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
