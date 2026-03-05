#!/bin/bash
set -e

echo "============================================"
echo " Istio Service Mesh Verification"
echo "============================================"
echo ""

# 1. Check Istio system pods
echo "--- Istio system pods ---"
kubectl get pods -n istio-system
echo ""

# 2. Check injection label on default namespace
echo "--- Namespace injection label ---"
kubectl get namespace default --show-labels | grep -E "NAME|istio-injection" || echo "WARNING: istio-injection label not set on default namespace"
echo ""

# 3. Check booking-service pods have sidecars (2/2 READY)
echo "--- booking-service pods (expect 2/2 READY with Istio sidecar) ---"
kubectl get pods -l app=booking-service -o wide
echo ""

# 4. Check sidecar injection (istio-proxy in init containers — Istio 1.24+ native sidecar)
echo "--- Sidecar injection check ---"
PODS=$(kubectl get pods -l app=booking-service -o jsonpath='{.items[*].metadata.name}')
ALL_INJECTED=true
for pod in $PODS; do
  INIT_CONTAINERS=$(kubectl get pod "$pod" -o jsonpath='{.spec.initContainers[*].name}')
  READY=$(kubectl get pod "$pod" -o jsonpath='{.status.containerStatuses[0].ready}')
  if echo "$INIT_CONTAINERS" | grep -q "istio-proxy"; then
    echo "  [OK] Pod $pod has istio-proxy (native sidecar in initContainers): $INIT_CONTAINERS"
  else
    echo "  [FAIL] Pod $pod is missing istio-proxy sidecar. initContainers: $INIT_CONTAINERS"
    ALL_INJECTED=false
  fi
done
if [ "$ALL_INJECTED" = true ]; then
  echo "  => All pods have Istio sidecars injected"
else
  echo "  => WARNING: Some pods are missing sidecars. Did you enable injection and restart pods?"
fi
echo ""

# 5. Check Istio resources
echo "--- VirtualService ---"
kubectl get virtualservice booking-service -o yaml 2>/dev/null | grep -E "name:|host:|weight:|subset:" || echo "VirtualService 'booking-service' not found"
echo ""

echo "--- DestinationRule ---"
kubectl get destinationrule booking-service -o yaml 2>/dev/null | grep -E "name:|host:|subset:|consecutive" || echo "DestinationRule 'booking-service' not found"
echo ""

echo "--- EnvoyFilter ---"
kubectl get envoyfilter feature-flag-header -o yaml 2>/dev/null | grep -E "name:|workloadSelector|version" || echo "EnvoyFilter 'feature-flag-header' not found"
echo ""

# 6. Summary
echo "--- Summary ---"
kubectl get virtualservice booking-service >/dev/null 2>&1 && VS="PRESENT" || VS="MISSING"
kubectl get destinationrule booking-service >/dev/null 2>&1 && DR="PRESENT" || DR="MISSING"
kubectl get envoyfilter feature-flag-header >/dev/null 2>&1 && EF="PRESENT" || EF="MISSING"
echo "VirtualService:  $VS"
echo "DestinationRule: $DR"
echo "EnvoyFilter:     $EF"
echo ""
echo "Done."
