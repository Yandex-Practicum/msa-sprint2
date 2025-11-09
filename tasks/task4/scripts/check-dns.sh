set -euo pipefail

NS=${1:-default}
POD_NAME=tmp-curl-$(date +%s)

kubectl run "$POD_NAME" -n "$NS" --image=curlimages/curl:8.10.1 -it --rm --restart=Never -- \
  sh -lc 'echo "Resolve booking-service" && getent hosts booking-service || nslookup booking-service || true; \
          echo "HTTP call:"; curl -fsS http://booking-service/ping && echo && exit 0'