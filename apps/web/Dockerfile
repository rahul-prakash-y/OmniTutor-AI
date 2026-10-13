# Multi-stage Dockerfile for OmniTutor AI Web Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests and tsconfig
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies across monorepo
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared types/schemas and web client bundle
RUN npm run build:shared
RUN npm run build:web

# Stage 2: High-performance Nginx Static File Server
FROM nginx:1.27-alpine AS runner

# Copy compiled frontend bundle
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy optimized Nginx reverse proxy configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
