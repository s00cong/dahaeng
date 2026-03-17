@echo off
setlocal

set REPO_ROOT=%~dp0..
set PYTHON_EXE=C:\Users\SSAFY\miniforge3\python.exe

echo ============================================================
echo Local data pipeline
echo Repo root: %REPO_ROOT%
echo ============================================================

echo [1/4] Rebuilding Trip.com normalized JSONL
"%PYTHON_EXE%" "%REPO_ROOT%\data\spark_pipeline\convert_bronze_to_jsonl.py" --source trip_com --outdir "%REPO_ROOT%\data\normalized"
if errorlevel 1 goto :fail

echo [2/4] Normalizing Trip.com city codes and airport fields
"%PYTHON_EXE%" "%REPO_ROOT%\data\trip_com\normalize_trip_city_codes.py" --skip-bronze
if errorlevel 1 goto :fail

echo [3/4] Loading local MySQL flight_summary
"%PYTHON_EXE%" "%REPO_ROOT%\data\spark_pipeline\local_flight_summary_etl.py" --db-host localhost --db-port 3307 --db-name dahang --db-user root --db-password ssafy
if errorlevel 1 goto :fail

echo [4/4] Loading local MongoDB flight_price_calendar
"%PYTHON_EXE%" "%REPO_ROOT%\data\spark_pipeline\local_calendar_etl.py" --db-url jdbc:mysql://localhost:3307/dahang --db-user root --db-password ssafy --mongo-uri mongodb://localhost:27017 --clear
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
