# Alewlsh API Documentation

This repository contains comprehensive API documentation for the Alewlsh emergency response platform.

## Files

- `swagger.json` - OpenAPI 3.0 specification for all API endpoints
- `api-docs.html` - Interactive Swagger UI documentation

## How to View Documentation

### Option 1: Local Swagger UI
1. Start the Next.js development server: `npm run dev`
2. Open `http://localhost:3000/api-docs.html` in your browser

### Option 2: Online Swagger Editor
1. Go to [Swagger Editor](https://editor.swagger.io/)
2. Copy and paste the contents of `swagger.json`
3. View the interactive documentation

### Option 3: VS Code Extension
Install the "OpenAPI (Swagger) Editor" extension in VS Code and open `swagger.json`

## API Endpoints Overview

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Emergency Contacts
- `GET /api/emergency-contacts` - Get user's emergency contacts
- `POST /api/emergency-contacts` - Add new emergency contact

### Panic Alerts
- `POST /api/panic` - Create panic alert
- `POST /api/panic/accept` - Accept panic alert as helper
- `GET /api/panic/active` - Get nearby active alerts
- `GET /api/panic/history` - Get user's panic history
- `POST /api/panic/resolve` - Resolve panic alert

### Safety Features
- `GET /api/safety/heatmap` - Get safety heatmap data
- `GET /api/safety/risk-score` - Get risk score for location

### Helpers & Police
- `GET /api/helpers` - Get helpers for panic alert
- `GET /api/police/alerts` - Get alerts for police officers

### Testing Endpoints
- `GET /api/test-db` - Test database connection
- `GET /api/test-fcm` - Test Firebase Cloud Messaging
- `GET /api/test-sms` - Test SMS functionality

## Testing Credentials

### Working Test User:
- **Phone:** `0911111111`
- **Password:** `testpassword`

Use these credentials to test authenticated endpoints.

## Authentication

Most endpoints require authentication using Bearer tokens. Include the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Environment Variables Required

Make sure these environment variables are set in your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SECRET_KEY=your_supabase_service_role_key
AFRICASTALKING_USERNAME=your_africastalking_username
AFRICASTALKING_API_KEY=your_africastalking_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Database Schema

The API expects the following Supabase tables:
- `users` - User accounts
- `profiles` - Extended user profiles
- `emergency_contacts` - Emergency contact information
- `panic_alerts` - Panic alert records
- `panic_helpers` - Helper assignments for alerts

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message description"
}
```

## Status Codes

- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`
4. Start development server: `npm run dev`
5. View API docs at `http://localhost:3000/api-docs.html`

## Support

For questions about the API, contact the Alewlsh development team.