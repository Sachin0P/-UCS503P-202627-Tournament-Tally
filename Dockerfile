# --- Stage 1: build the Angular app ---
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
# These must exist at build time — pass as build args so the client ID ends up
# baked into the static bundle (it's not a secret; see README).
ARG GOOGLE_CLIENT_ID
RUN cat > src/environments/environment.ts <<EOF
export const environment = {
  production: true,
  apiUrl: '/api',
  socketUrl: '/',
  googleClientId: '${GOOGLE_CLIENT_ID}',
};
EOF
RUN npx ng build

# --- Stage 2: backend + built frontend, this is what actually runs ---
FROM node:22-slim
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend ./
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
ENV DB_PATH=/app/data/arenasuite.db
VOLUME ["/app/data"]

EXPOSE 4000
CMD ["node", "server.js"]
