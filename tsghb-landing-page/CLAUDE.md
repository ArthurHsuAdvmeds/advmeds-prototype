# 三軍總醫院北投分院 — 精神醫療快速應變平台 Landing page 原型

三軍總醫院北投分院各角色的 Landing page 原型，共用同一份 `assets/`。之後所有 Landing page 都放在此資料夾，一個角色一個子資料夾。

**各頁的詳細規格寫在各自資料夾的 `CLAUDE.md`**，本文件只記共通規則、導覽頁與打包方式。

> **正式實作採 Vue 3（前端）+ .NET Core 8（後端）。** 這裡的 HTML 是給團隊對照的**參考原型**，
> 以 dc-runtime + React 快速做出畫面，不是正式程式碼；實作時依各頁 CLAUDE.md 第 3、4 節的版面與行為用 Vue 3 重寫，
> 語法對照、元件拆分與後端注意事項見各頁 CLAUDE.md 第 6 節。各角色頁的 Header、Hero、功能卡片、Footer 建議做成共用元件。

| 資料夾 | 內容 | 規格 | 下載包 |
| --- | --- | --- | --- |
| `doctor/` | 醫師入口頁：我的案件、案件查詢、管理儀錶板 | `doctor/CLAUDE.md` | `tsghb-doctor-spec.zip` |
| `orgMag/` | 機構管理者入口頁：平台使用者列表、報表匯出 | `orgMag/CLAUDE.md` | `tsghb-orgmag-spec.zip` |

---

## 1. 檔案結構

```
tsghb-landing-page/
├─ CLAUDE.md                 本文件（共通規則）
├─ index.html                導覽頁（純 HTML，不走 dc-runtime；導連 + 下載）
├─ tsghb-doctor-spec.zip     醫師入口頁下載包
├─ tsghb-orgmag-spec.zip     機構管理者入口頁下載包
├─ doctor/
│  ├─ CLAUDE.md              醫師入口頁規格
│  └─ index.html
├─ orgMag/
│  ├─ CLAUDE.md              機構管理者入口頁規格
│  └─ index.html
└─ assets/                   各頁共用
   ├─ js/        dc-runtime.js、ds-bundle.js、react / react-dom 18.3.1
   ├─ img/       logo-tsghb.png（共用）＋各頁插圖（見各頁 CLAUDE.md）
   └─ fonts/     noto-sans-tc-001…105.woff2（與 spec/nhri_ms/assets/fonts/ 逐檔相同）
```

**沒有 build 流程。** 直接用瀏覽器開各子資料夾的 `index.html` 即可，`file://` 也能正常運作。
各頁位於子資料夾，資產路徑一律寫 `../assets/…`；新增頁面時也照此寫法。

---

## 2. 共通規則

- 頁面採 dc-runtime 樣板（`<x-dc>` + `<script type="text/x-dc">`），**`window.__resources` 不可移除**，細節見各頁 CLAUDE.md 第 2 節。
- 版面樣式放在 `<helmet>` 最後一個 `<style>`，以 `lp-*` class 命名；斷點統一：
  手機／平板 `max-width:1023px`、電腦 `min-width:1024px and min-height:600px`（電腦版一頁不捲動）。
- Header、Footer 文字與「前往頁面」按鈕樣式（`.lp-btn`）各頁一致；需要「功能開發中」彈窗的頁面沿用 `doctor/` 的寫法。
- 改完請用瀏覽器實際開啟確認，並檢查 console 無錯誤。

---

## 3. 新增角色頁

1. 複製一個既有角色資料夾（例如 `orgMag/`），改名後修改版面與 logic。
2. 在該資料夾寫一份 `CLAUDE.md`（章節照 `orgMag/CLAUDE.md`），第 6 節要寫明該頁在 Vue 3 + .NET Core 8 下的元件拆分與後端注意事項。
3. 插圖放 `assets/img/`，檔名加角色前綴避免衝突。
4. 在 `index.html` 加一張導連卡片與一張下載卡片。
5. 依第 4 節產生下載包。

---

## 4. 下載包（zip）

每個角色一個 zip，放在本資料夾根目錄，由導覽頁提供下載。包內結構：

```
tsghb-<role>/
├─ CLAUDE.md             該頁規格（來源：<role>/CLAUDE.md）
├─ <role>/index.html
└─ assets/
   ├─ js/                全部
   ├─ img/               只含該頁用到的圖
   └─ fonts/             全部
```

**頁面、規格或插圖有改動時，要重新打包**，否則下載到的是舊版。
環境沒有 zip 指令，用 PowerShell（`System.IO.Compression`）產生，條目路徑必須用 `/`：

```powershell
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open("$PWD\tsghb-orgmag-spec.zip", 'Create')
[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, "$PWD\orgMag\CLAUDE.md", 'tsghb-orgmag/CLAUDE.md', 'Optimal')
# …依上方結構逐檔加入…
$zip.Dispose()
```

打包後解壓到暫存資料夾，直接開 `<role>/index.html` 確認離線可正常顯示。

---

## 5. 部署

本原型放在 GitHub Pages repo（`advmeds-prototype`）底下，push 到 `main` 後自動部署，不經任何 build。

```
導覽頁       https://arthurhsuadvmeds.github.io/advmeds-prototype/tsghb-landing-page/
醫師頁       https://arthurhsuadvmeds.github.io/advmeds-prototype/tsghb-landing-page/doctor/
機構管理者頁 https://arthurhsuadvmeds.github.io/advmeds-prototype/tsghb-landing-page/orgMag/
```

更新後若看到舊畫面，請用強制重新整理（`Ctrl` + `F5`）排除瀏覽器快取。
