# OmniTutor AI

> **Personalized Tutoring & Adaptive Multimodal Learning Platform**  
> Cognitive Socratic scaffolding, adaptive difficulty calibration, and semantic knowledge retrieval.

---

## 📌 Architecture Overview

OmniTutor AI is built as a production-grade TypeScript monorepo using **npm workspaces**:

- **Frontend (`apps/web`)**: React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Zustand, TanStack React Query, React Hook Form, Zod, Lucide icons.
- **Backend (`apps/api`)**: Node.js, Fastify, TypeScript, Mongoose (MongoDB 7.0), Pino structured logging, centralized error handling, and request ID tracking.
- **AI Service Abstraction**: Google Gemini API integration (`@google/genai`) with injectable interfaces and graceful standalone degradation.
- **Vector Storage Abstraction**: Qdrant vector database (`@qdrant/js-client-rest`) with collection lifecycle and semantic search abstractions.
- **Shared Package (`packages/shared`)**: Shared domain types, Zod validation schemas, and standard API envelope contracts.
- **Local Infrastructure (`docker-compose.yml`)**: MongoDB 7.0 and Qdrant container definitions with health probes.

---

## 🚀 Quick Start (Windows PowerShell)

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher (`v22.16.0` tested)
- **npm**: `v10.0.0` or higher
- **Docker Desktop** (Optional, for running MongoDB and Qdrant locally)

### 2. Install Workspace Dependencies
Open Windows PowerShell in the project directory and run:
```powershell
npm install
```

### 3. Setup Environment Configurations
Copy the placeholder environment files:
```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

### 4. (Optional) Start Local Infrastructure with Docker
```powershell
docker compose up -d
```
This launches:
- **MongoDB**: `localhost:27017`
- **Qdrant Vector DB**: `localhost:6333` (REST) and `localhost:6334` (gRPC)

### 5. Build Shared Library
```powershell
npm run build:shared
```

### 6. Start Development Servers
Run both API and Web concurrently:
```powershell
npm run dev
```

Or run them individually:
```powershell
# Fastify API Server on http://localhost:4000
npm run dev:api

# React Web Client on http://localhost:5173
npm run dev:web
```

---

## 📡 Core API Endpoints

### System Probes
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Comprehensive health check (Database, Qdrant, Gemini AI, Uptime) |
| `GET` | `/api/v1/ready` | Kubernetes-style readiness probe (HTTP 200 when ready, HTTP 503 if dependencies down) |
| `GET` | `/` | API service discovery and documentation links |

### Authentication & Account Management (Module 3)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register student account, create session cookie, dispatch verification email | No |
| `POST` | `/api/v1/auth/login` | Authenticate with email and password, create HttpOnly session cookie | No |
| `POST` | `/api/v1/auth/logout` | Revoke active session token and clear session cookie | Yes + CSRF |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile, session details, and CSRF token | Yes |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset email (enumeration-safe) | No |
| `POST` | `/api/v1/auth/reset-password` | Reset password using single-use cryptographically secure token | No |
| `POST` | `/api/v1/auth/verify-email` | Verify email address using single-use expiring token | No |
| `GET` | `/api/v1/users/me` | Read current user learning profile and preferences | Yes |
| `PATCH` | `/api/v1/users/me` | Update name, socratic pacing, difficulty, and audio settings | Yes + CSRF |
| `DELETE` | `/api/v1/users/me` | Delete account, revoke all sessions, and soft-delete user data | Yes + CSRF |
| `GET` | `/api/v1/admin/users` | List platform users (Admin role required) | Yes (`admin`) |

All responses conform to the uniform envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "6bc32d3e-908d-472e-8fbf-b3d9c79fa473",
    "timestamp": "2026-10-11T05:42:56.081Z",
    "durationMs": 12
  }
}
```

---

## 🔒 Security Architecture

