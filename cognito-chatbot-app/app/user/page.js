/**
 * User Page Component with Server-Side Rendering
 * Accessible to authenticated users with 'user' or 'admin' role
 * Includes chatbot interface and user-specific content
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession, getUserAttributes } from '../../lib/auth-server';
import Chatbot from '../../components/Chatbot';
import styles from './user.module.css';

/**
 * Server-side authentication check
 * Validates session and extracts user attributes
 */
async function getUserData() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login?redirect=/user');
  }
  
  const userAttributes = getUserAttributes(session.idToken);
  
  if (!userAttributes || !userAttributes.role) {
    redirect('/login?error=invalid_session');
  }
  
  // Verify user has appropriate role (user or admin)
  if (userAttributes.role !== 'user' && userAttributes.role !== 'admin') {
    redirect('/unauthorized');
  }
  
  return userAttributes;
}

/**
 * User Page Component
 * Server-side rendered with authentication check
 */
export default async function UserPage() {
  const user = await getUserData();
  
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Welcome, {user.email}</h1>
          <nav className={styles.nav}>
            {user.role === 'admin' && (
              <a href="/admin" className={styles.navLink}>
                Admin Dashboard
              </a>
            )}
            <form action="/api/auth/logout" method="POST" className={styles.logoutForm}>
              <button type="submit" className={styles.logoutButton}>
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>
      
      <main className={styles.main}>
        <div className={styles.userInfo}>
          <h2>Your Profile</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email:</span>
              <span className={styles.infoValue}>{user.email}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Role:</span>
              <span className={styles.infoValue}>{user.role}</span>
            </div>
            {user.department && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Department:</span>
                <span className={styles.infoValue}>{user.department}</span>
              </div>
            )}
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Username:</span>
              <span className={styles.infoValue}>{user.username}</span>
            </div>
          </div>
        </div>
        
        <div className={styles.chatbotSection}>
          <h2>AI Assistant</h2>
          <p className={styles.chatbotDescription}>
            Ask questions and get AI-powered answers based on our knowledge base.
          </p>
          <Chatbot />
        </div>
      </main>
    </div>
  );
}
