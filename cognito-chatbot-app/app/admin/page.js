/**
 * Admin Page Component with Server-Side Rendering
 * Accessible only to authenticated users with 'admin' role
 * Displays system statistics and admin-specific content
 */

import { redirect } from 'next/navigation';
import { getServerSession, getUserAttributes } from '../../lib/auth-server';
import styles from './admin.module.css';

/**
 * Server-side authentication and role check
 * Validates session and ensures user has admin role
 */
async function getAdminData() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login?redirect=/admin');
  }
  
  const userAttributes = getUserAttributes(session.idToken);
  
  if (!userAttributes || !userAttributes.role) {
    redirect('/login?error=invalid_session');
  }
  
  // Verify user has admin role
  if (userAttributes.role !== 'admin') {
    redirect('/unauthorized');
  }
  
  return { userAttributes, session };
}

/**
 * Fetch system statistics from admin API
 */
async function getSystemStats(session) {
  try {
    // Call Next.js API route which proxies to Lambda
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/admin/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.idToken}`,
      },
      cache: 'no-store', // Don't cache admin stats
    });
    
    if (!response.ok) {
      console.error('Failed to fetch stats:', response.status);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching system stats:', error);
    return null;
  }
}

/**
 * Admin Page Component
 * Server-side rendered with authentication and role check
 */
export default async function AdminPage() {
  const { userAttributes, session } = await getAdminData();
  const stats = await getSystemStats(session);
  
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <nav className={styles.nav}>
            <a href="/user" className={styles.navLink}>
              User Page
            </a>
            <form action="/api/auth/logout" method="POST" className={styles.logoutForm}>
              <button type="submit" className={styles.logoutButton}>
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>
      
      <main className={styles.main}>
        <div className={styles.adminInfo}>
          <h2>Administrator Profile</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email:</span>
              <span className={styles.infoValue}>{userAttributes.email}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Role:</span>
              <span className={styles.infoValue}>
                <span className={styles.adminBadge}>{userAttributes.role}</span>
              </span>
            </div>
            {userAttributes.department && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Department:</span>
                <span className={styles.infoValue}>{userAttributes.department}</span>
              </div>
            )}
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Username:</span>
              <span className={styles.infoValue}>{userAttributes.username}</span>
            </div>
          </div>
        </div>
        
        <div className={styles.statsSection}>
          <h2>System Statistics</h2>
          {stats ? (
            <>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.totalUsers}</div>
                  <div className={styles.statLabel}>Total Users</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.usersByRole?.user || 0}</div>
                  <div className={styles.statLabel}>Standard Users</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.usersByRole?.admin || 0}</div>
                  <div className={styles.statLabel}>Administrators</div>
                </div>
              </div>
              <div className={styles.statsFooter}>
                <span className={styles.statsTimestamp}>
                  Last updated: {new Date(stats.timestamp).toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <div className={styles.statsError}>
              <p>Unable to load system statistics. Please try again later.</p>
            </div>
          )}
        </div>
        
        <div className={styles.adminActions}>
          <h2>Admin Options</h2>
          <div className={styles.actionsGrid}>
            <div className={styles.actionCard}>
              <h3>User Management</h3>
              <p>View and manage user accounts, roles, and permissions.</p>
              <button className={styles.actionButton} disabled>
                Coming Soon
              </button>
            </div>
            <div className={styles.actionCard}>
              <h3>Knowledge Base</h3>
              <p>Upload and manage documents for the AI chatbot.</p>
              <button className={styles.actionButton} disabled>
                Coming Soon
              </button>
            </div>
            <div className={styles.actionCard}>
              <h3>System Logs</h3>
              <p>View application logs and monitor system health.</p>
              <button className={styles.actionButton} disabled>
                Coming Soon
              </button>
            </div>
            <div className={styles.actionCard}>
              <h3>Settings</h3>
              <p>Configure application settings and preferences.</p>
              <button className={styles.actionButton} disabled>
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
