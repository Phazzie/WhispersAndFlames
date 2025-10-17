# Changelog

All notable changes to this project will be documented in this file.

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
