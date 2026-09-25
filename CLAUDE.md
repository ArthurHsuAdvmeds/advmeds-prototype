# advmeds-prototype

Advmeds 的原型（prototype）展示 repo。每個原型都是**可獨立開啟的靜態 HTML**，
push 到 `main` 後由 GitHub Actions 原樣部署到 GitHub Pages，**沒有任何 build / 套件管理 / 測試流程**。

- 線上網址：`https://arthurhsuadvmeds.github.io/advmeds-prototype/{資料夾}/`
- 部署、網址規則、從零設定 Pages 的完整步驟見 [README.md](README.md)，本文件只記開發時要遵守的規則與目前狀況。

> **這個 repo 是公開的。** API Key、Token、帳密、內網 IP、真實病患資料一律不可進 repo；
> 展示資料一律用虛構的 mock data。

---

## 1. 專案地圖

根目錄 [index.html](index.html) 是所有原型的總覽頁，依客戶分區塊列出卡片。

| 資料夾 | 客戶 | 內容 | 技術 | 詳細文件 |
| --- | --- | --- | --- | --- |
| `tsghb-dashboard/` | 三總北投 | 精神健康個案通報管理儀表板，`v1/`–`v4/` 各版並存；入口 `index.html` 自動轉址到最新版；`release-note/` 為 V2 以後的版本說明 | 單檔 HTML + D3 / topojson（CDN） | — |
| `tsghb-landing-page/` | 三總北投 | 各角色登入後的入口頁，一個角色一個子資料夾（`doctor/`、`orgMag/`），共用 `assets/`，另附規格下載 zip | dc-runtime + React | [CLAUDE.md](tsghb-landing-page/CLAUDE.md)、各角色資料夾內 CLAUDE.md |
| `tsghb-doctor-landing-page/` | 三總北投 | **舊版**醫師入口頁，僅保留對照，**不要再改**（改 `tsghb-landing-page/doctor/`） | dc-runtime + React | [CLAUDE.md](tsghb-doctor-landing-page/CLAUDE.md) |
| `tsghb-flow-test/` | 三總北投 | 通報流程測試導引（緊急醫療、優化計畫測試情境清單） | 單檔 HTML | — |
| `tsghb-middleware/` | 三總北投 | HIS 整合示範（HIS 門診畫面開啟個案紀錄） | 單檔 HTML | — |
| `tsghb-ppt/` | 三總北投 | 平台網頁版簡報，圖片在 `assets/` | 單檔 HTML | — |
| `spec/nhri_ms/` | 國衛院 | 肌少症評估量表（AWGS 2025），`write/` 填寫頁、`result/` 結果頁 | dc-runtime + React | [CLAUDE.md](spec/nhri_ms/CLAUDE.md) |
| `spec/nhri_elearing_room/` | 國衛院 | ICOPE 學習小教室 | 單檔 HTML | — |
| `spec/nhri_elearing/` | 國衛院 | ICOPE 衛教推播邏輯一覽（給 PM 對照） | 單檔 HTML | — |
| `thai/qc-model/` | 泰國 | QC 品質管制模組（Levey-Jennings 管制圖，EN / ไทย / 中） | 單檔 HTML | — |
| `flow-chart/` | 內部工具 | FlowScript 文字語法流程圖：說明頁、`edit/`、`view/`，共用 `flowchart.js` | HTML + 共用 JS | [README.md](flow-chart/README.md) |
| `mjk/` | 非醫療 | 魔術道具報價單產生器，品項在 `item.csv` | 單檔 HTML | — |

**有子文件的資料夾，動手前先讀該資料夾的 CLAUDE.md / README.md**，裡面有判定邏輯、版面規格、打包方式等細節，以子文件為準。

根目錄另有 `精神醫療通報平台-醫師院會demo簡報0907.pdf`（總覽頁有連結）與 `參考暫存.csv`，兩者都會被公開部署。

---

## 2. 開發規則

### 通用

- **不能用需要編譯的寫法**（JSX、TypeScript、SCSS、npm 套件…）。瀏覽器直接開得起來才算完成。
- **單檔優先**：CSS / JS 盡量內嵌在同一份 `index.html`；外部套件只能走 `https://` CDN（目前用 jsDelivr、Google Fonts）。
- **一律用相對路徑**（`./detail/`、`../assets/…`），不要寫 `/detail/`，否則在 `/advmeds-prototype/` 子路徑下會壞；
  也要讓本機 `file://` 直接開檔能運作。
