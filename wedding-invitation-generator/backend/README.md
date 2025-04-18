# 婚禮邀請函生成系統 - 後端

這是婚禮邀請函生成系統的後端部分，提供API服務以支持前端功能。系統使用DeepSeek AI技術生成個性化邀請函，支持邀請函編輯和電子郵件發送功能。

## 技術架構

- **框架**: Express.js
- **數據庫**: SQLite (通過Prisma ORM)
- **AI整合**: DeepSeek API
- **電子郵件**: Nodemailer
- **日誌**: Winston + Morgan
- **監控**: Prometheus
- **安全**: Helmet, Rate-limiting, JWT

## 功能特點

- 新人資料管理
- 賓客資料管理
- AI輔助邀請函生成
- 邀請函編輯
- 電子郵件發送
- 完整的日誌記錄系統
- API監控和性能追蹤
- 安全防護措施

## 安裝步驟

1. 安裝依賴:
```bash
npm install
```

2. 設置環境變數:
將 `.env.example` 複製為 `.env` 並填入所需的變數

3. 初始化數據庫:
```bash
npx prisma migrate dev
```

4. 啟動開發服務器:
```bash
npm run dev
```

## API文檔

### 新人資料

- `POST /api/couple` - 創建/更新新人資料
- `GET /api/couple` - 獲取新人資料

### 賓客管理

- `POST /api/guests` - 添加賓客
- `GET /api/guests` - 獲取所有賓客
- `GET /api/guests/:id` - 獲取單個賓客
- `PUT /api/guests/:id` - 更新賓客資料
- `DELETE /api/guests/:id` - 刪除賓客

### 邀請函生成

- `POST /api/invitations/generate` - 生成邀請函
- `PUT /api/invitations/:guestId` - 更新邀請函內容

### 邀請函發送

- `POST /api/emails/send` - 發送所有邀請函
- `POST /api/emails/send/:guestId` - 發送單個邀請函

## 監控與日誌

系統包含詳細的日誌記錄和API監控功能：

- 日誌文件位於 `logs/` 目錄
- API監控指標可通過 `/api/metrics` 查看 (需管理員權限)
- 健康檢查端點: `/api/health` 和 `/api/health/detailed`

## 安全特性

- API速率限制防止濫用
- Helmet保護HTTP頭部
- JWT身份驗證
- 輸入驗證
- 參數化SQL防止注入攻擊

## 開發指令

- `npm start` - 啟動生產服務器
- `npm run dev` - 啟動開發服務器(支持熱重載)
- `npm test` - 運行測試
- `npm run prisma:generate` - 更新Prisma客戶端
- `npm run prisma:studio` - 啟動Prisma數據庫界面 