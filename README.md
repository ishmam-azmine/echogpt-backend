# EchoGPT Backend REST API

Backend REST API for **EchoGPT**, built with NestJS, PostgreSQL, Prisma, JWT authentication, Swagger/OpenAPI, and Docker.

## Tech Stack

- NestJS
- TypeScript
- PostgreSQL 17
- Prisma ORM
- JWT + Passport
- bcrypt
- Swagger / OpenAPI
- class-validator
- Helmet
- @nestjs/throttler
- Docker / Docker Compose

## Features

### Authentication

- User registration and login
- JWT access tokens
- Refresh tokens
- Secure logout
- bcrypt password hashing
- Database-backed sessions
- Refresh tokens stored as hashes
- Active/inactive account validation

### User Management

- View profile
- Update profile
- Change password
- Delete account
- USER and ADMIN roles
- Normalized Role table
- Role-based authorization

### Subscription Management

- FREE and PREMIUM plans
- Subscription status
- Upgrade and downgrade
- Usage tracking
- Remaining request calculation
- Request-limit enforcement
- FREE: 100 requests
- PREMIUM: 1000 requests

### AI Provider Management

Supports:

- OpenAI
- Anthropic / Claude
- Google Gemini

Provider functionality includes:

- Add provider
- Edit provider
- Delete provider
- Enable/disable provider
- Set default provider
- Provider health checking
- Provider/model configuration
- Encrypted API-key storage
- API keys are not exposed in API responses
- Provider management restricted to ADMIN users

### Chat

- Send AI prompts
- Select an AI provider
- Use the configured default provider
- Select/override model
- Create conversations
- Continue existing conversations
- Store user and assistant messages
- Retrieve conversation history
- Retrieve individual conversations
- Delete conversations
- Token usage tracking
- Response-time tracking
- Subscription usage enforcement
- API usage logging

### Web Search

- Search endpoint
- Search history
- Recent searches
- Search suggestions
- Result caching
- Subscription usage enforcement
- API usage logging

A valid web-search API key is required for live external search results.

### Admin APIs

ADMIN users can access:

- Dashboard statistics
- User management
- User role management
- User activation/deactivation
- Subscription management
- Provider management
- API usage analytics
- API usage logs
- HTTP request logs
- System health information

### Monitoring and Security

- Public health endpoint
- Database health checking
- Automatic HTTP request logging
- Success/failure logging
- Response-time logging
- API usage analytics
- Global rate limiting
- Helmet security headers
- Request validation
- Unknown DTO fields rejected
- JWT authentication
- Role-based authorization
- Hashed passwords
- Hashed refresh tokens
- Encrypted provider API keys
- Environment-based secrets

## Database Design

The PostgreSQL database contains normalized models for:

- User
- Role
- Session
- Subscription
- AI Provider
- Conversation
- Message
- Web Search
- API Usage Log
- Request Log

Relationships, indexes, foreign keys, unique constraints, and cascading behavior are defined through Prisma.

## Project Structure

```text
src/
├── admin/
├── auth/
├── chats/
├── common/
├── health/
├── prisma/
├── providers/
├── subscriptions/
├── users/
├── web-search/
├── app.module.ts
└── main.ts

prisma/
├── migrations/
└── schema.prisma
```

## Prerequisites

For local development:

- Node.js 24+
- npm
- PostgreSQL 17+

Docker and Docker Compose can alternatively run the application and database together.

## Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then configure the values inside `.env`.

Example:

```env
PORT=3000
NODE_ENV=development

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/echogpt?schema=public"

JWT_ACCESS_SECRET="replace-with-a-strong-access-secret"
JWT_ACCESS_EXPIRES_IN="15m"

JWT_REFRESH_SECRET="replace-with-a-strong-refresh-secret"
JWT_REFRESH_EXPIRES_IN="7d"

ENCRYPTION_KEY="replace-with-a-strong-encryption-secret"

OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
GEMINI_API_KEY=""
WEB_SEARCH_API_KEY=""
```

Provider credentials configured through the provider-management API are encrypted before being stored in PostgreSQL.

## Installation

Install dependencies:

```bash
npm install
```

Generate the Prisma client:

```bash
npm run db:generate
```

Apply development migrations:

```bash
npm run db:migrate
```

Start the development server:

```bash
npm run start:dev
```

The server runs at:

```text
http://localhost:3000
```

All REST endpoints use the prefix:

```text
/api/v1
```

## Swagger Documentation

Interactive Swagger documentation is available at:

```text
http://localhost:3000/docs
```

Protected endpoints use Bearer JWT authentication.

To test a protected endpoint:

1. Register or log in.
2. Copy the returned access token.
3. Open Swagger.
4. Click **Authorize**.
5. Enter the access token.
6. Execute the protected endpoint.

## API Routes

### Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

### Users

