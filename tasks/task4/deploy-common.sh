#!/usr/bin/env bash
# deploy-common.sh - shared deploy/redeploy logic (bash)
#
# Usage: ./deploy-common.sh ENV_LABEL VALUES_FILE CONTAINER TEST_PORT
#   $1 ENV_LABEL   e.g. PROD / STAGING
#   $2 VALUES_FILE e.g. ./helm/booking-service/values-prod.yaml
#   $3 CONTAINER   smoke-test container name
#   $4 TEST_PORT   smoke-test local port
#
# Optional env: IMAGE_TAG = fixed image tag (default: timestamp)
#
# Flow: build -> smoke test /ping -> minikube image load
#       -> helm upgrade --install -> kubectl rollout status
set -euo pipefail

ENV_LABEL="${1:-}"
VALUES_FILE="${2:-}"
CONTAINER="${3:-}"
TEST_PORT="${4:-}"

if [[ -z "$ENV_LABEL" || -z "$VALUES_FILE" || -z "$CONTAINER" || -z "$TEST_PORT" ]]; then
    echo "[ERROR] Usage: deploy-common.sh ENV_LABEL VALUES_FILE CONTAINER TEST_PORT" >&2
    exit 1
fi

IMAGE_NAME="booking-service"
RELEASE_NAME="booking-service"
CHART_DIR="./helm/booking-service"

# Resolve relative paths against this script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Unique image tag (timestamp) unless IMAGE_TAG is provided
FINAL_TAG="${IMAGE_TAG:-local-$(date +%Y%m%d%H%M%S)}"

echo "============================================================"
echo " Deploying $RELEASE_NAME [$ENV_LABEL]"
echo " Image : $IMAGE_NAME:$FINAL_TAG"
echo " Values: $VALUES_FILE"
echo "============================================================"

# ---------- [1/5] Build the image ----------
echo
echo "[1/5] Building image $IMAGE_NAME:$FINAL_TAG ..."
if ! docker build -t "$IMAGE_NAME:$FINAL_TAG" ./booking-service; then
    echo "[ERROR] docker build failed." >&2
    exit 1
fi

# ---------- [2/5] Smoke-test /ping ----------
echo
echo "[2/5] Smoke-testing /ping ..."
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
if ! docker run -d --name "$CONTAINER" -p "$TEST_PORT:8080" "$IMAGE_NAME:$FINAL_TAG"; then
    echo "[ERROR] Could not start smoke-test container." >&2
    exit 1
fi
sleep 2
if ! curl -fsS "http://localhost:$TEST_PORT/ping" >/dev/null 2>&1; then
    echo "[ERROR] Smoke test failed: /ping did not return pong." >&2
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    exit 1
fi
echo "      OK: /ping returned pong"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

# ---------- [3/5] Load image into Minikube ----------
echo
echo "[3/5] Loading image into Minikube ..."
if ! minikube image load "$IMAGE_NAME:$FINAL_TAG"; then
    echo "[ERROR] minikube image load failed." >&2
    exit 1
fi

# ---------- [4/5] Helm deploy / redeploy ----------
echo
echo "[4/5] helm upgrade --install ($ENV_LABEL values) ..."
if ! helm upgrade --install "$RELEASE_NAME" "$CHART_DIR" \
        -f "$VALUES_FILE" \
        --set "image.tag=$FINAL_TAG" \
        --set image.pullPolicy=IfNotPresent; then
    echo "[ERROR] helm upgrade failed." >&2
    exit 1
fi

# ---------- [5/5] Wait for rollout ----------
echo
echo "[5/5] Waiting for rollout ..."
if ! kubectl rollout status "deployment/$RELEASE_NAME"; then
    echo "[ERROR] Rollout did not complete." >&2
    exit 1
fi

echo
echo "[OK] $ENV_LABEL deployment successful."
kubectl get pods -l app="$RELEASE_NAME"
exit 0