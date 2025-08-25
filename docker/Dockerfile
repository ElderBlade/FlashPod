# FlashPod Production Dockerfile
FROM node:18-alpine AS css-builder

# Build CSS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy config files and CSS source
COPY postcss.config.mjs ./
COPY static/css/input.css ./static/css/

# Build CSS using postcss directly since we're in production
RUN npx postcss static/css/input.css -o static/css/style.css

# Python runtime
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user with configurable UID/GID
ARG USER_ID=1001
ARG GROUP_ID=1001

RUN addgroup --system --gid ${GROUP_ID} flashpod \
    && adduser --system --uid ${USER_ID} --gid ${GROUP_ID} flashpod

# Set work directory
WORKDIR /app

# Copy application code from project root (since build context is project root)
COPY --chown=flashpod:flashpod requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application directories
COPY --chown=flashpod:flashpod app/ ./app/
COPY --chown=flashpod:flashpod static/ ./static/
COPY --chown=flashpod:flashpod templates/ ./templates/

# Copy built CSS from node stage
COPY --from=css-builder --chown=flashpod:flashpod /app/static/css/style.css ./static/css/

# Create data directory with proper permissions
RUN mkdir -p /data && chown flashpod:flashpod /data

# Switch to non-root user
USER flashpod

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/health || exit 1

# Expose port
EXPOSE $PORT

# Run the application
WORKDIR /app
CMD ["python", "-m", "app.main"]