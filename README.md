# Utka 🦆

[![OpenTimestamps](https://img.shields.io/badge/OpenTimestamps-anchored-blue.svg)](https://opentimestamps.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-24%2B-brightgreen.svg)](https://nodejs.org)

**Utka** is a modular, stealth proxy management suite built on top of [Xray-core](https://github.com/XTLS/Xray-core). It manages distributed proxy nodes, dynamic client credentials, multi-inbound provisioning, multi-protocol subscription feeds (VLESS, Clash, Sing-box), and bandwidth accounting with a bilingual client portal, administrative dashboard, and terminal CLI.

---

## Architecture

Utka is composed of decoupled, specialized services that can run unified in a single container or scaled independently:

```
                          ┌───────────────────────────┐
                          │   Authentik IdP (OIDC)    │
                          └─────────────┬─────────────┘
                                        │
┌───────────────────────────────────────┼────────────────────────────────────────┐
│ Utka Suite                            │                                        │
│                                       ▼                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌────────────────────┐  │
│  │       utka-web        │  │       utka-sub        │  │      utka-cli      │  │
│  │ (Next.js Admin & Dash)│  │ (Subscription Server) │  │(Terminal CLI Tool) │  │
│  └───────────┬───────────┘  └───────────┬───────────┘  └──────────┬─────────┘  │
│              │                          │                         │            │
│              └──────────────────────────┼─────────────────────────┘            │
│                                         ▼                                      │
│                             ┌───────────────────────┐                          │
│                             │  PostgreSQL Database  │                          │
│                             └───────────┬───────────┘                          │
│                                         │                                      │
│                             ┌───────────▼───────────┐                          │
│                             │       utka-core       │                          │
│                             │(Reconciliation Daemon)│                          │
│                             └───────────┬───────────┘                          │
└─────────────────────────────────────────┼──────────────────────────────────────┘
                                          │ gRPC API
                                          ▼
                             ┌─────────────────────────┐
                             │        Xray-core        │
                             │(VLESS, Reality, WS, gRPC│
                             └─────────────────────────┘
```

1. **`utka-core`**: Autonomous background reconciliation daemon. Continuously inspects node connectivity, queries real-time traffic statistics from remote and local Xray instances via gRPC stats API, updates PostgreSQL, and synchronizes in-memory clients.
2. **`utka-sub`**: High-throughput HTTP subscription server. Serves dynamic subscription endpoints (`/s/:token`, `/api/sub/:token`) in multiple formats: raw base64 VLESS links, Clash/Mihomo YAML profiles, and Sing-box JSON configs with standard `Subscription-Userinfo` headers. Includes a fully responsive bilingual web portal with dark/light themes and QR code generators.
3. **`utka-web`**: Next.js App Router administrative console and end-user portal. Provides node topology management, client inbound controls, traffic logs, and Authentik OIDC single sign-on.
4. **`utka-cli` (`bin/utka`)**: Comprehensive headless command-line interface for administrators to manage users, inspect traffic, check gRPC socket health, and render terminal QR codes.

---

## Key Features

- **Multi-Inbound Provisioning**: Automatically generates multiple egress routes per user (e.g. Frankfurt relay egress, Moscow WARP egress, direct local egress) with strict routing isolation.
- **Universal Subscription Distribution**: Out-of-the-box compatibility with Clash Verge Rev, Mihomo Party, Clash Meta, Hiddify, Karing, ClashMi, v2rayN, and Sing-box.
- **Stealth Camouflage**: Ingress masquerades behind legitimate HTTPS services (e.g. Git, Auth, Nextcloud) with WebSocket path routing and TLS/XTLS Reality.
- **Authentik OIDC Single Sign-On**: Full authentication delegation with automatic group-to-role synchronization.
- **Traffic Tracking & Historical Logs**: Granular upload/download tracking with history, active quotas, and zero data leakage.
- **Cryptographic Release Verification**: Commits and tags are signed with SSH keys and anchored into the Bitcoin blockchain via OpenTimestamps.

---

## Quick Start

### 1. Prerequisites

- Docker / Podman with Compose support
- PostgreSQL 16+
- Xray-core 25.10+ (with API enabled over gRPC or UNIX socket)

### 2. Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Configure your `.env` parameters:

```ini
AUTH_URL=https://dash.example.com
AUTH_SECRET="generate_with_openssl_rand_base64_32"

# Authentik OIDC
AUTHENTIK_CLIENT_ID="utka-client-id"
AUTHENTIK_CLIENT_SECRET="utka-client-secret"
AUTHENTIK_ISSUER="https://auth.example.com/application/o/utka/"

# PostgreSQL
DATABASE_URL="postgresql://utka:secret@postgres:5432/utka_db?schema=public"

# Master Xray Node
XRAY_SERVER_DOMAIN_OR_IP="vpn.example.com"
XRAY_API_URL="unix:///run/xray/xray-api.sock"
```

### 3. Running with Docker Compose

```bash
docker compose up -d
```

Apply database migrations:

```bash
docker compose exec utka npx prisma migrate deploy
```

---

## CLI Usage

Utka ships with an integrated CLI tool (`utka`):

```bash
# Check daemon health, DB connection, and Xray socket
utka status

# Force sync all active database users into Xray memory
utka sync

# List all users with traffic usage and expiration
utka user list

# Add a new client
utka user add Alice

# Display user details, subscription URL, and QR code in terminal
utka user get Alice

# Revoke and delete a user
utka user delete Alice
```

---

## Security Policy

All official releases and Git commits are cryptographically signed using SSH keys and anchored to the Bitcoin blockchain via OpenTimestamps.

To verify signatures locally:

```bash
git config gpg.ssh.allowedSignersFile .allowed_signers
git log --show-signature
```

Vulnerabilities should be reported responsibly according to [SECURITY.md](SECURITY.md).

---

## Documentation

- [English Documentation](docs/en/README.md)
- [Русская документация](README.ru.md)
- [Architecture & ADRs](docs/architecture/README.md)

---

## License

This project is licensed under the [MIT License](LICENSE).
