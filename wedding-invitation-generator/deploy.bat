@echo off
chcp 65001 >nul
REM 婚禮邀請函生成器部署腳本 (Windows批處理版本)
REM 此腳本用於自動化前後端整合部署流程
REM 根據server.js的架構完善，包含數據庫初始化和環境變數設置

setlocal enabledelayedexpansion

REM 設置顏色代碼
set "INFO=[94m[INFO][0m"
set "STEP=[92m[STEP][0m"
set "WARN=[93m[WARN][0m"
set "ERROR=[91m[ERROR][0m"
set "SUCCESS=[92m[SUCCESS][0m"

echo %INFO% === 婚禮邀請函生成器部署開始 ===
echo.

REM 設置環境變數 (如果未設置)
if not defined NODE_ENV (
  echo %INFO% 設置環境變數 NODE_ENV=production
  set NODE_ENV=production
)

REM 顯示當前工作目錄
echo %INFO% 當前目錄: %CD%
echo.

REM 檢查所需工具是否安裝
echo %STEP% 檢查必要工具
call node --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo %ERROR% Node.js 未安裝，請先安裝 Node.js
  goto :error
)
call npm --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo %ERROR% npm 未安裝，請先安裝 npm
  goto :error
)
echo %SUCCESS% 必要工具檢查通過
echo.

REM 檢查目錄結構
echo %STEP% 檢查專案結構
if not exist "wedding-invitation-generator" (
  echo %ERROR% 找不到 wedding-invitation-generator 目錄
  goto :error
)
if not exist "wedding-invitation-generator\backend" (
  echo %ERROR% 找不到後端目錄
  goto :error
)
echo %SUCCESS% 專案結構檢查通過
echo.

REM 前端依賴安裝
echo %STEP% 安裝前端依賴
cd wedding-invitation-generator
echo %INFO% 運行 npm install...
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo %ERROR% 前端依賴安裝失敗
  goto :error
)
echo %SUCCESS% 前端依賴安裝完成
echo.

REM 建構前端
echo %STEP% 建構前端應用
echo %INFO% 運行 npm run build...
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo %ERROR% 前端建構失敗
  goto :error
)
echo %SUCCESS% 前端建構完成
echo.

REM 安裝後端依賴
echo %STEP% 安裝後端依賴
cd backend
echo %INFO% 運行 npm install...
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo %ERROR% 後端依賴安裝失敗
  cd ..
  goto :error
)
echo %SUCCESS% 後端依賴安裝完成
echo.

REM 檢查環境變數檔案
echo %STEP% 檢查環境變數設置
if not exist ".env" (
  echo %WARN% .env 檔案不存在，將從範例檔案創建
  if exist ".env.example" (
    copy .env.example .env
    echo %INFO% 已從 .env.example 創建 .env 檔案，請根據需要修改
  ) else (
    echo %INFO% 創建基本 .env 檔案
    echo DATABASE_URL=file:../data/wedding.db > .env
    echo PORT=5000 >> .env
    echo HOST=0.0.0.0 >> .env
    echo NODE_ENV=production >> .env
  )
) else (
  echo %INFO% .env 檔案已存在
)
echo.

REM 創建日誌目錄
echo %STEP% 設置日誌目錄
if not exist "logs" (
  echo %INFO% 創建日誌目錄
  mkdir logs
)
echo %SUCCESS% 日誌目錄設置完成
echo.

REM 檢查數據目錄
echo %STEP% 設置數據目錄
if not exist "..\data" (
  echo %INFO% 創建數據目錄
  mkdir ..\data
)
echo %SUCCESS% 數據目錄設置完成
echo.

REM 初始化/遷移數據庫
echo %STEP% 初始化數據庫
echo %INFO% 檢查 Prisma 模塊...
if exist "node_modules\.bin\prisma.cmd" (
  echo %INFO% 運行 Prisma 數據庫遷移...
  call npx prisma migrate deploy
  if %ERRORLEVEL% NEQ 0 (
    echo %WARN% 數據庫遷移可能有問題，但繼續執行
  )
  
  echo %INFO% 生成 Prisma 客戶端...
  call npx prisma generate
  if %ERRORLEVEL% NEQ 0 (
    echo %WARN% Prisma 客戶端生成失敗，但繼續執行
  )
) else (
  echo %WARN% 找不到 Prisma，跳過數據庫初始化
)
echo %SUCCESS% 數據庫設置完成
echo.

REM 建立後端public目錄
echo %STEP% 準備後端public目錄
if not exist "public" (
  echo %INFO% 建立public目錄
  mkdir public
)

REM 複製前端構建文件到後端
echo %STEP% 複製前端構建文件到後端
echo %INFO% 正在複製檔案...
xcopy /E /I /Y ..\dist\* public\
if %ERRORLEVEL% NEQ 0 (
  echo %ERROR% 複製文件失敗
  cd ..
  goto :error
)
echo %SUCCESS% 前端檔案複製完成
echo.

REM 檢查服務器配置
echo %STEP% 檢查服務器配置
echo %INFO% 驗證路由模塊...
call node -e "try { require('./routes/healthRoutes'); console.log('Health routes OK'); } catch(e) { console.error('Health routes error:', e.message); process.exit(1); }"
if %ERRORLEVEL% NEQ 0 (
  echo %WARN% 健康檢查路由模塊可能有問題，但繼續執行
)

call node -e "try { require('./routes/coupleRoutes'); console.log('Couple routes OK'); } catch(e) { console.error('Couple routes error:', e.message); process.exit(1); }"
if %ERRORLEVEL% NEQ 0 (
  echo %WARN% 新人資訊路由模塊可能有問題，但繼續執行
)

echo %SUCCESS% 服務器配置檢查完成
echo.

REM 部署完成
echo %STEP% 部署完成!
echo.

REM 詢問是否啟動服務器
set /p START_SERVER="是否啟動服務器? (Y/N): "
if /i "%START_SERVER%"=="Y" (
  REM 啟動伺服器
  echo %STEP% 啟動伺服器
  echo %INFO% 正在啟動伺服器，請等待...
  
  REM 使用 production 模式
  echo %INFO% 使用 %NODE_ENV% 模式啟動
  start "Wedding Invitation Server" cmd /c "set NODE_ENV=%NODE_ENV% && npm start"

  REM 等待伺服器啟動 (5秒)
  echo %INFO% 等待伺服器啟動中...
  ping 127.0.0.1 -n 6 > nul

  REM 自動打開瀏覽器
  echo %STEP% 打開應用程式
  start http://localhost:5000

  echo.
  echo %SUCCESS% 伺服器已啟動:
  echo   1. 後端伺服器正在運行
  echo   2. 瀏覽器已打開，訪問 http://localhost:5000
  echo   3. 若瀏覽器未打開，請手動訪問
  echo.
)

echo %INFO% 關閉伺服器:
echo   1. 在命令視窗中按 Ctrl+C
echo   2. 或關閉伺服器命令視窗
echo.
echo %INFO% 生產環境部署命令:
echo   set NODE_ENV=production ^&^& npm start
echo.
echo %INFO% 故障排除:
echo   1. 如果應用無法啟動，檢查日誌目錄下的錯誤日誌
echo   2. 確保端口 5000 未被其他應用佔用
echo   3. 檢查 .env 文件中的環境變數設置
echo.

cd ..
echo %SUCCESS% === 部署操作已完成 ===
goto :end

:error
echo.
echo %ERROR% 部署失敗，請查看上方錯誤信息。
exit /b 1

:end
endlocal 