# API Gateway Configuration

## Overview

The REST API is configured with AWS API Gateway and uses Cognito User Pool for authentication. All endpoints require a valid JWT token in the Authorization header.

## Endpoints

### Chatbot Endpoints

#### POST /chatbot/ask
- **Description**: Submit a question to the chatbot
- **Authentication**: Required (Cognito JWT)
- **Authorization**: User or Admin role
- **Request Body**:
  ```json
  {
    "question": "string",
    "conversationId": "string" (optional)
  }
  ```
- **Response**:
  ```json
  {
    "answer": "string",
    "conversationId": "string",
    "timestamp": "ISO8601 string"
  }
  ```

### Admin Endpoints

#### GET /admin/stats
- **Description**: Get system statistics
- **Authentication**: Required (Cognito JWT)
- **Authorization**: Admin role only
- **Response**:
  ```json
  {
    "stats": {
      "totalUsers": "number",
      "activeUsers": "number"
    }
  }
  ```

#### GET /admin/users
- **Description**: List users in the system
- **Authentication**: Required (Cognito JWT)
- **Authorization**: Admin role only
- **Response**:
  ```json
  {
    "users": [
      {
        "username": "string",
        "email": "string",
        "role": "string"
      }
    ]
  }
  ```

## Configuration

### CORS
- **Allowed Origins**: All origins (configure for production)
- **Allowed Methods**: All methods
- **Allowed Headers**: Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token
- **Allow Credentials**: true

### Throttling
- **Rate Limit**: 100 requests per second
- **Burst Limit**: 200 requests

### Logging
- **Metrics**: Enabled
- **Logging Level**: INFO
- **Data Trace**: Enabled

## Authorization

All endpoints use Cognito User Pool Authorizer. The JWT token must be included in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

The Lambda functions validate the `custom:role` attribute from the JWT token to enforce role-based access control.

## Outputs

The API Gateway configuration is exported to `amplify_outputs.json` with the following structure:

```json
{
  "custom": {
    "API": {
      "endpoint": "https://xxxxx.execute-api.region.amazonaws.com/prod",
      "region": "us-east-1",
      "apiId": "xxxxx"
    }
  }
}
```

## Usage in Frontend

Import the API configuration in your Next.js application:

```javascript
import outputs from '../amplify_outputs.json';

const apiEndpoint = outputs.custom.API.endpoint;

// Example: Call chatbot endpoint
const response = await fetch(`${apiEndpoint}/chatbot/ask`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`,
  },
  body: JSON.stringify({
    question: 'What is the product?',
  }),
});
```
