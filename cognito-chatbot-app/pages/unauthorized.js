/**
 * Unauthorized Access Page (403 Forbidden)
 * Displayed when a user attempts to access a resource they don't have permission for
 * Requirement: 2.5 - Display unauthorized message and prevent access
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { signOutUser } from '../common/auth-client';

export default function UnauthorizedPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Handle logout
   * Signs out user and redirects to login page
   * Useful when user needs to log in with a different account
   */
  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      } else {
        console.error('Logout failed:', result.error);
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <Head>
        <title>Access Denied - Cognito Chatbot App</title>
        <meta name="description" content="You do not have permission to access this page" />
      </Head>
      
      <div className="unauthorizedPage">
        <div className="container">
          <div className="iconContainer">
            <div className="lockIcon">🔒</div>
          </div>
          
          <h1 className="title">Access Denied</h1>
          
          <div className="statusCode">403 Forbidden</div>
          
          <p className="message">
            You don't have permission to access this page. This area is restricted to users with specific roles.
          </p>
          
          <div className="details">
            <p>This could be because:</p>
            <ul>
              <li>Your account doesn't have the required role</li>
              <li>Your session has expired</li>
              <li>You need to log in with a different account</li>
            </ul>
          </div>
          
          <div className="actions">
            <button 
              onClick={handleLogout} 
              className="logoutButton"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout & Try Different Account'}
            </button>
            <Link href="/login" className="loginButton">
              Go to Login
            </Link>
            <Link href="/" className="homeButton">
              Go to Home
            </Link>
          </div>
          
          <div className="helpText">
            <p>
              If you believe you should have access to this page, please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
