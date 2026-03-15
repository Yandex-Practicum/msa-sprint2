#!/bin/bash
set -e

echo "▶️ Checking canary release (90% v1, 10% v2)..."

# Run in-cluster test, capture all responses (each curl body)
kubectl run canary-test --image=curlimages/curl --restart=Never --rm -it -- \
    sh -c '
        for i in $(seq 1 100); do
        echo "Request $i: $(curl -s http://booking-service/ping)"
    done
    ' | tee canary-full-log.txt  # Save to file

# Count occurrences (summary)
echo
echo "Summary counts:"
cat canary-full-log.txt | grep -o "pong-v[12]" | sort | uniq -c
echo "Full log saved to canary-full-log.txt"