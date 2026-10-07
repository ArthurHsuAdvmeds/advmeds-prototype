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
| `tsghb-dashboard/` | 三總北投 | 精神健康個案通報管理儀表板，`v1/`–`v4/` 各版並存；入口 `index.html` 自動轉址到最新版；`release-note/` 為 V2 以後的版本說明；`db_desc/` 為資料庫規劃（DBML＋規格頁） | 單檔 HTML + D3 / topojson（CDN） | — |
| `tsghb-landing-page/` | 三總北投 | 各角色登入後的入口頁，一個角色一個子資料夾（`doctor/`、`orgMag/`），共用 `assets/`，另附規格下載 zip | dc-runtime + React | [CLAUDE.md](tsghb-landing-page/CLAUDE.md)、各角色資料夾內 CLAUDE.md |
| `tsghb-doctor-landing-page/` | 三總北投 | **舊版**醫師入口頁，僅保留對照，**不要再改**（改 `tsghb-landing-page/doctor/`） | dc-runtime + React | [CLAUDE.md](tsghb-doctor-landing-page/CLAUDE.md) |
| `tsghb-flow-test/` | 三總北投 | 通報流程測試導引（緊急醫療、優化計畫測試情境清單） | 單檔 HTML | — |
| `tsghb-middleware/` | 三總北投 | HIS 整合示範（HIS 門診畫面開啟個案紀錄） | 單檔 HTML | — |
| `tsghb-ppt/` | 三總北投 | 平台網頁版簡報，圖片在 `assets/` | 單檔 HTML | — |
| `spec/nhri_ms/` | 國衛院 | 肌少症評估量表（AWGS 2025），`write/` 填寫頁、`result/` 結果頁 | dc-runtime + React | [CLAUDE.md](spec/nhri_ms/CLAUDE.md) |
| `spec/nhri_elearing_room/` | 國衛院 | ICOPE 學習小教室 | 單檔 HTML | — |
| `spec/nhri_elearing/` | 國衛院 | ICOPE 衛教推播邏輯一覽（給 PM 對照） | 單檔 HTML | — |
| `spec/sc_app_transfer/` | 未分類（總覽頁暫放「工具與其他」） | Health Go 健康夠 App 下載轉址頁：手機依裝置自動轉到 App Store／Google Play，電腦顯示兩個商店的 QR Code（`assets/qr-*.png`，內容即商店網址，改網址要換圖）；網址加 `?preview=ios`、`android` 或 `desktop` 可預覽該畫面且不跳轉 | 單檔 HTML | — |
| `thai/qc-model/` | 泰國 | QC 品質管制模組（Levey-Jennings 管制圖，EN / ไทย / 中） | 單檔 HTML | — |
| `flow-chart/` | 內部工具 | FlowScript 文字語法流程圖：說明頁、`edit/`、`view/`，共用 `flowchart.js` | HTML + 共用 JS | [README.md](flow-chart/README.md) |
| `map_center/` | 內部工具 | 地圖半徑工具：輸入地址／座標／Google 地圖連結或點地圖決定圓心，給半徑畫出範圍；可多圓、匯出 KML、複製分享連結（狀態存在網址 `#` 與 localStorage），另有「我的位置」定位按鈕。手機（≤760px）版面是搜尋列／地圖／底部面板，DOM 只有一份，靠 `.panel`、`.sheet` 互換 `display:contents` 重排。地圖來源預設是 Leaflet + 免金鑰圖資；Google Maps 模式的 API 金鑰由使用者在頁面上輸入、只存 localStorage，**不可寫進檔案** | 單檔 HTML + Leaflet（CDN） | — |
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

## 3. 目前狀況（2026-09-29）

- **`tsghb-dashboard` 最新版是 `v6/`**（以 v5 為基礎的手機 RWD 版：≤899px 主選單改黏頂下拉、第二層頁籤換行、長條圖改橫向、
  指揮板流程卡片改直式、熱點地圖改直式畫布並支援觸控手勢；醫療機構端「優化計畫無法收案」與 AI「預測吻合程度」的可點擊提示改為按鈕，桌機同步）。
  入口轉址頁 `LATEST = 6`，canonical、`<noscript>`、手動連結都指向 `v6/`。
