'use client';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Logs error information and displays a fallback UI
 * Requirement: 7.5 - Handle loading states and error conditions gracefully
 */

import React from 'react';
import styles from './ErrorBoundary.module.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    // Store error details in state
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
    
    // In production, you might want to send this to an error reporting service
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    // Reset error state to allow retry
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className={styles.errorBoundary}>
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <h1 className={styles.errorTitle}>Oops! Something went wrong</h1>
            <p className={styles.errorMessage}>
              We're sorry, but something unexpected happened. Please try again.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className={styles.errorDetails}>
                <summary>Error Details (Development Only)</summary>
                <pre className={styles.errorStack}>
                  <strong>Error:</strong> {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <>
                      {'\n\n'}
                      <strong>Component Stack:</strong>
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}
            
            <div className={styles.errorActions}>
              <button 
                onClick={this.handleReset}
                className={styles.retryButton}
              >
                Try Again
              </button>
              <a 
                href="/"
                className={styles.homeButton}
              >
                Go to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
