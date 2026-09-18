# 三軍總醫院北投分院 — 精神醫療快速應變平台｜機構管理者入口頁原型

機構管理者登入後的入口頁（Landing page）：Hero 大標 + 兩張功能卡片（**平台使用者列表**、**報表匯出**），
目前兩張卡片都以「功能開發中」彈窗提示。

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

## 2. 技術結構

頁面本體是一份完整 HTML，內容放在 `<x-dc>` 元素中，由 `dc-runtime.js` 解析後以 React 渲染。

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
| 開發中彈窗 | `devOpen` 為真時顯示，文字帶入功能名稱，倒數 3 秒後自動返回上一頁 |

### 3.1 功能卡片

| 卡片 | 標題色 | 按鈕色 | 圖檔 |
| --- | --- | --- | --- |
| 平台使用者列表 | `#2f6fcf` | `#2f6fcf` | `feature-user-list.png` |
| 報表匯出 | `#5b93dc` | `#8db6ec`（較淺，依設計稿） | `feature-report-export.png` |

按鈕為**膠囊形**（`border-radius:100px`、高 34px），文字「前往頁面」後接 `›` 箭頭 SVG；
與醫師頁的方角、圖示在左的按鈕不同，是依設計稿刻意區分。

### 3.2 響應式

- **手機／平板**（`max-width:1023px`）：一般捲動頁。Hero 標題區與插圖上下堆疊；
  卡片單欄堆疊（最大寬 640px）並改橫式：圖片在左佔 42%、標題與按鈕在右；圖片固定 631:434 比例。
- **電腦**（`min-width:1024px` 且 `min-height:600px`）：整頁收在一個視窗高度內、**不需捲動**。
  `.lp-root` 固定 `100dvh`，Hero 高度 `clamp(200px,40vh,440px)`，標題區固定 40%（`flex:0 0 40%`）、插圖吃剩餘寬度；
  卡片區兩欄並排吃剩餘高度，卡片圖片 `height:100%` 隨可用空間縮放。

---

## 4. 狀態與行為（`state`）

| 欄位 | 說明 |
| --- | --- |
| `devOpen` | 「功能開發中」彈窗開關 |
| `devName` | 彈窗中顯示的功能名稱 |
| `count` | 彈窗倒數秒數（從 3 開始） |

| 卡片 | handler | 目前行為 |
| --- | --- | --- |
| 平台使用者列表 | `openUserList` | 開彈窗：「平台使用者列表尚在開發中，N 秒後自動返回上一頁。」 |
| 報表匯出 | `openReportExport` | 開彈窗：「報表匯出尚在開發中，N 秒後自動返回上一頁。」 |

兩個 handler 都呼叫共用的 `openDev(e, name)`；彈窗文字由 `renderVals()` 的 `devText` 組出。
倒數到 0 或按「立即返回上一頁」時呼叫 `goBack`：關閉彈窗並 `history.back()`（沒有上一頁時只關閉彈窗）。

設計稿中兩張卡片已標註正式網址，**尚未套用**，上線時改用：

```
平台使用者列表 https://mphr-tsghb.docloop.pro/organizations/org-admin-list?orgId=5&c=tsghbperp
報表匯出       https://mphr-tsghb.docloop.pro/care/report/management?c=tsghbperp
```

---

## 5. 修改須知

- **每張卡片的連結寫兩次**（圖片與「前往頁面」按鈕），改網址時兩處都要改。
  改成外連時把 `sc-camel-on-click="{{ openUserList }}"` 換成 `href="…" target="_blank" rel="noopener"`
  （HTML 內 `&` 要寫成 `&amp;`）；若兩張都改成外連，`openDev` 與彈窗可一併移除。
- **電腦版要維持一頁不捲動**：新增內容後請確認 1280×720 與 1440×900 都能完整顯示。
- 三張插圖為去背 PNG（1547×1016），取自設計稿；換圖時**同檔名覆蓋**即可，不需改 HTML。
- 改完請用瀏覽器實際開啟，並檢查 console 無錯誤。

---

## 6. 部署

本原型放在 GitHub Pages repo（`advmeds-prototype`）底下，push 到 `main` 後自動部署，不經任何 build。

```
導覽頁       https://arthurhsuadvmeds.github.io/advmeds-prototype/tsghb-landing-page/
機構管理者頁 https://arthurhsuadvmeds.github.io/advmeds-prototype/tsghb-landing-page/orgMag/
```

更新後若看到舊畫面，請用強制重新整理（`Ctrl` + `F5`）排除瀏覽器快取。
