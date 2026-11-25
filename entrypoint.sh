#!/bin/sh
# ==============================================================================
# Utka Unified Container Entrypoint
# Dynamically runs utka-core, utka-sub, and/or utka-web based on flags while
# forwarding SIGTERM/SIGINT cleanly so utka-core flushes traffic before exit.
# ==============================================================================
set -e

# Ignore SIGHUP so terminal disconnects or conmon socket events do not terminate PID 1
trap '' HUP

echo "[Utka] Syncing PostgreSQL database schema..."
prisma db push --skip-generate

ENABLE_CORE="${UTKA_ENABLE_CORE:-${ENABLE_WORKER:-true}}"
ENABLE_SUB="${UTKA_ENABLE_SUB:-${ENABLE_SUB:-true}}"
ENABLE_WEB="${UTKA_ENABLE_WEB:-${ENABLE_UI:-false}}"

if [ "$ENABLE_CORE" != "true" ] && [ "$ENABLE_SUB" != "true" ] && [ "$ENABLE_WEB" != "true" ]; then
    echo "[Utka] Error: No components enabled. At least one of CORE, SUB, or WEB must be enabled."
    exit 1
fi

CHILD_PIDS=""

# shellcheck disable=SC2317
shutdown() {
    for pid in $CHILD_PIDS; do
        kill -TERM "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    exit 0
}

trap shutdown TERM INT

# 1. Start utka-core in the background if enabled
if [ "$ENABLE_CORE" = "true" ]; then
    echo "[Utka] Starting utka-core (background stats & sync engine)..."
    if [ -f /app/core.js ]; then
        node /app/core.js &
    else
        node /app/worker.js &
    fi
    CHILD_PIDS="$CHILD_PIDS $!"
fi

# 2. Start utka-sub in the background if enabled alongside web, or foreground otherwise
if [ "$ENABLE_WEB" = "true" ]; then
    if [ "$ENABLE_SUB" = "true" ]; then
        echo "[Utka] Starting utka-sub (subscription delivery engine on port 8008)..."
        node /app/sub.js &
        CHILD_PIDS="$CHILD_PIDS $!"
    fi
    echo "[Utka] Starting utka-web (administrative UI on port 3000)..."
    node /app/server.js &
    CHILD_PIDS="$CHILD_PIDS $!"
elif [ "$ENABLE_SUB" = "true" ]; then
    echo "[Utka] Starting utka-sub (subscription delivery engine on port 8008)..."
    node /app/sub.js &
    CHILD_PIDS="$CHILD_PIDS $!"
fi

# Wait for any foreground/background child to exit and propagate its exit status
set +e
wait
EXIT_CODE=$?
set -e
exit "$EXIT_CODE"
