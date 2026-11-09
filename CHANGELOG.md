# Changelog

All notable changes to the `Utka` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.0.0] - 2026-11-09

### Added
- **Utka Core (`utka-core`)**: Background service reconciling Xray-core in-memory state with PostgreSQL database via gRPC domain socket (`/run/xray/xray-api.sock`).
- **Utka Sub (`utka-sub`)**: High-performance Rust/Node subscription server (port 8008) generating Clash, Sing-box, and standard VLESS configurations.
- **Utka Web (`utka-web`)**: Next.js 14 administrative dashboard (port 8006) with Authentik OIDC Single Sign-On and PostgreSQL persistence.
- **Utka CLI (`utka-cli`)**: Host CLI management tool (`/usr/local/bin/utka`) for automated client provisioning and state inspection.
- **Subconverter Integration**: Native Clash/Mihomo ruleset converter container (`docker.io/metacubex/subconverter:latest`).
- **Release Automation**: Release gate verification (`scripts/release-check.sh`) and milestone release tagging tool (`scripts/release.sh`).
