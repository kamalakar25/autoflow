import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import '../styles/SignIn.css';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


const SignIn = ({ onSignIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  if (token) {
    console.log('Token found, redirecting to /dashboard:', token);
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      console.log('Sending login request:', { email, password });
      const response = await axios.post(`${BASE_URL}/auth/login`, { email, password });
      console.log('Login response:', response.data);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem("userId", response.data.user._id)
      onSignIn();
      console.log('Navigating to /dashboard');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to sign in. Please try again.';
      setError(errorMessage);
      console.error('Login error:', err.response?.data || err);
      localStorage.removeItem('token');
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-card">
        <div className="signin-header">
          <h1>Welcome Back</h1>
          <p>Please enter your details to sign in</p>
        </div>
        <form onSubmit={handleSubmit} className="signin-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group password-group">
            <label>Password</label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
              >
                {showPassword ? <EyeSlashIcon className="icon" /> : <EyeIcon className="icon" />}
              </button>
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="signin-button">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignIn;