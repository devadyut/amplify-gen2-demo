/**
 * Token Diagnostic Script
 * Run this to check if you're getting the ID token correctly
 * 
 * Usage: node test-token.js
 */

// Decode a JWT token (without verification)
function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

console.log('=== Token Diagnostic Tool ===\n');
console.log('Instructions:');
console.log('1. Log in to your app');
console.log('2. Open browser DevTools Console');
console.log('3. Run this code in the console:\n');
console.log('```javascript');
console.log('import { fetchAuthSession } from "aws-amplify/auth";');
console.log('const session = await fetchAuthSession();');
console.log('console.log("Access Token:", session.tokens.accessToken.toString());');
console.log('console.log("ID Token:", session.tokens.idToken.toString());');
console.log('```\n');
console.log('4. Copy the ID token and paste it below as an argument:\n');
console.log('   node test-token.js "YOUR_ID_TOKEN_HERE"\n');

if (process.argv.length < 3) {
  console.log('No token provided. Exiting...');
  process.exit(0);
}

const token = process.argv[2];
const decoded = decodeToken(token);

if (!decoded) {
  console.error('Failed to decode token');
  process.exit(1);
}

console.log('=== Decoded Token ===\n');
console.log(JSON.stringify(decoded, null, 2));
console.log('\n=== Token Analysis ===\n');
console.log('Token Type:', decoded.token_use);
console.log('Issuer:', decoded.iss);
console.log('Client ID:', decoded.client_id || decoded.aud);
console.log('Username:', decoded['cognito:username']);
console.log('Email:', decoded.email);
console.log('Custom Role:', decoded['custom:role']);
console.log('Custom Department:', decoded['custom:department']);
console.log('Issued At:', new Date(decoded.iat * 1000).toISOString());
console.log('Expires At:', new Date(decoded.exp * 1000).toISOString());
console.log('Time Until Expiry:', Math.floor((decoded.exp * 1000 - Date.now()) / 1000), 'seconds');

console.log('\n=== Validation ===\n');

if (decoded.token_use !== 'id') {
  console.error('❌ WRONG TOKEN TYPE! This is an', decoded.token_use, 'token, not an ID token');
  console.log('   Make sure you\'re using session.tokens.idToken, not session.tokens.accessToken');
} else {
  console.log('✅ Correct token type (ID token)');
}

if (!decoded['custom:role']) {
  console.error('❌ Missing custom:role attribute!');
  console.log('   The user might not have been assigned a role yet');
} else {
  console.log('✅ Has custom:role attribute:', decoded['custom:role']);
}

if (decoded.exp * 1000 < Date.now()) {
  console.error('❌ Token is EXPIRED!');
} else {
  console.log('✅ Token is still valid');
}

console.log('\n=== Expected API Gateway Configuration ===\n');
console.log('User Pool ID:', decoded.iss.split('/').pop());
console.log('Client ID:', decoded.client_id || decoded.aud);
console.log('Region:', decoded.iss.split('.')[2]);
