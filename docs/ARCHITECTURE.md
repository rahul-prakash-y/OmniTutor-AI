# OmniTutor AI — Architecture Documentation

## 1. System Overview

**OmniTutor AI** is a personalized tutoring and adaptive learning platform designed for multimodal, cognitive Socratic education. It combines cognitive scaffolding, adaptive difficulty calibration, and semantic knowledge retrieval with real-time AI guidance.

```mermaid
graph TD
    Client[React Web Client (Vite + Tailwind)] -->|HTTP / JSON (REST)| Fastify[Fastify Backend API]
    Fastify --> RequestId[Request ID & Pino Logger Plugin]
    Fastify --> ErrorHandler[Global Error Handler & Envelope]
    Fastify --> HealthModule[Health & Readiness Probes]
    Fastify --> AIModule[AI Provider Service Abstraction]
    Fastify --> VectorModule[Vector Storage Service Abstraction]
    Fastify --> DBModule[Mongoose DB Lifecycle Manager]

    AIModule -->|SDK| Gemini[Google Gemini API (gemini-2.0-flash)]
    VectorModule -->|REST Client| Qdrant[(Qdrant Vector Database)]
    DBModule -->|ODM| MongoDB[(MongoDB 7.0)]
```

---

## 2. Monorepo Repository Structure

OmniTutor AI uses an **npm workspaces** monorepo layout:

```text
OmniTutor-AI/
├── .env.example                     # Root environment configuration reference
├── .gitignore                       # Git ignore rules for node_modules, .env, dist
├── docker-compose.yml               # Local development containers (MongoDB & Qdrant)
├── package.json                     # Root workspace scripts and workspace definitions
├── tsconfig.base.json               # Shared strict TypeScript compiler configuration
├── docs/
│   ├── ARCHITECTURE.md              # System architecture and technical specifications
│   └── DEVELOPMENT.md               # Local development and setup instructions
├── packages/
│   └── shared/                      # Shared types, Zod schemas, and contracts
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types/               # TypeScript interfaces (API, User, Learning, AI)
│           ├── schemas/             # Zod validation schemas (API, Env, User, Session)
│           └── index.ts             # Central export point
└── apps/
    ├── api/                         # Fastify Backend Service
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vitest.config.ts
    │   ├── .env.example
    │   └── src/
    │       ├── config/              # Validated environment (Zod) & Pino logger
    │       ├── database/            # MongoDB connection lifecycle & ping latency
    │       ├── plugins/             # Request ID propagation & centralized error handler
    │       ├── services/            # Injectable provider abstractions (AI, Qdrant)
    │       ├── modules/             # Domain modules (Health & Readiness)
    │       ├── utils/               # AppError classes & standard API response envelopes
    │       ├── app.ts               # Fastify factory function (injectable for testing)
    │       └── server.ts            # Entrypoint with graceful shutdown hooks
    └── web/                         # React Frontend Application
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts
        ├── tailwind.config.js
        ├── postcss.config.js
        ├── index.html
        ├── .env.example
        └── src/
            ├── components/          # Reusable UI (Button, Card, Badge) & Layout (Navbar, Sidebar, Shell)
            ├── pages/               # Dashboard, Sessions Workspace, Health Status, NotFound
            ├── services/            # Strongly-typed ApiClient
            ├── stores/              # Zustand application state
            ├── router.tsx           # React Router v6 route configuration
            └── main.tsx             # Application bootstrap
```

---

## 3. Backend Modular Architecture

The backend (`apps/api`) adheres strictly to clean architectural boundaries:

1. **Routes & Controllers**: Controllers (`health.controller.ts`) receive HTTP requests, invoke domain services, and return responses via `sendSuccess` or `sendError`.
2. **Services & Abstractions**:
   - `IAIProvider`: Interface defining `checkHealth()`, `isConfigured()`, and `generateCompletion()`. Decouples Fastify from specific AI vendors.
   - `GeminiProvider`: Google Gemini SDK integration using `@google/genai`. Degrades gracefully when `GEMINI_API_KEY` is omitted without crashing.
   - `IVectorService`: Interface defining collection management, point upsert, and vector search.
   - `QdrantService`: `@qdrant/js-client-rest` integration. Degrades gracefully if Qdrant container is offline.
3. **Database Connection Lifecycle**:
   - Managed via Mongoose in `src/database/connection.ts`.
   - Listens to `connected`, `error`, and `disconnected` events.
   - Computes ping latency in milliseconds for active connections.
   - Graceful shutdown hook closes MongoDB connections and terminates the HTTP server cleanly on `SIGINT` or `SIGTERM`.
4. **Standard API Envelope**:
   All endpoints return a uniform envelope:
   ```json
   {
     "success": true,
     "data": { ... },
     "error": {
       "code": "ERROR_CODE",
       "message": "Human readable description",
       "statusCode": 400,
       "details": [ ... ]
     },
     "meta": {
       "requestId": "uuid-v4",
       "timestamp": "2026-10-11T05:42:56.081Z",
       "durationMs": 4
     }
   }
   ```

---

## 4. Frontend Architecture & Design System

The frontend (`apps/web`) is built with:
- **React 18 & Vite**: Fast HMR and optimized production rollup builds.
- **Tailwind CSS & Glassmorphism**: Curated dark theme palette (`#080b11` base, indigo brand accents, emerald and cyan indicators).
- **Zustand**: Lightweight global state management for navigation drawer and active tutoring modes.
- **TanStack React Query**: Automated background polling, caching, and state synchronization with `/api/v1/health`.
- **React Hook Form + Zod**: Strict runtime validation on user inputs and session launcher configurations.
- **Lucide Icons**: Crisp SVG icons for intuitive educational telemetry.

---

## 5. Security & Isolation Principles

- **Zero Client-Side Secrets**: Gemini API keys and database credentials reside exclusively on the server (`apps/api/.env`).
- **Input Validation**: All query parameters, payloads, and environment variables are strictly verified using Zod schemas from `@omnitutor/shared`.
- **CORS Configuration**: Restricts access in production while allowing authorized origin access.
