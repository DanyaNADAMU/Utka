#!/usr/bin/env bash
# ==============================================================================
# Script: deploy-utka.sh
# Purpose: Atomic deploy for the rootless utka Quadlet container.
#
#   pull -> preserve rollback image ID -> pin image in Quadlet -> daemon-reload
#   -> restart ONLY utka.service (never xray.service or utka-pod.service)
#   -> self-check -> auto-rollback on failure -> prune.
#
# Runs ON the target host as the service user `apps` (the forced command
# is pinned in the apps user's authorized_keys). Never prompts, never
# interactive: exit codes drive the CI pipeline.
#
# Usage:
#   deploy-utka.sh <image-ref>           # ghcr.io/danyanadamu/utka@sha256:<digest>
#   deploy-utka.sh --rollback            # manual rollback to localhost/utka:rollback
# ==============================================================================
set -euo pipefail

ROLLBACK=0
if [ "${1:-}" = "--rollback" ]; then
    ROLLBACK=1
else
    IMAGE_REF="${1:-}"
fi

UTKA_USER="${UTKA_USER:-apps}"
XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
export XDG_RUNTIME_DIR

QUADLET_DIR="${QUADLET_DIR:-/etc/containers/systemd/users/$(id -u)}"
QUADLET_FILE="${QUADLET_FILE:-$QUADLET_DIR/utka.container}"
# Restart only utka.service so xray.service (host systemd) and subconverter
# remain untouched and active proxy sessions never drop.
SERVICE="${SERVICE:-utka.service}"
CONTAINER_NAME="${CONTAINER_NAME:-utka}"
STATE_DIR="${STATE_DIR:-$HOME/.local/state/utka}"
STATE_FILE="$STATE_DIR/deploys.json"
SELF_CHECK="${SELF_CHECK:-/usr/local/bin/utka-self-check}"
SELF_CHECK_RETRIES="${SELF_CHECK_RETRIES:-30}"
SELF_CHECK_DELAY="${SELF_CHECK_DELAY:-2}"
ROLLBACK_REF="localhost/utka:rollback"

log()  { printf '[deploy-utka] %s\n' "$*"; }
fail() { printf '[deploy-utka] FAIL: %s\n' "$*" >&2; exit 1; }

require_rootless() {
    [ "$(id -un)" = "$UTKA_USER" ] || fail "must run as $UTKA_USER, got $(id -un)"
    systemctl --user is-active "$SERVICE" >/dev/null 2>&1 \
        || fail "service $SERVICE is not active before deploy"
}

current_image_id() {
    podman inspect --format '{{.Image}}' "$1" 2>/dev/null || true
}

record_state() {
    mkdir -p "$STATE_DIR"
    python3 - "$STATE_FILE" "$1" "$2" "$3" <<'PYEOF'
import json, sys, time, os
path, ref, prev, new = sys.argv[1:5]
state = {"deploys": []}
if os.path.exists(path):
    try:
        with open(path) as f:
            state = json.load(f)
    except Exception:
        state = {"deploys": []}
state.setdefault("deploys", []).append({
    "ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    "image": ref, "previous": prev, "deployed": new,
    "rolled_back": False,
})
with open(path, "w") as f:
    json.dump(state, f, indent=2)
PYEOF
}

mark_rollback() {
    python3 - "$STATE_FILE" <<'PYEOF'
import json, sys
path = sys.argv[1]
try:
    with open(path) as f:
        state = json.load(f)
    if state.get("deploys"):
        state["deploys"][-1]["rolled_back"] = True
        with open(path, "w") as f:
            json.dump(state, f, indent=2)
except Exception:
    pass
PYEOF
}

pin_quadlet() {
    local ref="$1" tmp
    tmp="$(mktemp)"
    awk -v image="$ref" '
        BEGIN { done = 0 }
        !done && /^Image=/ { print "Image=" image; done = 1; next }
        { print }
        END { if (!done) print "Image=" image }
    ' "$QUADLET_FILE" > "$tmp"
    cat "$tmp" > "$QUADLET_FILE"
    rm -f "$tmp"
}

restart_service() {
    systemctl --user reset-failed "$SERVICE" 2>/dev/null || true
    systemctl --user daemon-reload
    systemctl --user restart "$SERVICE"
}

self_check() {
    [ -x "$SELF_CHECK" ] || { log "self-check probe missing: $SELF_CHECK"; return 1; }
    local attempt
    for attempt in $(seq 1 "$SELF_CHECK_RETRIES"); do
        if "$SELF_CHECK"; then
            [ "$attempt" -gt 1 ] && log "self-check passed on attempt $attempt"
            return 0
        fi
        sleep "$SELF_CHECK_DELAY"
    done
    return 1
}

prune_images() {
    podman image prune -f >/dev/null 2>&1 || true
}

do_rollback() {
    local image_id="$1"
    log "rolling back to utka:rollback ($image_id)"
    podman tag "$image_id" "$ROLLBACK_REF" 2>/dev/null || true
    pin_quadlet "$ROLLBACK_REF"
    restart_service
    if self_check; then
        log "rollback OK, service healthy on previous image"
    else
        fail "rollback also failed self-check; MANUAL INTERVENTION REQUIRED"
    fi
    mark_rollback || true
}

main() {
    require_rootless

    if [ "$ROLLBACK" = 1 ]; then
        local image_id
        image_id="$(podman image inspect --format '{{.Id}}' "$ROLLBACK_REF" 2>/dev/null)" \
            || fail "no utka:rollback image recorded"
        do_rollback "$image_id"
        prune_images
        exit 0
    fi

    [ -n "$IMAGE_REF" ] || fail "usage: $0 <image-ref> | --rollback"
    [ -f "$QUADLET_FILE" ] || fail "quadlet missing: $QUADLET_FILE"

    log "pulling $IMAGE_REF"
    podman pull "$IMAGE_REF" >/dev/null || fail "pull failed: $IMAGE_REF"

    local new_id prev_id
    new_id="$(podman image inspect --format '{{.Id}}' "$IMAGE_REF")" \
        || fail "cannot resolve image ID for $IMAGE_REF"
    prev_id="$(current_image_id "$CONTAINER_NAME")"

    log "previous image ID: ${prev_id:-<none>}"
    if [ -n "$prev_id" ] && [ "$prev_id" != "$new_id" ]; then
        podman tag "$prev_id" "$ROLLBACK_REF" || true
    fi

    pin_quadlet "$IMAGE_REF"
    restart_service

    if self_check; then
        log "self-check OK: deployed $IMAGE_REF ($new_id)"
        record_state "$IMAGE_REF" "$prev_id" "$new_id"
        prune_images
        log "deploy complete"
        exit 0
    fi

    log "self-check FAILED after deploying $IMAGE_REF"
    if [ -n "$prev_id" ] && [ "$prev_id" != "$new_id" ]; then
        record_state "$IMAGE_REF" "$prev_id" "$new_id" || true
        do_rollback "$prev_id"
        fail "deploy failed and was rolled back; CI must fail"
    fi
    fail "self-check failed with no previous image ID to roll back to"
}

main "$@"
