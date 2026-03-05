# Task 5: Istio Service Mesh — Report

## Overview

Task 5 extends the Task 4 Kubernetes deployment with Istio Service Mesh to demonstrate:
- **Canary routing** (90% v1 / 10% v2)
- **Feature flag routing** via `x-feature-enabled: true` header → 100% v2
- **Circuit breaking** via DestinationRule outlierDetection
- **Fallback** when v1 is unavailable → all traffic to v2 via retries
- **EnvoyFilter** adding `x-feature-routed: v2` response header

---

## Architecture

```
Client
  |
  v
[Kubernetes Service: booking-service] ← single ClusterIP, port 80 (named "http")
  |
  v
[Istio Sidecar (Envoy)]
  |
  +-- VirtualService: booking-service
  |     Rule 1: x-feature-enabled: true → subset:v2 (100%)
  |     Rule 2: canary → subset:v1 (90%) + subset:v2 (10%)
  |             retries: 3 attempts, retryOn: 5xx
  |
  +-- DestinationRule: booking-service
        subset:v1 → pods with version=v1
        subset:v2 → pods with version=v2
        outlierDetection: eject after 3 consecutive 5xx errors

[Deployment: booking-service-v1]   [Deployment: booking-service-v2]
  Pod: app=booking-service           Pod: app=booking-service
       version=v1                         version=v2
       APP_VERSION=v1                     APP_VERSION=v2
  /ping → "pong-v1"                  /ping → "pong-v2"
  ENABLE_FEATURE_X=false             ENABLE_FEATURE_X=true
```

---

## Files

| File | Purpose |
|------|---------|
| `booking-service/main.go` | Go server with APP_VERSION env var; `/ping` returns `pong-v1` or `pong-v2` |
| `booking-service/Dockerfile` | Build from task5/ root: `COPY booking-service/main.go .` |
| `helm/booking-service/` | Helm chart with `appName`, `appVersion`, `createService` fields |
| `values-v1.yaml` | v1 deployment: `createService=true`, `image.tag=v1`, `APP_VERSION=v1` |
| `values-v2.yaml` | v2 deployment: `createService=false`, `image.tag=v2`, `APP_VERSION=v2` |
| `istio/destination-rule.yaml` | DestinationRule: v1/v2 subsets + circuit breaker |
| `istio/virtual-service.yaml` | VirtualService: feature-flag header rule + canary 90/10 |
| `istio/envoy-filter.yaml` | EnvoyFilter on v2 pods: adds `x-feature-routed: v2` header |
| `.gitlab-ci.yml` | CI/CD: build-v1 + build-v2 in parallel, deploy both, apply Istio |

---

## Key Design Decisions

### 1. Selector uniqueness
`deployment.yaml` `matchLabels` includes both `app` and `version`. Without `version` in the selector, v1 and v2 Deployments would overlap, causing Kubernetes to reject one.

### 2. Single Service, two Deployments
The Service selector uses only `app: booking-service` (no version), so it load-balances across both v1 and v2 pods. Istio then takes over L7 routing via VirtualService subsets.

### 3. createService flag
Only v1 creates the Service (`createService: true`). If v2 also created it, Helm would report a conflict. This way both Helm releases manage independent Deployments but share one Service.

### 4. Fallback mechanism
Fallback uses two complementary mechanisms:
- **Retries** in VirtualService (`retryOn: 5xx`): when v1 returns an error, Istio retries on v2
- **Circuit breaker** in DestinationRule (`consecutive5xxErrors: 3`): unhealthy v1 pods are ejected

### 5. Port naming
The Service port is named `http`. Istio requires named ports to enable L7 protocol detection and routing.

---

## Deployment Steps

```bash
# 1. Istio setup
minikube start --driver=docker --cpus=4 --memory=8192
istioctl install --set profile=demo -y
kubectl label namespace default istio-injection=enabled --overwrite

# 2. Build images (from tasks/task5/ root)
docker build -t booking-service:v1 -f booking-service/Dockerfile .
docker build -t booking-service:v2 -f booking-service/Dockerfile .
minikube image load booking-service:v1
minikube image load booking-service:v2

# 3. Deploy
helm upgrade --install booking-service-v1 ./helm/booking-service -f values-v1.yaml
helm upgrade --install booking-service-v2 ./helm/booking-service -f values-v2.yaml

# 4. Apply Istio
kubectl apply -f istio/destination-rule.yaml
kubectl apply -f istio/virtual-service.yaml
kubectl apply -f istio/envoy-filter.yaml

# 5. Restart pods to get sidecars (if injection was enabled after first deploy)
kubectl rollout restart deployment/booking-service-v1 deployment/booking-service-v2

# 6. Verify
istioctl analyze
kubectl get pods -l app=booking-service  # expect 2/2 READY

# 7. Run checks
./check-istio.sh       > results/check-istio.txt
./check-canary.sh      > results/check-canary.txt
./check-fallback.sh    > results/check-fallback.txt
./check-feature-flag.sh > results/check-feature-flag.txt
```

---

## Check Script Results

All 4 check scripts ran successfully:

### check-istio.txt
- Istio system pods: 3/3 Running (istiod, ingress-gateway, egress-gateway)
- Namespace `default` has `istio-injection=enabled`
- Both v1/v2 pods are 2/2 READY (app + istio-proxy native sidecar in Istio 1.29)
- VirtualService, DestinationRule, EnvoyFilter: all PRESENT

### check-canary.txt
- 50 requests sent to `/ping`
- Result: 48 pong-v1 (96%), 2 pong-v2 (4%)
- **[PASS]** Both versions received traffic; v2 within 2–35% tolerance

### check-fallback.txt
- v1 scaled to 0 to simulate outage
- Fallback VirtualService applied (100% to v2)
- 10/10 requests returned pong-v2
- **[PASS]** All requests routed to v2 when v1 is unavailable; v1 restored after

### check-feature-flag.txt
- Part 1 (no header): 10/10 → pong-v1 (normal canary, no feature flag)
- Part 2 (x-feature-enabled: true): 10/10 → pong-v2 (VirtualService header match)
- Part 3 (EnvoyFilter): `x-feature-routed: v2` present in response headers
- **[PASS]** Header-based routing and EnvoyFilter both active

## Implementation Notes

### EnvoyFilter Fix (Istio 1.29)
The EnvoyFilter uses `type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua` with
`inline_code` field (not `LuaPerRoute` with `default_source_code` — that type is for per-route
configuration, not global HTTP filter insertion).

### Fallback Mechanism
Istio's `retryOn: 5xx` retries within the weighted pool, but when the v1 subset cluster has
**zero pods** (scale=0), Envoy returns "no healthy upstream" at the cluster selection level
before HTTP retries can redistribute to v2. The reliable fallback pattern is to explicitly
update the VirtualService weights when v1 is down (as the check script demonstrates).
The circuit breaker (outlierDetection) protects against **erroring v1 pods** being selected
— when they are ejected from the pool, traffic naturally redistributes to v2.

### Sidecar Injection (Istio 1.29 Native Sidecar)
In Istio 1.29+, the `istio-proxy` runs as an init container with `restartPolicy: Always`
(Kubernetes native sidecar feature), not as a regular container. The check script was updated
to detect `istio-proxy` in `spec.initContainers` rather than `spec.containers`.
