# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# --- Stage 2: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node src/config.js || true

# --- Stage 3: Production ---
FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs index.html styles.css app.js ./
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs package.json ./
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
USER nodejs
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1
CMD ["npx", "http-server", ".", "-p", "3000", "-a", "0.0.0.0"]

# --- Stage 4: Development ---
FROM node:20-alpine AS development
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ENV NODE_ENV=development PORT=3000
EXPOSE 3000
CMD ["npx", "http-server", ".", "-p", "3000", "-a", "0.0.0.0"]
