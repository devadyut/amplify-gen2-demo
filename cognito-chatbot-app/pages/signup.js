import { useState } from 'react';
import { signUp, confirmSignUp } from 'aws-amplify/auth';
import { useRouter } from 'next/router';

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

      // Redirect to login page with success message
      router.push('/login?message=signup_success');
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
    <div className="signup-container">
      <div className="signup-box">
        <h1 className="signup-title">
          {step === 'signup' ? 'Create Account' : 'Verify Email'}
        </h1>

        {step === 'signup' ? (
          <form onSubmit={handleSignup} className="signup-form">
            <div className="signup-form-group">
              <label htmlFor="email" className="signup-label">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="signup-input"
                required
                autoComplete="email"
                placeholder="your.email@example.com"
              />
            </div>

            <div className="signup-form-group">
              <label htmlFor="password" className="signup-label">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="signup-input"
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
              <p className="signup-hint">
                Must contain uppercase, lowercase, number, and special character
              </p>
            </div>

            <div className="signup-form-group">
              <label htmlFor="confirmPassword" className="signup-label">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="signup-input"
                required
                autoComplete="new-password"
                placeholder="Re-enter your password"
              />
            </div>

            {error && <div className="signup-error">{error}</div>}

            <button
              type="submit"
              className="signup-button"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <div className="signup-links">
              <p>
                Already have an account?{' '}
                <a href="/login" className="signup-link">
                  Sign In
                </a>
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirmSignup} className="signup-form">
            <p className="signup-description">
              We've sent a verification code to <strong>{formData.email}</strong>.
              Please enter it below to verify your account.
            </p>

            <div className="signup-form-group">
              <label htmlFor="confirmationCode" className="signup-label">
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
                className="signup-input"
                required
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </div>

            {error && <div className="signup-error">{error}</div>}

            <button
              type="submit"
              className="signup-button"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            <div className="signup-links">
              <button
                type="button"
                onClick={handleResendCode}
                className="signup-link-button"
                disabled={loading}
              >
                Resend Code
              </button>
              <span className="signup-separator">•</span>
              <button
                type="button"
                onClick={() => setStep('signup')}
                className="signup-link-button"
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
