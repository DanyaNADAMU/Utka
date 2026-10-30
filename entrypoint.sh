#!/bin/sh
# ==============================================================================
# Utka Unified Container Entrypoint
# Dynamically runs utka-core, utka-sub, and/or utka-web based on flags
# ==============================================================================
set -e

# Ignore SIGHUP so terminal disconnects or conmon socket events do not terminate PID 1
trap '' HUP

echo "[Utka] Syncing PostgreSQL database schema..."
prisma db push --accept-data-loss --skip-generate

ENABLE_CORE="${UTKA_ENABLE_CORE:-${ENABLE_WORKER:-true}}"
ENABLE_SUB="${UTKA_ENABLE_SUB:-${ENABLE_SUB:-true}}"
ENABLE_WEB="${UTKA_ENABLE_WEB:-${ENABLE_UI:-false}}"

if [ "$ENABLE_CORE" != "true" ] && [ "$ENABLE_SUB" != "true" ] && [ "$ENABLE_WEB" != "true" ]; then
    echo "[Utka] Error: No components enabled. At least one of CORE, SUB, or WEB must be enabled."
    exit 1
fi

# 1. Start utka-core in the background if enabled
if [ "$ENABLE_CORE" = "true" ]; then
    echo "[Utka] Starting utka-core (background stats & sync engine)..."
    if [ -f /app/core.js ]; then
        node /app/core.js &
    else
        node /app/worker.js &
    fi
    CORE_PID=$!
fi

# 2. Select foreground process based on hierarchy (WEB > SUB > CORE)
if [ "$ENABLE_WEB" = "true" ]; then
    if [ "$ENABLE_SUB" = "true" ]; then
        echo "[Utka] Starting utka-sub (subscription delivery engine on port 8008)..."
        node /app/sub.js &
    fi
    echo "[Utka] Starting utka-web (administrative UI on port 3000)..."
    exec node /app/server.js
elif [ "$ENABLE_SUB" = "true" ]; then
    echo "[Utka] Starting utka-sub (subscription delivery engine on port 8008)..."
    exec node /app/sub.js
else
    echo "[Utka] Running utka-core in foreground..."
    exec wait $CORE_PID
fi