- 每層網址都要有 `index.html`；資料夾名稱用小寫英數 + 連字號（既有的 `orgMag/`、`nhri_ms` 等例外不要改名，會斷掉已發出的連結）。
- 圖片等資產放在該原型資料夾底下，**不要跨專案資料夾引用檔案**（`tsghb-landing-page/` 內各角色共用 `assets/` 是例外）。
- 同一原型的新版本用子資料夾（`v1/`、`v2/`…），不要開新的專案資料夾。
- 改完用瀏覽器實際開啟確認畫面，並檢查 console 無錯誤。

### 新增原型

1. 根目錄開新資料夾，放 `index.html`。
2. 在根目錄 [index.html](index.html) 對應客戶的 `<section>` 裡複製一張 `.card`，改標題、說明與路徑（頁首原型數量會自動計算）。
3. 若原型有非顯而易見的規則（判定邏輯、門檻、打包流程），在該資料夾寫一份 CLAUDE.md。

### 大檔案

`tsghb-dashboard/v*/index.html`（約 0.8–2.7 MB、兩萬多行）、dc-runtime 系列頁面（約 0.35–0.7 MB）都很大：

- **不要整份 Read**，先用 Grep 找到區段（例如常數 `GEO_*`、`EFF_*`、`OUTCOME_*`、`BASIC_*`，或 `<script id="v…">` 補丁區塊）再局部讀取與 Edit。
- dashboard 各版是逐版疊加修改而來，後段有多個 `<script id="vNN-…">` 覆寫前面的行為；改功能時要確認最後生效的是哪一段。

### dc-runtime 頁面

`tsghb-landing-page/`、`tsghb-doctor-landing-page/`、`spec/nhri_ms/` 使用 `<x-dc>` 樣板 + `dc-runtime.js` 以 React 渲染：

- `window.__resources` 不可移除（React 靠它從本地 `assets/js/` 載入）。
- `{{ 變數 }}` 只能綁 `renderVals()` 回傳的頂層鍵；顏色一律用 `:root` 設計 token，不寫死色碼。
- 這些頁面原本是匯出工具產生的 base64 單檔 bundle，已拆成資產資料夾；若重新匯出會蓋回打包版，需要再拆一次。

---

## 3. 目前狀況（2026-09-25）

- **`tsghb-dashboard` 最新版是 `v4/`**（以 v3 套用會議修改意見：本院醫療轉介占率定義對齊官方指標清單、區域分布圖可依初評風險等級過濾）。
  入口轉址頁 `LATEST = 4`，canonical、`<noscript>`、手動連結都指向 `v4/`。
- `tsghb-dashboard/release-note/` 記錄 V2 以後各版差異與點選路徑。
- **發佈新版（v5…）時要一起做**：更新版本說明頁、在根目錄總覽頁儀表板卡片加版本 chip、
  更新轉址頁的 `LATEST` / canonical / `<noscript>` / 手動連結。
- `tsghb-dashboard/test_data.json` 為測試資料，目前沒有頁面引用。
- Landing page 已全部移到 `tsghb-landing-page/<role>/`；該處頁面、規格或插圖有改動時要**重新產生對應的 zip 下載包**（做法見其 CLAUDE.md 第 4 節）。
- `tsghb-landing-page/` 的正式實作採 Vue 3 + .NET Core 8，HTML 只是參考原型。

---

## 4. Git 與部署

- 直接在 `main` 上工作，push 即部署（約 1 分鐘，`cancel-in-progress` 只保留最後一次）；Actions → `Deploy GitHub Pages` 綠燈才算上線。
- **不要修改 `.github/workflows/pages.yml`**，除非使用者明確要求。
- Commit message 用繁體中文，開頭標示專案資料夾與版本，描述改了什麼，例如：
  `tsghb-dashboard v4 區域分布圖新增初評風險等級過濾開關`。
- 環境是 Windows；沒有 `zip` 指令，打包用 PowerShell `System.IO.Compression`（zip 內路徑用 `/`）。
- 上線後看到舊畫面時先 `Ctrl` + `F5` 排除快取。
