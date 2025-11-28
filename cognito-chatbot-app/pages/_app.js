/**
 * Custom App Component for Pages Router
 * Initializes Amplify configuration and provides global layout
 * Requirements: 1.2, 8.1, 8.3, 8.4
 */

import React from 'react';
import Head from 'next/head';
import { Geist, Geist_Mono } from 'next/font/google';
import { configureAmplifyClient } from '@/common/amplify-config';
import ErrorBoundary from '../components/ErrorBoundary';

// Define fonts - must be at module level
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Import all CSS files in the specified order
// Global styles
import '../styles/globals.css';

// Component styles
import '../styles/components/chatbot.css';
import '../styles/components/errorboundary.css';

// Page styles
import '../styles/pages/index.css';
import '../styles/pages/login.css';
import '../styles/pages/signup.css';
import '../styles/pages/user.css';
import '../styles/pages/admin.css';
import '../styles/pages/unauthorized.css';

// Configure Amplify at module level
configureAmplifyClient();

/**
 * Custom App component that wraps all pages
 * Provides global configuration, error boundary, and font variables
 */
export default function App({ Component, pageProps }) {
  return (
    <main className={`${geistSans.variable} ${geistMono.variable}`}>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Cognito Chatbot Application - AI-powered chatbot with AWS Cognito authentication" />
        <meta name="theme-color" content="#000000" />
        <title>Cognito Chatbot App</title>
      </Head>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </main>
  );
}
