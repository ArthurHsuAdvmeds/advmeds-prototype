# 國衛院 — 肌少症評估量表（AWGS 2025）原型

一組兩頁的靜態原型：**填寫頁**輸入量測值並即時判定，**結果頁**只呈現民眾需要的評估摘要。
依 **AWGS 2025（亞洲肌少症工作小組）共識**計算門檻；結果頁另提供 `a=true/false` 展示參數。

---

## 1. 檔案結構

```
spec/nhri_ms/
├─ CLAUDE.md             本文件
├─ index.html            入口頁（導連 + 下載）
├─ write/index.html      填寫頁
├─ result/index.html     結果頁（民眾摘要）
├─ nhri-ms-spec.zip      完整素材與 Spec 下載檔
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
ZIP 內以 `nhri-ms/` 為根目錄，收錄上述檔案但不包含 ZIP 本身。

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
| `dialogOpen` | 僅填寫頁使用的判定標準彈窗開關 |

所有數值皆以**字串**存放，計算前用 `num()` 轉換，無法解析則為 `null`。
**`null` 一律代表「未填」，不參與一般判定，也不會標紅。**
結果頁的 `a` 是 URL query 參數，不在 `state` 中；`a=false` 會產生正常範圍的展示數值。

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

### 4.4 結果文字（依高醫臨床流程）

Write 與 Result 的結果區塊使用**相同標題與說明**，文字需逐字維持一致：

| 條件 | 色調 | 標題 | 說明 |
| --- | --- | --- | --- |
| 低肌肉量 + 低肌力 | 紅 | 確診為肌少症 | 建議掛老年醫學科門診接受進一步診治。 |
| 其餘（含只符合其中一項） | 綠 | 未有肌少症 | 恭喜你!請繼續維持良好的運動與營養習慣，享受健康人生! |

- 不顯示「可能肌少症」等中間結果。
- Write 在肌肉量（SMI 與 ASM/BMI 皆無值）或握力未填時，隱藏結果區塊（`hasResult`）；Result 有 `a=true/false` 時可強制展示指定結果。

### 4.5 結果標籤

**只有 Write** 在評估結果標題旁顯示下列標籤，依條件各自出現；**Result 不顯示標籤**：

| 標籤 | 條件 | 色調 |
| --- | --- | --- |
| 符合肌少症診斷 | 低肌肉量 + 低肌力 | 紅 |
| 肌力低下 | 低肌力 | 橙 |
| 肌肉質量不足 | 低肌肉量 | 橙 |

標籤文字與結果區塊的標題不同：紅色標籤仍為「符合肌少症診斷」，紅色結果標題為「確診為肌少症」。
臨床目前不執行「低肌肉量風險」（小腿圍）與「肥胖型肌少症風險」（腰腿比），**這兩個標籤不顯示**。
小腿圍與腰腿比仍保留在身體量測區塊，只影響欄位標紅，不是確診條件。

---

## 5. 顯示規則

### 5.1 身體量測欄位（僅 Write）

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

身高、體重沒有標準值，不參與標紅。BMI 與腰腿比為自動計算，不標必填星號。Result 不顯示身體量測表單或唯讀欄位。

### 5.2 評估結果指標磚

Write 三格並排：

| 指標磚 | 單位 | 說明文字 | 門檻文字 | 轉紅 |
| --- | --- | --- | --- | --- |
| 四肢 ASM 總量 | kg | 依輸入方式：`右上肢 + 左上肢 + 右下肢 + 左下肢`／`直接輸入`／`SMI × 身高²` | 無 | 永不轉紅（AWGS 對 ASM 總量無門檻） |
| SMI | kg/m² | `四肢 ASM 總量 ÷ 身高²` | `正常 ≥ massT` | `< massT` |
| ASM / BMI | ratio | — | `標準值 ≥ asmBmiT` | `< asmBmiT` |

Result 的三格改為民眾版摘要，依序如下：

| 顯示名稱 | 來源 | 格式 | 門檻文字 | 轉紅 |
| --- | --- | --- | --- | --- |
| 握力（手握力測試） | 握力 | 1 位小數，kg | `標準值 ≥ strT kg` | `< strT` |
| 指標一 | SMI | 2 位小數，kg/m² | `標準值 ≥ massT kg/m²` | `< massT` |
| 指標二 | ASM/BMI | 3 位小數，無單位列 | `標準值 ≥ asmBmiT` | `< asmBmiT` |

門檻在 Result 分別格式化為握力與 SMI 1 位、ASM/BMI 2 位小數。兩頁指標異常時整塊紅框、紅底、紅字；正常時維持中性色。Result 的磚不顯示 Write 的 ASM 來源說明。

Write 實作上由 `renderVals()` 的 `outOfRange` 表推導出 `lbl*` / `box*` / `boxEdit*` / `val*` 四組樣式物件，
再用 `...fieldStyles` 展開回傳 — **判定條件只寫一次**，不會出現標題紅了而框線沒紅的情況。
新增欄位時請沿用這個模式，不要另外複製一份判定式。

---

## 6. 兩頁的差異

| | `write/` | `result/` |
| --- | --- | --- |
| 頁面內容 | 身體量測與肌肉量表單 → 評估結果 | 只有民眾版評估結果摘要 |
| 輸入與操作 | `<input>`、`<select>`、送出、判定標準彈窗 | 無表單、送出按鈕或判定標準彈窗 |
| 結果標籤 | 依判定顯示三種標籤 | 不顯示標籤 |
| 結果指標 | ASM 總量、SMI、ASM/BMI | 握力、指標一（SMI）、指標二（ASM/BMI） |
| 肌肉量預帶值 | 留空（供填寫） | 已填入，構成完整肌少症判定 |
| 預覽參數 | 無 | `a=true` / `a=false` |

兩頁共用判定門檻與結果區塊文案。頁首與頁尾都使用 `HeaderFooter` 元件：頁首為 `user_default`，頁尾為 `regular`。Result 根容器採用直向 flex 與 `min-height: 100vh`，內容區 `flex: 1`；當內容不足一頁時，頁尾仍位於視窗最下方。

### 6.1 Result 的 `a` 查詢參數

Result 透過 `URLSearchParams(window.location.search).get("a")` 讀取參數：

| URL | 結果 | 三個指標磚 |
| --- | --- | --- |
| `?a=true` | 強制顯示「確診為肌少症」 | 仍依原始數值及門檻決定顏色 |
| `?a=false` | 強制顯示「未有肌少症」 | 調整展示數值到正常範圍，重新計算並顯示中性樣式 |
| 無參數或其他值 | 依量測值計算 | 依量測值及門檻決定顏色 |

`a=false` 有身高與 BMI 時，將 ASM 調至同時符合 SMI 與 ASM/BMI 門檻的值再加 `0.2 kg`，並重新計算兩個指標；握力調至至少門檻再加 `2 kg`。身高或 BMI 缺失時使用指標後備展示值。此參數只存在 Result，用於展示，不會改動 Write 輸入資料。

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
→ 結果標題：確診為肌少症
→ Result 三個指標磚均為紅色；Result 不顯示標籤或量測欄位
```

