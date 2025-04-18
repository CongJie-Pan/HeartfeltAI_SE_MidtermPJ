@echo off
REM Wedding Invitation Generator Deployment Script (Windows Batch Version)
REM This script automates the frontend-backend integration deployment process

echo === Wedding Invitation Generator Deployment Started ===
echo.

REM Display current working directory
echo [INFO] Current directory: %CD%
echo.

REM Install frontend dependencies
echo [STEP 1] Installing frontend dependencies
cd wedding-invitation-generator
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Frontend dependencies installation failed
  goto :error
)
echo.

REM Build frontend
echo [STEP 2] Building frontend application
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Frontend build failed
  goto :error
)
echo.

REM Install backend dependencies
echo [STEP 3] Installing backend dependencies
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Backend dependencies installation failed
  goto :error
)
echo.

REM Create backend public directory
echo [STEP 4] Preparing backend public directory
if not exist "public" (
  echo [SETUP] Creating public directory
  mkdir public
)

REM Copy frontend build files to backend
echo [STEP 5] Copying frontend build files to backend
xcopy /E /I /Y ..\dist\* public\
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] File copying failed
  goto :error
)
echo.

REM Skip backend tests
echo [STEP 6] Skipping backend tests
echo.

REM Deployment complete
echo === Deployment Complete! ===
echo.
echo Start the application:
echo 1. Backend directory is already the current location
echo 2. Run server: npm start
echo 3. Browse to: http://localhost:5000
echo.
echo For production deployment:
echo NODE_ENV=production npm start
echo.

goto :end

:error
echo.
echo [ERROR] Deployment failed. Please check the error messages above.
exit /b 1

:end 