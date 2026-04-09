# ==========================================
# STAGE 1: Build Backend
# ==========================================
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN touch .env
RUN npm run build

# ==========================================
# STAGE 2: Build Frontend
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ==========================================
# STAGE 3: Production Runner (Single Container)
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

# Install process manager (concurrently or supervisord, we'll use a simple shell script)
RUN apk add --no-cache dumb-init

# Copy Backend Build
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/.env ./backend/.env

# Copy Frontend Build (Standalone feature)
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# Create Baileys auth folder safely
RUN mkdir -p /app/backend/auth_info_baileys

# Prepare startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting Backend (Port 3000)..."' >> /app/start.sh && \
    echo 'cd /app/backend && PORT=3000 node dist/main.js &' >> /app/start.sh && \
    echo 'echo "Starting Frontend (Port 3001)..."' >> /app/start.sh && \
    echo 'cd /app/frontend && node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Environment bindings
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Expose frontend port (The backend runs silently on 3000 within the same container, but routed via proxy)
EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/start.sh"]
