# Changelog

All notable changes to the `Utka` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Unified CI/CD Pipelines (`.github/workflows/`, `.github/actions/test/`)**: Adopted the organization's shared `Danyanadamu/Workflows@v1` pipelines (`build.yml`, `release.yml`, `ots-cron.yml`, `codeql.yml`, `protection-audit.yml`, `renovate-cron.yml`, `scan-cron.yml`) with gitleaks secret scanning, shellcheck/hadolint linting, Sigstore build-provenance attestations, and digest-pinned rootless Quadlet deploys via `scripts/deploy-utka.sh`.
- **Zero-Disconnect Xray User Reconciliation (`src/lib/xray.ts`, `src/core.ts`, `src/lib/trafficDaemon.ts`)**: Added `getXraySysStats` (uptime-based fast-restart detection) and `getInboundUsers` diffing in `syncNodeUsers` so `utka-core` restores missing users on startup and after fast Xray restarts without touching active client sessions.

### Changed
- **Safe Container Entrypoint (`entrypoint.sh`)**: Removed `--accept-data-loss` from startup `prisma db push` and added `SIGTERM`/`SIGINT` forwarding to child processes so `utka-core` flushes pending traffic cleanly on container updates.
- **Worker Deduplication (`src/worker.ts`)**: Consolidated legacy worker entrypoint onto `src/core.ts`.
- **Container Image (`Dockerfile`)**: Removed unused `docker-cli` package to reduce image size and CVE surface.
- **Release Automation (`scripts/release.sh`, `scripts/release-check.sh`)**: Synchronized with ecosystem release scripts to push `main` and signed tags to `origin`.

### Fixed
- **Security & Linter Gates (`package.json`, `package-lock.json`, `entrypoint.sh`, `scripts/release.sh`, `.hadolint.yaml`)**: Upgraded `next` / `eslint-config-next` to `16.4.6` and refreshed lockfile dependencies via `npm audit fix`, eliminating all critical and moderate npm advisories (`0` critical production dependencies); resolved `shellcheck` (`SC2059`, `SC2317`) and `hadolint` policy checks.

### Removed
- **Legacy CI & Ad-hoc Deploy Scripts**: Removed `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `scripts/build-nadamudash.sh`, and `scripts/deploy-nadamudash.sh`.

## [v1.2.2] - 2026-11-16

### Fixed
- **Xray User Synchronization**: Re-sync unexpired `ExpiringUuid` records alongside active subscription inbounds to Xray in `syncNodeUsers()`, ensuring clients in transition survive node reconnects and service restarts without authentication rejection.

## [v1.2.1] - 2026-11-16

### Fixed
- **Clash Rules**: Route `googleusercontent.com` to proxy for Gemini user assets.

## [v1.2.0] - 2026-11-15

### Added
- **Project Rules (`AGENTS.md`)**: Embedded standard repository rules and domain boundary specification following the canonical Template layout.
- **Bilingual Documentation (`README.md`, `README.ru.md`, `docs/`)**: Added comprehensive English and Russian user and administrator documentation, quick start guides, architecture topology diagrams, and CLI manuals.
- **MIT License (`LICENSE`)**: Added standard permissive open-source license.
- **Authentik Group-to-Role Synchronization (`src/auth.ts`)**: Implemented automatic admin role elevation on login based on Authentik admin group claims (Admin Implication Invariant).

### Changed
- **Privacy Sanitization**: Parameterized all infrastructure domains and private server IPs via generic environment variables (`XRAY_SERVER_DOMAIN_OR_IP`, `BASE_DOMAIN`, `FRANKFURT_HOST`, `FRANKFURT_SNI`, `BRAND_NAME`) with zero leakage in defaults.
- **Package Metadata**: Bumped version to `1.2.0` in `package.json` and synchronized built CLI bundle (`bin/utka.js`).

### Removed
- **Repository Scratch Scripts**: Purged ad-hoc database maintenance and debug scripts from the repository root (`fix_db.js`, `query.js`, `test_sub.js`, `wipe_traffic.ts`).
- **Legacy Deploy Script**: Removed deprecated `deploy.sh` script containing legacy project naming and direct-push patterns.
- **Erroneous Gitignore Entry**: Removed `AGENTS.md` from `.gitignore`.

## [v1.1.0] - 2026-11-15

### Added
- **Moscow Client Inbound (`src/lib/xray.ts`)**: Renamed default Glacier WARP inbound (`vless-in`) to `Moscow` across raw VLESS subscription links and Clash proxy definitions, providing dual client-facing inbounds (`Frankfurt` and `Moscow`).
- **Default Multi-Inbound Provisioning (`src/lib/userService.ts`, `src/app/admin/users/actions.ts`, `src/auth.ts`)**: Non-admin clients are now automatically provisioned with both `vless-frankfurt` and `vless-in` upon creation or initial subscription fetch.

### Fixed
- **Inbound Persistence (`src/lib/subscriptionHandler.ts`)**: Resolved bug where custom inbounds assigned to non-admin clients by administrators in the web panel were purged upon subsequent subscription polling by the client. Client inbound assignments now permanently persist in PostgreSQL and Xray memory.

## [v1.0.0] - 2026-11-09

### Added
- **Utka Core (`utka-core`)**: Background service reconciling Xray-core in-memory state with PostgreSQL database via gRPC domain socket (`/run/xray/xray-api.sock`).
- **Utka Sub (`utka-sub`)**: High-performance Rust/Node subscription server (port 8008) generating Clash, Sing-box, and standard VLESS configurations.
- **Utka Web (`utka-web`)**: Next.js 14 administrative dashboard (port 8006) with Authentik OIDC Single Sign-On and PostgreSQL persistence.
- **Utka CLI (`utka-cli`)**: Host CLI management tool (`/usr/local/bin/utka`) for automated client provisioning and state inspection.
- **Subconverter Integration**: Native Clash/Mihomo ruleset converter container (`docker.io/metacubex/subconverter:latest`).
- **Release Automation**: Release gate verification (`scripts/release-check.sh`) and milestone release tagging tool (`scripts/release.sh`).
