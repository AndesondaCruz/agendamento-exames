# syntax=docker/dockerfile:1

# ============================================================================
# API (NestJS) — build multi-stage
#   1. deps:    instala TODAS as dependências (incluindo dev, para compilar)
#   2. build:   compila o TypeScript e remove as dependências de dev
#   3. runtime: imagem final só com dist/ + node_modules de produção
# Resultado: imagem menor, sem compilador nem ferramentas de teste, e
# executada por um usuário sem privilégios de root.
# ============================================================================

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
# O lockfile e o campo allowScripts são do npm 11; a imagem do Node 22 traz o npm 10.
RUN npm install -g npm@11 && npm cache clean --force

# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
# Camada separada: só reinstala quando package*.json mudar (cache do Docker).
RUN npm ci

# ---------------------------------------------------------------------------
FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Só o necessário para executar: código compilado, deps de produção,
# package.json ("type": "module") e o catálogo de exames usado pelo seed.
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node data ./data
COPY --chown=node:node docker-entrypoint.sh ./

# Usuário sem privilégios (já existe na imagem oficial do Node).
USER node

EXPOSE 3000

# O Docker marca o container como "unhealthy" se a API ou o banco caírem.
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1

ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
