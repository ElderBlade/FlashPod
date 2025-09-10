# FlashPod Production Dockerfile - Using PostCSS (matches your existing setup)
FROM node:18-alpine AS css-builder

# Build CSS assets
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy configuration files
COPY postcss.config.mjs tailwind.config.js ./

# Copy all source files for Tailwind scanning
COPY static/ ./static/
COPY templates/ ./templates/

# Debug: Show what we have
RUN echo "=== CSS Builder Debug ===" && \
    echo "PostCSS config:" && \
    cat postcss.config.mjs && \
    echo -e "\nTailwind config:" && \
    cat tailwind.config.js && \
    echo -e "\nInput CSS:" && \
    cat static/css/input.css && \
    echo -e "\nNode modules:" && \
    ls node_modules/.bin/ | grep -E "(postcss|tailwind)" || true

# Build CSS using PostCSS (your current setup)
RUN npx postcss static/css/input.css -o static/css/style.css

# Verify CSS was built
RUN echo "=== CSS Build Verification ===" && \
    ls -la static/css/ && \
    echo "CSS file size:" && \
    wc -l static/css/style.css && \
    echo "CSS contains Tailwind classes:" && \
    (grep -c "bg-\|text-\|flex\|grid" static/css/style.css || echo "No Tailwind classes found!") && \
    echo "First 20 lines of generated CSS:" && \
    head -20 static/css/style.css

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
        tzdata \
    && rm -rf /var/lib/apt/lists/*

# Create app user with configurable UID/GID
ARG USER_ID=1001
ARG GROUP_ID=1001

RUN addgroup --system --gid ${GROUP_ID} flashpod \
    && adduser --system --uid ${USER_ID} --gid ${GROUP_ID} flashpod

# Set work directory
WORKDIR /app

# Copy and install Python dependencies
COPY --chown=flashpod:flashpod requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application directories
COPY --chown=flashpod:flashpod app/ ./app/
COPY --chown=flashpod:flashpod templates/ ./templates/

# Copy static files (excluding CSS which will be overwritten)
COPY --chown=flashpod:flashpod static/ ./static/

# Copy built CSS from node stage
COPY --from=css-builder --chown=flashpod:flashpod /app/static/css/style.css ./static/css/

# Final verification in Python container
RUN echo "=== Final Container CSS Verification ===" && \
    ls -la static/css/ && \
    echo "Final CSS file size:" && \
    wc -l static/css/style.css && \
    echo "CSS contains essential classes:" && \
    (grep -E "(\.bg-|\.text-|\.flex|\.grid|\.hidden|\.block)" static/css/style.css | head -5 || echo "Warning: CSS may be incomplete") && \
    echo "Custom flashcard styles:" && \
    (grep -E "(flashcard|card-container)" static/css/style.css | head -3 || echo "Custom styles found")

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