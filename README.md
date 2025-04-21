# HeartfeltAI | 智心相印

## AI婚禮邀請函系統

---

「智心相印」是一個融合AI與人情味的婚禮邀請函生成系統，利用先進的AI技術為每位賓客創建獨特個性化的邀請內容。

## 專案架構

```
wedding-invitation-generator/
├── src/                       # 前端代碼
│   ├── assets/                # 靜態資源（圖片、字體等）
│   │   └── images/            # 圖片資源
│   ├── components/            # React組件
│   │   ├── CoupleInfoPage.tsx # 新人資料輸入頁面
│   │   ├── GuestInfoPage.tsx  # 賓客資料輸入頁面
│   │   ├── PreviewPage.tsx    # 邀請函預覽頁面
│   │   └── ConfirmationPage.tsx # 最終確認與發送頁面
│   ├── contexts/              # React上下文管理
│   ├── hooks/                 # 自定義React Hooks
│   ├── pages/                 # 頁面組件
│   ├── services/              # 服務層
│   │   └── api.ts             # API請求封裝
│   ├── styles/                # 樣式文件
│   ├── types/                 # TypeScript類型定義
│   ├── utils/                 # 工具函數
│   ├── App.tsx                # 主應用組件
│   ├── main.tsx               # 應用入口點
│   └── vite-env.d.ts          # Vite環境類型聲明
│
├── backend/                   # 後端代碼
│   ├── config/                # 配置文件
│   │   ├── db.js              # 數據庫配置
│   │   ├── logger.js          # 日誌配置
│   │   └── email.js           # 郵件服務配置
│   ├── controllers/           # 控制器
│   │   ├── coupleController.js # 新人資料控制器
│   │   ├── guestController.js  # 賓客資料控制器
│   │   ├── invitationController.js # 邀請函生成控制器
│   │   └── emailController.js  # 郵件發送控制器
│   ├── middleware/            # 中間件
│   │   ├── auth.js            # 認證中間件
│   │   └── errorHandler.js    # 錯誤處理中間件
│   ├── models/                # Prisma模型及遷移
│   │   ├── migrations/        # 數據庫遷移文件
│   │   └── schema.prisma      # Prisma模型定義
│   ├── routes/                # API路由
│   │   ├── coupleRoutes.js    # 新人資料路由
│   │   ├── guestRoutes.js     # 賓客資料路由
│   │   ├── invitationRoutes.js # 邀請函路由
│   │   ├── emailRoutes.js     # 郵件發送路由
│   │   └── healthRoutes.js    # 健康檢查路由
│   ├── utils/                 # 工具函數
│   │   ├── logViewer.js       # 日誌查看工具
│   │   └── validators.js      # 資料驗證工具
│   ├── scripts/               # 實用腳本
│   │   └── viewSqlLogs.js     # SQL日誌查看工具
│   ├── app.js                 # 主應用入口
│   ├── server.js              # 服務器啟動文件
│   └── .env                   # 環境變量配置
│
├── public/                    # 公共資源
├── prisma/                    # Prisma配置
├── node_modules/              # 依賴包
├── package.json               # 項目依賴管理
├── vite.config.js             # Vite配置
├── tsconfig.json              # TypeScript配置
└── README.md                  # 項目說明文檔
```

## 核心功能說明

### 前端組件

1. **頁面組件 (pages/)**
   - **CoupleInfoPage.tsx**: 收集新人基本資料，包括新郎新娘姓名、婚禮日期、地點等
   - **GuestInfoPage.tsx**: 管理賓客資料的輸入和編輯，包括關係、喜好、回憶等
   - **PreviewPage.tsx**: 顯示AI生成的邀請函預覽，提供編輯、重新生成和確認功能
   - **ConfirmationPage.tsx**: 最終確認所有邀請函，準備發送郵件

2. **服務層 (services/)**
   - **api.ts**: 封裝所有對後端的API請求，處理數據傳輸和錯誤處理

### 後端模塊

1. **控制器 (controllers/)**
   - **coupleController.js**: 處理新人資料的創建、讀取和更新
   - **guestController.js**: 管理賓客資料的CRUD操作
   - **invitationController.js**: 核心模塊，利用AI生成邀請函內容
   - **emailController.js**: 處理電子郵件的發送和追蹤

2. **路由 (routes/)**
   - 定義REST API端點，將請求路由到相應的控制器

3. **模型 (models/)**
   - **schema.prisma**: 定義數據庫結構和關係

## 技術棧

- **前端**: React, TypeScript, Vite, TailwindCSS
- **後端**: Node.js, Express.js, Prisma ORM
- **數據庫**: SQLite (開發), PostgreSQL (生產)
- **AI服務**: OpenAI API, DeepSeek API
- **郵件服務**: Nodemailer

## 開發指南 (VSCode)

### 環境準備

