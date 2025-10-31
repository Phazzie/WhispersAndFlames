# Changelog

All notable changes to this project will be documented in this file.

## [0.4.0] - 2025-10-31

### Added

- **PostgreSQL Support**: Full database integration for production deployments
  - Created `storage-pg.ts` with connection pooling and automatic schema initialization
  - Implemented TTL-based game expiration (24 hours)
  - Automatic cleanup of expired sessions and games
- **Storage Adapter Pattern**: Seamless switching between PostgreSQL and in-memory storage
  - Automatically selects storage backend based on `DATABASE_URL` environment variable
  - Falls back to in-memory storage for development
  - Clear logging of active storage backend
- **Database Schema**: PostgreSQL tables for users, sessions, and games
  - Users table with email and password hash
  - Sessions table with expiration tracking
  - Games table with JSONB state storage

### Changed

- Made all storage methods properly async across both implementations
- Updated all API routes to use storage adapter instead of direct storage
- Added `DATABASE_URL` to environment configuration
- Updated DigitalOcean App Platform configuration with PostgreSQL database

### Fixed

- Added missing `await` keywords in authentication and storage calls
- Removed unused variables in API routes
- Fixed test expectations for achievement descriptions
- Fixed apostrophe encoding in game UI components

## [0.3.0] - 2025-10-17

### Removed

- **Firebase Integration**: Completely removed Firebase (Firestore and Authentication)
- Firebase npm package and all related dependencies
- `.firebaserc` configuration file

### Added

- **In-Memory Storage**: New storage layer for games and user sessions
- **Session-Based Authentication**: Custom authentication system using HTTP-only cookies
- **API Routes**: Complete set of REST API endpoints for auth and game management:
  - `/api/auth/signup` - User registration
  - `/api/auth/signin` - User login
  - `/api/auth/signout` - User logout
  - `/api/auth/me` - Get current user
  - `/api/game/create` - Create new game
  - `/api/game/join` - Join existing game
  - `/api/game/update` - Update game state
  - `/api/game/[roomCode]` - Get game by room code
- **Client Libraries**: `client-auth.ts` and `client-game.ts` for frontend API interactions
- **Polling-Based Updates**: Real-time game updates via 2-second polling interval

### Changed

- Game state management now uses in-memory storage instead of Firestore
- Authentication switched from Firebase Auth to custom session-based system
- Updated all game step components to use new API-based architecture
- Home page and profile page rewritten to use new authentication system
- Game types updated to remove Firebase-specific types (DocumentReference, FieldValue)

### Technical Details

- Storage is ephemeral - all data resets on server restart
- Sessions stored in memory with 7-day expiration
- SHA-256 hashing for passwords (suitable for demo, not production)
- Optimized for DigitalOcean App Platform single-instance deployment

## [0.2.0] - 2025-10-17

### Added

#### Build & Environment

- Added `.nvmrc` specifying Node 20
- Added `engines` field in `package.json` requiring Node >=20 <21
- Created `.env.example` with required environment variables
- Cleaned up `next.config.ts` removing build error ignores

#### Linting & Formatting

- Added `.eslintrc.cjs` with Next.js, TypeScript, and React configuration
- Added `.prettierrc` with consistent code formatting rules
- Configured `lint-staged` with `husky` for pre-commit hooks
- Added `format` and `lint:fix` npm scripts

#### Testing

- Configured Vitest with jsdom environment and path aliases
- Added unit tests for environment validation
- Added unit tests for rate limiter utility
- Configured Playwright for end-to-end testing
- Added basic e2e tests for game flow
- Added `test`, `test:ui`, `test:coverage`, and `test:e2e` scripts

#### Security & Robustness

- Added middleware with security headers (X-Frame-Options, Referrer-Policy, CSP)
- Implemented in-memory rate limiter (30 requests/minute per IP)
- Created rate limiter utility for protecting server actions

#### Observability & Health

- Added `/api/health` endpoint returning status, version, and timestamp
- Added development-only console timing around AI operations

#### Deployment

- Created `.do/app.yaml` for DigitalOcean App Platform deployment
- Added `DEPLOY.md` with deployment instructions and doctl usage

#### CI/CD

- Created `.github/workflows/ci.yml` for automated testing
- Configured Node 20.x with npm caching
- Added jobs for typecheck, lint, test, and optional e2e tests

#### Infrastructure

- Created environment validation module with Zod
- Added explicit TypeScript return types throughout
- Fixed type errors in game steps and profile page

### Changed

- Updated all AI action handlers with timing logs (dev mode only)
- Improved error handling in server actions

### Known Limitations

- In-memory database (single instance, ephemeral data)
- Rate limiting is per-instance only
- Google Fonts may fail in restricted network environments (build-time)

## [0.1.0] - Initial Release

- Basic game functionality with Firebase
- AI-powered question generation
- Real-time multiplayer support
