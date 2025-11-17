'use client';

/**
 * Chatbot Component
 * Provides AI-powered question-answer interface
 * Handles message history, loading states, and error handling
 */

import { useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import outputs from '../amplify_outputs.json';
import styles from './Chatbot.module.css';

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  /**
   * Handle question submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate input
    if (!question.trim()) {
      return;
    }

    // Clear any previous errors
    setError(null);

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: question.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);

    try {
      // Get ID token from current session (contains custom:role attribute)
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (!idToken) {
        throw new Error('No authentication token available. Please log in again.');
      }

      console.log('Using ID token for authentication');

      // Get API Gateway endpoint from Amplify outputs
      const apiEndpoint = outputs.custom?.API?.endpoint;
      if (!apiEndpoint) {
        throw new Error('API endpoint not configured');
      }
      
      // Remove trailing slash if present
      const baseUrl = apiEndpoint.endsWith('/') ? apiEndpoint.slice(0, -1) : apiEndpoint;
      const apiUrl = `${baseUrl}/chatbot/ask`;

      // Call API Gateway directly
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          question: userMessage.content,
          conversationId,
        }),
      });
      console.log('API Gateway response status:', response.status);

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch (parseError) {
          // Response is not JSON, might be HTML
          const text = await response.text();
          console.error('Non-JSON response:', text.substring(0, 200));
          errorMessage = 'Server returned an invalid response';
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Update conversation ID
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      // Add AI response to chat
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.answer,
        sources: data.sources,
        timestamp: data.timestamp,
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (err) {
      console.error('Chatbot error:', err);

      // Display error message
      setError(err.message || 'Failed to get response. Please try again.');

      // Add error message to chat
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Sorry, I encountered an error processing your question. Please try again.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);

    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle input change
   */
  const handleInputChange = (e) => {
    setQuestion(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  /**
   * Clear chat history
   */
  const handleClearChat = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  };

  return (
    <div className={styles.chatbot}>
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>👋 Hi! I'm your AI assistant.</p>
            <p>Ask me anything and I'll help you find answers from our knowledge base.</p>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.message} ${styles[message.type]}`}
              >
                <div className={styles.messageHeader}>
                  <span className={styles.messageLabel}>
                    {message.type === 'user' ? 'You' : message.type === 'ai' ? 'AI Assistant' : 'Error'}
                  </span>
                  <span className={styles.messageTime}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className={styles.messageContent}>
                  {message.content}
                </div>
                {message.sources && message.sources.length > 0 && (
                  <div className={styles.sources}>
                    <span className={styles.sourcesLabel}>Sources:</span>
                    {message.sources.map((source, index) => (
                      <span key={index} className={styles.source}>
                        {source.documentName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className={`${styles.message} ${styles.ai} ${styles.loading}`}>
                <div className={styles.messageHeader}>
                  <span className={styles.messageLabel}>AI Assistant</span>
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.loadingDots}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className={styles.loadingText}>Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorText}>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <div className={styles.inputContainer}>
          <input
            type="text"
            value={question}
            onChange={handleInputChange}
            placeholder="Ask a question..."
            className={styles.input}
            disabled={isLoading}
            maxLength={500}
          />
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearChat}
            className={styles.clearButton}
            disabled={isLoading}
          >
            Clear Chat
          </button>
        )}
      </form>
    </div>
  );
}
