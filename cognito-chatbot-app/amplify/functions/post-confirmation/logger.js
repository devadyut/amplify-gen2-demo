/**
 * Structured logging utility for Lambda functions
 * Provides consistent JSON-formatted logging with context
 */

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

// Get log level from environment variable, default to INFO
const currentLogLevel = process.env.LOG_LEVEL || 'INFO';

/**
 * Check if a log level should be logged based on current log level
 */
function shouldLog(level) {
  const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
  const currentIndex = levels.indexOf(currentLogLevel);
  const messageIndex = levels.indexOf(level);
  return messageIndex >= currentIndex;
}

/**
 * Create structured log entry
 */
function createLogEntry(level, message, context = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || 'unknown',
    ...context,
  };

  // Remove undefined values
  Object.keys(entry).forEach(key => {
    if (entry[key] === undefined) {
      delete entry[key];
    }
  });

  return entry;
}

/**
 * Sanitize sensitive data from logs
 */
function sanitize(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'apikey', 'api_key'];

  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitize(sanitized[key]);
    }
  });

  return sanitized;
}

/**
 * Logger class
 */
class Logger {
  constructor(context = {}) {
    this.context = context;
  }

  /**
   * Add persistent context to all log entries
   */
  addContext(additionalContext) {
    this.context = { ...this.context, ...additionalContext };
  }

  /**
   * Log debug message
   */
  debug(message, context = {}) {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      const entry = createLogEntry(LOG_LEVELS.DEBUG, message, {
        ...this.context,
        ...sanitize(context),
      });
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Log info message
   */
  info(message, context = {}) {
    if (shouldLog(LOG_LEVELS.INFO)) {
      const entry = createLogEntry(LOG_LEVELS.INFO, message, {
        ...this.context,
        ...sanitize(context),
      });
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Log warning message
   */
  warn(message, context = {}) {
    if (shouldLog(LOG_LEVELS.WARN)) {
      const entry = createLogEntry(LOG_LEVELS.WARN, message, {
        ...this.context,
        ...sanitize(context),
      });
      console.warn(JSON.stringify(entry));
    }
  }

  /**
   * Log error message
   */
  error(message, error, context = {}) {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      const entry = createLogEntry(LOG_LEVELS.ERROR, message, {
        ...this.context,
        ...sanitize(context),
        error: error ? {
          message: error.message,
          name: error.name,
          stack: error.stack,
          code: error.code,
        } : undefined,
      });
      console.error(JSON.stringify(entry));
    }
  }

  /**
   * Log external service call
   */
  logServiceCall(serviceName, operation, context = {}) {
    this.info(`Calling ${serviceName}`, {
      service: serviceName,
      operation,
      ...context,
    });
  }

  /**
   * Log authentication/authorization decision
   */
  logAuthDecision(decision, context = {}) {
    this.info(`Authorization decision: ${decision}`, {
      authDecision: decision,
      ...context,
    });
  }
}

/**
 * Create a logger instance with optional context
 */
export function createLogger(context = {}) {
  return new Logger(context);
}

export default { createLogger, LOG_LEVELS };
