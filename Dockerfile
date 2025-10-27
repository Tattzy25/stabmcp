FROM node:24-alpine AS build
WORKDIR /app
ENV NODE_ENV=production

# Install build tools for native dependencies
RUN apk add --no-cache python3 make g++ libc6-compat

# If you use private registry auth, uncomment and pass build-arg NPM_TOKEN
# ARG NPM_TOKEN
# RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc

# Copy package manifests first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies with cache mount and debug logging on failure
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci --include=dev || (echo "npm ci failed; dumping logs..." && \
    ls -la /root/.npm/_logs || true && \
    cat /root/.npm/_logs/*-debug-*.log || true && \
    exit 1)

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Runtime stage
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy built dependencies and application
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Copy environment file if exists
COPY --from=build /app/.env ./.env 2>/dev/null || echo ".env not found, skipping"

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD ["node", "dist/index.js"]