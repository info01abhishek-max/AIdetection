@echo off
:: ============================================================================
:: AI vs Real Detection System - Unified Project Launcher
:: ============================================================================
:: This script starts all 4 backend services (Photo, Video, Audio, Text)
:: and the unified frontend in a single click.
::
:: Requirements:
:: - Python 3.11+ with all backend dependencies installed
:: - Node.js 18+ with npm
:: - All backends must be set up (run pip install -r requirements.txt in each)
:: ============================================================================

setlocal enabledelayedexpansion

:: Configuration
set PROJECT_ROOT=%~dp0
set PYTHON_CMD=python
set VENV_ACTIVATE=

:: Colors for output
set GREEN=\033[92m
set YELLOW=\033[93m
set RED=\033[91m
set BLUE=\033[94m
set CYAN=\033[96m
set RESET=\033[0m
set BOLD=\033[1m

:: Enable virtual terminal processing for colors (Windows 10+)
for /f %%a in ('echo prompt $E ^| cmd') do set ESC=%%a
set GREEN=%ESC%[92m
set YELLOW=%ESC%[93m
set RED=%ESC%[91m
set BLUE=%ESC%[94m
set CYAN=%ESC%[96m
set RESET=%ESC%[0m
set BOLD=%ESC%[1m

:: Helper functions (using unique prefixes to avoid recursion)
:sp_print_header
echo.
echo %BOLD%%CYAN%============================================================================%RESET%
echo %BOLD%%CYAN%  %1%RESET%
echo %BOLD%%CYAN%============================================================================%RESET%
echo.

:sp_print_success
echo %GREEN%[OK]%RESET% %1

:sp_print_warning
echo %YELLOW%[WARN]%RESET% %1

:sp_print_error
echo %RED%[ERROR]%RESET% %1

:sp_print_info
echo %BLUE%[INFO]%RESET% %1

:sp_print_step
echo %CYAN%[STEP]%RESET% %1

:: Check if running as administrator (not required but recommended)
net session >nul 2>&1
if %errorLevel% == 0 (
    call :sp_print_info Running with administrator privileges
) else (
    call :sp_print_warning Not running as administrator - some port operations may fail
)

:: ----------------------------------------------------------------------------
:: STEP 1: Check Prerequisites
:: ----------------------------------------------------------------------------
call :sp_print_header "STEP 1: Checking Prerequisites"

:: Check Python
where python >nul 2>&1
if %errorLevel% neq 0 (
    call :sp_print_error Python not found in PATH. Please install Python 3.11+
    goto :error_exit
)
for /f "tokens=2" %%i in ('python --version') do set PY_VER=%%i
call :sp_print_success Python found: %PY_VER%

:: Check Node.js
where node >nul 2>&1
if %errorLevel% neq 0 (
    call :sp_print_error Node.js not found in PATH. Please install Node.js 18+
    goto :error_exit
)
for /f %%i in ('node --version') do set NODE_VER=%%i
call :sp_print_success Node.js found: %NODE_VER%

:: Check npm
where npm >nul 2>&1
if %errorLevel% neq 0 (
    call :sp_print_error npm not found in PATH.
    goto :error_exit
)
for /f %%i in ('npm --version') do set NPM_VER=%%i
call :sp_print_success npm found: %NPM_VER%

:: ----------------------------------------------------------------------------
:: STEP 2: Kill existing project processes
:: ----------------------------------------------------------------------------
call :sp_print_header "STEP 2: Cleaning up existing processes"

call :kill_port 8002 "Photo Backend"
call :kill_port 8001 "Video Backend"
call :kill_port 8000 "Audio Backend"
call :kill_port 8003 "Text Backend"
call :kill_port 5173 "Unified Frontend"

:: Give processes time to fully terminate
timeout /t 2 /nobreak >nul

:: ----------------------------------------------------------------------------
:: STEP 3: Start Backend Services
:: ----------------------------------------------------------------------------
call :sp_print_header "STEP 3: Starting Backend Services"

:: Photo Backend (Port 8002)
call :start_backend "Photo" "backend-photo" 8002 "app.main:app"

:: Video Backend (Port 8001)
call :start_backend "Video" "backend-video" 8001 "app.main:app"

:: Audio Backend (Port 8000)
call :start_backend "Audio" "backend" 8000 "app.main:app"

:: Text Backend (Port 8003)
call :start_backend "Text" "text-detection\backend" 8003 "app.main:app"

:: Wait for backends to start
call :sp_print_info Waiting for backends to initialize...
timeout /t 5 /nobreak >nul

:: ----------------------------------------------------------------------------
:: STEP 4: Verify Backend Health
:: ----------------------------------------------------------------------------
call :sp_print_header "STEP 4: Verifying Backend Health"

call :check_health "Photo" "http://localhost:8002/api/health"
call :check_health "Video" "http://localhost:8001/api/v1/health"
call :check_health "Audio" "http://localhost:8000/api/health"
call :check_health "Text" "http://localhost:8003/api/health"

:: ----------------------------------------------------------------------------
:: STEP 5: Start Unified Frontend
:: ----------------------------------------------------------------------------
call :sp_print_header "STEP 5: Starting Unified Frontend"

if not exist "unified-frontend" (
    call :sp_print_error unified-frontend directory not found!
    call :sp_print_info Please run the setup first to create the unified frontend
    goto :error_exit
)

cd /d "%PROJECT_ROOT%unified-frontend"

:: Check if node_modules exists
if not exist "node_modules" (
    call :sp_print_step Installing frontend dependencies...
    npm install
    if %errorLevel% neq 0 (
        call :sp_print_error Failed to install frontend dependencies
        goto :error_exit
    )
    call :sp_print_success Frontend dependencies installed
)

:: Start frontend dev server in background
call :sp_print_step Starting Vite dev server on port 5173...
start "AI vs Real Frontend" cmd /k "npm run dev"

:: Give frontend time to start
timeout /t 5 /nobreak >nul

:: ----------------------------------------------------------------------------
:: STEP 6: Open Browser
:: ----------------------------------------------------------------------------
call :sp_print_header "STEP 6: Opening Browser"

call :sp_print_step Launching http://localhost:5173
start "" "http://localhost:5173"

:: ----------------------------------------------------------------------------
:: COMPLETE
:: ----------------------------------------------------------------------------
call :sp_print_header "AI vs Real Detection System - RUNNING"

echo %BOLD%%GREEN%All services started successfully!%RESET%
echo.
echo %BOLD%Backend Services:%RESET%
echo   %CYAN%Photo:%RESET%   http://localhost:8002  (API: http://localhost:8002/docs)
echo   %CYAN%Video:%RESET%   http://localhost:8001  (API: http://localhost:8001/docs)
echo   %CYAN%Audio:%RESET%   http://localhost:8000  (API: http://localhost:8000/docs)
echo   %CYAN%Text:%RESET%    http://localhost:8003  (API: http://localhost:8003/docs)
echo.
echo %BOLD%Frontend:%RESET%
echo   %CYAN%Unified App:%RESET% http://localhost:5173
echo.
echo %BOLD%Press Ctrl+C in any backend window to stop that service.%RESET%
echo %BOLD%Run STOP_PROJECT.bat to stop all project processes at once.%RESET%
echo.

:: Keep this window open to show status
call :sp_print_info Press any key to close this launcher window (services will continue running)
pause >nul
exit /b 0

:: ============================================================================
:: HELPER FUNCTIONS
:: ============================================================================

:kill_port
set PORT=%1
set NAME=%2
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT%') do (
    taskkill /F /PID %%a >nul 2>&1
    if !errorLevel! equ 0 (
        call :print_success Stopped %NAME% on port %PORT% (PID: %%a)
    )
)
goto :eof

:start_backend
set NAME=%1
set DIR=%2
set PORT=%3
set APP=%4

cd /d "%PROJECT_ROOT%%DIR%"
if errorlevel 1 (
    call :print_error Directory not found: %PROJECT_ROOT%%DIR%
    goto :eof
)

call :print_step Starting %NAME% Backend on port %PORT%...
start "%NAME% Backend" cmd /k "%PYTHON_CMD% -m uvicorn %APP% --port %PORT% --host 0.0.0.0"
call :print_success %NAME% Backend started (PID in new window)
cd /d "%PROJECT_ROOT%"
goto :eof

:check_health
set NAME=%1
set URL=%2

call :print_step Checking %NAME% Backend health...
set HEALTH_OK=0
for /l %%i in (1,1,10) do (
    curl -s -f %URL% >nul 2>&1
    if !errorLevel! equ 0 (
        set HEALTH_OK=1
        goto :health_done
    )
    timeout /t 1 /nobreak >nul
)
:health_done
if %HEALTH_OK% equ 1 (
    call :print_success %NAME% Backend is healthy
) else (
    call :print_warning %NAME% Backend health check failed (may still be starting)
)
goto :eof

:error_exit
echo.
call :print_error "Startup failed. Check the errors above."
pause
exit /b 1