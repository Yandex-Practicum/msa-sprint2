@echo off

REM ============================================================
REM  deploy-staging.bat
REM  Deploy/redeploy booking-service into Minikube using the STAGING values.
REM ============================================================

call "%~dp0deploy-common.bat" STAGING ./helm/booking-service/values-staging.yaml test-booking-staging 8081
exit /b %errorlevel%