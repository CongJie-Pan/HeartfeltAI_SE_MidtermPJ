@echo off
chcp 65001 >nul
REM 婚禮邀請函生成器部署腳本 (Windows批處理版本)
REM 此腳本用於自動化前後端整合部署流程

echo === 婚禮邀請函生成器部署開始 ===
echo.

REM 顯示當前工作目錄
echo [資訊] 當前目錄: %CD%
echo.

REM 前端依賴安裝
echo [步驟1] 安裝前端依賴
cd wedding-invitation-generator
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo [錯誤] 前端依賴安裝失敗
  goto :error
)
echo.

REM 建構前端
echo [步驟2] 建構前端應用
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo [錯誤] 前端建構失敗
  goto :error
)
echo.

REM 安裝後端依賴
echo [步驟3] 安裝後端依賴
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo [錯誤] 後端依賴安裝失敗
  goto :error
)
echo.

REM 建立後端public目錄
echo [步驟4] 準備後端public目錄
if not exist "public" (
  echo [設置] 建立public目錄
  mkdir public
)

REM 複製前端構建文件到後端
echo [步驟5] 複製前端構建文件到後端
xcopy /E /I /Y ..\dist\* public\
if %ERRORLEVEL% NEQ 0 (
  echo [錯誤] 複製文件失敗
  goto :error
)
echo.

REM 跳過後端測試
echo [步驟6] 跳過後端測試
echo.

REM 部署完成
echo === 部署完成! ===
echo.
echo 啟動應用:
echo 1. 後端目錄已是當前位置
echo 2. 執行伺服器: npm start
echo 3. 瀏覽器訪問: http://localhost:5000
echo.
echo 生產環境部署:
echo NODE_ENV=production npm start
echo.

goto :end

:error
echo.
echo [錯誤] 部署失敗，請查看上方錯誤信息。
exit /b 1

:end 