# 三軍總醫院北投分院 — 精神醫療快速應變平台｜醫師入口頁原型

醫師登入後的入口頁（Landing page）：Hero 大標 + 三張功能卡片（**我的案件**、**案件查詢**、**管理儀錶板**），
點卡片導向對應功能，尚未開發的功能以「功能開發中」彈窗提示。

> **正式實作採 Vue 3 + .NET Core 8。** 本資料夾的 HTML 是視覺與互動的**參考原型**（dc-runtime + React），
> 不要移植它的執行框架；請依第 3、4 節的版面與行為用 Vue 3 重寫，做法見第 6 節。

---

## 1. 檔案結構

```
tsghb-doctor/            下載包根目錄（repo 中為 tsghb-landing-page/）
├─ CLAUDE.md             本文件（repo 中位於 doctor/CLAUDE.md）
├─ doctor/index.html     醫師入口頁
└─ assets/
   ├─ js/
   │  ├─ dc-runtime.js                  樣板執行期（解析 <x-dc>、綁定 {{ }}）
   │  ├─ ds-bundle.js                   mPHR 設計系統元件
   │  ├─ react.production.min.js        React 18.3.1
   │  └─ react-dom.production.min.js    React-DOM 18.3.1
   ├─ img/
   │  ├─ logo-tsghb.png                 院徽（header 左上）
   │  ├─ hero.png                       Hero 右側插圖
   │  ├─ feature-case-list.png          我的案件卡片
   │  ├─ feature-report-history.png     案件查詢卡片
   │  └─ feature-dashboard.png          管理儀錶板卡片
   └─ fonts/             noto-sans-tc-001…105.woff2（Noto Sans TC 子集切片）
```

**沒有 build 流程。** 直接用瀏覽器開 `doctor/index.html` 即可，`file://` 也能正常運作
（字型、腳本、圖片都走相對路徑）。頁面位於子資料夾，資產路徑一律寫 `../assets/…`。

> 本頁原本是單檔 bundle（所有資產 base64 內嵌，開啟時由 JS 解壓再抽換 DOM，
> 因此會先看到一個 loading 畫面）。現已拆成上述結構，載入器完全移除。
> 若日後從原匯出工具重新匯出，會蓋回打包版本，需要再拆一次。

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

---

## 3. 版面

| 區塊 | 內容 |
| --- | --- |
| Header（sticky） | 院徽 + 平台名稱「精神醫療快速應變平台」，無選單 |
| Hero | 左側漸層底（`#19aad1 → #8fd7ea`）白色大標「精神醫療／快速應變平台」，右側 `hero.png` |
| 功能卡片 | 三張 `<article>`，由左到右：我的案件、案件查詢、管理儀錶板；每張只有圖片、標題與「前往頁面」按鈕，**無說明文字** |
| Footer | 左：院名＋平台名；右：「本平台資料僅供授權之醫療、警消及社政人員使用」 |
| 開發中彈窗 | `devOpen` 為真時顯示，倒數 3 秒後自動返回上一頁 |

### 3.1 功能卡片

| 卡片 | 主色（標題／按鈕／圖片底色） | 按鈕圖示 | 圖檔 |
| --- | --- | --- | --- |
| 我的案件 | `#19aad1` | 剪貼簿 | `feature-case-list.png` |
| 案件查詢 | `#0c6496` | 放大鏡 | `feature-report-history.png` |
| 管理儀錶板 | `#1285b3` | 長條圖 | `feature-dashboard.png` |

按鈕為圓角 6px 的滿版按鈕（最大寬 260px），圖示在文字左側，hover 時 `filter:brightness(.92)`。

### 3.2 響應式

- **手機／平板**（`max-width:1023px`）：一般捲動頁。卡片單欄堆疊（最大寬 640px）並改橫式：
  圖片在左佔 42%、標題與按鈕在右；圖片固定 631:434 比例。
- **電腦**（`min-width:1024px` 且 `min-height:600px`）：整頁收在一個視窗高度內、**不需捲動**。
  `.lp-root` 固定 `100dvh`，Hero 高度 `clamp(200px,34vh,380px)`，卡片區三欄並排吃剩餘高度，
  卡片圖片 `height:100%` 隨可用空間縮放。

---

## 4. 狀態與行為（`state`）

| 欄位 | 說明 |
| --- | --- |
| `devOpen` | 「功能開發中」彈窗開關 |
| `count` | 彈窗倒數秒數（從 3 開始） |

