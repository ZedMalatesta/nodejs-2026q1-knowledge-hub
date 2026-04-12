# Knowledge Hub

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager.

## Downloading

```
git clone {repository URL}
```

## Installing NPM modules

```
npm install
```

## Configuration

The application requires environment variables. Create a `.env` file in the root directory by copying the example file:

```bash
cp .env.example .env
```

Ensure you update the values in `.env` to match your local environment, especially for database credentials and security keys.
  
## Database Migrations

Before running the application for the first time or after changing the Prisma schema, run the migrations to sync the database:

```bash
npm run prisma:migrate
```


## Running application

```
npm start
```

After starting the app on port (4000 as default) you can open
in your browser OpenAPI documentation by typing http://localhost:4000/doc/.
For more information about OpenAPI/Swagger please visit https://swagger.io/.

## Testing

After application running open new terminal and enter:

To run all tests without authorization

```
npm run test
```

To run custom tests required for hacker score

```
npm run test:custom
```

To run only one of all test suites

```
npm run test -- <path to suite>
```

To run all test with authorization

```
npm run test:auth
```

To run only specific test suite with authorization

```
npm run test:auth -- <path to suite>
```

To run refresh token tests

```
npm run test:refresh
```

To run RBAC (role-based access control) tests

```
npm run test:rbac
```

### Auto-fix and format

```
npm run lint
```

```
npm run format
```

### Debugging in VSCode

Press <kbd>F5</kbd> to debug.

For more information, visit: https://code.visualstudio.com/docs/editor/debugging

## Docker

To run the application in Docker:

```bash
npm run docker:run
```

To stop the application in Docker:

```bash
npm run docker:down
```

After startup, the API will be available at http://localhost:4000.
The database is available internally at `localhost:5432`.
Adminer (Database UI) is available at http://localhost:8080.

### Security Scanning

Scan for vulnerabilities using:
```bash
npm run docker:scan:scout
# OR
npm run docker:scan:trivy
```

### Docker Hub

The Docker image for this application can be found at: 
[https://hub.docker.com/r/1111zedda/nodejs-2026q1-knowledge-hub-app](https://hub.docker.com/r/1111zedda/nodejs-2026q1-knowledge-hub-app)