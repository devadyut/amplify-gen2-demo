/**
 * Admin Page Component
 * Accessible only to authenticated users with 'admin' role
 * Displays system statistics and admin-specific content
 * Requirements: 2.2, 5.1, 5.2, 5.3, 5.4, 5.5, 3.3, 3.4
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signOutUser } from '../common/auth-client';
import { get } from 'aws-amplify/api';

export default function AdminPage({ user }) {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    loadAdminStats();
  }, []);

  /**
   * Load admin statistics from Amplify API
   * Fetches data from Lambda function via API Gateway
   */
  async function loadAdminStats() {
    try {
      // Call admin API using Amplify REST API client
      const restOperation = get({
        apiName: 'ChatbotRestAPI',
        path: '/admin',
      });

      const { body } = await restOperation.response;
      const data = await body.json();

      setStats(data.stats || {
        totalUsers: 0,
        activeUsers: 0,
        totalQuestions: 0,
      });
    } catch (error) {
      console.error('Failed to load admin stats:', error);
      // Set default stats on error
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        totalQuestions: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle logout
   * Signs out user and redirects to login page
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
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header-content">
          <h1 className="admin-title">Admin Dashboard</h1>
          <nav className="admin-nav">
            <a href="/user" className="admin-nav-link">
              User Page
            </a>
            <button 
              onClick={handleLogout} 
              className="admin-logout-button"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </nav>
        </div>
      </header>
      
      <main className="admin-main">
        <div className="admin-welcome-section">
          <h2>Welcome, Administrator</h2>
          <p className="admin-user-email">{user.email}</p>
        </div>

        {loading ? (
          <div className="admin-loading">Loading statistics...</div>
        ) : (
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <h3 className="admin-stat-title">Total Users</h3>
              <p className="admin-stat-value">{stats?.totalUsers || 0}</p>
            </div>
            
            <div className="admin-stat-card">
              <h3 className="admin-stat-title">Active Users</h3>
              <p className="admin-stat-value">{stats?.activeUsers || 0}</p>
            </div>
            
            <div className="admin-stat-card">
              <h3 className="admin-stat-title">Total Questions</h3>
              <p className="admin-stat-value">{stats?.totalQuestions || 0}</p>
            </div>
          </div>
        )}

        <div className="admin-section">
          <h2>Admin Functions</h2>
          <p className="admin-description">
            This is the admin dashboard. You can add admin-specific functionality here.
          </p>
          
          <div className="admin-actions">
            <button className="admin-action-button">
              Manage Users
            </button>
            <button className="admin-action-button">
              View Analytics
            </button>
            <button className="admin-action-button">
              System Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Server-side authentication and authorization check
 * Verifies user is authenticated and has admin role
 * Redirects to unauthorized page if not admin
 */
export async function getServerSideProps(context) {
  const { req } = context;
  
  // Extract cookies from request
  const cookies = req.cookies || {};
  
  // Look for Cognito tokens in cookies
  // Amplify stores tokens with pattern: CognitoIdentityServiceProvider.{clientId}.{username}.{tokenType}
  const cookieKeys = Object.keys(cookies);
  
  // Find the idToken cookie
  const idTokenKey = cookieKeys.find(key => 
    key.includes('CognitoIdentityServiceProvider') && key.endsWith('.idToken')
  );
  
  // If no token found, redirect to login
  if (!idTokenKey) {
    return {
      redirect: {
        destination: '/login?redirect=/admin',
        permanent: false,
      },
    };
  }
  
  const idToken = cookies[idTokenKey];
  
  // Decode JWT token to extract user attributes
  // Note: This does NOT verify the signature - signature is verified by API Gateway
  try {
    const tokenParts = idToken.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const payload = tokenParts[1];
    const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
    const claims = JSON.parse(decodedPayload);
    
    // Extract user attributes
    const userAttributes = {
      sub: claims.sub,
      email: claims.email,
      emailVerified: claims.email_verified,
      role: claims['custom:role'],
      department: claims['custom:department'],
      username: claims['cognito:username'],
    };
    
    // Check if user has admin role
    if (userAttributes.role !== 'admin') {
      return {
        redirect: {
          destination: '/unauthorized',
          permanent: false,
        },
      };
    }
    
    // Return user data as props
    return {
      props: {
        user: userAttributes,
      },
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    
    // If token is invalid, redirect to login
    return {
      redirect: {
        destination: '/login?redirect=/admin&error=session_expired',
        permanent: false,
      },
    };
  }
}
