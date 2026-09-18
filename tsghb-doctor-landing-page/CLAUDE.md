# 三軍總醫院北投分院 — 精神醫療快速應變平台（醫師入口頁）原型

單頁靜態原型：醫師登入後的入口頁，提供「我的案件」「案件查詢」「管理儀錶板」三張功能卡片。

---

## 1. 檔案結構

```
tsghb-doctor-landing-page/
├─ CLAUDE.md             本文件
├─ index.html            入口頁
└─ assets/
   ├─ js/
   │  ├─ dc-runtime.js                  樣板執行期（解析 <x-dc>、綁定 {{ }}）
   │  ├─ ds-bundle.js                   mPHR 設計系統元件
   │  ├─ react.production.min.js        React 18.3.1
   │  └─ react-dom.production.min.js    React-DOM 18.3.1
   ├─ img/
   │  ├─ logo-tsghb.png                 院徽（header 左上）
   │  ├─ hero.png                       主視覺右側插圖
   │  ├─ feature-case-list.png          我的案件卡片
   │  ├─ feature-dashboard.png          管理儀錶板卡片
   │  └─ feature-report-history.png     案件查詢卡片
   └─ fonts/             noto-sans-tc-001…105.woff2（Noto Sans TC 子集切片）
```

**沒有 build 流程。** 直接用瀏覽器開 `index.html` 即可，`file://` 也能正常運作（字型、腳本、圖片都走相對路徑）。

> 本頁原本是單檔 bundle（所有資產 base64 內嵌，開啟時由 JS 解壓再抽換 DOM，
> 因此會先看到一個 loading 畫面）。現已拆成上述結構，載入器完全移除。
> 若日後從原匯出工具重新匯出，會蓋回打包版本，需要再拆一次。
> 字型切片與 `spec/nhri_ms/assets/fonts/` 逐檔相同。

---

## 2. 技術結構

與 `spec/nhri_ms` 相同：內容放在 `<x-dc>` 元素中，由 `dc-runtime.js` 解析後以 React 渲染。

```html
<head>
  <script>window.__resources = { "<CDN 網址>": "./assets/js/<本地檔>" };</script>
  <script src="./assets/js/dc-runtime.js"></script>
</head>
<body>
  <x-dc>
    <helmet><style>…設計 token、字型…</style></helmet>
    …版面，用 {{ 變數 }} 綁定…
  </x-dc>
  <script type="text/x-dc">
    class Component extends DCLogic { … }
  </script>
</body>
```

- **`window.__resources` 不可移除。** dc-runtime 靠這張表決定 React 從本地副本載入還是回頭連 unpkg。
- **`{{ 變數 }}`** 只能綁 `renderVals()` 回傳物件的**頂層**鍵。
- **`sc-camel-on-click="{{ handler }}"`** 是事件綁定；`<sc-if>` / `<sc-for>` 是條件與迴圈。
- `style-hover="…"` 是 hover 狀態樣式。

---

## 3. 版面

| 區塊 | 內容 |
| --- | --- |
| Header（sticky） | 院徽 + 平台名稱（無選單） |
| Hero | 左側漸層底大標「精神醫療 快速應變平台」，右側 `hero.png` |
| 功能卡片 | 三張 `<article>`，由左到右：我的案件、案件查詢、管理儀錶板；每張只有圖片、標題與「前往頁面」按鈕（圓角 6px、左側圖示），無說明文字 |
| Footer | 院名 + 使用授權說明 |
| 開發中彈窗 | `devOpen` 為真時顯示，倒數 3 秒後自動返回上一頁 |

三張卡片的主色：我的案件 `#19aad1`、案件查詢 `#0c6496`、管理儀錶板 `#1285b3`。

### 響應式

版面樣式集中在 `<helmet>` 最後一個 `<style>`，以 `lp-*` class 命名。

- **手機／平板**（`max-width:1023px`）：一般捲動頁，卡片單欄堆疊、改橫式（圖片左 42%、標題與按鈕在右），圖片固定 631:434 比例。
- **電腦**（`min-width:1024px` 且 `min-height:600px`）：整頁收在一個視窗高度內、不需捲動
  （參考正式站 `rapid-response-platform`）。`.lp-root` 固定 `100dvh`，Hero 高度 `clamp(200px,34vh,380px)`，
  卡片區吃剩餘高度，卡片圖片 `height:100%` 隨可用空間縮放。

---

## 4. 狀態與行為（`state`）

| 欄位 | 說明 |
| --- | --- |
| `devOpen` | 「功能開發中」彈窗開關 |
| `count` | 彈窗倒數秒數（從 3 開始） |

- **我的案件** → 新分頁開 `https://mphr-tsghb.docloop.pro/patient-groups/list?`
- **案件查詢** → 尚未開發，呼叫 `openDev` 開彈窗；倒數結束或按按鈕觸發 `goBack`（`history.back()`）
- **管理儀錶板** → 新分頁開 `https://mphr-tsghb.docloop.pro/data-dashboard?c=tsghbperp`

---

## 5. 修改須知

- 每張卡片的連結在圖片與「前往頁面」按鈕各寫一次，改網址時兩處都要改。
- 電腦版要維持一頁不捲動：新增內容時請確認 1280×720 仍能完整顯示。
- 圖檔名沿用舊名（`feature-case-list.png` = 我的案件、`feature-report-history.png` = 案件查詢）。
- 改完請用瀏覽器實際開啟確認，並檢查 console 無錯誤。

---

## 6. 部署

本原型放在 GitHub Pages repo（`advmeds-prototype`）底下，push 到 `main` 後自動部署，不經任何 build。

```
https://arthurhsuadvmeds.github.io/advmeds-prototype/tsghb-doctor-landing-page/
```

更新後若看到舊畫面，請用強制重新整理（`Ctrl` + `F5`）排除瀏覽器快取。
