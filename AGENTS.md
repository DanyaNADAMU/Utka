# Utka — Project Agent Rules

This file documents Utka-specific architecture, domain boundaries, and development rules. Global standards live in `~/Projects/Agent/AGENTS.md` and apply unconditionally on top of this file.

## What This Project Is

Utka is a modular, stealth proxy management suite built on top of Xray-core with VLESS-WebSocket and XTLS-Reality protocols. It manages distributed proxy nodes, dynamic client credentials, multi-inbound provisioning (e.g. relay and direct/WARP egress paths), subscription distribution (raw VLESS, Clash, Sing-box), and bandwidth accounting with a bilingual client portal, administrative dashboard, and command-line interface.

## Non-Negotiables

- **Global rules win**: Global directives from `~/Projects/Agent/AGENTS.md` apply across all environments (auth delegation via Authentik, exactly one break-glass admin, core → CLI → Web panel build order, secrets only in `Infra` vault, systemd over cron, ufw over raw iptables).
- **Public repository invariant**: This repository is public and open source by default. Hardcoding private server IPs, personal domains, or infrastructure-specific secrets is strictly prohibited. All hosts, domains, ports, and credentials must be parameterized via environment variables and database settings with generic fallbacks.
- **Tested to main, tagged to prod**: Every change must be validated on the `test` staging testbed on Berg prior to merging into `main`. Production deployments require a clean Git tree, active `main` branch, SemVer tag (`vMAJOR.MINOR.PATCH`), and an explicit release section in `CHANGELOG.md`.

## Architecture & Module Boundaries

Utka is structured into cleanly isolated layers:

- **Core Library (`src/lib/`)**: Single source of truth for business logic. Contains Xray gRPC client operations (`src/lib/xray.ts`), subscription payload generators (`src/lib/subscriptionHandler.ts`, `src/lib/clashConfig.ts`), user services (`src/lib/userService.ts`), and database models (`src/lib/db.ts`). Core logic must remain decoupled from specific HTTP frameworks or UI components.
- **Reconciliation Engine (`src/core.ts` / `utka-core`)**: Autonomous background daemon responsible for continuous health monitoring, traffic consumption polling via Xray gRPC stats, and database synchronization.
- **Subscription Server (`src/sub.ts` / `utka-sub`)**: High-performance HTTP server dedicated to subscription delivery (`/s/:token`, `/api/sub/:token`) and the self-contained bilingual client web portal.
- **CLI Control Plane (`src/cli/` / `bin/utka`)**: Console interface for headless server management, user provisioning, node health checks, and QR code terminal rendering. CLI depends only on `src/lib/` and never imports Web UI code.
- **Web Interface (`src/app/` / `utka-web`)**: Next.js App Router administrative panel and user dashboard. Authenticates via Authentik OIDC and invokes `src/lib/` services.

## Conventions

- **Commits**: Conventional Commits (`feat`, `fix`, `docs`, `chore`, `refactor`), written in English in imperative mood, signed with SSH key (`danya-git`).
- **Documentation**: All user-facing documentation, manuals, and UI copy must be bilingual (English in `README.md` and `docs/en/`; Russian in `README.ru.md` and `docs/ru/`).
- **Code Standards**: Strict static TypeScript typing without `any` where avoidable. Vitest unit and integration test coverage for all subscription formatters, client link builders, and protocol handlers.
