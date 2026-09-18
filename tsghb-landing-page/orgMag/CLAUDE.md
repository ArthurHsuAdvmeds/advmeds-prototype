# 三軍總醫院北投分院 — 精神醫療快速應變平台｜機構管理者入口頁原型

機構管理者登入後的入口頁（Landing page）：Hero 大標 + 兩張功能卡片（**平台使用者列表**、**報表匯出**），
點卡片以新分頁開啟對應功能。

> **正式實作採 Vue 3 + .NET Core 8。** 本資料夾的 HTML 是視覺與互動的**參考原型**（dc-runtime + React），
> 不要移植它的執行框架；請依第 3、4 節的版面與行為用 Vue 3 重寫，做法見第 6 節。

---

## 1. 檔案結構

```
tsghb-orgmag/            下載包根目錄（repo 中為 tsghb-landing-page/）
├─ CLAUDE.md             本文件（repo 中位於 orgMag/CLAUDE.md）
├─ orgMag/index.html     機構管理者入口頁
└─ assets/
   ├─ js/
   │  ├─ dc-runtime.js                  樣板執行期（解析 <x-dc>、綁定 {{ }}）
   │  ├─ ds-bundle.js                   mPHR 設計系統元件
   │  ├─ react.production.min.js        React 18.3.1
   │  └─ react-dom.production.min.js    React-DOM 18.3.1
   ├─ img/
   │  ├─ logo-tsghb.png                 院徽（header 左上）
   │  ├─ orgmag-hero.png                Hero 右側插圖（去背 PNG）
   │  ├─ feature-user-list.png          平台使用者列表卡片（去背 PNG）
   │  └─ feature-report-export.png      報表匯出卡片（去背 PNG）
   └─ fonts/             noto-sans-tc-001…105.woff2（Noto Sans TC 子集切片）
```

**沒有 build 流程。** 直接用瀏覽器開 `orgMag/index.html` 即可，`file://` 也能正常運作
（字型、腳本、圖片都走相對路徑）。頁面位於子資料夾，資產路徑一律寫 `../assets/…`。

---

## 2. 原型技術結構（閱讀原型用，不需移植）

原型頁面本體是一份完整 HTML，內容放在 `<x-dc>` 元素中，由 `dc-runtime.js` 解析後以 React 渲染。

```html
<head>
  <script>window.__resources = { "<CDN 網址>": "../assets/js/<本地檔>" };</script>
  <script src="../assets/js/dc-runtime.js"></script>
</head>
<body>
  <x-dc>
    <helmet><style>…字型、版面樣式（lp-*）…</style></helmet>
    …版面，用 {{ 變數 }} 綁定…
  </x-dc>
  <script type="text/x-dc">
    class Component extends DCLogic {
      state = { … };
      renderVals() { …回傳給 {{ }} 使用的所有值… }
    }
  </script>
</body>
```

重點：

- **`window.__resources` 不可移除。** dc-runtime 靠這張表決定 React 從本地副本載入還是回頭連 unpkg，
  少了它離線就開不起來。
- **`{{ 變數 }}`** 只能綁 `renderVals()` 回傳物件的**頂層**鍵。
- **`sc-camel-on-click="{{ handler }}"`** 是事件綁定；`<sc-if>` / `<sc-for>` 是條件與迴圈。
- **`style-hover="…"`** 是 hover 狀態樣式；SVG 的 `viewBox` 要寫成 `sc-camel-view-box`。
- 版面樣式集中在 `<helmet>` 最後一個 `<style>`，以 `lp-*` class 命名；該段之前是 `__resources` 與 font-face，不需更動。
- 結構與 class 沿用醫師入口頁（`doctor/`），兩頁的 `lp-*` 規則大致相同，差異見下節。

---

## 3. 版面

| 區塊 | 內容 |
| --- | --- |
| Header（sticky） | 院徽 + 平台名稱「精神醫療快速應變平台」，無選單 |
| Hero | 左側藍色漸層底（`#2a6ac4 → #5b9be6`）白色大標「精神醫療／快速應變平台」，右側 `orgmag-hero.png`，插圖區底色 `#cfe0f7` |
| 功能卡片 | 兩張 `<article>`，置中、最大寬 880px：平台使用者列表、報表匯出；每張只有圖片、標題與「前往頁面」按鈕，**無說明文字** |
| Footer | 左：院名＋平台名；右：「本平台資料僅供授權之醫療、警消及社政人員使用」 |

### 3.1 功能卡片

| 卡片 | 主色（標題／按鈕） | 按鈕圖示 | 圖檔 |
| --- | --- | --- | --- |
| 平台使用者列表 | `#2f6fcf` | 使用者群組 | `feature-user-list.png` |
| 報表匯出 | `#5b93dc` | 下載 | `feature-report-export.png` |

按鈕樣式與醫師頁（`doctor/`）**完全一致**：`.lp-btn` 三段規則（基本、手機、電腦）逐字相同，
圓角 6px 的滿版按鈕（最大寬 260px、高 42px），圖示在文字左側，hover 時 `filter:brightness(.92)`。
改按鈕樣式時兩頁要一起改。

### 3.2 響應式

- **手機／平板**（`max-width:1023px`）：一般捲動頁。Hero 標題區與插圖上下堆疊；
  卡片單欄堆疊（最大寬 640px）並改橫式：圖片在左佔 42%、標題與按鈕在右；圖片固定 631:434 比例。
