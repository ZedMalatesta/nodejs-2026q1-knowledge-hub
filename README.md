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
- [Testing](#testing)
- [Logging](#logging)
- [Linting & Formatting](#linting--formatting)
- [Docker](#docker)

---

## Prerequisites

| Tool | Version | Link |
|------|---------|------|
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
|----------|-------------|---------|
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
|-------|----------|------|
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
|---------|-------------|
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
|--------|-------|--------|--------|
| Read anything | ✓ | ✓ | ✓ |
| Create / edit / delete articles & comments | ✓ | own only | ✗ |
| Manage categories | ✓ | ✗ | ✗ |
| Manage users | ✓ | ✗ | ✗ |

---

## Testing

### Unit tests (Vitest)

No running server or database needed:

```bash
npm run test:unit
```

Run with coverage report:

```bash
npm run test:coverage
```

### End-to-end tests (Jest + Supertest)

These hit a running server. **Start the app first** (`npm start` or `npm run start:dev`), then open a second terminal.

The e2e scripts automatically seed the database before running, so point them at a **test database**, not production.

| Command | What it runs |
|---------|-------------|
| `npm run test:auth` | Full CRUD + auth flow for all resources |
| `npm run test:refresh` | Refresh token lifecycle |
| `npm run test:rbac` | Role-based access control scenarios |
| `npm run test:custom` | Pagination & sorting edge cases |

> All e2e commands connect directly to `localhost:5432`. Make sure your local Postgres is running even if your app is running in Docker, or adjust `DATABASE_URL` in the test scripts.

### Common testing workflow from scratch

```bash
# Terminal 1 — start the app
npm run db:migrate
npm start

# Terminal 2 — run all e2e suites
npm run test:auth
npm run test:refresh
npm run test:rbac
npm run test:custom
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
|---------|-----|
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
