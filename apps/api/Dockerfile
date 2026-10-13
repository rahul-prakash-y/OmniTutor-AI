# Multi-stage Dockerfile for OmniTutor AI Backend API
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests and tsconfig
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build packages in dependency order
RUN npm run build:shared
RUN npm run build:api

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Install curl for container healthcheck
RUN apk add --no-cache curl

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
