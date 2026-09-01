#!/bin/bash
# Утилита для запуска запросов внутри кластера.
# curl-mesh.sh — выполняет curl ИЗ mesh (пода curl-client, outbound через sidecar Envoy);
# чтобы VirtualService / DestinationRule / EnvoyFilter реально применялись к запросу.

kubectl exec deploy/curl-client -c curl -- curl "$@"