#!/bin/sh
# Inicialização do container da API:
#   1. aplica as migrations pendentes (seguro repetir: só roda as novas)
#   2. popula o catálogo (idempotente), se RUN_SEED=true
#   3. inicia a API
# "set -e": se a migration falhar, o container NÃO sobe com o schema errado.
set -e

echo "[entrypoint] Aplicando migrations..."
node ./node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run

if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "[entrypoint] Populando catálogo (idempotente)..."
  node dist/database/seeds/seed.js
fi

echo "[entrypoint] Iniciando a API..."
# exec: o Node vira o processo principal e recebe o SIGTERM do Docker,
# permitindo o desligamento gracioso (enableShutdownHooks).
exec node dist/main.js
