# CORS and API Security Configuration

This document describes the CORS (Cross-Origin Resource Sharing) and security configuration for the Cognito Chatbot Application API Gateway.

## Overview

The application uses AWS API Gateway with Cognito User Pool authorization to secure REST API endpoints. CORS is configured to allow requests from authorized origins while maintaining security.

## CORS Configuration

### Allowed Origins

The application uses environment-specific CORS origins:

#### Development/Staging
- `http://localhost:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3000`

#### Production
- `https://yourdomain.com` (update in `amplify/api/resource.ts`)
- `https://www.yourdomain.com` (update in `amplify/api/resource.ts`)

**⚠️ Important:** Update the production origins in `amplify/api/resource.ts` before deploying to production.

### Allowed Methods
- `GET` - For retrieving data (admin stats, etc.)
- `POST` - For submitting data (chatbot questions)
- `OPTIONS` - For CORS preflight requests

### Allowed Headers
- `Content-Type` - For JSON request bodies
- `X-Amz-Date` - AWS signature header
- `Authorization` - JWT bearer token
- `X-Api-Key` - API key (if used)
- `X-Amz-Security-Token` - AWS security token
- `X-Requested-With` - AJAX request identifier

### CORS Settings
- **Allow Credentials:** `true` - Enables cookies and authorization headers
- **Max Age:** `3600` seconds (1 hour) - Caches preflight responses

## API Security

### Authentication

All API endpoints require authentication using AWS Cognito User Pool:

1. **JWT Token Validation**
   - API Gateway uses Cognito User Pool Authorizer
   - Validates JWT token signature and expiration
   - Extracts user claims including custom attributes

2. **Authorization Header**
   - Format: `Authorization: Bearer <JWT_TOKEN>`
   - Required on all protected endpoints
   - Token obtained from Cognito after successful login

### Authorization (ABAC)

Attribute-Based Access Control using Cognito custom attributes:

1. **Custom Attributes**
   - `custom:role` - User role (user or admin)
   - `custom:department` - Optional department attribute

2. **Access Control Rules**
   - **Chatbot API (`/chatbot/ask`):** Requires `custom:role` = "user" OR "admin"
   - **Admin API (`/admin/*`):** Requires `custom:role` = "admin"

3. **Validation Layers**
   - **API Gateway:** Validates JWT token
   - **Lambda Function:** Validates custom:role attribute
   - **Next.js Middleware:** Validates session and role for frontend routes

### Rate Limiting

API Gateway throttling settings:

#### Development/Staging
- **Rate Limit:** 100 requests per second
- **Burst Limit:** 200 requests

#### Production
- **Rate Limit:** 1000 requests per second
- **Burst Limit:** 2000 requests

**Per-Method Throttling:** Enabled for all endpoints

### Request Validation

API Gateway validates:
- Request body structure (POST requests)
- Request parameters (query strings, headers)
- Content-Type headers

Invalid requests return `400 Bad Request` before reaching Lambda.

### Response Headers

All API responses include CORS headers:

```
Access-Control-Allow-Origin: <origin>
Access-Control-Allow-Credentials: true
```

Error responses (401, 403, 500) also include CORS headers to ensure proper error handling in browsers.

## Security Best Practices

### 1. Token Management
- Tokens stored in HTTP-only cookies (Next.js)
- Short token expiration (60 minutes for access/ID tokens)
- Refresh tokens valid for 30 days
- Automatic token refresh on expiration

### 2. HTTPS Only
- All production traffic uses HTTPS
- API Gateway enforces TLS 1.2+
- Certificates managed by AWS

### 3. Logging and Monitoring
- CloudWatch logging enabled for all requests
- X-Ray tracing enabled in production
- Metrics tracked for throttling events
- Error rates monitored

### 4. Input Validation
- Request validation at API Gateway
- Additional validation in Lambda functions
- Sanitization of user inputs
- Protection against injection attacks

### 5. Least Privilege
- Lambda functions have minimal IAM permissions
- S3 bucket access restricted to specific paths
- Bedrock access limited to specific models
- Cognito access limited to read operations

## Testing CORS and Security

### Test CORS Preflight

```bash
# Test chatbot endpoint
curl -X OPTIONS https://your-api-id.execute-api.region.amazonaws.com/prod/chatbot/ask \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization"

# Test admin endpoint
curl -X OPTIONS https://your-api-id.execute-api.region.amazonaws.com/prod/admin/stats \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization"
```

### Test Authentication Requirement

```bash
# Should return 401 Unauthorized
curl -X POST https://your-api-id.execute-api.region.amazonaws.com/prod/chatbot/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "test"}'
```

### Test Authenticated Request

```bash
# Should return 200 OK (with valid token)
curl -X POST https://your-api-id.execute-api.region.amazonaws.com/prod/chatbot/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"question": "What is this application?"}'
```

### Run Automated Tests

```bash
# Verify CORS and security configuration
npm run test:cors-security

# Or directly
node scripts/test-cors-security.js
```

## Configuration Files

### API Gateway Configuration
- **File:** `amplify/api/resource.ts`
- **Purpose:** Defines REST API, CORS, throttling, and security settings

### Lambda Authorization
- **Files:** 
  - `amplify/functions/chatbot/handler.js`
  - `amplify/functions/admin/handler.js`
- **Purpose:** Validates JWT tokens and custom:role attributes

### Next.js Middleware
- **File:** `middleware.js`
- **Purpose:** Server-side authentication and authorization for frontend routes

### Next.js API Routes
- **Files:**
  - `app/api/chatbot/ask/route.js`
  - `app/api/admin/stats/route.js`
- **Purpose:** Proxy requests to API Gateway with session validation

## Troubleshooting

### CORS Errors in Browser

**Symptom:** Browser console shows CORS error

**Solutions:**
1. Verify origin is in allowed origins list
2. Check that preflight request returns 200 OK
3. Ensure credentials are included in request
4. Verify CORS headers in response

### 401 Unauthorized

**Symptom:** API returns 401 even with token

**Solutions:**
1. Verify token is not expired
2. Check Authorization header format
3. Ensure token is from correct User Pool
4. Verify Cognito authorizer configuration

### 403 Forbidden

**Symptom:** API returns 403 after authentication

**Solutions:**
1. Verify custom:role attribute is set
2. Check role value matches requirements
3. Ensure Lambda validates role correctly
4. Review CloudWatch logs for details

### Rate Limiting (429)

**Symptom:** API returns 429 Too Many Requests

**Solutions:**
1. Implement exponential backoff
2. Review throttling limits
3. Consider increasing limits for production
4. Check CloudWatch metrics for patterns

## Production Deployment Checklist

Before deploying to production:

- [ ] Update allowed origins in `amplify/api/resource.ts`
- [ ] Set `AMPLIFY_ENV=production` environment variable
- [ ] Verify rate limiting settings are appropriate
- [ ] Enable X-Ray tracing
- [ ] Configure CloudWatch alarms for errors
- [ ] Test CORS with production domain
- [ ] Verify SSL/TLS certificates
- [ ] Review IAM permissions
- [ ] Test authentication flow end-to-end
- [ ] Monitor initial traffic for issues

## Additional Resources

- [AWS API Gateway CORS Documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)
- [Cognito User Pool Authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html)
- [API Gateway Throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