```text
GET    /api/v1/users/me
PATCH  /api/v1/users/me
PATCH  /api/v1/users/me/password
DELETE /api/v1/users/me
```

### Subscriptions

```text
GET   /api/v1/subscriptions/me
GET   /api/v1/subscriptions/me/usage
PATCH /api/v1/subscriptions/me/plan
```

### AI Providers

```text
POST   /api/v1/providers
GET    /api/v1/providers
GET    /api/v1/providers/:id
PATCH  /api/v1/providers/:id
DELETE /api/v1/providers/:id

PATCH /api/v1/providers/:id/toggle
PATCH /api/v1/providers/:id/default
GET   /api/v1/providers/:id/health
```

Provider-management operations require ADMIN authorization.

### Chat

```text
POST   /api/v1/chats/prompt
GET    /api/v1/chats
GET    /api/v1/chats/:id
DELETE /api/v1/chats/:id
```

Example prompt request:

```json
{
  "prompt": "Explain retrieval-augmented generation simply.",
  "providerId": "optional-provider-uuid",
  "model": "optional-model",
  "conversationId": "optional-conversation-uuid"
}
```

If no provider is specified, the configured default provider is used.

### Web Search

```text
POST /api/v1/search
GET  /api/v1/search/history
GET  /api/v1/search/recent
GET  /api/v1/search/suggestions
```

### Admin

```text
GET   /api/v1/admin/dashboard

GET   /api/v1/admin/users
GET   /api/v1/admin/users/:id
PATCH /api/v1/admin/users/:id/role
PATCH /api/v1/admin/users/:id/status
PATCH /api/v1/admin/users/:id/subscription

GET /api/v1/admin/analytics/usage
GET /api/v1/admin/usage-logs
GET /api/v1/admin/request-logs
GET /api/v1/admin/system/health
```

All Admin endpoints require the `ADMIN` role.

### Health

```text
GET /api/v1/health
```

Example response:

```json
{
  "status": "ok",
  "database": "connected",
  "responseTimeMs": 2,
  "uptimeSeconds": 120,
  "timestamp": "2026-09-27T14:00:00.000Z"
}
```

## Subscription Limits

Each applicable AI or web-search request consumes subscription usage.

| Plan | Request Limit |
| --- | ---: |
| FREE | 100 |
| PREMIUM | 1000 |

Requests exceeding the active subscription limit are rejected.

## Database Commands

Generate Prisma client:

```bash
npm run db:generate
```

Create/apply a development migration:

```bash
npm run db:migrate
```

Apply existing migrations in production:

```bash
npm run db:deploy
```

Check migration status:

```bash
npm run db:status
```

Open Prisma Studio:

```bash
npm run db:studio
```

## Production Build

Build the application:

```bash
npm run build
```

Start the production build:

```bash
npm run start:prod
```

## Docker

The project includes:

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`

Start the API and PostgreSQL:

```bash
docker compose up --build
```

Docker Compose will:

1. Start PostgreSQL.
2. Wait for the database health check.
3. Start the EchoGPT API.
4. Apply Prisma production migrations.
5. Expose the API on port 3000.

Stop the containers:

```bash
docker compose down
```

Remove the containers and PostgreSQL volume:

```bash
docker compose down -v
```

## Validation and Error Handling

Global request validation includes:

- DTO whitelisting
- Unknown-field rejection
- Automatic type transformation
- class-validator validation

NestJS HTTP exceptions are used for authentication, authorization, validation, missing resources, subscription limits, provider failures, and other API errors.

## Security

The backend implements:

- bcrypt password hashing
- JWT access authentication
- Refresh-token rotation/session handling
- Hashed refresh tokens
- Role-based authorization
- Provider API-key encryption
- Helmet security headers
- Rate limiting
- Request validation
- Environment-based secrets
- `.env` exclusion from Git

For production deployments:

- Replace all example secrets.
- Use strong PostgreSQL credentials.
- Use HTTPS.
- Restrict CORS to trusted origins.
- Rotate provider credentials when necessary.
- Never commit `.env`.

## Typical Swagger Test Flow

1. Register a user.
2. Log in.
3. Authorize Swagger with the access token.
4. View/update the profile.
5. Check subscription usage.
6. Configure an AI provider with an ADMIN account.
7. Set a default provider.
8. Check provider health.
9. Send a chat prompt.
10. View conversation history.
11. Perform a web search when a search key is configured.
12. Review Admin analytics and request logs.
13. Check system health.

## External API Credentials

Real AI responses require valid credentials for the selected AI provider.

Live web-search functionality requires a valid `WEB_SEARCH_API_KEY`.

Without external provider credentials, authentication, user management, subscriptions, database functionality, admin APIs, Swagger documentation, health monitoring, and other internal functionality can still be tested locally.

## License

Developed as an internship technical assessment.