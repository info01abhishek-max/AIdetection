@echo off
:: ============================================================================
:: AI vs Real Detection System - Unified Project Stopper
:: ============================================================================
:: This script stops ONLY the project processes (backends on ports 8001-8004
:: and frontend on port 5173). It does NOT affect other applications.
:: ============================================================================

setlocal enabledelayedexpansion

:: Configuration
set PROJECT_ROOT=%~dp0

:: Colors for output
for /f %%a in ('echo prompt $E ^| cmd') do set ESC=%%a
set GREEN=%ESC%[92m
set YELLOW=%ESC%[93m
set RED=%ESC%[91m
set BLUE=%ESC%[94m
set CYAN=%ESC%[96m
set RESET=%ESC%[0m
set BOLD=%ESC%[1m

:print_header
echo.
echo %BOLD%%CYAN%============================================================================%RESET%
echo %BOLD%%CYAN%  %1%RESET%
echo %BOLD%%CYAN%============================================================================%RESET%
echo.

:print_success
echo %GREEN%[OK]%RESET% %1

:print_warning
echo %YELLOW%[WARN]%RESET% %1

:print_error
echo %RED%[ERROR]%RESET% %1

:print_info
echo %BLUE%[INFO]%RESET% %1

:print_step
echo %CYAN%[STEP]%RESET% %1

:: ----------------------------------------------------------------------------
:: STOP PROJECT PROCESSES
:: ----------------------------------------------------------------------------
call :print_header "Stopping AI vs Real Project Processes"

:: Define project ports and their service names
set PORTS=8001 8002 8003 8004 5173
set NAMES=Photo_Backend Video_Backend Text_Backend Audio_Backend Unified_Frontend

:: Stop processes on project ports
set IDX=0
for %%P in (%PORTS%) do (
    set /a IDX+=1
    for /f "tokens=1,5" %%a in ('netstat -ano ^| findstr :%%P') do (
        set PID=%%b
        if defined PID (
            taskkill /F /PID !PID! >nul 2>&1
            if !errorLevel! equ 0 (
                call :print_success Stopped service on port %%P (PID: !PID!)
            ) else (
                call :print_warning Failed to stop process on port %%P (PID: !PID!)
            )
        )
    )
)

:: Also kill any uvicorn processes started from our project directories
call :print_step Checking for remaining uvicorn processes...
for /f "tokens=2" %%i in ('wmic process where "name like '%%python%%' and commandline like '%%uvicorn%%'" get ProcessId /value ^| findstr "="') do (
    set PID=%%i
    set CMDLINE=
    for /f "tokens=*" %%c in ('wmic process where "ProcessId=!PID!" get CommandLine /value ^| findstr "="') do set CMDLINE=!CMDLINE!%%c
    echo !CMDLINE! | findstr /i "%PROJECT_ROOT:"=%" >nul 2>&1
    if !errorLevel! equ 0 (
        taskkill /F /PID !PID! >nul 2>&1
        if !errorLevel! equ 0 (
            call :print_success Stopped uvicorn process (PID: !PID!)
        )
    )
)

:: Kill any npm/vite processes from our frontend directory
call :print_step Checking for remaining frontend processes...
for /f "tokens=2" %%i in ('wmic process where "name like '%%node%%' and commandline like '%%vite%%'" get ProcessId /value ^| findstr "="') do (
    set PID=%%i
    set CMDLINE=
    for /f "tokens=*" %%c in ('wmic process where "ProcessId=!PID!" get CommandLine /value ^| findstr "="') do set CMDLINE=!CMDLINE!%%c
    echo !CMDLINE! | findstr /i "unified-frontend" >nul 2>&1
    if !errorLevel! equ 0 (
        taskkill /F /PID !PID! >nul 2>&1
        if !errorLevel! equ 0 (
            call :print_success Stopped vite process (PID: !PID!)
        )
    )
)

:: Kill cmd windows with our service titles
call :print_step Closing service command windows...
taskkill /FI "WINDOWTITLE eq Photo Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Video Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Audio Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Text Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq AI vs Real Frontend*" /F >nul 2>&1

:: Verify all ports are free
call :print_header "Verification"
set ALL_FREE=1
for %%P in (8001 8002 8003 8004 5173) do (
    netstat -ano | findstr :%%P >nul 2>&1
    if !errorLevel! equ 0 (
        call :print_warning Port %%P still in use
        set ALL_FREE=0
    ) else (
        call :print_success Port %%P is free
    )
)

echo.
if %ALL_FREE% equ 1 (
    call :print_header "All Project Processes Stopped Successfully"
    echo %GREEN%All AI vs Real services have been stopped.%RESET%
    echo %GREEN%Ports 8001-8004 and 5173 are now free.%RESET%
) else (
    call :print_header "Some Processes May Still Be Running"
    echo %YELLOW%Some ports are still in use. You may need to manually stop remaining processes.%RESET%
    echo %YELLOW%Run 'netstat -ano | findstr :8001 :8002 :8003 :8004 :5173' to check.%RESET%
)

echo.
pause