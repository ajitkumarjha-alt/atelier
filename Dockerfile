# Multi-stage build for Atelier MEP Portal
# Stage 1: Build frontend with Vite
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy frontend dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source
COPY . ./

# Build Vite frontend
RUN npm run build

# Stage 2: Runtime with Express backend
FROM node:20-alpine
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set Node environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy backend code
COPY server/ ./server/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/dist ./public

# Expose port
EXPOSE 8080

# Run as non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start Express server
CMD ["node", "server/index.js"]
