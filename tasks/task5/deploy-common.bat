@echo off
setlocal EnableExtensions

REM ============================================================
REM  deploy-common.bat - shared deploy/redeploy logic
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
set "IMAGE_NAME=booking-service"
set "RELEASE_NAME=booking-service"
set "CHART_DIR=./helm/booking-service"

REM --- Unique image tag (timestamp) unless IMAGE_TAG is provided ---
if defined IMAGE_TAG (
    set "FINAL_TAG=%IMAGE_TAG%"
) else (
    for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMddHHmmss"') do set "FINAL_TAG=local-%%i"
)

echo ============================================================
echo  Deploying %RELEASE_NAME% [%ENV_LABEL%]
echo  Image : %IMAGE_NAME%:%FINAL_TAG%
echo  Values: %VALUES_FILE%
echo ============================================================

REM ---------- [1/5] Build the image ----------
echo.
echo [1/5] Building image %IMAGE_NAME%:%FINAL_TAG% ...
docker build -t %IMAGE_NAME%:%FINAL_TAG% ./booking-service
if errorlevel 1 goto :error

REM ---------- [2/5] Smoke-test /ping ----------
echo.
echo [2/5] Smoke-testing /ping ...
docker rm -f %CONTAINER% >nul 2>&1
docker run -d --name %CONTAINER% -p %TEST_PORT%:8080 %IMAGE_NAME%:%FINAL_TAG%
if errorlevel 1 goto :error
timeout /t 2 /nobreak >nul
curl -f http://localhost:%TEST_PORT%/ping >nul 2>&1
if errorlevel 1 goto :error_smoke
echo       OK: /ping returned pong
docker rm -f %CONTAINER% >nul 2>&1

REM ---------- [3/5] Load image into Minikube ----------
echo.
echo [3/5] Loading image into Minikube ...
minikube image load %IMAGE_NAME%:%FINAL_TAG%
if errorlevel 1 goto :error

REM ---------- [4/5] Helm deploy / redeploy ----------
echo.
echo [4/5] helm upgrade --install (%ENV_LABEL% values) ...
echo install %VALUES_FILE%
helm upgrade --install %RELEASE_NAME% %CHART_DIR% ^
    -f %VALUES_FILE% ^
    --set image.tag=%FINAL_TAG% ^
    --set image.pullPolicy=IfNotPresent
if errorlevel 1 goto :error

REM ---------- [5/5] Wait for rollout ----------
echo.
echo [5/5] Waiting for rollout (versions v1 and v2) ...
REM Note: версии v1/v2 задаются списком versions: в values.yaml (цикл по ним в templates/deployment.yaml)
kubectl rollout status deployment/%RELEASE_NAME%-v1 --timeout=120s
if errorlevel 1 goto :error
kubectl rollout status deployment/%RELEASE_NAME%-v2 --timeout=120s
if errorlevel 1 goto :error

echo.
echo [OK] %ENV_LABEL% deployment successful.
kubectl get pods -l app=%RELEASE_NAME%
exit /b 0

:error_smoke
echo.
echo [ERROR] Smoke test failed: /ping did not return pong.
docker rm -f %CONTAINER% >nul 2>&1
goto :error

:error
echo.
echo [ERROR] Deployment failed. See output above.
exit /b 1