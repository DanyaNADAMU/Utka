# Changelog

All notable changes to the `Utka` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
