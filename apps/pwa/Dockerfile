# ─── Stage: base ──────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ─── Stage: development ───────────────────────────────────────
FROM base AS development
COPY . .
EXPOSE 4200
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--poll", "1000"]

# ─── Stage: builder ───────────────────────────────────────────
FROM base AS builder
COPY . .
RUN npm run build --configuration=production

# ─── Stage: production ────────────────────────────────────────
FROM nginx:alpine AS production
COPY --from=builder /app/dist/pwa/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
