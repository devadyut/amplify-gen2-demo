#!/usr/bin/env node

/**
 * Wiring Verification Script
 * Verifies that all components are properly wired together
 * Checks configuration, imports, and integration points
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check if file exists
function checkFileExists(filePath, description) {
  const fullPath = join(projectRoot, filePath);
  if (existsSync(fullPath)) {
    log(`✅ ${description}: ${filePath}`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${filePath} (NOT FOUND)`, 'red');
    return false;
  }
}

// Check file content for specific patterns
function checkFileContent(filePath, patterns, description) {
  const fullPath = join(projectRoot, filePath);
  
  if (!existsSync(fullPath)) {
    log(`❌ ${description}: File not found`, 'red');
    return false;
  }
  
  try {
    const content = readFileSync(fullPath, 'utf-8');
    const results = [];
    
    for (const pattern of patterns) {
      const found = pattern.regex.test(content);
      results.push({
        name: pattern.name,
        found,
      });
      
      if (found) {
        log(`  ✅ ${pattern.name}`, 'green');
      } else {
        log(`  ❌ ${pattern.name}`, 'red');
      }
    }
    
    return results.every(r => r.found);
  } catch (error) {
    log(`❌ ${description}: Error reading file - ${error.message}`, 'red');
    return false;
  }
}

// Verify backend infrastructure
function verifyBackendInfrastructure() {
  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log('  Backend Infrastructure Verification', 'blue');
  log('═══════════════════════════════════════════════════════════\n', 'blue');
  
  const checks = [
    { file: 'amplify/backend.ts', desc: 'Backend configuration' },
    { file: 'amplify/auth/resource.ts', desc: 'Auth resource' },
    { file: 'amplify/api/resource.ts', desc: 'API Gateway resource' },
    { file: 'amplify/storage/resource.ts', desc: 'S3 storage resource' },
    { file: 'amplify/functions/chatbot/resource.ts', desc: 'Chatbot Lambda resource' },
    { file: 'amplify/functions/chatbot/handler.js', desc: 'Chatbot Lambda handler' },
    { file: 'amplify/functions/admin/resource.ts', desc: 'Admin Lambda resource' },
    { file: 'amplify/functions/admin/handler.js', desc: 'Admin Lambda handler' },
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    if (!checkFileExists(check.file, check.desc)) {
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Verify API Gateway configuration
function verifyApiGatewayConfiguration() {
  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log('  API Gateway Configuration Verification', 'blue');
  log('═══════════════════════════════════════════════════════════\n', 'blue');
  
  const patterns = [
    { name: 'REST API creation', regex: /new RestApi/ },
    { name: 'Cognito authorizer', regex: /CognitoUserPoolsAuthorizer/ },
    { name: 'CORS configuration', regex: /defaultCorsPreflightOptions/ },
    { name: 'Chatbot route (/chatbot/ask)', regex: /chatbot.*ask/ },
    { name: 'Admin route (/admin/stats)', regex: /admin.*stats/ },
    { name: 'Lambda integration', regex: /LambdaIntegration/ },
    { name: 'Authorization type', regex: /AuthorizationType\.COGNITO/ },
  ];
  
  return checkFileContent('amplify/api/resource.ts', patterns, 'API Gateway configuration');
}

// Verify Lambda functions
function verifyLambdaFunctions() {
  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log('  Lambda Functions Verification', 'blue');
  log('═══════════════════════════════════════════════════════════\n', 'blue');
  
  log('Chatbot Lambda:', 'yellow');
  const chatbotPatterns = [
    { name: 'JWT token extraction', regex: /extractToken/ },
    { name: 'Token validation', regex: /validateToken/ },
    { name: 'Role validation', regex: /validateRole/ },
    { name: 'S3 document retrieval', regex: /retrieveKnowledgeBase/ },
    { name: 'Bedrock API call', regex: /BedrockRuntimeClient/ },
    { name: 'Error handling', regex: /catch.*error/ },
  ];
  
  const chatbotPassed = checkFileContent(
    'amplify/functions/chatbot/handler.js',
    chatbotPatterns,
    'Chatbot Lambda'
  );
  
  log('\nAdmin Lambda:', 'yellow');
  const adminPatterns = [
    { name: 'JWT token extraction', regex: /extractToken/ },
    { name: 'Token validation', regex: /validateToken/ },
    { name: 'Admin role validation', regex: /validateAdminRole/ },
    { name: 'Cognito integration', regex: /CognitoIdentityProviderClient/ },
    { name: 'Error handling', regex: /catch.*error/ },
  ];
  
  const adminPassed = checkFileContent(
    'amplify/functions/admin/handler.js',
    adminPatterns,
    'Admin Lambda'
  );
  
  return chatbotPassed && adminPassed;
}

// Verify frontend components
function verifyFrontendComponents() {
  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log('  Frontend Components Verification', 'blue');
  log('═══════════════════════════════════════════════════════════\n', 'blue');
  
  const checks = [
    { file: 'app/layout.js', desc: 'Root layout' },
    { file: 'app/login/page.js', desc: 'Login page' },
    { file: 'app/user/page.js', desc: 'User page' },
    { file: 'app/admin/page.js', desc: 'Admin page' },
    { file: 'app/unauthorized/page.js', desc: 'Unauthorized page' },
    { file: 'components/Chatbot.js', desc: 'Chatbot component' },
    { file: 'middleware.js', desc: 'Authentication middleware' },
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    if (!checkFileExists(check.file, check.desc)) {
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Verify Next.js API routes
function verifyNextJsApiRoutes() {
  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log('  Next.js API Routes Verification', 'blue');
  log('═══════════════════════════════════════════════════════════\n', 'blue');
  
  log('Chatbot API Route:', 'yellow');
  const chatbotPatterns = [
    { name: 'Session validation', regex: /getServerSession/ },
    { name: 'API endpoint retrieval', regex: /getApiEndpoint/ },
    { name: 'Request forwarding', regex: /await fetch\(lambdaUrl/ },
    { name: 'Authorization header', regex: /Authorization.*Bearer/ },
    { name: 'Error handling', regex: /catch.*error/ },
  ];
  
  const chatbotPassed = checkFileContent(
    'app/api/chatbot/ask/route.js',
    chatbotPatterns,
    'Chatbot API route'
  );
  
  log('\nAdmin API Route:', 'yellow');
  const adminPatterns = [
    { name: 'Session validation', regex: /getServerSession/ },
    { name: 'Role validation', regex: /getUserRole/ },
    { name: 'API endpoint retrieval', regex: /getApiEndpoint/ },
    { name: 'Request forwarding', regex: /await fetch\(lambdaUrl/ },
    { name: 'Authorization header', regex: /Authorization.*Bearer/ },
    { name: 'Error handling', regex: /catch.*error/ },
  ];
  
  const adminPassed = checkFileContent(
    'app/api/admin/stats/route.js',
    adminPatterns,
    'Admin API route'
  );
  
  return chatbotPassed && adminPassed;
}

// Verify middleware
function verifyMiddleware() {
  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log('  Middleware Verification', 'blue');
  log('═══════════════════════════════════════════════════════════\n', 'blue');
  
  const patterns = [
    { name: 'JWT decoding', regex: /decodeJWT/ },
    { name: 'Token extraction from cookies', regex: /getIdTokenFromCookies/ },
    { name: 'Role extraction', regex: /getUserRole/ },
    { name: 'Token expiration check', regex: /isTokenExpired/ },
    { name: 'Authorization check', regex: /checkAuthorization/ },
    { name: 'Redirect to login', regex: /redirect.*login/ },
    { name: 'Redirect to unauthorized', regex: /redirect.*unauthorized/ },
  ];
  
  return checkFileContent('middleware.js', patterns, 'Middleware');
}

// Verify authentication utilities
function verifyAuthUtilities() {
  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log('  Authentication Utilities Verification', 'blue');
  log('═══════════════════════════════════════════════════════════\n', 'blue');
  
  const patterns = [
    { name: 'Server session retrieval', regex: /getServerSession/ },
    { name: 'JWT decoding', regex: /decodeJWT/ },
    { name: 'Role extraction', regex: /getUserRole/ },
    { name: 'Authorization check', regex: /checkAuthorization/ },
    { name: 'User attributes extraction', regex: /getUserAttributes/ },
  ];
  
  return checkFileContent('lib/auth-server.js', patterns, 'Auth utilities');
}

// Verify Amplify configuration
function verifyAmplifyConfiguration() {
  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log('  Amplify Configuration Verification', 'blue');
  log('═══════════════════════════════════════════════════════════\n', 'blue');
  
  const checks = [
    { file: 'amplify_outputs.json', desc: 'Amplify outputs' },
    { file: 'lib/amplify-config.js', desc: 'Amplify client config' },
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    if (!checkFileExists(check.file, check.desc)) {
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Verify integration points
function verifyIntegrationPoints() {
  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log('  Integration Points Verification', 'blue');
  log('═══════════════════════════════════════════════════════════\n', 'blue');
  
  log('Checking integration points:\n', 'yellow');
  
  const integrationPoints = [
    {
      name: 'Frontend → Next.js API Routes',
      description: 'Chatbot component calls /api/chatbot/ask',
      file: 'components/Chatbot.js',
      pattern: /\/api\/chatbot\/ask/,
    },
    {
      name: 'Next.js API Routes → API Gateway',
      description: 'API routes forward to Lambda via API Gateway',
      file: 'app/api/chatbot/ask/route.js',
      pattern: /await fetch\(lambdaUrl/,
    },
    {
      name: 'API Gateway → Lambda Functions',
      description: 'API Gateway routes to Lambda integrations',
      file: 'amplify/api/resource.ts',
      pattern: /LambdaIntegration/,
    },
    {
      name: 'Lambda → S3',
      description: 'Chatbot Lambda retrieves knowledge base from S3',
      file: 'amplify/functions/chatbot/handler.js',
      pattern: /S3Client/,
    },
    {
      name: 'Lambda → Bedrock',
      description: 'Chatbot Lambda calls Bedrock API',
      file: 'amplify/functions/chatbot/handler.js',
      pattern: /BedrockRuntimeClient/,
    },
    {
      name: 'Lambda → Cognito',
      description: 'Admin Lambda queries Cognito',
      file: 'amplify/functions/admin/handler.js',
      pattern: /CognitoIdentityProviderClient/,
    },
    {
      name: 'Middleware → Auth Check',
      description: 'Middleware validates JWT and checks roles',
      file: 'middleware.js',
      pattern: /checkAuthorization/,
    },
  ];
  
  let allPassed = true;
  
  integrationPoints.forEach(point => {
    const fullPath = join(projectRoot, point.file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      if (point.pattern.test(content)) {
        log(`✅ ${point.name}`, 'green');
        log(`   ${point.description}`, 'reset');
      } else {
        log(`❌ ${point.name}`, 'red');
        log(`   ${point.description}`, 'reset');
        allPassed = false;
      }
    } else {
      log(`❌ ${point.name} (file not found)`, 'red');
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Display summary
function displaySummary(results) {
  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log('  Verification Summary', 'blue');
  log('═══════════════════════════════════════════════════════════\n', 'blue');
  
  const categories = [
    { name: 'Backend Infrastructure', passed: results.backend },
    { name: 'API Gateway Configuration', passed: results.apiGateway },
    { name: 'Lambda Functions', passed: results.lambda },
    { name: 'Frontend Components', passed: results.frontend },
    { name: 'Next.js API Routes', passed: results.apiRoutes },
    { name: 'Middleware', passed: results.middleware },
    { name: 'Auth Utilities', passed: results.authUtils },
    { name: 'Amplify Configuration', passed: results.amplifyConfig },
    { name: 'Integration Points', passed: results.integrationPoints },
  ];
  
  categories.forEach(category => {
    if (category.passed) {
      log(`✅ ${category.name}`, 'green');
    } else {
      log(`❌ ${category.name}`, 'red');
    }
  });
  
  const allPassed = categories.every(c => c.passed);
  
  if (allPassed) {
    log('\n✅ All verifications passed!', 'green');
    log('   All components are properly wired together.\n', 'green');
  } else {
    log('\n❌ Some verifications failed.', 'red');
    log('   Please review the errors above and fix the issues.\n', 'red');
  }
  
  return allPassed;
}

// Main verification function
function runVerification() {
  log('═══════════════════════════════════════════════════════════', 'blue');
  log('  Wiring Verification Script', 'blue');
  log('  Verifying Frontend to Backend Integration', 'blue');
  log('═══════════════════════════════════════════════════════════', 'blue');
  
  const results = {
    backend: verifyBackendInfrastructure(),
    apiGateway: verifyApiGatewayConfiguration(),
    lambda: verifyLambdaFunctions(),
    frontend: verifyFrontendComponents(),
    apiRoutes: verifyNextJsApiRoutes(),
    middleware: verifyMiddleware(),
    authUtils: verifyAuthUtilities(),
    amplifyConfig: verifyAmplifyConfiguration(),
    integrationPoints: verifyIntegrationPoints(),
  };
  
  const allPassed = displaySummary(results);
  
  if (!allPassed) {
    process.exit(1);
  }
}

// Run verification
runVerification();
