# Knowledge Hub API

A robust Knowledge Hub API built with NestJS, Prisma, and PostgreSQL.

## 🚀 Quick Start (Docker)

The fastest way to get the server up and running is using Docker.

### 1. Prerequisites
- **Docker Desktop** installed and running.
- **Node.js** (v22+) installed for running tests locally.

### 2. Setup Environment
Copy the example environment file to `.env`:
```bash
cp .env.example .env
```
*The default values in `.env` are pre-configured to work with Docker.*

### 3. Launch the Server
Run the following command to build the image, start the database, and launch the API:
```bash
npm run docker:run
```
Once started:
- **API**: http://localhost:4000
- **Swagger Documentation**: http://localhost:4000/doc/
- **Database Admin (Adminer)**: http://localhost:8080 (Run with `docker compose --profile debug up` to enable)

---

## 🛠 Local Development

If you prefer to run the application outside of Docker, follow these steps:

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Database only
You still need the PostgreSQL database. Start it via Docker:
```bash
docker compose up -d db
```

### 3. Database Migrations & Seeding
Sync the database schema and add initial data:
```bash
npm run db:migrate
npm run db:seed
```

### 4. Run the Application
```bash
npm run start:dev
```

---

## 🧪 Testing

The tests connect to the database at `localhost:5432`. Ensure the database container is running (`docker compose up -d db`) before testing.

### Run All Tests (Recommended)
This runs all E2E tests including Authentication, RBAC, and Refresh Token logic.
```bash
npm run test
```

### Other Test Commands
- `npm run test:auth`: Run only core authentication tests.
- `npm run test:refresh`: Run refresh token logic tests.
- `npm run test:rbac`: Run Role-Based Access Control tests.
- `npm run test:custom`: Run custom hacker-score tests.

---

## 📦 Project Structure

- `src/`: Application source code (NestJS).
- `prisma/`: Database schema and seed scripts.
- `test/`: E2E test suites.
- `docker/`: Dockerfiles and container configuration.

## 🛡 Security Scanning

Scan the Docker image for vulnerabilities:
```bash
npm run docker:scan:scout  # Using Docker Scout
npm run docker:scan:trivy  # Using Trivy
```