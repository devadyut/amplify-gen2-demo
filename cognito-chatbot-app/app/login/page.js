'use client';

/**
 * Login Page Component
 * Provides authentication interface with email and password
 * Implements form validation and error handling
 * Redirects users based on custom:role attribute after successful authentication
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInUser, getUserSession } from '../../lib/auth-client';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  
  // Get redirect path and error from URL params
  const redirectPath = searchParams.get('redirect') || null;
  const urlError = searchParams.get('error');
  
  /**
   * Validate form inputs
   * Returns true if valid, false otherwise
   */
  const validateForm = () => {
    const errors = {};
    
    // Email validation
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  /**
   * Handle form submission
   * Authenticates user and redirects based on role
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    setValidationErrors({});
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Sign in with Amplify Auth
      const signInResult = await signInUser(email, password);
      
      if (!signInResult.success) {
        setError(signInResult.error);
        setIsLoading(false);
        return;
      }
      
      // Get user session to extract custom:role attribute
      const sessionResult = await getUserSession();
      
      if (!sessionResult.success) {
        setError('Failed to retrieve user session');
        setIsLoading(false);
        return;
      }
      
      const userRole = sessionResult.session.userAttributes.role;
      
      // Validate that user has a role
      if (!userRole) {
        setError('User role not found. Please contact administrator.');
        setIsLoading(false);
        return;
      }
      
      // Redirect based on custom:role attribute
      if (redirectPath) {
        // If there was a redirect path, go there
        router.push(redirectPath);
      } else {
        // Otherwise, redirect based on role
        if (userRole === 'admin') {
          router.push('/admin');
        } else if (userRole === 'user') {
          router.push('/user');
        } else {
          setError('Invalid user role');
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };
  
  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <h1>Welcome Back</h1>
          <p>Sign in to access your account</p>
        </div>
        
        {/* Display session expired message */}
        {urlError === 'session_expired' && (
          <div className="alert alert-error">
            Your session has expired. Please sign in again.
          </div>
        )}
        
        {/* Display error message */}
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          {/* Email field */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              autoComplete="email"
              autoFocus
            />
            {validationErrors.email && (
              <div className="form-error">{validationErrors.email}</div>
            )}
          </div>
          
          {/* Password field */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
            />
            {validationErrors.password && (
              <div className="form-error">{validationErrors.password}</div>
            )}
          </div>
          
          {/* Submit button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            {isLoading ? (
              <span className={styles.loadingText}>
                <span className={styles.spinner}></span>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        <div className={styles.loginFooter}>
          <p className={styles.helpText}>
            Don't have an account?{' '}
            <a href="/signup" className={styles.signupLink}>
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
