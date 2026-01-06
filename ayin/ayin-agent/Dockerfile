# AYIN Agent - Production Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 ayin
USER ayin
COPY --from=builder --chown=ayin:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ayin:nodejs /app/dist ./dist
COPY --from=builder --chown=ayin:nodejs /app/package.json ./
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
EXPOSE 3001
CMD ["node", "dist/index.js"]
