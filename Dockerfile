FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci

# Copy source files
COPY src/ ./src/
COPY tsconfig.json ./

# Build the project
RUN npm run build

# Remove dev dependencies and install only production
RUN npm prune --production

# Expose port (Railway uses PORT environment variable)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the server
CMD ["node", "dist/server/main.js"]