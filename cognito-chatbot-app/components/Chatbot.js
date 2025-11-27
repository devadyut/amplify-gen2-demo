'use client';

/**
 * Chatbot Component
 * Provides AI-powered question-answer interface
 * Handles message history, loading states, and error handling
 */

import { useState } from 'react';
import { post } from 'aws-amplify/api';

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
      // Call API using Amplify REST API client
      const restOperation = post({
        apiName: 'ChatbotRestAPI',
        path: 'chatbot',
        options: {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: {
            question: userMessage.content,
            conversationId,
          },
        },
      });

      const { body } = await restOperation.response;
      const data = await body.json();

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
    <div className="chatbot">
      <div className="messagesContainer">
        {messages.length === 0 ? (
          <div className="emptyState">
            <p>👋 Hi! I'm your AI assistant.</p>
            <p>Ask me anything and I'll help you find answers from our knowledge base.</p>
          </div>
        ) : (
          <div className="messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.type}`}
              >
                <div className="messageHeader">
                  <span className="messageLabel">
                    {message.type === 'user' ? 'You' : message.type === 'ai' ? 'AI Assistant' : 'Error'}
                  </span>
                  <span className="messageTime">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="messageContent">
                  {message.content}
                </div>
                {message.sources && message.sources.length > 0 && (
                  <div className="sources">
                    <span className="sourcesLabel">Sources:</span>
                    {message.sources.map((source, index) => (
                      <span key={index} className="source">
                        {source.documentName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="message ai loading">
                <div className="messageHeader">
                  <span className="messageLabel">AI Assistant</span>
                </div>
                <div className="messageContent">
                  <div className="loadingDots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="loadingText">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="errorBanner">
          <span className="errorIcon">⚠️</span>
          <span className="errorText">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="inputForm">
        <div className="inputContainer">
          <input
            type="text"
            value={question}
            onChange={handleInputChange}
            placeholder="Ask a question..."
            className="input"
            disabled={isLoading}
            maxLength={500}
          />
          <button
            type="submit"
            className="submitButton"
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearChat}
            className="clearButton"
            disabled={isLoading}
          >
            Clear Chat
          </button>
        )}
      </form>
    </div>
  );
}
