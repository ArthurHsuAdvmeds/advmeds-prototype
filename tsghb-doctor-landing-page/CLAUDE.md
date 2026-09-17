# 三軍總醫院北投分院 — 精神醫療快速應變平台（醫師入口頁）原型

單頁靜態原型：醫師登入後的入口頁，提供「個案清單」「數據儀表板」「通報歷史紀錄」三張功能卡片。

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
   │  ├─ feature-case-list.png          個案清單卡片
   │  ├─ feature-dashboard.png          數據儀表板卡片
   │  └─ feature-report-history.png     通報歷史紀錄卡片
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
| Header（sticky） | 院徽 + 平台名稱，右側漢堡選單；展開後列出三個功能連結（`<sc-for list="{{ items }}">`） |
| Hero | 左側漸層底大標「精神醫療 快速應變平台」，右側 `hero.png` |
| 功能卡片 | 三張 `<article>`，`auto-fit` grid，窄螢幕自動堆疊 |
| Footer | 院名 + 使用授權說明 |
| 開發中彈窗 | `devOpen` 為真時顯示，倒數 3 秒後自動返回上一頁 |

三張卡片的主色：個案清單 `#19aad1`、數據儀表板 `#1285b3`、通報歷史紀錄 `#0c6496`。

---

## 4. 狀態與行為（`state`）

| 欄位 | 說明 |
| --- | --- |
| `menuOpen` | 漢堡選單展開 |
| `devOpen` | 「功能開發中」彈窗開關 |
| `count` | 彈窗倒數秒數（從 3 開始） |

- **個案清單** → 新分頁開 `https://mphr-tsghb.docloop.pro/patient-groups/list?`
- **數據儀表板** → 新分頁開 `https://mphr-tsghb.docloop.pro/data-dashboard?c=tsghbperp`
- **通報歷史紀錄** → 尚未開發，呼叫 `openDev` 開彈窗；倒數結束或按按鈕觸發 `goBack`（`history.back()`）

---

## 5. 修改須知

- **連結有兩處來源**：卡片的 `href` 寫在 `<x-dc>` 版面中，漢堡選單的連結寫在 `renderVals()` 的 `items`。
  改網址或標題時兩處都要改。
- `items` 內的 `img` / `desc` 欄位目前沒有被版面使用（卡片圖片直接寫在 HTML），屬於殘留欄位。
- 三張卡片的描述文字目前相同（皆為「由警察、消防隊員、公衛護理師、社工進行通報」），屬於待補的佔位文案。
- 改完請用瀏覽器實際開啟確認，並檢查 console 無錯誤。

---

## 6. 部署

本原型放在 GitHub Pages repo（`advmeds-prototype`）底下，push 到 `main` 後自動部署，不經任何 build。

```
https://arthurhsuadvmeds.github.io/advmeds-prototype/tsghb-doctor-landing-page/
```

更新後若看到舊畫面，請用強制重新整理（`Ctrl` + `F5`）排除瀏覽器快取。
