# OmniTutor AI — Comprehensive Development & Operations Guide

## 1. Prerequisites & System Requirements

- **Node.js**: `v20.0.0` or higher (verified on Node `v20.x` and `v22.x`).
- **npm**: `v10.0.0` or higher.
- **Docker & Docker Compose**: Recommended for local MongoDB 7.0 and Qdrant v1.13.2 containers.
- **Operating System**: Windows (PowerShell 5.1+ or PowerShell Core), macOS, or Linux.

---

## 2. Quickstart: 3-Minute Setup

### Step 1: Clone Repository & Install Dependencies
From the repository root:
```powershell
# Install all monorepo dependencies across shared, api, and web workspaces
npm install
```

### Step 2: Configure Environment Files
Copy the unified configuration template:
```powershell
# Root configuration
Copy-Item .env.example .env

# Workspace-specific configuration files
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

### Step 3: Launch Supporting Infrastructure (Docker)
Start the local MongoDB document store and Qdrant vector database:
```powershell
docker compose up -d mongodb qdrant
```
Verify container health:
```powershell
docker compose ps
```

### Step 4: Synchronize Database Indexes & Seed Demo Data
Initialize the 81 schema indexes across all 15 collections and seed the synthetic demo curriculum:
```powershell
# Build shared types/schemas first
npm run build:shared

# Initialize MongoDB collection indexes
npm run db:init

# Seed synthetic CS301 demo course and student profile
npm run seed:demo
```

### Step 5: Start Monorepo in Development Mode
```powershell
npm run dev
```
- **Student Web Application**: `http://localhost:5173`
- **Fastify Backend API**: `http://localhost:4000/api/v1`
- **Pre-Seeded Demo Student Account**:
  - Email: `demo.student@omnitutor.ai`
  - Password: `DemoStudent123!`

---

## 3. Obtaining Service Credentials

### Google Gemini API Key (Multimodal AI & Embeddings)
1. Navigate to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** -> **Create API key in new project**.
4. Set `GEMINI_API_KEY=your_key_here` in `apps/api/.env`.
> **Graceful Fallback Mode**: If `GEMINI_API_KEY` is omitted, the API automatically uses `MockAIProvider` and `MockEmbeddingProvider`, permitting full offline local development and test execution.

### Qdrant Vector Database
- **Local Dev (Docker)**: Default `http://localhost:6333` requires no authentication (`QDRANT_API_KEY=` can be left empty).
- **Managed Qdrant Cloud**:
  1. Register at [cloud.qdrant.io](https://cloud.qdrant.io).
  2. Create a free 1GB cluster.
  3. Under **Data Access Control**, generate an **API Key**.
  4. Set `QDRANT_URL=https://<cluster-id>.<region>.gcp.cloud.qdrant.io:6333` and `QDRANT_API_KEY=your_api_key`.

### MongoDB Atlas (Managed Cloud Document Store)
1. Create a cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user with read/write access.
3. Whitelist your IP or `0.0.0.0/0` in Network Access.
4. Copy the connection string into `MONGODB_URI` in `apps/api/.env`:
   `mongodb+srv://<user>:<password>@cluster0.mongodb.net/omnitutor?retryWrites=true&w=majority`

---

## 4. Workspaces & Execution Commands

| Action | Root Monorepo Script | Individual Workspace Script |
|---|---|---|
| **Development** | `npm run dev` | `npm run dev:api` / `npm run dev:web` |
| **Production Build** | `npm run build` | `npm run build:api` / `npm run build:web` |
| **Automated Tests** | `npm run test` | `npm run test:api` / `npm run test:web` |
| **TypeScript Typecheck** | `npm run typecheck` | `tsc --noEmit` |
| **Linting** | `npm run lint` | `tsc --noEmit` |
| **Database Sync** | `npm run db:init` | `npm run db:init --workspace=@omnitutor/api` |
| **Demo Seeding** | `npm run seed:demo` | `npm run seed:demo --workspace=@omnitutor/api` |

---

## 5. Troubleshooting Common Issues

### 1. `Invalid or expired session` / `CSRF validation failed`
- **Cause**: Session cookie missing or CSRF header not matching cookie signature.
- **Solution**: The web client uses the `useAuthStore` and `apiClient` double-submit pattern. Ensure state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) include the `x-csrf-token` header obtained from `/auth/me` or `/auth/login`.

### 2. `SESSION_SECRET must be at least 32 characters`
- **Cause**: In production mode, Fastify validates session entropy.
- **Solution**: Set a cryptographically random secret of at least 32 characters:
  `openssl rand -base64 32`

### 3. Qdrant Connection Refused on Port 6333
- **Cause**: Qdrant Docker container is stopped or port is blocked.
- **Solution**: Run `docker compose up -d qdrant` or verify `docker compose logs qdrant`. The backend will automatically downgrade to `MockVectorService` if Qdrant is temporarily offline.

### 4. CORS Errors on Web Requests
- **Cause**: Frontend origin not in `CORS_ORIGIN` allowlist.
- **Solution**: Add your origin (e.g., `http://localhost:5173,http://localhost:80`) to `CORS_ORIGIN` in `apps/api/.env`.
