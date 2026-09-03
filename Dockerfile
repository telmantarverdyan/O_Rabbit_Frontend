# =========================================================
# Stage 1: Build Stage
# =========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with lockfile caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build config
COPY . .

# Optional build-time environment variable for backend URL
ARG VITE_ORABBIT_BACKEND_URL=""
ENV VITE_ORABBIT_BACKEND_URL=$VITE_ORABBIT_BACKEND_URL

# Compile TypeScript and bundle Vite assets for production
RUN npm run build

# =========================================================
# Stage 2: Runtime Stage (Lightweight Nginx Alpine)
# =========================================================
FROM nginx:1.27-alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Container healthcheck using wget (available in alpine)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://localhost/healthz || exit 1

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