1. **安裝必要軟件**:
   - 安裝 [Node.js](https://nodejs.org/) (版本 16.x 或更高)
   - 安裝 [Visual Studio Code](https://code.visualstudio.com/)
   - 安裝 [Git](https://git-scm.com/)

2. **安裝 VSCode 擴展**:
   - 打開 VSCode
   - 點擊左側擴展圖標 (或按 `Ctrl+Shift+X`)
   - 搜索並安裝以下擴展:
     - ESLint
     - Prettier
     - Prisma
     - TypeScript Vue Plugin (Volar)
     - REST Client (可選，用於測試API)

### 專案設置

1. **克隆專案**:
   - 打開 VSCode
   - 按 `Ctrl+Shift+P` 打開命令面板
   - 輸入 `Git: Clone` 並按 Enter
   - 輸入專案的git URL並選擇保存位置
   - 等待克隆完成

2. **打開專案**:
   - 在 VSCode 中，選擇 `文件` > `打開文件夾`
   - 選擇克隆的專案文件夾
   - 點擊 `選擇文件夾`

3. **設置終端**:
   - 在 VSCode 中，按 `` Ctrl+` `` 打開終端
   - 確保終端位於專案的根目錄

### 安裝依賴

1. **安裝前端依賴**:
   ```bash
   # 在專案根目錄執行
   npm install
   ```

2. **安裝後端依賴**:
   ```bash
   # 切換到後端目錄
   cd backend
   npm install
   ```

### 配置環境變量

1. **前端環境變量**:
   - 在專案根目錄中，複製 `.env.example` 為 `.env.local`
   - 按需修改變量

2. **後端環境變量**:
   - 在 `backend` 目錄中，複製 `.env.example` 為 `.env`
   - 填入必要的配置，特別是 AI API 密鑰和郵件設置
   ```
   # 最基本的配置示例
   PORT=5000
   NODE_ENV=development
   DATABASE_URL="file:./dev.db"
   DEEPSEEK_API_KEY=your_deepseek_api_key
   ```

### 數據庫設置

1. **初始化數據庫**:
   ```bash
   # 在backend目錄下
   npx prisma migrate dev --name init
   ```

2. **查看數據庫 (可選)**:
   ```bash
   npx prisma studio
   ```

### 啟動開發服務器

1. **啟動後端服務**:
   ```bash
   # 在backend目錄下
   npm run dev
   ```
   後端服務將在 http://localhost:5000 運行

2. **啟動前端服務**:
   ```bash
   # 返回專案根目錄
   cd ..
   npm run dev
   ```
   前端服務將在 http://localhost:5173 運行

3. **在瀏覽器中訪問**:
   - 打開 http://localhost:5173

### 開發工作流程

1. **查看源代碼**:
   - 在 VSCode 左側的文件瀏覽器中瀏覽項目結構
   - 前端代碼在 `src` 目錄下
   - 後端代碼在 `backend` 目錄下

2. **修改前端**:
   - 編輯 `src` 目錄下的文件
   - 保存後，Vite 將自動重新加載頁面

3. **修改後端**:
   - 編輯 `backend` 目錄下的文件
   - 使用 nodemon，服務器將自動重啟

4. **查看日誌**:
   - 前端日誌在運行前端服務的終端窗口中
   - 後端日誌在運行後端服務的終端窗口中
   - 詳細的日誌保存在 `backend/logs` 目錄中

### SQL日誌查看工具使用

如需查看SQL操作日誌，使用內置工具:

```bash
# 在backend目錄下
node scripts/viewSqlLogs.js

# 保存日誌到文件
node scripts/viewSqlLogs.js --save

# 指定自定義日誌路徑
node scripts/viewSqlLogs.js --path ./logs/custom.log
```

## 常見問題排解

### 啟動問題

**問題**: 啟動後端時出現 "Port already in use" 錯誤
**解決方案**: 
1. 找出佔用端口的進程:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   
   # Mac/Linux
   lsof -i :5000
   ```
2. 終止該進程或在 `.env` 中修改 PORT 值

**問題**: 啟動時出現 "Missing OpenAI API key" 警告
**解決方案**: 在 `backend/.env` 文件中添加 DEEPSEEK_API_KEY 或 OPENAI_API_KEY

### 數據庫問題

**問題**: 執行 Prisma 命令報錯
**解決方案**: 確保 Prisma 已正確安裝且數據庫 URL 正確配置:
```bash
# 重新安裝 Prisma
npm install -g prisma
npm install --save-dev prisma

# 重置數據庫
npx prisma migrate reset
```

### API連接問題

**問題**: 前端無法連接後端 API
**解決方案**:
1. 確保後端服務正在運行
2. 檢查 `src/services/api.ts` 中的 API 基礎 URL 是否正確
3. 檢查瀏覽器控制台是否有 CORS 錯誤，若有，確保後端 CORS 設置正確

## 上線部署指南

1. **構建前端**:
   ```bash
   # 在專案根目錄
   npm run build
   ```

2. **設置生產環境變量**:
   在 `backend/.env` 中設置:
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=your_production_db_url
   ```

3. **啟動生產服務**:
   ```bash
   # 在backend目錄
   npm start
   ```

## 聯絡與支持

若有任何問題或建議，請聯絡專案維護者。

---

*「智心相印」- 以AI之智，傳遞心之真情*