# User Page Implementation

This document describes the implementation of the User page with chatbot functionality.

## Overview

The User page is a server-side rendered (SSR) page that provides authenticated users with access to an AI-powered chatbot interface. It implements proper authentication checks, role-based access control, and a complete chat experience.

## Components

### 1. User Page (`app/user/page.js`)

**Features:**
- Server-side authentication check using `getServerSession()`
- Extracts user attributes from JWT token (email, role, department, username)
- Validates user has appropriate role ('user' or 'admin')
- Displays user profile information
- Includes chatbot component
- Provides navigation to admin dashboard (for admin users)
- Logout functionality

**Authentication Flow:**
1. Server component calls `getServerSession()` to retrieve session
2. If no session, redirects to login page
3. Extracts user attributes from ID token
4. Validates user role (must be 'user' or 'admin')
5. If invalid, redirects to unauthorized page
6. Renders page with user data

### 2. Chatbot Component (`components/Chatbot.js`)

**Features:**
- Client-side React component with state management
- Message history display (user messages, AI responses, errors)
- Question input field with validation
- Loading states during API calls
- Error handling and display
- Conversation ID tracking for context
- Source document display
- Clear chat functionality

**User Experience:**
- Empty state with welcome message
- Real-time message updates
- Animated loading indicator
- Error messages with retry capability
- Responsive design for mobile devices

**API Integration:**
- Calls `/api/chatbot/ask` Next.js API route
- Sends question and conversation ID
- Receives AI-generated answer with sources
- Handles various error scenarios

### 3. Chatbot API Route (`app/api/chatbot/ask/route.js`)

**Features:**
- Server-side session validation
- Request body parsing and validation
- Proxies requests to Lambda function via API Gateway
- Forwards authentication token in Authorization header
- Error handling with appropriate status codes
- CORS support

**Request Flow:**
1. Validates server-side session
2. Extracts and validates question from request body
3. Gets API Gateway endpoint from Amplify outputs
4. Forwards request to Lambda with Bearer token
5. Returns Lambda response to client

**Error Handling:**
- 401: Unauthorized (no session)
- 400: Invalid request body or question
- 503: Service unavailable (API not configured or unreachable)
- 500: Internal server error

### 4. Logout API Route (`app/api/auth/logout/route.js`)

**Features:**
- Clears all Cognito authentication cookies
- Redirects to login page
- Handles errors gracefully

## API Contract

### POST /api/chatbot/ask

**Request:**
```json
{
  "question": "string (required, non-empty)",
  "conversationId": "string (optional)"
}
```

**Response (Success - 200):**
```json
{
  "answer": "string",
  "conversationId": "string",
  "sources": [
    {
      "documentName": "string",
      "documentId": "string"
    }
  ],
  "timestamp": "ISO8601 string"
}
```

**Response (Error):**
```json
{
  "error": {
    "code": "string",
    "message": "string"
  }
}
```

## Styling

### User Page Styles (`app/user/user.module.css`)
- Clean, modern design with gradient background
- Responsive layout with flexbox and grid
- Card-based sections for profile and chatbot
- Mobile-friendly with media queries

### Chatbot Styles (`components/Chatbot.module.css`)
- Chat interface with message bubbles
- Distinct styling for user, AI, and error messages
- Animated loading indicator
- Smooth animations for message appearance
- Responsive design for various screen sizes

## Security Considerations

1. **Server-Side Authentication**: All authentication checks happen on the server
2. **Token Validation**: JWT tokens validated before API calls
3. **Session Management**: Secure cookie-based session storage
4. **Input Validation**: Question input validated on both client and server
5. **Error Messages**: Generic error messages to avoid information leakage

## Usage

### Accessing the User Page

1. User must be authenticated with Cognito
2. User must have 'user' or 'admin' role in custom:role attribute
3. Navigate to `/user` route
4. Middleware validates authentication and authorization

### Using the Chatbot

1. Type question in input field
2. Click "Send" or press Enter
3. Wait for AI response (loading indicator shown)
4. View answer with source documents
5. Continue conversation or clear chat

### Logging Out

1. Click "Logout" button in header
2. All authentication cookies cleared
3. Redirected to login page

## Requirements Satisfied

- **Requirement 3.2**: User page accessible to authenticated users with User or Admin role
- **Requirement 3.4**: Navigation between pages with maintained authentication state
- **Requirement 5.1**: Chatbot interface on user page
- **Requirement 5.2**: Question submission to API Gateway
- **Requirement 5.6**: Display AI-generated responses in chatbot interface

## Next Steps

To complete the application:
1. Implement Admin page (Task 10)
2. Implement error handling and unauthorized access page (Task 11)
3. Configure deployment settings (Task 12)
4. Wire frontend to backend APIs (Task 13)