開啟 `result/?a=false` 時，此預帶個案的 Result 展示值為握力 `22.0 kg`、指標一 `5.78 kg/m²`、指標二 `0.667`；三磚均為中性樣式，標題為「未有肌少症」。`?a=true` 則維持原始三個異常數值與紅色樣式，顯示「確診為肌少症」。

---

## 8. 修改須知

- **不要寫死色碼**，一律使用 `:root` 的設計 token。
- **門檻數值只有一處來源**（`massT` / `asmBmiT` / `strT` / `calfT` / `waistCalfT`），
  灰字說明與紅色判定都必須由這些變數推導，不可各寫一份。
- **兩頁同步**：動到共用判定門檻或結果區塊文案時，請同步修改 `write/` 與 `result/`；兩頁指標磚內容與互動各自依上表維持。
- **判定標準彈窗**僅存在 Write。
- 修改本資料夾的文件或頁面後，重新打包 `nhri-ms-spec.zip`；ZIP 以 `nhri-ms/` 為根目錄，包含最新的 `CLAUDE.md`、入口頁、兩個頁面與 `assets/`，不包含 ZIP 自身。
- 修改頁面後請用瀏覽器實際開啟兩頁確認，並檢查 console 無錯誤；Result 也需檢查 `?a=true`、`?a=false` 與短頁面的頁尾位置。

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
