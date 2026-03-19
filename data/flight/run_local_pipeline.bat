@echo off
setlocal

set FLIGHT_ROOT=%~dp0
if not defined PYTHON_EXE set PYTHON_EXE=python

echo ============================================================
echo Local data pipeline orchestrator
echo Flight root: %FLIGHT_ROOT%
echo ============================================================

echo Running crawl, normalization, and local DB loading with scheduler rules
"%PYTHON_EXE%" "%FLIGHT_ROOT%run_scheduled_pipeline.py" %*
if errorlevel 1 goto :fail

echo ============================================================
echo Local pipeline completed successfully.
echo ============================================================
exit /b 0

:fail
echo ============================================================
echo Local pipeline failed.
echo ============================================================
exit /b 1
