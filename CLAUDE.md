# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**obsrv-web-console** is a full-stack web application consisting of:
- **Backend**: Node.js/Express server (TypeScript) - handles API routes, authentication, database operations, and proxies to external services
- **Frontend**: React application (TypeScript) - UI for the Obsrv observability platform

The backend serves both API endpoints and serves the built React frontend at `/console`.

## Project Structure

```
obsrv-web-console/
├── src/
│   ├── app.ts                          # Express app configuration, session setup, auth initialization
│   ├── index.ts                        # Server entry point
│   ├── main/                           # Main application code
│   │   ├── controllers/                # Route handlers (auth, users, metrics, etc)
│   │   ├── services/                   # Business logic (auth providers, OAuth, Keycloak, etc)
│   │   ├── middlewares/                # Express middlewares (auth, validation, authorization)
│   │   ├── proxies/                    # Proxies to external services (Prometheus, AlertManager)
│   │   ├── helpers/                    # Utility helpers for OAuth, Prometheus metrics, etc
│   │   ├── resources/                  # Configuration (routes config, Prometheus entities)
│   │   ├── routes/                     # Route mounting logic
│   │   ├── utils/                      # Utilities (validation schemas, axios config, etc)
│   │   ├── types/                      # TypeScript type definitions
│   │   └── tests/                      # Jest tests
│   └── shared/                         # Shared utilities and config
│       ├── databases/                  # Database connection (PostgreSQL)
│       ├── middlewares/                # Shared middlewares (error handler, metadata)
│       ├── resources/                  # App config from env vars
│       ├── types/                      # Shared types
│       └── utils/                      # Shared utilities (logger, routes, fs)
├── web-console-v2/                     # React frontend (Create React App)
│   ├── src/
│   ├── public/
│   └── package.json
├── dbScripts/                          # Database migration/setup scripts
├── Dockerfile                          # Multi-stage build: React frontend + Node backend
├── package.json                        # Backend dependencies and scripts
├── tsconfig.json                       # TypeScript configuration
├── jest.config.js                      # Jest test configuration
└── .eslintrc.js                        # ESLint configuration with Prettier integration

```

## Key Architecture Concepts

### Backend (Express/TypeScript)

**Authentication Flow**:
- Multiple auth providers: Keycloak, Google OAuth, Active Directory, local Obsrv auth, OIDC
- Selected via `AUTHENTICATION_TYPE` env var
- Uses Passport.js for strategy implementation
- Sessions stored in PostgreSQL (`user_session` table)
- OAuth endpoints at `/oauth/v1/*` for token management
- Auth provider factory pattern in `authProviderFactory.ts` selects the correct provider based on config

**Route Configuration**:
- Routes defined as nested config objects in `src/main/resources/routesConfig.ts`
- Mounted via `mountRoutesWithApplication` utility in `src/shared/utils/routes.ts`
- Each route can have multiple middlewares in sequence
- Controllers handle the final response

**Database**:
- PostgreSQL connection pool via `pg-promise` and `pg`
- Connection configured in `src/shared/databases/postgres.ts`
- Sessions persist in PostgreSQL via `connect-pg-simple`

**Proxies**:
- HTTP proxies to external services: Prometheus, AlertManager, System API, Grafana, Superset
- Configured in `src/main/proxies/` and mounted via `src/main/utils/proxy.ts`

**Metrics**:
- Prometheus metrics exposed at `/metrics` endpoint
- Client library: `prom-client`
- Metrics defined in `src/main/helpers/prometheus/metrics.ts`

### Frontend (React/Create React App)

**Key Libraries**:
- **Material-UI (MUI)**: UI components and theming
- **React Router**: Navigation (v6)
- **React Query (@tanstack/react-query)**: Server state management
- **Formik + Yup**: Form validation
- **@rjsf**: JSON Schema form rendering
- **ApexCharts**: Charts and graphs
- **Axios**: HTTP client

**Build Output**:
- React app built to `web-console-v2/build/`
- Post-build script moves static files: `build/console/static/`
- Backend copies built app to `src/build/` at runtime (see Dockerfile)

**Development Setup**:
- Proxy in `package.json` forwards API requests to `http://localhost:3000/` (the backend)
- Frontend served from `http://localhost:3000/` in development

## Commands

### Backend (root directory)

```bash
npm install                    # Install dependencies
npm start                      # Start backend server (ts-node ./src)
npm test                       # Run Jest tests
npm lint                       # Check linting with ESLint
npm lint:fix                   # Auto-fix linting issues
npm prettier                   # Check code formatting
npm prettier:fix               # Auto-format code
```

