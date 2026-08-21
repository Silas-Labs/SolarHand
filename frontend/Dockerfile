# SolarHand PWA — multi-stage image.
#   Stage 1 (node): install deps and produce the static production build.
#   Stage 2 (nginx): serve the build and reverse-proxy /api to the API.

# ---- Stage 1: build ---------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# libc6-compat smooths over native-binary (sharp/esbuild) edge cases on musl.
RUN apk add --no-cache libc6-compat

# Install against the lockfile first so this layer caches until deps change.
COPY package.json package-lock.json ./
RUN npm ci

# App sources.
COPY . .

# Production API base. Served same-origin, the PWA calls nginx's /api proxy,
# which strips the prefix and forwards to the API. Overridable at build time:
#   docker build --build-arg VITE_API_BASE=/api ...
ARG VITE_API_BASE=/api
RUN printf 'VITE_API_BASE=%s\n' "$VITE_API_BASE" > .env.production

# Type-check + bundle (npm run build == tsc --noEmit && vite build).
RUN npm run build

# ---- Stage 2: serve ---------------------------------------------------------
FROM nginx:alpine AS runtime

# Site config: SPA fallback + /api reverse proxy + PWA cache headers.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static build output.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Liveness: the shell must render (busybox wget ships in nginx:alpine).
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

# nginx:alpine already sets CMD ["nginx", "-g", "daemon off;"].
