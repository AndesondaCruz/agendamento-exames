# syntax=docker/dockerfile:1

# ============================================================================
# Front-end (React + Vite) — build multi-stage
#   1. build:   instala dependências e gera os arquivos estáticos (dist/)
#   2. runtime: Nginx sem privilégios de root servindo dist/ e fazendo
#               proxy de /api para o container da API
# A imagem final não tem Node: só Nginx + HTML/CSS/JS (alguns MB).
# ============================================================================

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
RUN npm install -g npm@11 && npm cache clean --force

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# URL da API embutida no build. "/api" = mesma origem (proxy do Nginx abaixo).
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ---------------------------------------------------------------------------
# Imagem oficial da NGINX Inc. que já roda como usuário não-root (porta 8080).
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ > /dev/null || exit 1
