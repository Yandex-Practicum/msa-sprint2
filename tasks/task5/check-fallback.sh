#!/bin/bash

echo "============================================"
echo " Fallback Check (v1 down → fallback to v2)"
echo "============================================"
echo ""

# Step 1: Scale v1 to 0 to simulate v1 outage
echo "--- Step 1: Scaling booking-service-v1 to 0 replicas (simulating v1 outage) ---"
kubectl scale deployment booking-service-v1 --replicas=0
echo "Waiting 15s for pod termination and Istio EDS update..."
sleep 15

# Check pods
echo ""
echo "--- Current pods (v1 should be gone) ---"
kubectl get pods -l app=booking-service

# Step 2: Apply fallback VirtualService (100% to v2 when v1 has no endpoints)
echo ""
echo "--- Step 2: Activating fallback VirtualService (100% traffic to v2) ---"
cat <<'VSEOF' | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: booking-service
  namespace: default
spec:
  hosts:
    - booking-service
  http:
    - name: feature-flag-route
      match:
        - headers:
            x-feature-enabled:
              exact: "true"
      route:
        - destination:
            host: booking-service
            subset: v2
            port:
              number: 80

    - name: fallback-to-v2
      route:
        - destination:
            host: booking-service
            subset: v2
            port:
              number: 80
          weight: 100
      retries:
        attempts: 3
        perTryTimeout: 5s
        retryOn: "5xx,connect-failure,reset"
VSEOF

echo "Waiting 5s for VirtualService update to propagate..."
sleep 5

# Step 3: Send requests - all should go to v2
echo ""
echo "--- Step 3: Sending 10 requests (expect all pong-v2) ---"
ALL_V2=true
for i in $(seq 1 10); do
  RESPONSE=$(kubectl run fallback-check-$i \
    --rm -i --restart=Never \
    --image=curlimages/curl:8.4.0 \
    --timeout=30s \
    -- curl -s --max-time 5 http://booking-service/ping 2>/dev/null) || RESPONSE="error"
  echo "  [$i] -> $RESPONSE"
  if ! echo "$RESPONSE" | grep -q "pong-v2"; then
    ALL_V2=false
  fi
done

echo ""
if [ "$ALL_V2" = true ]; then
  echo "[PASS] All requests routed to v2 (fallback activated when v1 is unavailable)"
else
  echo "[FAIL] Some requests did not reach v2. Check VirtualService configuration."
fi

# Step 4: Restore original state
echo ""
echo "--- Restoring: scale v1 to 1, apply original canary VirtualService ---"
kubectl scale deployment booking-service-v1 --replicas=1
kubectl apply -f istio/virtual-service.yaml
echo "v1 restored."

echo ""
echo "Done."
