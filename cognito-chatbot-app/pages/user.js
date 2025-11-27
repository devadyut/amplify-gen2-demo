/**
 * User Page Component
 * Accessible to authenticated users with 'user' or 'admin' role
 * Includes chatbot interface and user-specific content
 * Requirements: 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 4.5, 3.3, 3.4
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOutUser } from '@/common/auth-client';
import Chatbot from '../components/Chatbot';

export default function UserPage({ user }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Handle logout
   * Signs out user and redirects to login page
   */
  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      const result = await signOutUser();
      if (result.success) {
        await router.push('/login');
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
    <div className="user-container">
      <header className="user-header">
        <div className="user-header-content">
          <h1 className="user-title">Welcome, {user.email}</h1>
          <nav className="user-nav">
            {user.role === 'admin' && (
              <Link href="/admin"  as="/admin" className="user-nav-link">
                Admin Dashboard
              </Link>
            )}
            <button 
              onClick={handleLogout} 
              className="user-logout-button"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </nav>
        </div>
      </header>
      
      <main className="user-main">
        <div className="user-info">
          <h2>Your Profile</h2>
          <div className="user-info-grid">
            <div className="user-info-item">
              <span className="user-info-label">Email:</span>
              <span className="user-info-value">{user.email}</span>
            </div>
            <div className="user-info-item">
              <span className="user-info-label">Role:</span>
              <span className="user-info-value">{user.role}</span>
            </div>
            {user.department && (
              <div className="user-info-item">
                <span className="user-info-label">Department:</span>
                <span className="user-info-value">{user.department}</span>
              </div>
            )}
            <div className="user-info-item">
              <span className="user-info-label">Username:</span>
              <span className="user-info-value">{user.username}</span>
            </div>
          </div>
        </div>
        
        <div className="user-chatbot-section">
          <h2>AI Assistant</h2>
          <p className="user-chatbot-description">
            Ask questions and get AI-powered answers based on our knowledge base.
          </p>
          <Chatbot />
        </div>
      </main>
    </div>
  );
}

/**
 * Server-side authentication check
 * Verifies user is authenticated and fetches user data
 * Redirects to login if not authenticated
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
        destination: '/login?redirect=/user',
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
      //department: claims['custom:department'],
      username: claims['cognito:username'],
    };
    
    // Check if user has a role (user or admin)
    if (!userAttributes.role) {
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
        destination: '/login?redirect=/user&error=session_expired',
        permanent: false,
      },
    };
  }
}
