#!/usr/bin/env bash
# deploy-staging.sh
# Deploy/redeploy booking-service into Minikube using the STAGING values.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$DIR/deploy-common.sh" STAGING ./helm/booking-service/values-staging.yaml test-booking-staging 8081