#!/bin/sh
# ==============================================================================
# Utka Unified Container Entrypoint
# Dynamically runs utka-core, utka-sub, and/or utka-web based on flags
# ==============================================================================
set -e

echo "[Utka] Syncing PostgreSQL database schema..."
prisma db push --accept-data-loss --skip-generate

PIDS=""

shutdown() {
    echo ""
    echo "[Utka] Signal received. Shutting down active components gracefully..."
    for pid in $PIDS; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null
        fi
    done
    wait
    echo "[Utka] All components exited. Container stopping."
    exit 0
}

trap shutdown INT TERM

# 1. utka-core (Background sync daemon and Xray traffic collector)
ENABLE_CORE="${UTKA_ENABLE_CORE:-${ENABLE_WORKER:-true}}"
if [ "$ENABLE_CORE" = "true" ]; then
    echo "[Utka] Starting utka-core (background stats & sync engine)..."
    if [ -f /app/core.js ]; then
        node /app/core.js &
    else
        node /app/worker.js &
    fi
    PIDS="$PIDS $!"
fi

# 2. utka-sub (Subscription delivery data plane on port 8008)
ENABLE_SUB="${UTKA_ENABLE_SUB:-${ENABLE_SUB:-true}}"
if [ "$ENABLE_SUB" = "true" ]; then
    echo "[Utka] Starting utka-sub (subscription delivery engine on port 8008)..."
    node /app/sub.js &
    PIDS="$PIDS $!"
fi

# 3. utka-web (Next.js administrative web UI on port 3000)
ENABLE_WEB="${UTKA_ENABLE_WEB:-${ENABLE_UI:-false}}"
if [ "$ENABLE_WEB" = "true" ]; then
    echo "[Utka] Starting utka-web (administrative UI on port 3000)..."
    node /app/server.js &
    PIDS="$PIDS $!"
fi

if [ -z "$PIDS" ]; then
    echo "[Utka] Error: No components enabled. At least one of CORE, SUB, or WEB must be enabled."
    exit 1
fi

echo "[Utka] Active components running (PIDs:$PIDS). Ready."

# Wait for any child process to exit. If any critical child fails, exit container.
wait -n
EXIT_STATUS=$?
echo "[Utka] A core process exited with status $EXIT_STATUS. Terminating container..."
shutdown
