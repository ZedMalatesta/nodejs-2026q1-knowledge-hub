# Knowledge Hub

A RESTful API built with NestJS, PostgreSQL, and Prisma. Supports JWT authentication, role-based access control (admin / editor / viewer), and structured logging with file rotation.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start — Local](#quick-start--local)
- [Quick Start — Docker](#quick-start--docker)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [AI Integration (Gemini)](#ai-integration-gemini)
- [Testing](#testing)
- [Logging](#logging)
- [Linting & Formatting](#linting--formatting)
- [Docker](#docker)

---

## Prerequisites

| Tool | Version | Link |
| ---- | ------- | ---- |
| Node.js | 20 or 22 LTS | [nodejs.org](https://nodejs.org/en/download/) |
| npm | bundled with Node | — |
| PostgreSQL | 14+ | [postgresql.org](https://www.postgresql.org/download/) |
| Git | any | [git-scm.com](https://git-scm.com/downloads) |

> If you prefer Docker, you only need **Docker** and **Docker Compose** — see [Quick Start — Docker](#quick-start--docker).

---

## Quick Start — Local

Follow these steps in order on a fresh machine:

```bash
# 1. Clone the repository
git clone <repository-url>
cd nodejs-2026q1-knowledge-hub

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
```

Open `.env` and make sure `DATABASE_URL` points to your local Postgres instance.  
The default already uses `localhost`, so if you have Postgres running locally with default credentials no change is needed:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/knowledge_hub?schema=public"
```

```bash
# 4. Apply database migrations (creates all tables)
npm run db:migrate

# 5. (Optional) Seed the database with sample data
npm run db:seed

# 6. Start the application
npm start
```

The API is now available at **http://localhost:4000**.  
Swagger docs are at **http://localhost:4000/doc**.

---

## Quick Start — Docker

Docker handles the database automatically — no local Postgres required.

```bash
# 1. Clone and enter the repo
git clone <repository-url>
cd nodejs-2026q1-knowledge-hub

# 2. Create your environment file
cp .env.example .env

# 3. Build and start all services
npm run docker:run
```

> No need to edit `DATABASE_URL` for Docker — `docker-compose.yml` automatically uses `db` as the hostname inside the container, regardless of what is in your `.env`.
> Migrations run automatically on every container start via the entrypoint script.

The API is now available at **http://localhost:4000**.  
Swagger docs are at **http://localhost:4000/doc**.

To stop everything:

```bash
npm run docker:down
```

---

## Environment Variables

All variables live in `.env`. Copy `.env.example` to get started — every value has a sensible default for local development.

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `PORT` | Port the app listens on | `4000` |
| `DATABASE_URL` | Postgres connection string | `localhost:5432` (local) |
| `POSTGRES_USER` | Postgres username | `postgres` |
| `POSTGRES_PASSWORD` | Postgres password | `postgres` |
| `POSTGRES_DB` | Database name | `knowledge_hub` |
| `POSTGRES_HOST` | Postgres host (`localhost` or `db` for Docker) | `localhost` |
| `POSTGRES_PORT` | Postgres port | `5432` |
| `JWT_SECRET` | Secret for signing access tokens | `secret123123` |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | `secret123123` |
| `JWT_ACCESS_TTL` | Access token lifetime | `15m` |
| `JWT_REFRESH_TTL` | Refresh token lifetime | `7d` |
| `LOG_LEVEL` | Logging verbosity (`log`, `debug`, `warn`, `error`) | `log` |
| `LOG_MAX_FILE_SIZE` | Max log file size in KB before rotation | `1024` |

> **Security:** change `JWT_SECRET` and `JWT_REFRESH_SECRET` to long random strings in any environment that is not purely local development.

---

## Database

### Migrations

Migrations are managed with Prisma. Run this any time you pull changes that update `prisma/schema.prisma`:

```bash
npm run db:migrate      # development — creates migration files + applies them
npm run db:deploy       # production / CI — applies existing migrations only
```

### Seeding

The seed script creates a set of test users, articles, categories, and comments. **It deletes all existing data first**, so only use it on a dev/test database.

```bash
npm run db:seed
```

After seeding the following accounts exist:

| Login | Password | Role |
| ----- | -------- | ---- |
| `TEST_ADMIN_USER` | `TestAdmin123!` | admin |
| `editor` | (see seed file) | editor |

### Creating an admin manually

There is a dedicated endpoint that safely creates an admin account (or returns the existing one if the login is already an admin):

```bash
curl -X POST http://localhost:4000/auth/admin-create \
  -H "Content-Type: application/json" \
  -d '{"login": "myadmin", "password": "MySecret123!"}'
```

---

## Running the Application

| Command | Description |
| ------- | ----------- |
| `npm start` | Start with ts-node (development, no build needed) |
| `npm run start:dev` | Start with file-watch (restarts on change) |
| `npm run build && npm run start:prod` | Compile then run from `dist/` |

---

## API Documentation

Interactive Swagger UI is available at **http://localhost:4000/doc** whenever the app is running.

All endpoints require a **Bearer token** in the `Authorization` header except:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/admin-create`

### Role permissions summary

| Action | admin | editor | viewer |
| ------ | ----- | ------ | ------ |
| Read anything | ✓ | ✓ | ✓ |
| Create / edit / delete articles & comments | ✓ | own only | ✗ |
| Manage categories | ✓ | ✗ | ✗ |
| Manage users | ✓ | ✗ | ✗ |

---

## AI Integration (Gemini)

The API includes AI-powered endpoints backed by the **Google Gemini API** (model: `gemini-2.0-flash`).

### Obtaining a Gemini API key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) and sign in with a Google account.
2. Click **Create API key** and select or create a Google Cloud project.
3. Copy the generated key — it starts with `AIza...`.
4. Open your `.env` file and paste the key:

   ```env
   GEMINI_API_KEY=AIza...your-key-here...
   ```

The free tier provides sufficient quota for development and testing.

### AI environment variables

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `GEMINI_API_KEY` | Your Gemini API key | *(required)* |
| `GEMINI_API_BASE_URL` | Gemini API base URL | `https://generativelanguage.googleapis.com` |
| `GEMINI_MODEL` | Model name | `gemini-2.0-flash` |
| `AI_RATE_LIMIT_RPM` | Max AI requests per minute | `20` |
| `AI_CACHE_TTL_SEC` | In-memory cache TTL in seconds | `300` |

### AI endpoints

All AI endpoints require a valid Bearer token (any role).

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/ai/articles/:articleId/summarize` | Summarize an article (`maxLength`: `short` / `medium` / `detailed`) |
| `POST` | `/ai/articles/:articleId/translate` | Translate an article (`targetLanguage` required) |
| `POST` | `/ai/articles/:articleId/analyze` | Analyze an article (`task`: `review` / `bugs` / `optimize` / `explain`) |
| `POST` | `/ai/generate` | Free-form prompt (rate-limited) |
| `GET` | `/ai/usage` | In-memory usage stats (requests, tokens by endpoint) |

#### Quick test (replace `TOKEN` and `ARTICLE_ID`)

```bash
# Summarize
curl -X POST http://localhost:4000/ai/articles/ARTICLE_ID/summarize \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxLength": "short"}'

# Free-form generation
curl -X POST http://localhost:4000/ai/generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain dependency injection in one paragraph."}'

# Usage stats
curl http://localhost:4000/ai/usage \
  -H "Authorization: Bearer TOKEN"
```

### Known limitations

- **Free-tier quota**: The Gemini free tier allows ~15 requests/minute and 1 500 requests/day. `AI_RATE_LIMIT_RPM=20` is set conservatively but you may still hit upstream 429s under sustained load — the service retries up to 3 times with exponential backoff before returning 503.
- **Latency**: Gemini responses typically take 1–5 seconds per request. Cached responses (summarize, translate, analyze) return instantly on repeat calls within the TTL window.
- **Regional availability**: The Gemini API may not be available in all regions. If you receive persistent 403 errors, check [Google's availability page](https://ai.google.dev/gemini-api/docs/available-regions) or use a VPN.
- **In-memory cache and usage stats**: Both are reset on every server restart. They are not shared across multiple instances.

---

## Testing

> **Requires a running app.** Start the server first (`npm start`), then run tests in a second terminal.

Run everything — Vitest unit tests and all Jest e2e suites — with one command:

```bash
npm test
```

Or run individual groups:

| Command | Tests | What it runs |
| ------- | ----- | ----------- |
| `npm run test:unit` | 189 | Vitest unit tests (no server needed) |
| `npm run test:coverage` | 310 | All tests + coverage report |
| `npm run test:auth` | 77 | Full CRUD + auth flow for all resources |
| `npm run test:refresh` | 4 | Refresh token lifecycle |
| `npm run test:rbac` | 35 | Role-based access control scenarios |
| `npm run test:custom` | 5 | Pagination & sorting edge cases |

The e2e scripts seed the database automatically before each run — point them at a **test database**, not production.

### Coverage

| Metric | Result |
| ------ | ------ |
| Statements | 99.67% |
| Branches | 94.39% |
| Functions | 100% |
| Lines | 99.66% |

### Full test run from scratch

```bash
# Terminal 1 — start the app
npm run db:migrate
npm start

# Terminal 2 — run all tests
npm test
```

---

## Logging

The application writes structured JSON logs to both stdout and a rotating log file at `logs/app.log`.

- Log verbosity is controlled by `LOG_LEVEL` in `.env` (`log` | `debug` | `warn` | `error`).
- When `logs/app.log` exceeds `LOG_MAX_FILE_SIZE` KB the current file is renamed to `logs/app-<timestamp>.log` and a new file is started.
- Sensitive fields (`password`, `token`, `accessToken`, `refreshToken`, `secret`) are automatically replaced with `[REDACTED]` in request/response logs.
- Unhandled exceptions and unhandled promise rejections are logged before the process exits.

---

## Linting & Formatting

```bash
npm run lint      # ESLint with auto-fix
npm run format    # Prettier
```

---

## Docker

### Run

```bash
npm run docker:run     # docker-compose up --build
npm run docker:down    # docker-compose down
```

Services started:

| Service | URL |
| ------- | --- |
| API | http://localhost:4000 |
| Swagger | http://localhost:4000/doc |
| Postgres | `localhost:5432` (host machine) |
| Adminer (DB UI) | http://localhost:8080 — only with `--profile debug` |

Run Adminer for database inspection:

```bash
docker-compose --profile debug up
```

### Security scanning

```bash
npm run docker:scan:scout   # Docker Scout
npm run docker:scan:trivy   # Trivy
```

### Docker Hub

The pre-built image is available at:  
[https://hub.docker.com/r/1111zedda/nodejs-2026q1-knowledge-hub-app](https://hub.docker.com/r/1111zedda/nodejs-2026q1-knowledge-hub-app)
