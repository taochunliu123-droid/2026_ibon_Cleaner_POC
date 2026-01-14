# 🤖 智慧客服機器人 (Voice Robot Assistant)

一個支援語音互動的 AI 客服機器人 POC，專為平板顯示設計。

![Robot Preview](./docs/preview.png)

## ✨ 功能特色

- 🎤 **語音輸入** - Web Speech API 語音識別（支援中文）
- 🔊 **語音輸出** - OpenAI TTS 自然語音回覆
- 🤖 **可愛動畫** - 機器人有四種狀態動畫：待機、聆聽、思考、說話
- 💬 **AI 對話** - 整合 OpenAI Assistant API
- 📱 **平板優化** - 響應式設計，觸控友善
- 🎯 **喚醒詞** - 支援「你好」、「嗨」喚醒

## 🛠️ 技術架構

| 層級 | 技術 |
|-----|------|
| 框架 | Next.js 14 + React 18 |
| 樣式 | Tailwind CSS |
| 動畫 | Framer Motion |
| 語音輸入 | Web Speech API |
| 語音輸出 | OpenAI TTS (`tts-1`) |
| AI 對話 | OpenAI Assistant API |
| 部署 | Vercel |

## 📦 安裝步驟

### 1. Clone 專案

```bash
git clone https://github.com/your-username/robot-assistant.git
cd robot-assistant
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 設定環境變數

複製 `.env.example` 為 `.env.local`：

```bash
cp .env.example .env.local
```

編輯 `.env.local`，填入你的 API 金鑰：

```env
# OpenAI API Key (用於 Assistant 和 TTS)
OPENAI_API_KEY=sk-your-api-key-here

# OpenAI Assistant ID
OPENAI_ASSISTANT_ID=asst_your-assistant-id-here
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

## 🚀 部署到 Vercel

### 方法一：透過 Vercel CLI

```bash
npm i -g vercel
vercel
```

### 方法二：透過 GitHub 整合

1. Push 程式碼到 GitHub
2. 在 [Vercel](https://vercel.com) 連結 GitHub repo
3. 設定環境變數：
   - `OPENAI_API_KEY`
   - `OPENAI_ASSISTANT_ID`
4. 點擊 Deploy

## 📱 使用方式

### 按鈕觸發模式
1. 點擊底部麥克風按鈕
2. 對著平板說話
3. 等待 AI 回覆

### 喚醒詞模式
1. 開啟右上角「喚醒詞」開關
2. 說「你好」或「嗨」喚醒機器人
3. 繼續對話

## 🎨 機器人狀態

| 狀態 | 顏色 | 說明 |
|-----|------|------|
| 待機 | 灰色 | 準備接收指令 |
| 聆聽 | 藍色 | 正在接收語音 |
| 思考 | 黃色 | AI 處理中 |
| 說話 | 綠色 | 播放語音回覆 |

## 🔧 自訂設定

### 更換 TTS 聲音

在 `app/api/tts/route.ts` 中修改 `voice` 參數：

```typescript
// 可選: alloy, echo, fable, onyx, nova, shimmer
voice: 'nova' // 推薦用於中文
```

### 調整語音識別語言

在 `app/page.tsx` 中修改：

```typescript
recognition.lang = 'zh-TW' // 繁體中文
// recognition.lang = 'zh-CN' // 簡體中文
// recognition.lang = 'en-US' // 英文
```

## 📝 OpenAI Assistant 設定建議

在 OpenAI Platform 建立 Assistant 時，建議設定：

```
名稱: 智慧客服助理
指令:
你是一個親切的客服助理機器人。請用繁體中文回答，語氣要友善、簡潔。
回答時請：
1. 保持回覆簡短（2-3句話）
2. 語氣親切有禮
3. 如果不確定，請禮貌詢問更多資訊

模型: gpt-4-turbo 或 gpt-3.5-turbo
```

## 🐛 常見問題

### Q: 語音識別沒有反應？
A: 確認瀏覽器有麥克風權限，並使用 Chrome 瀏覽器（最佳支援）

### Q: TTS 沒有聲音？
A: 檢查 OPENAI_API_KEY 是否正確，以及帳戶是否有餘額

### Q: 部署後 API 不工作？
A: 確認 Vercel 環境變數已正確設定

## 📄 授權

MIT License

## 🙏 致謝

- [OpenAI](https://openai.com) - AI 服務
- [Vercel](https://vercel.com) - 部署平台
- [Framer Motion](https://www.framer.com/motion/) - 動畫庫
