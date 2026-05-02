import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const { signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const validateName = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Full name is required.';
    if (trimmed.length < 2) return 'Full name must be at least 2 characters.';
    return '';
  };

  const validateEmail = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Email is required.';
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(trimmed) ? '' : 'Enter a valid email address.';
  };

  const validatePassword = (value) => {
    if (!value) return 'Password is required.';
    if (value.length < 6) return 'Password must be at least 6 characters.';
    return '';
  };

  const nameError = validateName(name);
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const showNameError = touched.name || name.length > 0;
  const showEmailError = touched.email || email.length > 0;
  const showPasswordError = touched.password || password.length > 0;
  const isFormValid = !nameError && !emailError && !passwordError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      setTouched({ name: true, email: true, password: true });
      toast.error('Please fix the errors before continuing.');
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password);
      toast.success('Admin account created! Welcome to TaskFlow.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" id="signup-page">
      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-logo">TF</div>
          <h1 className="auth-title">TaskFlow</h1>
          <p className="auth-subtitle">Team Task Manager</p>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Create Admin Account</h2>
            <p>Set up your workspace and start managing tasks</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" id="signup-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                className={showNameError && nameError ? 'input-error' : ''}
                placeholder="John Doe"
                autoComplete="name"
                required
              />
              {showNameError && nameError && (
                <span className="form-error">{nameError}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                className={showEmailError && emailError ? 'input-error' : ''}
                placeholder="admin@company.com"
                autoComplete="email"
                required
              />
              {showEmailError && emailError && (
                <span className="form-error">{emailError}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  className={showPasswordError && passwordError ? 'input-error' : ''}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {showPasswordError && passwordError && (
                <span className="form-error">{passwordError}</span>
              )}
            </div>

            <div className="auth-note">
              <span className="note-icon">i</span>
              <span>This creates an <strong>Admin</strong> account. Team members will be added from your dashboard.</span>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !isFormValid}
              id="signup-btn"
            >
              {loading ? <span className="btn-spinner" /> : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
