#!/bin/bash

set -e

echo "Running in-cluster DNS test..."

kubectl run dns-test --restart=Never \
 --image=busybox \
 --command -- sh -c 'wget -O- --timeout=5 http://booking-service/ping && echo && echo DNS_OK'

kubectl wait --for=jsonpath={.status.phase}=Succeeded pod/dns-test --timeout=60s >/dev/null

OUT=$(kubectl logs dns-test)
kubectl delete pod dns-test --ignore-not-found >/dev/null

echo "$OUT"
echo
echo "$OUT" | grep -q pong && echo "Success" || echo "Failed"