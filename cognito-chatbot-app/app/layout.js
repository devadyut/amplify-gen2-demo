import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { configureAmplifyClient } from '../lib/amplify-config';
import ErrorBoundary from '../components/ErrorBoundary';

// Configure Amplify for client-side with SSR support
configureAmplifyClient();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Cognito Chatbot App",
  description: "AI-powered chatbot with AWS Cognito authentication and ABAC",
};

/**
 * Root layout component for the application
 * Configures Amplify and provides global styles
 * Supports server-side rendering with authentication
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ErrorBoundary>
          <div className="app-container">
            {children}
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
