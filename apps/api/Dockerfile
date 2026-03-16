# ─── Stage: base ──────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ─── Stage: development ───────────────────────────────────────
FROM base AS development
COPY . .
EXPOSE 3000 9229
CMD ["npm", "run", "start:dev"]

# ─── Stage: builder ───────────────────────────────────────────
FROM base AS builder
COPY . .
RUN npm run build

# ─── Stage: production ────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000
CMD ["node", "dist/main"]
