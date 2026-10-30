# Back-end (API NestJS)

A documentação completa do projeto (como rodar, testes, API, arquitetura e decisões técnicas) está no [README da raiz](../README.md).

Comandos mais usados, dentro desta pasta:

| Comando | O que faz |
| --- | --- |
| `npm run start:dev` | API com hot reload em http://localhost:3000/api (Swagger em `/api/docs`) |
| `npm run db:setup` | Aplica as migrations e carrega o catálogo |
| `npm test` | Testes unitários |
| `npm run test:e2e` | Testes e2e (precisa de `docker compose up -d --wait postgres redis`) |
| `npm run migration:generate -- src/database/migrations/Nome` | Gera uma migration a partir das entidades |
| `npm run lint` / `npm run typecheck` / `npm run format:check` | Qualidade de código |
