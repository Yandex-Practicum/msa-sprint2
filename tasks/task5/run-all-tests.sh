#!/bin/bash
set -e
echo "▶️ Запуск всех проверок..."
./check-istio.sh > results/check-istio.log 2>&1 && echo "✅ check-istio" || echo "❌ check-istio"
./check-canary.sh > results/check-canary.log 2>&1 && echo "✅ check-canary" || echo "❌ check-canary"
./check-fallback.sh > results/check-fallback.log 2>&1 && echo "✅ check-fallback" || echo "❌ check-fallback"
./check-feature-flag.sh > results/check-feature-flag.log 2>&1 && echo "✅ check-feature-flag" || echo "❌ check-feature-flag"
echo "✅ Все тесты завершены. Логи в results/."