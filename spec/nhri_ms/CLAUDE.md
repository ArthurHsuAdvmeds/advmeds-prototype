# 國衛院 — 肌少症評估量表（AWGS 2025）原型

一組兩頁的靜態原型：**填寫頁**輸入量測值並即時判定，**結果頁**以唯讀方式呈現一筆已完成的評估。
依 **AWGS 2025（亞洲肌少症工作小組）共識**實作判定邏輯。

---

## 1. 檔案結構

```
spec/nhri_ms/
├─ CLAUDE.md             本文件
├─ index.html            入口頁（導連 + 下載）
├─ write/index.html      填寫頁
├─ result/index.html     結果頁（唯讀）
└─ assets/               兩頁共用
   ├─ js/
   │  ├─ dc-runtime.js                  樣板執行期（解析 <x-dc>、綁定 {{ }}）
   │  ├─ ds-bundle.js                   mPHR 設計系統元件（Header/Footer 等）
   │  ├─ react.production.min.js        React 18.3.1
   │  └─ react-dom.production.min.js    React-DOM 18.3.1
   └─ fonts/             noto-sans-tc-001…105.woff2（Noto Sans TC 子集切片）
```

**沒有 build 流程。** 直接用瀏覽器開 `write/index.html` 或 `result/index.html` 即可，
`file://` 也能正常運作（字型、腳本都走相對路徑）。

> 這兩頁原本是單檔 bundle（把所有資產 base64 內嵌，開啟時由 JS 解壓再抽換 DOM，
> 因此會先看到一個 loading 畫面）。現已拆成上述結構，載入器完全移除。
> 若日後從原匯出工具重新匯出，會蓋回打包版本，需要再拆一次。

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
    <helmet><style>…設計 token 與版面樣式…</style></helmet>
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

- **`window.__resources` 不可移除。** dc-runtime 的 `cdnScriptFor()` 會查這張表，
  決定 React 從本地副本載入還是回頭連 unpkg。少了它離線就開不起來。
- **`{{ 變數 }}`** 只能綁 `renderVals()` 回傳物件的**頂層**鍵。
  `style="{{ 樣式物件 }}"` 會把物件序列化成 CSS，這是全頁統一的動態樣式做法。
- **`sc-camel-on-change="{{ handler }}"`** 是事件綁定；`<sc-if>` / `<sc-for>` 是條件與迴圈。
- 設計 token 全部定義在 `<helmet>` 的 `:root`（`--green-300`、`--red-500`、`--grey-900`…），
  **請一律使用 token，不要寫死色碼。**

---

## 3. 資料模型（`state`）

| 欄位 | 說明 |
| --- | --- |
| `name` / `pid` / `sex` / `age` | 姓名、身分證字號、`"male"`\|`"female"`、年齡 |
| `height` / `weight` / `waist` | 身高 cm、體重 kg、腰圍 cm |
| `calfL` / `calfR` / `grip` | 左右小腿圍 cm、握力（左右較佳值）kg |
| `asmMode` | 肌肉量輸入方式：`"asm"` 四肢分別輸入 \| `"mass"` ASM 總和 \| `"smi"` 直接輸入 SMI |
| `asmRU` / `asmLU` / `asmRL` / `asmLL` | 四肢 ASM（`asmMode === "asm"` 時使用） |
| `asmDirect` / `smiDirect` | ASM 總和 / SMI 直接輸入值 |
| `dialogOpen` | 判定標準彈窗開關 |

所有數值皆以**字串**存放，計算前用 `num()` 轉換，無法解析則為 `null`。
**`null` 一律代表「未填」，不參與判定，也不會標紅。**

---

## 4. 判定邏輯（AWGS 2025）

### 4.1 衍生值

```
BMI      = 體重 ÷ 身高²(m)
ASM      = 四肢加總，或由 SMI × 身高² 反推
SMI      = ASM ÷ 身高²(m)
ASM/BMI  = ASM ÷ BMI
腰腿比    = 腰圍 ÷ 較粗側小腿圍
```

### 4.2 門檻（依性別與年齡分組）

年齡分組：`≥65 歲` 為高齡組，其餘為 `50–64 歲` 組（未滿 50 歲以 50–64 歲門檻作為參考）。

| 指標 | 變數 | 男 50–64 | 男 ≥65 | 女 50–64 | 女 ≥65 |
| --- | --- | --- | --- | --- | --- |
| SMI | `massT` | 7.6 | 7.0 | 5.7 | 5.7 |
| ASM/BMI | `asmBmiT` | 0.90 | 0.83 | 0.63 | 0.57 |
| 握力 | `strT` | 34 | 28 | 20 | 18 |
| 小腿圍 | `calfT` | 34 | 34 | 33 | 33 |
| 腰腿比 | `waistCalfT` | 2.6 | 2.6 | 2.4 | 2.4 |

### 4.3 確診

```
低肌肉量 = SMI < massT  或  ASM/BMI < asmBmiT
低肌力   = 握力 < strT
肌少症   = 低肌肉量 且 低肌力
```

