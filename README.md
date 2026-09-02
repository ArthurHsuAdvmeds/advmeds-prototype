# 描述
這是一個專門用來放置原型展示品（prototype）的專案，以 GitHub Pages 進行部署。

每個原型都是**可獨立開啟的靜態 HTML**，不經過任何編譯或打包流程，
把檔案放進資料夾、推上 `main`，網址就會自動生效。

> ⚠️ 請不要把 API Key、帳號密碼、內部網址或任何權限相關資訊放進 HTML 單檔中。
> 這個 repo 是公開的，所有檔案內容都會直接暴露在網頁原始碼裡。

# 網址

```
https://arthurhsuadvmeds.github.io/advmeds-prototype/{專案資料夾}/
https://arthurhsuadvmeds.github.io/advmeds-prototype/{專案資料夾}/{子資料夾}/
```

實際範例：

| 路徑 | 網址 |
| --- | --- |
| `tsghb-dashboard/index.html` | https://arthurhsuadvmeds.github.io/advmeds-prototype/tsghb-dashboard/ |

規則：

- 資料夾網址結尾請保留 `/`，該層必須有 `index.html` 才能正常開啟。
- 網址**區分大小寫**，資料夾請一律用小寫。
- 根目錄（`.../advmeds-prototype/`）沒有 `index.html`，直接開會是 404，請從子路徑進入。

# 建議專案架構

Repo 整體：

```
advmeds-prototype/
├─ .github/workflows/pages.yml   # 自動部署設定，請勿隨意修改
├─ README.md
├─ {專案資料夾A}/
└─ {專案資料夾B}/
```

單一原型（只有一頁時，只留 `index.html` 即可）：

```
{專案資料夾}/
├─ index.html
├─ {子資料夾1}/
│  └─ index.html
├─ {子資料夾2}/
│  └─ index.html
└─ {子資料夾3}/
   └─ index.html
```

命名建議：

- 資料夾用小寫英數 + 連字號，例如 `tsghb-dashboard`、`clinic-booking-flow`。
- 資料夾名稱建議以「客戶／院所 + 功能」命名，方便日後辨識。
- 同一個原型的不同版本請用子資料夾（例如 `v1/`、`v2/`），不要開新的專案資料夾。

# 使用方式

## 新增一個原型

1. 在根目錄開一個新的專案資料夾，例如 `my-prototype/`。
2. 把單檔 HTML 放進去，檔名必須是 `index.html`。
3. 本機用瀏覽器直接開檔確認畫面正常。
4. Commit 後推上 `main`：

   ```bash
   git add my-prototype
   git commit -m "Add my-prototype"
   git push origin main
   ```

5. 等 GitHub Actions 跑完（約 1 分鐘），開 `https://arthurhsuadvmeds.github.io/advmeds-prototype/my-prototype/` 確認。

## 更新既有原型

直接修改該資料夾底下的檔案，commit 後 push 到 `main` 即可。
Commit message 建議標示版本，例如 `V31`，方便對照客戶看過的版本。

## 多頁原型

在專案資料夾底下開子資料夾，每個子資料夾各放一個 `index.html`：

```html
<!-- my-prototype/index.html 內的連結 -->
<a href="./detail/">明細頁</a>
```

頁面之間請用**相對路徑**（`./detail/`），不要用 `/detail/`，
否則在 GitHub Pages 的子路徑下會連錯位置。

# 部署

部署由 [`.github/workflows/pages.yml`](.github/workflows/pages.yml) 自動處理：

- **觸發時機**：push 到 `main`，或在 Actions 頁面手動執行（`workflow_dispatch`）。
- **部署內容**：整個 repo 根目錄原樣上傳，**不做任何 build**，所以不能使用需要編譯的框架寫法（JSX、TypeScript、SCSS 等）。
- **連續 push**：設定了 `cancel-in-progress`，短時間內連續推送只會部署最後一次的結果。
- **查看狀態**：GitHub repo → Actions → `Deploy GitHub Pages`。綠燈才代表已上線。

# 注意事項

- **單檔優先**：CSS / JS 盡量內嵌在同一份 HTML，減少檔案散落與路徑問題。
- **外部套件走 CDN**：必須是 `https://`，例如目前 `tsghb-dashboard` 使用的
  `https://cdn.jsdelivr.net/npm/d3@7/...`。用 `http://` 會被瀏覽器擋掉。
- **不要放機密資訊**：API Key、Token、內網 IP、真實病患資料一律不可進 repo。
  展示用資料請自行造假資料（mock data）。
- **瀏覽器快取**：更新後看到舊畫面時，用強制重新整理（`Ctrl` + `F5`）再確認。
- **圖片等資產**：放在該原型資料夾底下，用相對路徑引用，不要引用其他專案資料夾的檔案。