### Frontend (web-console-v2 directory)

```bash
npm install --legacy-peer-deps # Install dependencies (needed for peer dep conflicts)
npm start                      # Run dev server on http://localhost:3000
npm test                       # Run tests in watch mode
npm run build                  # Build for production (includes postbuild script)
npm run lint                   # Check linting
npm run lint-fix               # Auto-fix linting
```

### Common Development Workflows

**Full Stack Development**:
1. Start backend: `npm start` (from root, listens on PORT env var, default 3000)
2. In another terminal, start frontend: `cd web-console-v2 && npm start` (proxies API to backend)

**Build and Run in Docker**:
```bash
docker build -t obsrv-web-console .
docker run -p 3000:3000 obsrv-web-console
```

**Run Backend Tests**:
```bash
npm test                           # Run all tests
npm test -- src/main/tests/sample  # Run specific test file
npm test -- --watch                # Run in watch mode (add to npm test command)
```

**Database Setup**:
- Requires PostgreSQL running
- See `dbScripts/all.sql` for schema/migrations
- Session table `user_session` created automatically by `connect-pg-simple`

## Environment Configuration

Key environment variables (see `src/shared/resources/appConfig.ts`):

```bash
# Server
PORT=3000
ENV=development
APP_NAME=obsrv-web-console
SESSION_SECRET=your-session-secret

# Authentication
AUTHENTICATION_TYPE=basic  # or keycloak, google, ad, oidc, obsrv
AUTH_KEYCLOAK_SERVER_URL=http://localhost:8080/auth
AUTH_KEYCLOAK_REALM=MyKeyCloakRealm
AUTH_KEYCLOAK_CLIENT_ID=myOauthClient
AUTH_GOOGLE_CLIENT_ID=...
AUTH_GOOGLE_CLIENT_SECRET=...

# External Services
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:8000
ALERT_MANAGER_URL=http://localhost:9093
OBS_API_URL=http://localhost:4000
CONFIG_API_URL=http://localhost:4000
SYSTEM_API_URL=http://localhost:4002

# Database
PGHOST=localhost
PGPORT=5432
PGDATABASE=obsrv
PGUSER=postgres
PGPASSWORD=password
```

## Common Development Patterns

### Adding a New API Endpoint

1. **Create a controller** in `src/main/controllers/` - export a default function that returns `{ handler: () => (req, res) => {...} }`
2. **Add to controller index** in `src/main/controllers/index.ts` using the registry map
3. **Add route config** in `src/main/resources/routesConfig.ts` with path, method, and middleware chain
4. **Add validation schema** if needed in `src/main/utils/validationSchemas/`

### Authentication and Authorization

- **Auth middleware**: `src/main/middlewares/auth.ts` - verifies user is authenticated
- **Authorization middleware**: `src/main/middlewares/authorization.ts` - checks permissions
- **Dataset auth**: `src/main/middlewares/datasetAuthInjector.ts` - injects dataset-level auth context

### Using Database

```typescript
import { query } from '../shared/databases/postgres';
const result = await query('SELECT * FROM table WHERE id = $1', [id]);
```

### Adding Prometheus Metrics

- Define metric in `src/main/helpers/prometheus/metrics.ts`
- Increment/observe in controllers or services
- Metric automatically exposed at `/metrics` endpoint

## Code Quality

- **ESLint**: Configured with TypeScript support, Prettier, and security rules
- **Prettier**: Code formatter (runs via ESLint)
- **No console logs**: ESLint enforces no-console rule - use logger from `src/shared/utils/logger.ts`
- **TypeScript Strict Mode**: Enabled in tsconfig.json
- Some type-checking rules disabled with TODOs - see `.eslintrc.js` rules section

## Testing

- **Framework**: Jest with TypeScript support (ts-jest preset)
- **Test files**: Place alongside source code or in `src/main/tests/`
- **Env for tests**: `NODE_ENV=test` automatically set by Jest

## Docker Build Process

Multi-stage Dockerfile:
1. **Stage 1**: Build React frontend in `web-console-v2/` → output to `/opt/app/web-console-v2/build/`
2. **Stage 2**: Copy backend code, install dependencies, copy built frontend to `src/build/`
3. **Runtime**: Starts with `npm run start` which runs ts-node pointing to the built backend

The backend serves the React frontend at `/console` route and API endpoints at `/` and `/api/`.
