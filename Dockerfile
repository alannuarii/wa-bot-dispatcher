# ==========================================
# STAGE 1: Build Backend
# ==========================================
FROM node:22-slim AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --no-audit --no-fund --maxsockets=3
COPY backend/ .
RUN touch .env
RUN npm run build

# ==========================================
# STAGE 2: Build Frontend (depends on backend-builder to force sequential build)
# ==========================================
FROM node:22-slim AS frontend-builder
# Force sequential: copy a dummy file from backend-builder so BuildKit won't parallelize
COPY --from=backend-builder /app/backend/package.json /tmp/.backend-done
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund --maxsockets=3
COPY frontend/ .
RUN npm run build

# ==========================================
# STAGE 3: Production Runner (Single Container)
# ==========================================
FROM node:22-slim AS runner
WORKDIR /app

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

# Copy and setup startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Environment bindings
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Expose frontend port (The backend runs silently on 3000 within the same container, but routed via proxy)
EXPOSE 3001

ENTRYPOINT ["/app/start.sh"]
