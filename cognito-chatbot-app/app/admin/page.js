'use client';

/**
 * Admin Page Component (Client-Side)
 * Accessible only to authenticated users with 'admin' role
 * Displays system statistics and admin-specific content
 */

import { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, fetchAuthSession, signOut } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import outputs from '../../amplify_outputs.json';
import styles from './admin.module.css';

Amplify.configure(outputs);

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      const idToken = session.tokens?.idToken;
      if (!idToken) {
        router.push('/login?redirect=/admin');
        return;
      }

      const userAttributes = {
        email: idToken.payload.email,
        role: idToken.payload['custom:role'],
        department: idToken.payload['custom:department'],
        username: idToken.payload['cognito:username'],
      };

      // Check if user has admin role
      if (userAttributes.role !== 'admin') {
        router.push('/unauthorized');
        return;
      }

      setUser(userAttributes);
      setLoading(false);
      
      // Load admin stats (placeholder for now)
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        totalQuestions: 0,
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login?redirect=/admin');
    }
  }

  async function handleLogout() {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <nav className={styles.nav}>
            <a href="/user" className={styles.navLink}>
              User Page
            </a>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </nav>
        </div>
      </header>
      
      <main className={styles.main}>
        <div className={styles.welcomeSection}>
          <h2>Welcome, Administrator</h2>
          <p className={styles.userEmail}>{user.email}</p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3 className={styles.statTitle}>Total Users</h3>
            <p className={styles.statValue}>{stats?.totalUsers || 0}</p>
          </div>
          
          <div className={styles.statCard}>
            <h3 className={styles.statTitle}>Active Users</h3>
            <p className={styles.statValue}>{stats?.activeUsers || 0}</p>
          </div>
          
          <div className={styles.statCard}>
            <h3 className={styles.statTitle}>Total Questions</h3>
            <p className={styles.statValue}>{stats?.totalQuestions || 0}</p>
          </div>
        </div>

        <div className={styles.adminSection}>
          <h2>Admin Functions</h2>
          <p className={styles.description}>
            This is the admin dashboard. You can add admin-specific functionality here.
          </p>
          
          <div className={styles.adminActions}>
            <button className={styles.actionButton}>
              Manage Users
            </button>
            <button className={styles.actionButton}>
              View Analytics
            </button>
            <button className={styles.actionButton}>
              System Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
