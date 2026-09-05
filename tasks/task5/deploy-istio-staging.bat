@echo off

REM ============================================================
REM  deploy-istio-staging.bat
REM  Deploy/redeploy booking-service into Minikube using the STAGING values.
REM ============================================================

call "%~dp0deploy-istio-common.bat" STAGING ./helm/booking-service/values-staging.yaml test-booking-staging 8081
exit /b %errorlevel%