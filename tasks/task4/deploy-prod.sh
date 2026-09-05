#!/usr/bin/env bash
# deploy-prod.sh
# Deploy/redeploy booking-service into Minikube using the PROD values.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$DIR/deploy-common.sh" PROD ./helm/booking-service/values-prod.yaml test-booking-prod 8082