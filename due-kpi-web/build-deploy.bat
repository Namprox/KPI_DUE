@echo off
set "PROJECT_DIR=C:\Users\Admin\Downloads\Phat\Code\KPI_DUE\due-kpi-web"
set "BUILD_DIR=%PROJECT_DIR%\build"
set "DEPLOY_DIR=D:\Phat\NetAPI\KPI_FE"

cd /d "%PROJECT_DIR%"

echo [1/3] Cleaning "%BUILD_DIR%" ...
if exist "%BUILD_DIR%\" rmdir /s /q "%BUILD_DIR%"

echo [2/3] Running "npm run build" ...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed - nothing was deployed.
    pause
    exit /b 1
)

echo [3/3] Copying to "%DEPLOY_DIR%" ...
if not exist "%DEPLOY_DIR%\" mkdir "%DEPLOY_DIR%"
xcopy "%BUILD_DIR%\*" "%DEPLOY_DIR%\" /E /I /Y /Q
if errorlevel 1 (
    echo [ERROR] Copy failed.
    pause
    exit /b 1
)

echo.
echo DONE - deployed to %DEPLOY_DIR%
