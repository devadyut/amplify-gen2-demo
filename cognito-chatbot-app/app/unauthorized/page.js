/**
 * Unauthorized Access Page (403 Forbidden)
 * Displayed when a user attempts to access a resource they don't have permission for
 * Requirement: 2.5 - Display unauthorized message and prevent access
 */

import Link from 'next/link';
import styles from './unauthorized.module.css';

export const metadata = {
  title: 'Access Denied - Cognito Chatbot App',
  description: 'You do not have permission to access this page',
};

export default function UnauthorizedPage() {
  return (
    <div className={styles.unauthorizedPage}>
      <div className={styles.container}>
        <div className={styles.iconContainer}>
          <div className={styles.lockIcon}>🔒</div>
        </div>
        
        <h1 className={styles.title}>Access Denied</h1>
        
        <div className={styles.statusCode}>403 Forbidden</div>
        
        <p className={styles.message}>
          You don't have permission to access this page. This area is restricted to users with specific roles.
        </p>
        
        <div className={styles.details}>
          <p>This could be because:</p>
          <ul>
            <li>Your account doesn't have the required role</li>
            <li>Your session has expired</li>
            <li>You need to log in with a different account</li>
          </ul>
        </div>
        
        <div className={styles.actions}>
          <Link href="/login" className={styles.loginButton}>
            Go to Login
          </Link>
          <Link href="/" className={styles.homeButton}>
            Go to Home
          </Link>
        </div>
        
        <div className={styles.helpText}>
          <p>
            If you believe you should have access to this page, please contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
