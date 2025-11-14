'use client';

/**
 * User Page Component (Client-Side)
 * Accessible to authenticated users with 'user' or 'admin' role
 * Includes chatbot interface and user-specific content
 */

import { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, fetchAuthSession, signOut } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import outputs from '../../amplify_outputs.json';
import Chatbot from '../../components/Chatbot';
import styles from './user.module.css';

Amplify.configure(outputs);

export default function UserPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      const idToken = session.tokens?.idToken;
      if (!idToken) {
        router.push('/login?redirect=/user');
        return;
      }

      const userAttributes = {
        email: idToken.payload.email,
        role: idToken.payload['custom:role'],
        department: idToken.payload['custom:department'],
        username: idToken.payload['cognito:username'],
      };

      if (!userAttributes.role) {
        router.push('/unauthorized');
        return;
      }

      setUser(userAttributes);
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login?redirect=/user');
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
          <h1 className={styles.title}>Welcome, {user.email}</h1>
          <nav className={styles.nav}>
            {user.role === 'admin' && (
              <a href="/admin" className={styles.navLink}>
                Admin Dashboard
              </a>
            )}
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
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