- **Password Hashing**: Implemented with Argon2id using `@node-rs/argon2` with recommended parameters (`memoryCost: 64MB`, `timeCost: 3`, `outputLen: 32`).
- **Session Management**: Cryptographically secure 256-bit random session tokens stored hashed in MongoDB (`Session` collection) and delivered via `HttpOnly`, `SameSite=Lax`, `Path=/` cookies with secure flags in production.
- **CSRF Protection**: Synchronizer HMAC-based CSRF protection enforcing `x-csrf-token` on state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) authenticated via browser cookies.
- **Account Enumeration Defense**: Login and password reset endpoints return generic messages so malicious actors cannot discover if an email exists.
- **Single-Use Tokens**: Verification and password reset tokens are stored as SHA-256 hashes in MongoDB with strict expiration windows (24h for verification, 1h for reset).
- **Rate Limiting**: Integrated via `@fastify/rate-limit` protecting authentication routes against brute-force attacks.
- **Injectable Email Provider**: `MockEmailService` stores emails in-memory with safe logging in development/test without exposing secrets. Production requires an explicitly configured transactional email service.

---

## 🧪 Testing & Verification

Run all test suites across the monorepo:
```powershell
# Run all Vitest unit, API injection, and web tests (35 tests)
npm run test

# Run TypeScript type check across all workspaces
npm run typecheck

# Build all packages and applications for production
npm run build
```

---

## 📂 Repository Layout

```text
OmniTutor-AI/
├── apps/
│   ├── api/             # Fastify Backend API
│   │   ├── src/
│   │   │   ├── database/models/  # User & Session Mongoose models
│   │   │   ├── modules/auth/     # Auth service & routes
│   │   │   ├── modules/user/     # User service & routes
│   │   │   ├── plugins/auth.ts   # Session & CSRF verification plugin
│   │   │   └── services/email/   # Injectable email provider abstractions
│   └── web/             # React + Vite Frontend
│       ├── src/
│       │   ├── components/layout/ProtectedRoute.tsx  # Auth & role gate
│       │   ├── stores/useAuthStore.ts                # Session state & actions
│       │   ├── pages/LoginPage.tsx                   # Interactive login
│       │   ├── pages/RegisterPage.tsx                # Least-privilege registration
│       │   ├── pages/ResetPasswordPage.tsx           # Token-based password reset
│       │   └── pages/VerifyEmailPage.tsx             # Email verification view
├── packages/
│   └── shared/          # Shared types, Zod schemas (Register, Login, User)
├── docs/
│   ├── ARCHITECTURE.md  # Detailed architecture & data flow diagrams
│   └── DEVELOPMENT.md   # Setup guide and developer manual
├── docker-compose.yml   # MongoDB & Qdrant local containers
├── package.json         # Root workspace scripts
└── tsconfig.base.json   # Root TypeScript strict configuration
```

---

## 🔑 Environment Variables Reference

### API (`apps/api/.env`)
| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment (`development`, `test`, `production`) |
| `PORT` | `4000` | HTTP port for the Fastify server |
| `HOST` | `0.0.0.0` | Bind host address |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
| `LOG_LEVEL` | `info` | Pino logging level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`) |
| `SESSION_SECRET` | *(required in prod)* | Secret key for signing session cookies and CSRF HMAC (min 32 chars) |
| `COOKIE_DOMAIN` | *(empty)* | Optional cookie domain for production deployments |
| `APP_URL` | `http://localhost:5173` | Base web application URL for reset/verification links |
| `EMAIL_PROVIDER` | `mock` | Email dispatch provider (`mock`, `smtp`, `console`) |
| `MONGODB_URI` | `mongodb://localhost:27017/omnitutor` | MongoDB connection string |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant REST URL |
| `QDRANT_API_KEY` | *(empty)* | Optional Qdrant API key |
| `GEMINI_API_KEY` | *(empty)* | Google Gemini API key (optional for offline/fallback mode) |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model name |

### Web (`apps/web/.env`)
| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:4000/api/v1` | Target API gateway endpoint |
| `VITE_APP_NAME` | `OmniTutor AI` | Client application display title |
