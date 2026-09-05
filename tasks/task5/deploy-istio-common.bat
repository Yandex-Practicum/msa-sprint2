@echo off
rem Switch console to UTF-8 for Cyrillics.
chcp 65001 >nul

setlocal EnableExtensions

REM ============================================================
REM  deploy-istio-common.bat - base logic for full deploy/redeploy with Istio
REM
REM  Usage: call deploy-common.bat ENV_LABEL VALUES_FILE CONTAINER TEST_PORT
REM    %1 ENV_LABEL   e.g. PROD / STAGING
REM    %2 VALUES_FILE e.g. ./helm/booking-service/values-prod.yaml
REM    %3 CONTAINER   smoke-test container name
REM    %4 TEST_PORT   smoke-test local port
REM
REM  Optional env: IMAGE_TAG = fixed image tag (default: timestamp)
REM
REM  Flow: build -> smoke test /ping -> minikube image load
REM        -> helm upgrade --install (single, обе версии v1/v2 в одном chart -> kubectl rollout status
REP        -> apply Istio configs (booking-service versions v1 and v2, feature flag, canary release)
REM ============================================================

if "%~1"=="" (
    echo [ERROR] Usage: deploy-common.bat ENV_LABEL VALUES_FILE CONTAINER TEST_PORT
    exit /b 1
)

REM --- Ensure relative paths resolve relative to this script's dir ---
cd /d "%~dp0"

set "ENV_LABEL=%~1"
set "VALUES_FILE=%~2"
set "CONTAINER=%~3"
set "TEST_PORT=%~4"

if "%ISTIOCTL%"=="" set "ISTIOCTL=C:\Istio\istio-1.30.4\bin\istioctl.exe"

echo 1) Запуск кластера Kubernetes
echo Подготовка кластера Kubernetes
minikube start --memory=4096 --cpus=2

echo Обновить kubeconfig на актуальный endpoint
minikube update-context

echo Предварительная подгрузка образа ingress-nginx на случай таймаута при вызове "istioctl install"
echo minikube ssh docker pull registry.k8s.io/ingress-nginx/controller:v1.14.3

echo 2) Проверка istioctl
if not exist "%ISTIOCTL%" (
    echo ERROR: istioctl не найден: %ISTIOCTL%
    echo Скачайте Windows-сборку Istio ^(istio-x.win-amd64.zip^) и задайте ISTIOCTL.
    exit /b 1
)
"%ISTIOCTL%" version --remote=false

echo 3) Установка Istio, если namespace istio-system ещё не создан.
echo Эта команда развёртывает Istio в вашем кластере Kubernetes
echo с использованием демопрофиля, который включает все основные компоненты Istio.
kubectl get namespace istio-system >nul 2>&1
if %errorlevel%==0 (
    echo Istio уже установлен, пропускаем install.
) else (
    "%ISTIOCTL%" install --set profile=demo -y
)

echo 4) Включите автоматическую вставку sidecar-прокси для namespace,
echo где будут работать микросервисы Booking
kubectl label namespace default istio-injection=enabled --overwrite

echo 5) Сборка, загрузка, генерация и накат конфигов через Helm
call "%~dp0deploy-helm.bat" %ENV_LABEL% %VALUES_FILE% %CONTAINER% %TEST_PORT%
if errorlevel 1 (
    echo [ERROR] deploy-common.bat завершился ошибкой. Остановка.
    exit /b 1
)

echo 6) Применение конфигурации трафика Istio (DestinationRule + VirtualService)
echo (канареечный Release 90/10, фича-флаг, retries, Circuit Breaking)
kubectl apply -f booking-service-destination-rule.yaml
if errorlevel 1 goto :error
kubectl apply -f booking-service-virtual-Service.yaml
if errorlevel 1 goto :error

echo Фича-флаг через EnvoyFilter (заголовок X-Feature-Enabled)
kubectl apply -f booking-service-envoy-filter.yaml
if errorlevel 1 goto :error

echo 7) Проверка
kubectl rollout status deployment/booking-service-v1 --timeout=120s
kubectl rollout status deployment/booking-service-v2 --timeout=120s
kubectl get pods -n istio-system
kubectl get pods -l app=booking-service
kubectl get virtualservice,destinationrule,envoyfilter

echo.
echo ============================================================
echo Деплой завершён.
echo ============================================================

echo Если нужно вызвать сервис напрямую (curl http://localhost:8080/ping),
echo то можно открыть порт командой: "kubectl port-forward svc/booking 8080:80"
echo и выполнять тестовые запросы к сервису из другого терминала.
exit /b 0

:error
echo.
echo [ERROR] Ошибка на этапе применения конфигов Istio (kubectl apply). Остановка.
exit /b 1