- **電腦**（`min-width:1024px` 且 `min-height:600px`）：整頁收在一個視窗高度內、**不需捲動**。
  `.lp-root` 固定 `100dvh`，Hero 高度 `clamp(200px,40vh,440px)`，標題區固定 40%（`flex:0 0 40%`）、插圖吃剩餘寬度；
  卡片區兩欄並排吃剩餘高度，卡片圖片 `height:100%` 隨可用空間縮放。

---

## 4. 行為

頁面沒有 `state`，`renderVals()` 回傳空物件；兩張卡片都是純連結，新分頁開啟（`target="_blank" rel="noopener"`）。

| 卡片 | 連結 |
| --- | --- |
| 平台使用者列表 | `https://mphr-tsghb.docloop.pro/organizations/org-admin-list?orgId=5&managerRoleId=11&page=3&c=tsghbperp` |
| 報表匯出 | `https://mphr-tsghb.docloop.pro/care/report/management?c=tsghbperp` |

與醫師頁不同，本頁沒有「功能開發中」彈窗；若日後新增尚未開發的卡片，可照 `doctor/index.html` 的 `openDev`／`goBack` 與彈窗 markup 加回。

---

## 5. 修改原型須知

- **每張卡片的連結寫兩次**（圖片與「前往頁面」按鈕），改網址時兩處都要改；HTML 內 `&` 要寫成 `&amp;`。
- **電腦版要維持一頁不捲動**：新增內容後請確認 1280×720 與 1440×900 都能完整顯示。
- 三張插圖為去背 PNG（1547×1016），取自設計稿；換圖時**同檔名覆蓋**即可，不需改 HTML。
- 改完請用瀏覽器實際開啟，並檢查 console 無錯誤。

---

## 6. 正式實作指引（Vue 3 + .NET Core 8）

原型只決定**長相與行為**；以下是把它搬進 Vue 3 前端、.NET Core 8 後端專案時的對應方式。
專案既有的慣例（目錄結構、路由、狀態管理、UI 元件庫、TypeScript 與否）優先，本節只是建議。

### 6.1 原型語法對照

| 原型（dc-runtime） | Vue 3 |
| --- | --- |
| `renderVals()` 回傳值 + `{{ 變數 }}` | `<script setup>` 的 `ref` / `computed`，模板一樣用 `{{ }}` |
| `sc-camel-on-click="{{ fn }}"` | `@click.prevent="fn"` |
| `<sc-if value="{{ x }}">` / `<sc-for>` | `v-if` / `v-for` |
| `style-hover="…"` | `<style scoped>` 裡的 `:hover` |
| `sc-camel-view-box` | 一般的 `viewBox` |
| `<helmet>` 內的 `lp-*` 規則 | 搬到元件的 `<style scoped>`，斷點與數值照抄 |

`window.__resources`、`dc-runtime.js`、`ds-bundle.js`、React 都**不需要**帶進正式專案。

### 6.2 元件拆分（建議）

```
OrgManagerLanding.vue       路由頁面
├─ LandingHeader.vue        院徽 + 平台名稱（各角色共用）
├─ LandingHero.vue          props: gradient, image, imageAlt（各角色共用）
├─ FeatureCard.vue ×2       props: title, color, image, icon, href（各角色共用）
└─ LandingFooter.vue        （各角色共用）
```

- 與醫師頁共用同一組元件，只換資料；兩張卡片用陣列資料 + `v-for` 產生。
- 卡片為純連結：`<a :href target="_blank" rel="noopener">`，圖片與按鈕連到同一個網址。
- 本頁不需要「功能開發中」彈窗；日後有未開發的卡片，沿用醫師頁的 `DevNoticeDialog.vue`。
- 按鈕樣式與醫師頁一致（第 3.1 節），`FeatureCard` 共用即可保證一致。

### 6.3 資產

- 插圖與院徽放進前端專案（`src/assets/` 以 `import` 引用，或放 `public/`），檔名沿用第 1 節。
- 字型：專案若已載入 Noto Sans TC 就沿用；否則可用原型 `<helmet>` 中的 `@font-face` 子集切片（`assets/fonts/`）。

### 6.4 後端（.NET Core 8）

- 本頁是純前端畫面，**不需要新增 API**。
- 外部連結（`mphr-tsghb.docloop.pro` 網域、`c=tsghbperp` 參數）不要寫死在元件裡，
  放在前端環境設定（Vite `.env` 的 `VITE_*`）或由後端 `appsettings.{Environment}.json` 經設定 API 提供，方便切換測試／正式環境。
- 平台使用者列表網址中的 `orgId=5`、`managerRoleId=11` 是原型寫死的值；正式實作時請確認是否應改由
  登入者所屬機構（後端驗證後的身分／claims）帶入，`page=3` 是否需要保留也請一併確認。
- 依登入角色決定顯示哪個 Landing page 時，角色以後端驗證後的身分為準，前端路由守衛只負責導向。

---

## 7. 部署（原型）

本原型放在 GitHub Pages repo（`advmeds-prototype`）底下，push 到 `main` 後自動部署，不經任何 build。

```
導覽頁       https://arthurhsuadvmeds.github.io/advmeds-prototype/tsghb-landing-page/
機構管理者頁 https://arthurhsuadvmeds.github.io/advmeds-prototype/tsghb-landing-page/orgMag/
```

更新後若看到舊畫面，請用強制重新整理（`Ctrl` + `F5`）排除瀏覽器快取。
