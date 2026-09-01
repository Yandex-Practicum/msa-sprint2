@echo off

REM ============================================================
REM  deploy-prod.bat
REM  Deploy/redeploy booking-service into Minikube using the PROD values.
REM ============================================================

call "%~dp0deploy-common.bat" PROD ./helm/booking-service/values-prod.yaml test-booking-prod 8082
exit /b %errorlevel%