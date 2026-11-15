# Utka User Documentation

Welcome to the Utka user and administrator documentation.

## Table of Contents

1. [Architecture Overview](../../README.md#architecture)
2. [CLI Manual](#cli-manual)
3. [Client Setup Guide](#client-setup-guide)
4. [Deployment with Docker Compose](../../README.md#quick-start)

---

## CLI Manual

The `utka` command-line utility provides zero-overhead administration directly from the server:

### Commands

| Command | Description |
|---|---|
| `utka status` | Check PostgreSQL database connectivity, worker loop state, and Xray gRPC socket status. |
| `utka sync` | Reconcile active users in database with in-memory Xray clients across all configured nodes. |
| `utka user list` | Tabular display of all subscriptions, traffic consumption, and active inbounds. |
| `utka user add <name>` | Provision a new user with default client inbounds and print subscription link. |
| `utka user get <name\|token>` | Show user details, copyable VLESS links, and an ASCII QR code in terminal. |
| `utka user delete <name\|token>` | Remove user credentials from all nodes and delete database records. |

---

## Client Setup Guide

Utka generates dynamic, universal subscription feeds compatible with major modern proxy clients:

- **Clash Verge Rev / Mihomo Party (Desktop)**: Import subscription URL directly into Profiles. Mode: Rule.
- **Hiddify (Android / iOS / Desktop)**: Tap "New Profile" $\rightarrow$ "Add from Clipboard".
- **Karing / ClashMi (iOS / Android)**: Tap "Add Profile" and paste the `/s/:token` URL.
- **Sing-box**: Use the `/api/sub/:token` endpoint for native JSON configurations.