- v6 的修改：主選單後的 `.v6-nav-select` 容器、兩張可點擊卡片裡的 `.v6-open-hint`、檔尾 `<style id="v6-mobile-nav-select">`／`<style id="v6-mobile-rwd">`
  與各自的 `-behavior` 腳本，以及地圖模組內標註 `v6` 的程式（`geoCanvasBox()`：≤899px 畫布高度依地圖框比例、`translateExtent`、觸控雙擊放大、旋轉時重畫）。
  - 主選單下拉：選項由 `.tabs` 內的按鈕自動產生，切頁一律觸發對應 `.tab` 的 click；新增的控制項**不可帶 `tab` class**，否則會被 `querySelectorAll('.tab')` 當成頁籤。
  - 長條圖橫向：各圖表只寫行內 `height:%`，由 `v6-mobile-rwd-behavior` 同步成 CSS 變數 `--v6-bar`（MutationObserver 監看 `#basic`、`#reporter`）；
    新增直條圖時要把長條元素加進腳本的 `BAR_SELECTOR`，否則手機上長條寬度會是 0。
  - ≤899px 的規則一律以 `html body .dashboard #頁面.page …` 起頭，才壓得過舊層的 `.dashboard .page:is(#…) :is(.…)`＋`!important`。
  - `<style id="v6-mobile-dialogs">`：熱點地圖彈窗改為標題固定、`.geo-body` 捲動；地圖未放大時單指觸控不交給 d3（`geoZoomBehavior.filter`）好讓手指捲動彈窗。
    注意 `v84-responsive-release` 在 ≤1199px 用 `[class*="-shell"]` 把頁面內所有 *-shell 的 max-height 清成 none，會波及放在頁面裡的彈窗外框；新彈窗的外框避免用 `-shell` 結尾，或比照補回。
- v5（以 v4 為基礎）：區域分布圖點位加大並合併同址通報、字級以 1920×1080 為基準放大、
  模擬資料補到 2026/09/25、SNQ 結案後轉介比例點擊開 dialog 看門診／居家／住院、
  醫療機構端無法收案原因表收成右側卡片 + dialog、指揮儀表板同期比較改為比較案件處理效率指標並可依通報類別篩選。
- v5 的修改都集中在檔尾的 `<style id="v5-…">` 區塊（字級層 `v5-typography-1920` 只在 ≥1200px 生效，以 125% 縮放的 1536px 視窗為主要驗證尺寸）與地圖、SNQ 的 JS；
  模擬資料的「今天」是 2026-09-25，本年度總數仍為 420 件（只更新了 9 月的本月／本季／本日數字）。
- `tsghb-dashboard/release-note/` 記錄 V2 以後各版差異與點選路徑。
- **發佈新版（v7…）時要一起做**：更新版本說明頁、在根目錄總覽頁儀表板卡片加版本 chip、
  更新轉址頁的 `LATEST` / canonical / `<noscript>` / 手動連結。
- `tsghb-dashboard/test_data.json` 為測試資料，目前沒有頁面引用。
- **`tsghb-dashboard/kpi/` 整個資料夾不進版控、不部署**（已列入根目錄 `.gitignore`），內容只存在使用者本機；不要 `git add -f` 加回來。
- `tsghb-dashboard/kpi/kpi.csv` 是依 v6 實際畫面整理的各分頁指標清單（UTF-8 含 BOM，供 Excel 直接開啟），
  欄位為項次、主分頁、次分頁、指標名稱、圖表種類、重複項次、計算公式、是否依賴HIS資料。儀表板增刪指標時要同步更新。
  - 「重複項次」填同一指標在前面出現過的項次（多個以 `;` 分隔），目前只留要跟客戶討論的幾項，由使用者維護。
  - 「計算公式」以客戶的原始指標清單（`kpi/original_list.xlsx`，使用者自行放入）為準，清單沒有的才依儀表板上的定義補；
    句尾的【原清單無】表示儀表板有、原清單沒有，【差異】表示兩邊定義或呈現不一致，都是要跟客戶確認的項目。
  - 「是否依賴HIS資料」不依賴就留空，依賴才寫需要哪些 HIS 資料。
- `tsghb-dashboard/db_desc/` 是把 v6 儀表板落地成 PostgreSQL 的資料庫規劃：`pgsql.dbml`（資料表定義，以它為準）與 `index.html`（規格頁，頁首有下載 DBML 的按鈕）。
  - 資料來源是通報平台 API 與醫院 HIS API；表名前綴 `pf_` 平台、`his_` HIS、`ref_` 代碼與設定、`mart_` 衍生表、`sync_` 同步紀錄。
  - **字串欄位一律 `text`**（使用者指定），不用 `varchar(n)` 也不用 enum；代碼型欄位的允許值寫在欄位 note。
  - `index.html` 第 4 節的資料表明細是依 DBML 產生後貼入的靜態 HTML：改 DBML 時該節、頁首的表數／欄位數、第 5 節的指標對應要一起改。
    第 5 節的「項次」對應 `kpi/kpi.csv`，1–149 要全部涵蓋。
  - 規格頁只依 v6 畫面寫，不引用客戶原始清單的內容（`kpi/` 不進版控）；兩邊 API 的實際欄位尚未核對，待確認事項列在第 9 節。
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
