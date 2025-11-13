/**
 * Environment-specific configuration for Amplify backend
 * This file centralizes environment settings for different deployment stages
 */

export interface EnvironmentConfig {
  name: string;
  isProduction: boolean;
  isStaging: boolean;
  isDevelopment: boolean;
  
  // Lambda configuration
  lambda: {
    chatbot: {
      timeout: number;
      memory: number;
      logLevel: string;
    };
    admin: {
      timeout: number;
      memory: number;
      logLevel: string;
    };
  };
  
  // API Gateway configuration
  api: {
    throttling: {
      rateLimit: number;
      burstLimit: number;
    };
  };
  
  // Cognito configuration
  cognito: {
    passwordPolicy: {
      minimumLength: number;
      requireLowercase: boolean;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
    tokenValidity: {
      accessToken: number; // minutes
      idToken: number; // minutes
      refreshToken: number; // days
    };
    mfaConfiguration: 'OFF' | 'OPTIONAL' | 'ON';
  };
  
  // Monitoring configuration
  monitoring: {
    enableDetailedMetrics: boolean;
    logRetentionDays: number;
  };
  
  // S3 configuration
  storage: {
    versioningEnabled: boolean;
  };
}

/**
 * Get environment configuration based on AMPLIFY_ENV
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const envName = process.env.AMPLIFY_ENV || 'dev';
  
  const baseConfig: EnvironmentConfig = {
    name: envName,
    isProduction: envName === 'production',
    isStaging: envName === 'staging',
    isDevelopment: envName === 'dev',
    
    lambda: {
      chatbot: {
        timeout: parseInt(process.env.CHATBOT_LAMBDA_TIMEOUT || '30'),
        memory: parseInt(process.env.CHATBOT_LAMBDA_MEMORY || '512'),
        logLevel: 'INFO',
      },
      admin: {
        timeout: parseInt(process.env.ADMIN_LAMBDA_TIMEOUT || '10'),
        memory: parseInt(process.env.ADMIN_LAMBDA_MEMORY || '256'),
        logLevel: 'INFO',
      },
    },
    
    api: {
      throttling: {
        rateLimit: parseInt(process.env.API_RATE_LIMIT || '1000'),
        burstLimit: parseInt(process.env.API_BURST_LIMIT || '2000'),
      },
    },
    
    cognito: {
      passwordPolicy: {
        minimumLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: true,
      },
      tokenValidity: {
        accessToken: parseInt(process.env.ACCESS_TOKEN_VALIDITY || '60'),
        idToken: parseInt(process.env.ID_TOKEN_VALIDITY || '60'),
        refreshToken: parseInt(process.env.REFRESH_TOKEN_VALIDITY || '30'),
      },
      mfaConfiguration: (process.env.MFA_CONFIGURATION as 'OFF' | 'OPTIONAL' | 'ON') || 'OPTIONAL',
    },
    
    monitoring: {
      enableDetailedMetrics: false,
      logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '7'),
    },
    
    storage: {
      versioningEnabled: process.env.S3_VERSIONING_ENABLED === 'true',
    },
  };
  
  // Environment-specific overrides
  if (envName === 'production') {
    return {
      ...baseConfig,
      lambda: {
        chatbot: {
          ...baseConfig.lambda.chatbot,
          logLevel: 'INFO',
        },
        admin: {
          ...baseConfig.lambda.admin,
          logLevel: 'INFO',
        },
      },
      api: {
        throttling: {
          rateLimit: 2000,
          burstLimit: 4000,
        },
      },
      monitoring: {
        enableDetailedMetrics: true,
        logRetentionDays: 30,
      },
      storage: {
        versioningEnabled: true,
      },
    };
  }
  
  if (envName === 'staging') {
    return {
      ...baseConfig,
      lambda: {
        chatbot: {
          ...baseConfig.lambda.chatbot,
          logLevel: 'DEBUG',
        },
        admin: {
          ...baseConfig.lambda.admin,
          logLevel: 'DEBUG',
        },
      },
      api: {
        throttling: {
          rateLimit: 1000,
          burstLimit: 2000,
        },
      },
      monitoring: {
        enableDetailedMetrics: true,
        logRetentionDays: 14,
      },
      storage: {
        versioningEnabled: true,
      },
    };
  }
  
  // Development environment
  return {
    ...baseConfig,
    lambda: {
      chatbot: {
        ...baseConfig.lambda.chatbot,
        logLevel: 'DEBUG',
      },
      admin: {
        ...baseConfig.lambda.admin,
        logLevel: 'DEBUG',
      },
    },
    api: {
      throttling: {
        rateLimit: 500,
        burstLimit: 1000,
      },
    },
    monitoring: {
      enableDetailedMetrics: false,
      logRetentionDays: 7,
    },
    storage: {
      versioningEnabled: false,
    },
  };
}
