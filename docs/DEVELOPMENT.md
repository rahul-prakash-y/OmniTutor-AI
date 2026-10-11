# OmniTutor AI — Development Guide

## Prerequisites

- **Node.js**: `v20.0.0` or higher (tested on Node `v22.16.0`).
- **npm**: `v10.0.0` or higher.
- **Docker & Docker Compose** (Optional for local MongoDB & Qdrant instances).
- **Windows PowerShell 5.1+** or **PowerShell 7+**.

---

## Getting Started (Windows PowerShell)

### 1. Clone & Install Dependencies

From the repository root:

```powershell
# Install all monorepo dependencies across shared, api, and web workspaces
npm install
```

### 2. Configure Environment Variables

Copy the example environment files:

```powershell
# API environment file
Copy-Item apps/api/.env.example apps/api/.env

# Web environment file
Copy-Item apps/web/.env.example apps/web/.env
```

> **Note**: OmniTutor AI runs out of the box in standalone / graceful fallback mode even if `GEMINI_API_KEY` is not provided. To enable live Gemini AI generation, add your API key to `apps/api/.env`.

### 3. Start Local Database and Vector Store (Optional)

Start MongoDB and Qdrant with Docker Compose:

```powershell
docker compose up -d
```

Verify containers are running:
```powershell
docker compose ps
```

### 4. Build Shared Package

Before running TypeScript compilation in consumer workspaces, build the shared package:

```powershell
npm run build:shared
```

---

## Running the Development Servers

You can run both services concurrently or individually:

### Run Everything:
```powershell
npm run dev
```

### Run Fastify Backend Only (Port 4000):
```powershell
npm run dev:api
```
- Health Probe: `http://localhost:4000/api/v1/health`
- Readiness Probe: `http://localhost:4000/api/v1/ready`

### Run React Frontend Only (Port 5173):
```powershell
npm run dev:web
```
- Web Application: `http://localhost:5173`

---

## Quality Assurance & Verification Commands

### Run Full Test Suite:
```powershell
npm run test
```

### Run Type Checking:
```powershell
npm run typecheck
```

### Run Production Builds:
```powershell
npm run build
```

---

## Troubleshooting

- **MongoDB connection refused**: If MongoDB is not running locally, the Fastify server will automatically enter degraded database mode without crashing. Start the container using `docker compose up -d mongodb`.
- **Port 4000 in use**: Change `PORT=4000` in `apps/api/.env`.
