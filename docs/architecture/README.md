# System Architecture & Topology

This document describes the internal component topology, data flows, and protocol design of Utka.

## Topology Diagram

```mermaid
flowchart TD
    subgraph ClientLayer["Clients & Subscribers"]
        Browser["End Users (Web Portal / Admin)"]
        VPNClient["Proxy Clients (Clash, Hiddify, Sing-box)"]
    end

    subgraph IngressLayer["Edge Ingress (Nginx)"]
        NginxWeb["Nginx Reverse Proxy (:443)"]
    end

    subgraph UtkaSuite["Utka Application Suite"]
        Web["utka-web (Next.js :3000)"]
        Sub["utka-sub (Fastify/Node :8008)"]
        Core["utka-core (Reconcile Daemon)"]
        CLI["utka CLI (Terminal)"]
    end

    subgraph StorageLayer["Data Layer"]
        Postgres[(PostgreSQL Database)]
    end

    subgraph XrayLayer["Xray-core Nodes"]
        MasterXray["Master Node Xray (Local UNIX socket)"]
        EdgeXray["Remote Nodes (gRPC over VLESS)"]
    end

    Browser -->|HTTPS| NginxWeb
    VPNClient -->|HTTP Sub /s/:token| NginxWeb
    NginxWeb -->|Proxy /dash, /admin| Web
    NginxWeb -->|Proxy /s/, /api/sub| Sub
    CLI --> Postgres
    CLI -->|gRPC| MasterXray

    Web --> Postgres
    Sub --> Postgres
    Core --> Postgres

    Core -->|gRPC Stats & User Alter| MasterXray
    Core -->|gRPC Stats & User Alter| EdgeXray
```

## Data Flows

1. **User Authentication & Provisioning**:
   - Web visitors authenticate against Authentik via NextAuth OIDC.
   - Upon sign-in, user roles are synchronized from Authentik group claims.
   - Subscriptions and per-inbound UUIDs are generated and persisted in PostgreSQL.
   - `utka-core` pushes the generated UUIDs to all designated Xray inbounds over gRPC `AddUserOperation`.

2. **Subscription Delivery**:
   - Clients request `/s/:token` or `/api/sub/:token`.
   - `utka-sub` retrieves active node configs and subscription metadata from PostgreSQL.
   - Returns client configurations (VLESS / Clash / Sing-box) with live `Subscription-Userinfo` bandwidth usage headers.

3. **Reconciliation & Traffic Sync**:
   - `utka-core` polls Xray's `StatsService` over gRPC periodically (default 15s).
   - Ingests uplink and downlink byte counters, updates database records, and evicts inactive/revoked clients via `RemoveUserOperation`.
