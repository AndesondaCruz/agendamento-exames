# Agendamento de Exames de Imagem

Aplicação full stack para agendar exames de imagem: o paciente **busca o exame**, escolhe o **médico**, vê os **horários livres** de uma data e **confirma o agendamento**. Tudo também está disponível pela API.

[![CI](https://github.com/AndesondaCruz/agendamento-exames/actions/workflows/ci.yml/badge.svg)](https://github.com/AndesondaCruz/agendamento-exames/actions/workflows/ci.yml)

| Camada | Tecnologias |
| --- | --- |
| Back-end | Node 22, NestJS 12, TypeScript, TypeORM, PostgreSQL 16, Redis 7 |
| Front-end | React 19, TypeScript (strict), Vite, Tailwind CSS 4, TanStack Query |
| Testes | Vitest, Supertest, Testing Library, axe-core (acessibilidade) |
| Infra | Docker, Docker Compose, Nginx, GitHub Actions, Dependabot |

![Fluxo completo de agendamento](docs/screenshots/fluxo-completo.png)

---

## Sumário

- [Como rodar](#como-rodar)
- [Como testar](#como-testar)
- [API](#api)
- [Arquitetura](#arquitetura)
- [Decisões técnicas](#decisões-técnicas)
- [Premissas](#premissas)
- [O que ficou de fora](#o-que-ficou-de-fora-e-próximos-passos)
- [Fluxo de trabalho](#fluxo-de-trabalho)

---

## Como rodar

### Opção 1: Docker (recomendado, um comando)

Pré-requisito: Docker com Compose v2. As portas `8080`, `3000`, `5432` e `6379` precisam estar livres. Só a `8080` (o Nginx) é acessível pela rede; as outras três respondem apenas na própria máquina (`127.0.0.1`).

```bash
git clone https://github.com/AndesondaCruz/agendamento-exames.git
cd agendamento-exames
docker compose up --build --wait
```

| O quê | Onde |
| --- | --- |
| Aplicação (front) | http://localhost:8080 |
| API | http://localhost:3000/api |
| Documentação da API (Swagger) | http://localhost:3000/api/docs |

A API na porta `3000` só aceita conexões da própria máquina (`127.0.0.1`); quem vem de fora passa pelo Nginx, na `8080` (motivo na [decisão 10](#10-rate-limiting)).

O container da API aplica as migrations e carrega o catálogo (30 exames e 5 médicos) sozinho ao subir. Para parar: `docker compose down` (acrescente `--volumes` para apagar também os dados).

### Opção 2: desenvolvimento local (com hot reload)

Pré-requisitos: **Node 22** (há um `.nvmrc`; com nvm, rode `nvm use`) e **npm 11** (`npm install -g npm@11`; o lockfile usa recursos do npm 11).

```bash
# 1. Banco e cache (só eles, via Docker)
docker compose up -d --wait postgres redis

# 2. API: http://localhost:3000/api
cd backend
cp .env.example .env
npm ci
npm run db:setup        # migrations + catálogo
npm run start:dev

# 3. Front (em outro terminal): http://localhost:5173
cd frontend
npm ci
npm run dev
```

Em desenvolvimento o Vite repassa `/api` para `localhost:3000`, então o front não precisa de configuração.

---

## Como testar

Os testes e2e precisam só do Postgres e do Redis (eles sobem a própria cópia da API). Se você já seguiu a Opção 1, eles já estão rodando e a primeira linha pode ser pulada. Da raiz do repositório:

```bash
docker compose up -d --wait postgres redis

cd backend
npm ci              # dependências
npm test
npm run test:e2e

cd ../frontend
npm ci
npm test
```

| Pasta | Comando | O que roda | Quantidade |
| --- | --- | --- | --- |
| `backend` | `npm test` | Unitários: regra de horários, calendário/fuso, CPF e telefone, parser do CSV, cache | 94 testes |
| `backend` | `npm run test:e2e` | API completa via HTTP contra **Postgres e Redis reais** | 89 testes |
| `frontend` | `npm test` | Reducer, regras, fluxos completos de agendar, consultar e cancelar (Testing Library) e acessibilidade de cada tela (axe-core) | 67 testes |

Os testes e2e usam um banco separado (`agendamento_test`, criado automaticamente pelo Docker na primeira subida) e se recusam a rodar em qualquer banco cujo nome não termine em `_test`.

> Se o volume do Postgres já existia antes do script de criação do banco de teste, crie-o uma vez com:
> `docker exec agendamento-db createdb -U app agendamento_test`

**O que os testes garantem**, entre outros:

- a grade de horários do enunciado (turnos, durações de 20/30/40 min, horários ocupados, "agora");
- **20 requisições simultâneas para o mesmo horário: exatamente 1 sucesso e 19 conflitos (409)**, inclusive com a constraint do banco removida (a regra também está no código);
- todas as validações e códigos de erro (400, 404, 409, 422), incluindo CPF com dígito verificador errado;
- consultar exige protocolo **e** CPF; cancelar libera o horário na hora (outra pessoa consegue agendar), é idempotente e é recusado para exame que já começou;
- o cache: HIT/MISS, invalidação após agendar e a API funcionando **com o Redis fora do ar**;
- a documentação Swagger lista os erros que cada endpoint realmente devolve;
- o fluxo do front de ponta a ponta, incluindo o tratamento de horário ocupado por outra pessoa.

No CI, além disso, rodam formatação (Prettier), lint (oxlint), checagem de tipos, build, auditoria de dependências e um **smoke test do ambiente Docker completo** (front → Nginx → API → Postgres e Redis).

---

## API

Base: `http://localhost:3000/api`. Documentação interativa em `/api/docs`. Há uma coleção pronta em [`docs/api.http`](docs/api.http) (extensão REST Client do VS Code ou IDEs JetBrains).

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/exams?search=resson` | Busca exames pelo nome (ignora maiúsculas e acentos) |
| `GET` | `/doctors` | Médicos com seus turnos semanais |
| `GET` | `/doctors/:doctorId/availability?examId=7&date=2026-11-16` | Horários livres do médico para o exame na data |
| `POST` | `/appointments` | Cria um agendamento |
| `POST` | `/appointments/lookup` | Consulta um agendamento pelo protocolo + CPF |
| `POST` | `/appointments/:id/cancel` | Cancela um agendamento (exige o CPF) e libera o horário |
| `GET` | `/appointments/:id` | Consulta um agendamento pelo id |
| `GET` | `/health` | Saúde da API, do banco e do cache |

### Exemplos com curl

> Use uma data futura. `2026-11-16` é uma segunda-feira, dia em que a Dra. Helena (id 1) atende.

```bash
# Buscar exames
curl "http://localhost:3000/api/exams?search=resson"

# Horários livres: Dra. Helena, Ultrassonografia Abdominal Total (40 min)
curl "http://localhost:3000/api/doctors/1/availability?examId=7&date=2026-11-16"

# Agendar
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"patientName":"Maria da Silva","patientCpf":"529.982.247-25","patientBirthDate":"1990-05-20","patientPhone":"(85) 98765-4321","examId":7,"doctorId":1,"startsAt":"2026-11-16T08:00:00-03:00"}'

# Consultar (o protocolo são os 8 primeiros caracteres do id devolvido no POST)
curl -X POST http://localhost:3000/api/appointments/lookup \
  -H "Content-Type: application/json" \
  -d '{"protocol":"A1B2C3D4","patientCpf":"529.982.247-25"}'

# Cancelar (troque pelo id devolvido no POST)
curl -X POST http://localhost:3000/api/appointments/<id>/cancel \
  -H "Content-Type: application/json" \
  -d '{"patientCpf":"529.982.247-25"}'
```

A resposta do agendamento traz `protocol`, `status` (`SCHEDULED` ou `CANCELLED`), `cancelledAt` e o CPF **mascarado** (`***.982.247-**`): a API nunca devolve o documento completo.

Resposta da disponibilidade (resumida):

```json
{
  "date": "2026-11-16",
  "timezone": "America/Sao_Paulo",
  "doctor": { "id": 1, "name": "Dra. Helena Marques" },
  "exam": { "id": 7, "name": "Ultrassonografia Abdominal Total", "durationMinutes": 40 },
  "slots": [
    { "time": "08:00", "startsAt": "2026-11-16T08:00:00.000-03:00", "endsAt": "2026-11-16T08:40:00.000-03:00" },
    { "time": "08:40", "startsAt": "2026-11-16T08:40:00.000-03:00", "endsAt": "2026-11-16T09:20:00.000-03:00" }
  ],
  "unavailableReason": null
}
```

Data passada, dia sem atendimento ou agenda cheia **não são erro**: a resposta é `200` com `slots: []` e o motivo em `unavailableReason` (`PAST_DATE`, `NOT_WORKING_DAY`, `NO_AVAILABLE_SLOTS`). O front usa esse motivo para mostrar uma mensagem específica.

### Erros

Todo erro segue o mesmo formato, com um `code` estável (o cliente decide pelo `code`, não pelo texto):

```json
{
  "statusCode": 409,
  "code": "SLOT_UNAVAILABLE",
  "message": "Este horário não está mais disponível para este médico. Escolha outro.",
  "path": "/api/appointments",
  "timestamp": "2026-10-30T02:44:35.697Z"
}
```

| HTTP | `code` | Quando |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Corpo ou parâmetros inválidos; `details` lista cada campo e o motivo |
| 400 | `INVALID_DATE` | Data inexistente (ex.: `2026-02-30`) |
| 404 | `EXAM_NOT_FOUND`, `DOCTOR_NOT_FOUND`, `NOT_FOUND` | Recurso inexistente; na consulta e no cancelamento, também quando o CPF não confere (a mesma mensagem, para não confirmar que o protocolo existe) |
| 409 | `SLOT_UNAVAILABLE` | O horário foi ocupado, inclusive por uma requisição simultânea |
| 422 | `SLOT_IN_PAST` | Início no passado |
| 422 | `OUTSIDE_WORKING_HOURS` | O médico não atende ou o exame não cabe inteiro no turno |
| 422 | `SLOT_NOT_ON_GRID` | Horário fora da grade do exame (a mensagem lista os horários válidos) |
| 422 | `CANCELLATION_NOT_ALLOWED` | Cancelar um exame que já começou ou já passou |
| 429 | `TOO_MANY_REQUESTS` | Limite de requisições por IP excedido (agendar, consultar ou cancelar). O cabeçalho `Retry-After` diz em quantos segundos tentar de novo |
| 500 | `INTERNAL_ERROR` | Erro inesperado (detalhes só no log, nunca na resposta) |

A separação entre **422** e **409** é intencional: 422 é uma requisição que nunca seria válida; 409 é um conflito de estado, e tentar outro horário resolve.

---

## Arquitetura

```mermaid
flowchart LR
    B[Navegador] -->|:8080| W[Nginx<br/>front estático + proxy /api]
    W -->|/api| A[API NestJS]
    A -->|leituras e escritas| P[(PostgreSQL<br/>fonte da verdade)]
    A -.->|cache de leitura| R[(Redis)]
```

### Estrutura

```
.
├── backend/                  API NestJS
│   ├── data/                 exames.csv e medicos.md (dados do enunciado)
│   ├── src/
│   │   ├── appointments/     agendamento e disponibilidade
│   │   │   └── domain/       regra de horários (função pura, sem framework)
│   │   ├── exams/  doctors/  catálogo
│   │   ├── common/           erros, validação, tempo/fuso, cache
│   │   ├── database/         migrations e seed
│   │   └── health/
│   └── test/e2e/             testes contra Postgres e Redis reais
├── frontend/                 React + Vite
│   └── src/
│       ├── api/              cliente HTTP, tipos e hooks (TanStack Query)
│       ├── features/booking/ fluxo de agendamento (página, reducer, componentes)
│       ├── components/       componentes genéricos (estados de loading/erro/vazio)
│       └── lib/              datas no fuso da clínica, mensagens de erro
├── docker-compose.yml        Postgres + Redis + API + front
└── .github/                  CI, Dependabot e template de PR
```

### Modelo de dados

```mermaid
erDiagram
    doctors ||--o{ doctor_shifts : "atende em"
    doctors ||--o{ appointments : "realiza"
    exams ||--o{ appointments : "é agendado em"
    doctors {
        int id PK
        varchar name
        varchar crm UK
    }
    doctor_shifts {
        int id PK
        int doctor_id FK
        smallint weekday "1 = segunda ... 7 = domingo"
        smallint start_minute "08:00 = 480"
        smallint end_minute
    }
    exams {
        int id PK "id do exames.csv"
        varchar name
        smallint duration_minutes "20, 30 ou 40"
    }
    appointments {
        uuid id PK
        varchar patient_name
        char patient_cpf "só dígitos"
        date patient_birth_date
        varchar patient_phone "só dígitos, com DDD"
        varchar patient_email "opcional"
        varchar status "SCHEDULED ou CANCELLED"
        timestamptz cancelled_at
        int doctor_id FK
        int exam_id FK
        timestamptz starts_at
        timestamptz ends_at "início + duração do exame"
        timestamptz created_at
    }
```

Turnos são guardados em **minutos do dia** (`08:00` = 480): a geração de horários vira aritmética simples, sem depender de datas nem de fuso.

---

## Decisões técnicas

### 1. Concorrência com duas camadas: no código e no banco

A regra "um médico não pode ter dois exames ao mesmo tempo" é garantida duas vezes, de forma independente:

| Camada | Como funciona | Protege contra |
| --- | --- | --- |
| **1. Código** | Dentro de uma transação, a API trava a linha do médico (`SELECT ... FOR UPDATE`) e confere a sobreposição com a mesma função `overlaps` que gera a disponibilidade | Pedidos simultâneos pela API, em qualquer banco relacional com `FOR UPDATE` (Postgres, MySQL...) |
| **2. Banco** | Uma **exclusion constraint** do PostgreSQL recusa dois intervalos sobrepostos do mesmo médico | O que escapar do código: um bug, um script, outra aplicação gravando no mesmo banco |

```sql
EXCLUDE USING gist (doctor_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
  WHERE (status = 'SCHEDULED')
```

O `WHERE` faz a constraint ignorar agendamentos cancelados: cancelar libera o horário sem apagar o registro.

**Por que travar o médico, e não o horário:** um horário livre não tem linha no banco para travar, e por isso "consultar antes de inserir" sozinho tem *race condition* (duas requisições consultam, as duas veem livre, as duas gravam). Travando a linha do médico, pedidos para o **mesmo** médico são processados um de cada vez, enquanto médicos diferentes continuam em paralelo. O lock é do banco, então vale também com várias instâncias da API.

**Por que manter a constraint:** a regra de negócio não pode depender só de um banco específico (se o banco mudar, a regra continua no código), nem só do código (se algo gravar sem passar pela API, o banco ainda recusa). A violação da constraint (erro `23P01`) também vira **409**, e o log informa qual camada barrou o conflito.

Os testes provam cada camada sozinha: com a constraint **removida**, 20 requisições simultâneas ainda geram exatamente 1 agendamento; e um `INSERT` direto no banco, sem passar pela API, é recusado pela constraint.

### 2. Regra de negócio isolada e testada primeiro

A geração de horários é uma **função pura** (`appointments/domain/slot-generator.ts`): recebe turnos, duração, horários ocupados e "agora", e devolve os inícios possíveis. Sem banco, sem Nest, sem datas. Foi escrita com TDD a partir dos exemplos do enunciado. A mesma função valida o `POST`: a API recusa horários fora da grade mesmo que o front nunca os ofereça.

### 3. Fuso horário explícito

- Os turnos valem no fuso da clínica (`America/Sao_Paulo`, configurável em `CLINIC_TIMEZONE`).
- O banco guarda `timestamptz` (instante absoluto, em UTC).
- A API responde com o offset local (`2026-11-16T08:00:00.000-03:00`).
- O `POST` **exige** o offset em `startsAt`: `08:00` sem fuso é ambíguo, então a API recusa em vez de adivinhar.
- O "agora" vem de um `Clock` injetável. Nos testes ele é fixo, então eles dão o mesmo resultado hoje, daqui a um ano e no CI.

### 4. Cache de leitura com Redis

| Leitura | Validade | Invalidação |
| --- | --- | --- |
| Busca de exames, lista de médicos | 1 h | a cada inicialização da API (o catálogo só muda no deploy) |
| Disponibilidade | 5 min | **imediata**, a cada agendamento daquele médico naquele dia |
| Disponibilidade de hoje | não usa cache | depende do relógio |

- **O cache nunca decide uma escrita.** O agendamento vai sempre ao Postgres. No pior caso, o cache mostra um horário que acabou de ser ocupado, e o banco responde 409.
- **Invalidação por versão** (*generational keys*): cada médico + dia tem um contador que faz parte da chave. Agendar sobe o contador, e as chaves antigas ficam inalcançáveis numa operação atômica. Isso também evita a corrida clássica de "apagar a chave", em que uma leitura lenta regrava o dado velho logo depois.
- **Degradação graciosa**: com o Redis fora, a API segue pelo banco, sem erro e sem espera (os comandos falham na hora, sem fila). O `/api/health` informa o estado do cache, mas não derruba a API por causa dele.
- Sem `REDIS_URL`, o cache fica em memória: a aplicação funciona do mesmo jeito.
- Header `X-Cache: HIT | MISS | BYPASS` em cada resposta cacheável.

Com 30 exames e 5 médicos o Postgres já responde em milissegundos. O cache está aqui para mostrar como o sistema se comportaria com volume real, sem comprometer as regras de negócio.

### 5. Banco versionado e dados de entrada validados

- Schema só muda por **migration** versionada (`synchronize` desligado).
- O seed lê o `exames.csv` com validação de cada linha (tolera BOM e quebras de linha do Windows, aponta a linha com erro) e é **idempotente**: pode rodar várias vezes sem duplicar.
- Variáveis de ambiente são validadas no boot (zod): configuração errada impede a API de subir, com mensagem clara.

### 6. Validação e erros de ponta a ponta

- DTOs com `class-validator`; campos desconhecidos são **rejeitados** (`forbidNonWhitelisted`).
- A busca usa parâmetros no SQL (sem SQL injection) e escapa os curingas do `LIKE`.
- Um filtro global padroniza todas as respostas de erro; erros inesperados são logados com stack trace e devolvidos sem detalhes internos.
- Helmet (cabeçalhos de segurança) e CORS restrito à origem do front.

### 7. Front-end

- **TanStack Query** para estado do servidor (cache, loading, erro, refetch) e `useReducer` com reducer puro para o estado da tela. O reducer garante, por exemplo, que trocar o exame limpa o horário escolhido.
- Cada etapa trata **loading, erro e vazio**; a disponibilidade se atualiza sozinha a cada 60 s.
- **Conflito (409)**: o paciente volta para a escolha de horário com um aviso, a lista é recarregada e os dados do paciente são preservados.
- Dias em que o médico não atende já aparecem desabilitados.
- **Acessibilidade**: inputs nativos (navegação por teclado e leitor de tela) e foco gerenciado. A conformidade com WCAG 2.1 AA foi verificada com axe-core de duas formas, que **não são a mesma coisa**:
  - **Auditoria manual** com axe-core em navegador real (Chromium, via Playwright), durante o desenvolvimento, em todas as telas (agendamento, erro de validação, confirmação, consulta, confirmação de cancelamento e cancelado), incluindo contraste: 0 violações. Esse roteiro não está no repositório, então não dá para reproduzi-lo a partir daqui.
  - **Testes automatizados** com axe-core (jsdom), em `frontend/src/test/accessibility.test.tsx`: rodam a cada `npm test` e garantem a estrutura acessível em cada tela e estado. **Contraste não é coberto por esses testes**, porque o jsdom não calcula CSS.
- Busca com debounce de 300 ms; build de produção com cerca de 89 KB (gzip).

| Escolha da data | Horário ocupado por outra pessoa (409) | Celular |
| --- | --- | --- |
| ![](docs/screenshots/selecao-de-data.png) | ![](docs/screenshots/conflito-409.png) | ![](docs/screenshots/mobile.png) |

### 8. Docker e CI/CD

- Imagens multi-stage, rodando como usuário **não-root**, com healthcheck. O front é servido por Nginx sem privilégios, com cache longo para os arquivos com hash e proxy para a API.
- O Compose sobe cada serviço só quando as dependências estão saudáveis.
- O pipeline do GitHub Actions roda em todo PR. A `main` é protegida: só recebe código por PR com o CI verde.
- Dependabot abre PRs semanais de atualização. As atualizações *major* são avaliadas uma a uma: três delas foram recusadas porque o CI mostrou que quebrariam o projeto, e as de `@types/node` porque os tipos precisam acompanhar o Node usado em produção (22).

### 9. Identificação do paciente, consulta e cancelamento

Inspirado no fluxo de agendamento de grandes redes de diagnóstico, o paciente se identifica e depois consegue consultar e cancelar o exame sozinho.

- **Identificação**: CPF (com dígito verificador), data de nascimento, telefone com DDD e e-mail opcional. A validação existe nos dois lados: no front, para o paciente corrigir na hora; na API, porque ela pode ser chamada direto. O banco guarda só dígitos e tem `CHECK` de formato.
- **Mínimo de dados na resposta (LGPD)**: o CPF volta sempre mascarado.
- **Consulta por protocolo + CPF**, num `POST`: o CPF vai no corpo, e não na URL, para não ficar registrado em logs de servidor e no histórico do navegador. Errar o protocolo ou o CPF dá a mesma mensagem, para não confirmar que um protocolo existe.
- **Cancelamento sem apagar** (*soft cancel*): o status vira `CANCELLED` com a data do cancelamento. O histórico fica preservado, a disponibilidade e a constraint passam a ignorar o agendamento, e o cache daquele dia é invalidado na hora.
- **Idempotente**: cancelar duas vezes devolve o mesmo resultado. Se a resposta do primeiro pedido se perder, o paciente pode repetir sem erro.
- No front, cancelar pede **confirmação** na própria tela, e o foco vai para a pergunta e depois para o resultado (leitores de tela anunciam o que mudou).

| Consultar | Confirmar o cancelamento |
| --- | --- |
| ![](docs/screenshots/meu-agendamento.png) | ![](docs/screenshots/cancelar.png) |

### 10. Rate limiting

Consultar e cancelar recebem um CPF, então alguém poderia tentar descobrir agendamentos de outras pessoas em massa. A API limita quantas requisições cada IP faz por janela de tempo.

| Rota | Limite por IP (padrão) | Variável |
| --- | --- | --- |
| `POST /appointments/lookup` | 10 por minuto | `RATE_LIMIT_LOOKUP` |
| `POST /appointments/:id/cancel` | 10 por minuto | `RATE_LIMIT_CANCEL` |
| `POST /appointments` | 100 por minuto | `RATE_LIMIT_CREATE` |

A janela é `RATE_LIMIT_WINDOW_SECONDS` (60). Cada rota tem o **seu contador**: consultar não gasta o limite de cancelar, e as demais rotas (exames, médicos, horários, saúde) não são limitadas. Ao estourar, a resposta é **429** no formato de erro da API (`TOO_MANY_REQUESTS`), com o cabeçalho `Retry-After` em segundos.

- **O limitador roda antes da validação do corpo**, então requisições inválidas também gastam o limite.
- **De onde vem o IP**: atrás de um proxy, o IP da conexão é o do proxy. A API lê o `X-Forwarded-For`, mas **só confia nos últimos `TRUST_PROXY_HOPS` saltos** (padrão `1`, o Nginx do Compose). O que o cliente escrever antes disso é ignorado, e por isso ele não consegue forjar o IP.
- **`TRUST_PROXY_HOPS` depende de onde a API roda.** Em um deploy como o Render, a API fica atrás do proxy da plataforma (e não do nosso Nginx), e o número de saltos pode ser outro. Valor **menor** que o real: todos os clientes aparecem com o IP do proxy e dividem o mesmo limite. Valor **maior**: o cliente consegue forjar o IP e escapar do limite. Confira com a documentação da plataforma e ajuste a variável. Use `0` quando a API receber conexões diretas.
- **Porta 3000 só local**: por isso o Compose a publica em `127.0.0.1`. Aberta para a rede, qualquer um poderia chamar a API sem passar pelo Nginx, escrevendo um `X-Forwarded-For` falso para cada requisição.
- **Postgres e Redis também só locais** (`127.0.0.1:5432` e `127.0.0.1:6379`): o banco usa usuário e senha de desenvolvimento (`app`/`app`) e o Redis não tem senha, então abertos para a rede qualquer um nela os alcançaria. A API e o Nginx falam com eles pela rede interna do Compose, que não depende dessas portas; elas existem para o desenvolvimento local (`npm run start:dev`, testes e2e) e para clientes como o DBeaver na própria máquina. Para acessar de outro computador, use um túnel SSH.
- **Contador em memória**: simples e sem dependência extra, mas cada instância da API conta sozinha. Com várias réplicas, o limite efetivo seria (limite × instâncias); nesse cenário o contador deve ficar no Redis, que o projeto já usa para o cache.
- Todas as variáveis estão documentadas em [`backend/.env.example`](backend/.env.example) e são validadas no boot: um valor inválido (`TRUST_PROXY_HOPS=abc`, limite `0`) impede a API de subir, e variável vazia vale como ausente.

Nos testes e2e o limitador fica **ligado**, com limites altos na configuração de teste; o teste do 429 usa limites baixos e exercita o mesmo código de produção.

---

## Premissas

Pontos que o enunciado deixa em aberto e como foram decididos:

1. **Grade de horários**: começa no início de cada turno e avança em passos iguais à duração do exame. Turno 08:00–12:00 com exame de 40 min gera 08:00, 08:40, 09:20, 10:00, 10:40, 11:20. Um horário só é oferecido se o exame couber **inteiro** no turno.
2. **Sobreposição**: intervalos são fechados no início e abertos no fim (`[início, fim)`). Um exame que termina às 08:40 não conflita com outro que começa às 08:40.
3. **Horários ocupados** removem da grade os inícios cujo intervalo se sobrepõe a um agendamento existente, inclusive de outro exame com outra duração. A grade não é recalculada a partir do fim do agendamento existente.
4. **Hoje**: só aparecem horários com início a partir de agora. Datas passadas retornam lista vazia.
5. **Fuso**: todos os horários são da clínica (`America/Sao_Paulo`).
6. **Qualquer médico faz qualquer exame**, como diz o `medicos.md`.
7. **Turnos não cruzam a meia-noite** (vale para todos os médicos do enunciado).
8. **Nome do paciente**: de 3 a 120 caracteres, só letras (com acento), espaços, apóstrofo, hífen e ponto.
9. **Janela de agendamento**: o front oferece os próximos 60 dias. A API não impõe limite superior.
10. **Protocolo**: os 8 primeiros caracteres do id (UUID), em maiúsculas. Sozinho não dá acesso a nada: a consulta sempre exige o CPF junto.
11. **Cancelamento**: permitido até o início do exame. Não há prazo mínimo de antecedência, porque o enunciado não define um.

---

## O que ficou de fora (e próximos passos)

Fora do escopo do desafio, mas o que eu faria num sistema real:

- **Rate limiting distribuído e por CPF**: hoje o limite é por IP e o contador fica na memória de cada instância (veja a [decisão 10](#10-rate-limiting)). Com várias réplicas da API, o contador deve ir para o Redis; e um limite também por CPF protegeria contra quem troca de IP.
- **Login do paciente** e cadastro reaproveitável; hoje a identificação vai em cada agendamento.
- **Remarcar** num passo só (hoje: cancelar e agendar de novo).
- **Unidades, convênios e instruções de preparo** (ex.: jejum), como nos fluxos de grandes redes. Ficaram de fora porque dependem de dados que o enunciado não traz, e inventá-los seria pior que não ter.
- **Confirmação por e-mail ou SMS** com o protocolo.
- **Administração** de médicos, turnos e exames (hoje vêm do seed), incluindo feriados e bloqueios de agenda.
- **Observabilidade**: logs estruturados (JSON), métricas e tracing.
- **Teste de carga** (k6) para medir o ganho real do cache e o comportamento sob concorrência alta.
- **Banco com dois perfis de acesso**: um com privilégios para migrations e outro restrito para a API em execução.
- **Validação explícita do certificado TLS** do banco em produção.
- Migração para TypeScript 7 e Vitest 5 no back-end (recusadas por enquanto; o CI apontou incompatibilidades).

---

## Fluxo de trabalho

- **GitHub Flow**: cada funcionalidade numa branch, integrada por Pull Request com descrição, CI obrigatório e *merge commit* (o histórico mostra a evolução por etapas).
- **Conventional Commits** (`feat`, `fix`, `test`, `build`, `ci`, `docs`...), em commits pequenos e com um assunto só.
- Ordem de construção: banco e catálogo → regra de horários (TDD) → API de agendamento → CI → front → Docker → cache.

### Uso de IA

Usei IA (Claude) como par de programação e mentor técnico durante todo o desafio: para discutir alternativas de arquitetura, revisar código, investigar erros e escrever testes. As decisões foram minhas, e todo o código foi revisado, executado e testado por mim antes de cada commit.