橫幅四種狀態：

| 條件 | 色調 | 標題 |
| --- | --- | --- |
| 低肌肉量 + 低肌力 | 紅 | 依目前資料符合 AWGS 2025 肌少症 |
| 僅符合其中一項 | 橙 | 可能肌少症（尚未符合完整判定） |
| 肌肉量或握力未填 | 灰 | 尚待輸入完整數值 |
| 皆未達門檻 | 綠 | 目前未符合肌少症判定條件 |

小腿圍與腰腿比是**篩檢與風險標註工具，不是確診條件**，只影響標籤與欄位標色。

---

## 5. 顯示規則

### 5.1 身體量測欄位

每個有標準值的欄位下方顯示灰字門檻（依性別／年齡即時計算），超標時**標題、框線、數值一起轉紅**：

| 欄位 | 超標條件 |
| --- | --- |
| BMI | `< 18.5` 或 `≥ 24` |
| 腰圍 | 男 `≥ 90`、女 `≥ 80` cm |
| 握力 | `< strT` |
| 左／右小腿圍 | `< calfT`（左右獨立判斷） |
| 腰腿比 | `> waistCalfT` |

底色分兩種：

- **填寫欄**（腰圍、握力、左右小腿圍）→ 維持白底，只換紅框、紅字。
- **唯讀欄**（BMI、腰腿比）→ 紅底 `--red-50` + 紅框 + 紅字。

身高、體重沒有標準值，不參與標紅。BMI 與腰腿比為自動計算，不標必填星號。

### 5.2 評估結果指標磚

SMI 與 ASM/BMI 兩格並排，各自顯示門檻文字，低於門檻時整塊轉紅（紅框 + 紅底 + 紅字）。
四肢肌肉量（ASM）總值不另外顯示 — AWGS 2025 對 ASM 本身沒有門檻，判定只看 SMI 與 ASM/BMI。

實作上由 `renderVals()` 的 `outOfRange` 表推導出 `lbl*` / `box*` / `boxEdit*` / `val*` 四組樣式物件，
再用 `...fieldStyles` 展開回傳 — **判定條件只寫一次**，不會出現標題紅了而框線沒紅的情況。
新增欄位時請沿用這個模式，不要另外複製一份判定式。

---

## 6. 兩頁的差異

| | `write/` | `result/` |
| --- | --- | --- |
| 輸入元件 | `<input>`、`<select>` | 全部改為唯讀灰底欄位 |
| 區塊順序 | 表單 → 評估結果 | **評估結果 → 表單** |
| 必填星號 | 有 | 無 |
| 送出／清除按鈕 | 送出 | 無 |
| 事件 handler | `upd_*`、`submit` | 已移除 |
| 肌肉量預帶值 | 留空（供填寫） | 已填入，構成完整肌少症判定 |

**判定邏輯、門檻、樣式產生方式兩頁完全相同**，修改時請同步套用，
否則同一筆資料會在兩頁呈現不同結果。

---

## 7. 預帶資料

兩頁共用同一位虛構個案（**非真實病患資料**）：

```
林淑貞 / A238471905 / 女 / 63 歲
身高 158 cm、體重 54 kg、腰圍 78 cm
小腿圍 左 32.5 / 右 32 cm、握力 18.5 kg
四肢 ASM 1.8 / 1.7 / 5.1 / 5.0 kg（僅 result 頁）
```

result 頁的計算結果：

```
BMI 21.6、ASM 13.60 kg
SMI 5.45      < 5.7   → 低肌肉量
ASM/BMI 0.629 < 0.63  → 低肌肉量（另一指標亦達標）
握力 18.5     < 20     → 低肌力
→ 判定：符合 AWGS 2025 肌少症
紅字欄位：握力、左小腿圍、右小腿圍
```

---

## 8. 修改須知

- **不要寫死色碼**，一律使用 `:root` 的設計 token。
- **門檻數值只有一處來源**（`massT` / `asmBmiT` / `strT` / `calfT` / `waistCalfT`），
  灰字說明與紅色判定都必須由這些變數推導，不可各寫一份。
- **兩頁同步**：動到判定邏輯、門檻或指標磚時，`write/` 與 `result/` 都要改。
- **判定標準彈窗**的文字內容兩頁必須逐字相同。
- 改完請用瀏覽器實際開啟兩頁確認，並檢查 console 無錯誤。

---

## 9. 部署

本原型放在 GitHub Pages repo（`advmeds-prototype`）底下，push 到 `main` 後自動部署，
不經任何 build。頁面之間請使用**相對路徑**（`./write/`），不要用絕對路徑。

```
入口   https://arthurhsuadvmeds.github.io/advmeds-prototype/spec/nhri_ms/
填寫頁 https://arthurhsuadvmeds.github.io/advmeds-prototype/spec/nhri_ms/write/
結果頁 https://arthurhsuadvmeds.github.io/advmeds-prototype/spec/nhri_ms/result/
```

更新後若看到舊畫面，請用強制重新整理（`Ctrl` + `F5`）排除瀏覽器快取。
