'use client';

import { useState } from 'react';
import { signUp, confirmSignUp, signIn } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import styles from './signup.module.css';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState('signup'); // 'signup' or 'confirm'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      await signUp({
        username: formData.email,
        password: formData.password,
        options: {
          userAttributes: {
            email: formData.email,
          },
        },
      });

      setStep('confirm');
      setLoading(false);
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to sign up. Please try again.');
      setLoading(false);
    }
  };

  const handleConfirmSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await confirmSignUp({
        username: formData.email,
        confirmationCode: confirmationCode,
      });

      // After confirmation, automatically sign in
      await signIn({
        username: formData.email,
        password: formData.password,
      });

      // Redirect to user page
      router.push('/user');
    } catch (err) {
      console.error('Confirmation error:', err);
      setError(err.message || 'Failed to confirm signup. Please try again.');
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);

    try {
      await signUp({
        username: formData.email,
        password: formData.password,
        options: {
          userAttributes: {
            email: formData.email,
          },
        },
      });
      setError('Verification code resent to your email');
      setLoading(false);
    } catch (err) {
      console.error('Resend code error:', err);
      setError(err.message || 'Failed to resend code. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.signupBox}>
        <h1 className={styles.title}>
          {step === 'signup' ? 'Create Account' : 'Verify Email'}
        </h1>

        {step === 'signup' ? (
          <form onSubmit={handleSignup} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={styles.input}
                required
                autoComplete="email"
                placeholder="your.email@example.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={styles.input}
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
              <p className={styles.hint}>
                Must contain uppercase, lowercase, number, and special character
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={styles.input}
                required
                autoComplete="new-password"
                placeholder="Re-enter your password"
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              type="submit"
              className={styles.button}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <div className={styles.links}>
              <p>
                Already have an account?{' '}
                <a href="/login" className={styles.link}>
                  Sign In
                </a>
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirmSignup} className={styles.form}>
            <p className={styles.description}>
              We've sent a verification code to <strong>{formData.email}</strong>.
              Please enter it below to verify your account.
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="confirmationCode" className={styles.label}>
                Verification Code
              </label>
              <input
                type="text"
                id="confirmationCode"
                name="confirmationCode"
                value={confirmationCode}
                onChange={(e) => {
                  setConfirmationCode(e.target.value);
                  setError('');
                }}
                className={styles.input}
                required
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              type="submit"
              className={styles.button}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            <div className={styles.links}>
              <button
                type="button"
                onClick={handleResendCode}
                className={styles.linkButton}
                disabled={loading}
              >
                Resend Code
              </button>
              <span className={styles.separator}>•</span>
              <button
                type="button"
                onClick={() => setStep('signup')}
                className={styles.linkButton}
              >
                Change Email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