| 卡片 | 行為 |
| --- | --- |
| 我的案件 | 新分頁開 `https://mphr-tsghb.docloop.pro/patient-groups/list?` |
| 案件查詢 | 尚未開發：`openDev` 開彈窗，文字「案件查詢尚在開發中，N 秒後自動返回上一頁。」 |
| 管理儀錶板 | 新分頁開 `https://mphr-tsghb.docloop.pro/data-dashboard?c=tsghbperp` |

彈窗倒數到 0 或按「立即返回上一頁」時呼叫 `goBack`：關閉彈窗並 `history.back()`（沒有上一頁時只關閉彈窗）。

---

## 5. 修改原型須知

- **每張卡片的連結寫兩次**（圖片與「前往頁面」按鈕），改網址或改成彈窗時兩處都要改。
- 案件查詢上線後：把兩處 `sc-camel-on-click="{{ openDev }}"` 換成 `href="…" target="_blank" rel="noopener"`，
  寫法照「我的案件」。
- **電腦版要維持一頁不捲動**：新增內容後請確認 1280×720 與 1440×900 都能完整顯示。
- 圖檔名沿用舊名（`feature-case-list.png` = 我的案件、`feature-report-history.png` = 案件查詢），
  換圖時**同檔名覆蓋**、維持 631×434 比例即可，不需改 HTML。
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
| `componentWillUnmount` | `onBeforeUnmount` |
| `history.back()` | `router.back()`（Vue Router） |

`window.__resources`、`dc-runtime.js`、`ds-bundle.js`、React 都**不需要**帶進正式專案。

### 6.2 元件拆分（建議）

```
DoctorLanding.vue           路由頁面
├─ LandingHeader.vue        院徽 + 平台名稱（各角色共用）
├─ LandingHero.vue          props: gradient, image, imageAlt（各角色共用）
├─ FeatureCard.vue ×3       props: title, color, image, icon, href?（各角色共用）
├─ LandingFooter.vue        （各角色共用）
└─ DevNoticeDialog.vue      「功能開發中」彈窗
```

- 三張卡片用陣列資料 + `v-for` 產生；`FeatureCard` 有 `href` 時渲染 `<a target="_blank" rel="noopener">`，
  沒有時 `emit('click')`，由頁面決定開彈窗。圖片與按鈕要連到同一個目標（原型中兩處都可點）。
- 卡片主色（標題／按鈕／圖片底色）以 prop 傳入，對照第 3.1 節。

彈窗倒數邏輯（對應原型的 `openDev` / `goBack`）：

```ts
const router = useRouter()
const devOpen = ref(false)
const count = ref(3)
let timer: number | undefined

function openDev() {
  devOpen.value = true
  count.value = 3
  clearInterval(timer)
  timer = window.setInterval(() => {
    if (--count.value <= 0) goBack()
  }, 1000)
}

function goBack() {
  clearInterval(timer)
  devOpen.value = false
  if (window.history.length > 1) router.back()
}

onBeforeUnmount(() => clearInterval(timer))
```

### 6.3 資產

- 插圖與院徽放進前端專案（`src/assets/` 以 `import` 引用，或放 `public/`），檔名沿用第 1 節。
- 字型：專案若已載入 Noto Sans TC 就沿用；否則可用原型 `<helmet>` 中的 `@font-face` 子集切片（`assets/fonts/`）。

### 6.4 後端（.NET Core 8）

- 本頁是純前端畫面，**不需要新增 API**。
- 外部連結（`mphr-tsghb.docloop.pro` 網域、`c=tsghbperp` 參數）不要寫死在元件裡，
  放在前端環境設定（Vite `.env` 的 `VITE_*`）或由後端 `appsettings.{Environment}.json` 經設定 API 提供，方便切換測試／正式環境。
- 依登入角色決定顯示哪個 Landing page 時，角色以後端驗證後的身分（claims）為準，前端路由守衛只負責導向。

---

## 7. 部署（原型）

本原型放在 GitHub Pages repo（`advmeds-prototype`）底下，push 到 `main` 後自動部署，不經任何 build。

```
導覽頁 https://arthurhsuadvmeds.github.io/advmeds-prototype/tsghb-landing-page/
醫師頁 https://arthurhsuadvmeds.github.io/advmeds-prototype/tsghb-landing-page/doctor/
```

更新後若看到舊畫面，請用強制重新整理（`Ctrl` + `F5`）排除瀏覽器快取。
