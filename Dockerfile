FROM node:20-alpine AS builder

WORKDIR /app

# Copy all package files
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/

# Install all dependencies (including devDependencies for build)
RUN npm install --ignore-scripts

# Copy source
COPY tsconfig.json ./
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/
COPY packages/frontend/ packages/frontend/

# Build shared + backend
RUN npx tsc -b packages/backend --force

# Verify shared dist exists
RUN ls packages/shared/dist/index.js

# Build frontend (shared dist already exists from tsc -b above)
WORKDIR /app/packages/frontend
RUN npx vite build
WORKDIR /app

# --- Production stage ---
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/

RUN npm install --omit=dev --ignore-scripts

# Copy built backend
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/backend/dist packages/backend/dist
COPY --from=builder /app/packages/backend/package.json packages/backend/

# Copy built frontend (served by Express in production)
COPY --from=builder /app/packages/frontend/dist packages/frontend/dist

# Copy migration SQL files + seed (needed at runtime)
COPY packages/backend/src/db/migrations packages/backend/dist/db/migrations
COPY packages/backend/src/db/seed.sql packages/backend/dist/db/seed.sql

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run migrations + seed, then start the server
CMD ["sh", "-c", "node packages/backend/dist/db/setup.js --seed && node packages/backend/dist/index.js"]
