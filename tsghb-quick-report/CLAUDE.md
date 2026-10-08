# 三軍總醫院北投分院 — 精神醫療快速應變平台（快速通報頁面）原型

單頁靜態原型：頁面提供緊急醫療通報、第一類優化計畫通報、第二類優化計畫通報

版面以 `design/landing_page.png` 為準（左：手機 375px，右：桌機 1440×1024）。

---

## 1. 檔案結構

```
tsghb-quick-report/
├─ CLAUDE.md             本文件
├─ index.html            通報入口頁
├─ design/
│  └─ landing_page.png   設計圖（手機＋桌機）
└─ assets/
   ├─ js/
   │  ├─ dc-runtime.js                  樣板執行期（解析 <x-dc>、綁定 {{ }}）
   │  ├─ ds-bundle.js                   mPHR 設計系統元件
   │  ├─ react.production.min.js        React 18.3.1
   │  └─ react-dom.production.min.js    React-DOM 18.3.1
   ├─ img/
   │  ├─ logo-tsghb.png                 院徽（header 左上）
   │  ├─ hero.jpg                       主視覺右側插圖（含底色，左緣由 CSS 淡出）
   │  ├─ report-emergency.png           緊急醫療通報卡片
   │  ├─ report-plan1.png               第一類優化計畫通報卡片
   │  └─ report-plan2.png               第二類優化計畫通報卡片
   └─ fonts/             noto-sans-tc-001…105.woff2（Noto Sans TC 子集切片）
```

**沒有 build 流程。** 直接用瀏覽器開 `index.html` 即可，`file://` 也能正常運作（字型、腳本、圖片都走相對路徑）。

> `hero.jpg` 與三張 `report-*.png` **是從設計圖裁下來再放大 2 倍的暫代圖**，放大看會糊。
> 拿到原始插圖後用同檔名覆蓋即可：卡片插圖請維持 **220:200、白底**（人物置中），
> 主視覺維持約 **679:298**、右側對齊、左側留一小段純漸層底。
>
> 本頁由 `tsghb-doctor-landing-page/` 複製後改寫，字型切片與 `spec/nhri_ms/assets/fonts/` 逐檔相同。

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
    <helmet><style>…設計 token、字型、版面…</style></helmet>
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
- 顏色一律用 `:root` 的設計 token（`--red-500`、`--teal-300`…）。設計圖有、token 沒有的顏色與陰影
  集中宣告在版面 `<style>` 開頭的 `--lp-*`（頁面底色、Hero 漸層三個色點、卡片與浮層陰影）。

---

## 3. 版面

| 區塊 | 內容 |
| --- | --- |
| Header（sticky） | 院徽 + 平台名稱，右側漢堡選單鈕；按下後在下方展開通報選單 |
| Hero | 135° 漸層底（`--lp-hero-from → mid → to`）＋白色大標「精神醫療 快速應變平台」，右側 `hero.jpg` |
| 通報卡片 | 三張 `<article>`，由左到右：緊急醫療通報、第一類優化計畫通報、第二類優化計畫通報；每張有插圖、標題、一行說明與膠囊形「進行通報」按鈕 |
| 提示彈窗 | `dlgOpen` 為真時顯示，標題是被點的通報名稱 |

沒有 Footer（設計圖沒有）。

三張卡片的配色寫在 `.lp-tone-*`，卡片與選單項目共用：

| class | 標題 `--lp-title` | 按鈕 `--lp-btn` | 說明文字 |
| --- | --- | --- | --- |
| `.lp-tone-emergency` | `--red-500` | `--red-300` | 由警察、消防隊員、公衛護理師、社工進行通報 |
| `.lp-tone-plan1` | `--teal-500` | `--teal-300` | 網路轉介之疑似精神病個案 |
| `.lp-tone-plan2` | `--teal-700` | `--teal-500` | 疑似精神病人被護送就醫未住院者 |

### 響應式

版面樣式集中在 `<helmet>` 最後一個 `<style>`，以 `lp-*` class 命名。

- **手機／平板**（`max-width:1023px`，基礎樣式）：一般捲動頁。Header 56px、Hero 高 `clamp(144px,38.4vw,260px)`；
  卡片單欄（最寬 560px 置中）、橫式——插圖在左 38%，標題／說明／滿寬按鈕在右。
  `max-width:359px` 再縮小卡片留白與標題字級，讓 9 個字的標題維持一行。
- **電腦**（`min-width:1024px`）：內容區最寬 1140px、三欄直式卡片（設計圖為 348×400，間距 24px）。
  Header、Hero、卡片上方留白都用 `vh` 的 `clamp()`，在 1440×1024 時剛好等於設計圖的 92／300／80px。
- **電腦且視窗高度 ≥600px**：整頁收在一個視窗高度內、不需捲動。`.lp-root` 固定 `100dvh`，
  卡片高度不夠時只縮插圖區（`.lp-media` 的 `flex:0 1 200px`），標題、說明、按鈕不變。

Hero 插圖 `.lp-hero-art` 靠右、等高，寬度超過上限（手機 46%、電腦 56%）時從左側裁掉，
左緣用 `mask-image` 淡出接回底下的漸層，所以圖檔本身不需要去背。

---

## 4. 狀態與行為（`state`）

| 欄位 | 說明 |
| --- | --- |
| `menuOpen` | 漢堡選單開關 |
| `dlgOpen` | 提示彈窗開關 |
| `dlgTitle` | 彈窗標題（被點的通報名稱） |

- **通報網址**寫在 `Component` 的 `links = { emergency, plan1, plan2 }`，卡片按鈕與選單項目共用。
  - 留空（目前三個都是）：點擊開彈窗「此原型僅示意通報入口頁，通報表單尚未串接。」
  - 填入網址：該項目改為另開分頁前往，不再開彈窗。
- 漢堡選單目前只列三個通報入口（設計圖沒有畫展開後的內容）；點選單外側或按 `Esc` 關閉。
- 彈窗點遮罩、按「關閉」或 `Esc` 關閉。

---

## 5. 修改須知

- 設計圖的手機版與桌機版內容不一致：手機版是「緊急通報／優化計劃通報／處置追蹤」三張卡、Header 沒有選單鈕；
  桌機版是本頁採用的三張卡與漢堡選單。目前**內容以桌機版為準，手機只沿用手機版的橫式卡片版型**。
- 新增卡片：複製一張 `<article>`，加一組 `.lp-tone-*`、`links`／`names` 的鍵與對應的 `go…` handler；
  電腦版的 `.lp-grid` 寫死三欄，超過三張要一起調整。
- 電腦版要維持一頁不捲動：改動後請確認 1280×720 與 1440×1024 都能完整顯示。
- 改完請用瀏覽器實際開啟確認，並檢查 console 無錯誤。

---

## 6. 部署

本原型放在 GitHub Pages repo（`advmeds-prototype`）底下，push 到 `main` 後自動部署，不經任何 build。

```
https://arthurhsuadvmeds.github.io/advmeds-prototype/tsghb-quick-report/
```

更新後若看到舊畫面，請用強制重新整理（`Ctrl` + `F5`）排除瀏覽器快取。
