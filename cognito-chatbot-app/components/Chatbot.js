'use client';

/**
 * Chatbot Component
 * Provides AI-powered question-answer interface
 * Handles message history, loading states, and error handling
 */

import { useState } from 'react';
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
      // Call Next.js API route
      const response = await fetch('/api/chatbot/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.content,
          conversationId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Request failed with status ${response.status}`);
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
