import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

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

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const showEmailError = touched.email || email.length > 0;
  const showPasswordError = touched.password || password.length > 0;
  const isFormValid = !emailError && !passwordError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      setTouched({ email: true, password: true });
      toast.error('Please fix the errors before continuing.');
      return;
    }
    setLoading(true);
    try {
      const userData = await login(email, password);
      toast.success('Welcome back!');
      navigate(userData.role === 'ADMIN' ? '/dashboard' : '/tasks');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" id="login-page">
      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-logo">TF</div>
          <h1 className="auth-title">TaskFlow</h1>
          <p className="auth-subtitle">Team Task Manager</p>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" id="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                className={showEmailError && emailError ? 'input-error' : ''}
                placeholder="you@example.com"
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
                  placeholder="********"
                  autoComplete="current-password"
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

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !isFormValid}
              id="login-btn"
            >
              {loading ? <span className="btn-spinner" /> : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/signup" className="auth-link">Create Admin Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
