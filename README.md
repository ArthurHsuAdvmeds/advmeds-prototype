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
| `flow-chart/index.html` | https://arthurhsuadvmeds.github.io/advmeds-prototype/flow-chart/ |
| `flow-chart/edit/index.html` | https://arthurhsuadvmeds.github.io/advmeds-prototype/flow-chart/edit/ |

規則：

- 資料夾網址結尾請保留 `/`，該層必須有 `index.html` 才能正常開啟。
- 網址**區分大小寫**，資料夾請一律用小寫。
- 根目錄（`.../advmeds-prototype/`）是所有原型的總覽頁（`index.html`），新增原型後請記得在這頁補一張卡片。

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

## 從零開始設定 GitHub Actions 部署

以下是從一個全新 repo 到網址可以開啟的完整步驟。
要另外建立一個類似的原型 repo，或這個 repo 的部署設定壞掉需要重建時，照著做即可。

### 1. 建立 repo

1. GitHub 右上角 `+` → **New repository**。
2. 填入 Repository name（例如 `advmeds-prototype`），這個名稱會變成網址的一部分：
   `https://{帳號}.github.io/{repo 名稱}/`。
3. Visibility 選 **Public**。
   免費方案只有 Public repo 能開 GitHub Pages；Private repo 需要付費方案（Pro / Team / Enterprise）。
4. 按 **Create repository**。

本機若已有資料夾，把它接到遠端：

```bash
git init
git branch -M main
git remote add origin https://github.com/{帳號}/{repo 名稱}.git
```

### 2. 把 Pages 的來源改成 GitHub Actions

這一步**一定要做**，否則 workflow 會在 `Setup Pages` / `Deploy to GitHub Pages` 失敗。

1. 進 repo → **Settings** → 左側選單 **Pages**。
2. **Build and deployment** → **Source** 選 **GitHub Actions**（不是 `Deploy from a branch`）。
3. 選完會自動儲存，不需要按其他按鈕。

### 3. 確認 Actions 權限

1. Settings → **Actions** → **General**。
2. **Actions permissions** 選 **Allow all actions and reusable workflows**
   （或至少允許 GitHub 官方的 `actions/*`）。
3. **Workflow permissions** 維持預設即可；需要的權限已在 workflow 檔裡用 `permissions:` 指定。

### 4. 新增 workflow 檔

在 repo 根目錄建立 `.github/workflows/pages.yml`（路徑與副檔名都不能錯），內容如下：

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches:
      - main          # push 到 main 時自動部署
  workflow_dispatch:  # 允許在 Actions 頁面手動執行

permissions:
  contents: read      # 讀取 repo 內容
  pages: write        # 部署到 GitHub Pages
  id-token: write     # deploy-pages 驗證身分用

concurrency:
  group: pages
  cancel-in-progress: true   # 連續 push 只保留最後一次部署

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: '.'          # 整個 repo 根目錄原樣上傳，不做 build

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

各步驟用途：

| 步驟 | 作用 |
| --- | --- |
| `Checkout` | 把 repo 內容抓到執行環境 |
| `Setup Pages` | 讀取 Pages 設定、確認 Source 為 GitHub Actions |
| `Upload artifact` | 把 `path` 指定的資料夾打包成 Pages 用的 artifact |
| `Deploy to GitHub Pages` | 把 artifact 發佈到 `github-pages` 環境，並輸出網址 |

補充：

- 用 Actions 部署時不會跑 Jekyll，所以**不需要** `.nojekyll`。
- `upload-pages-artifact` 預設會排除 `.git`、`.github` 等點開頭的檔案與資料夾，
  所以 workflow 檔本身不會被公開成網頁。
- 單次上傳上限約 1 GB，PDF、影片等大檔請斟酌是否要放進 repo。

### 5. 放一個測試頁並推上去

```bash
mkdir hello
echo "<h1>Hello Pages</h1>" > hello/index.html

git add .github/workflows/pages.yml hello
git commit -m "Setup GitHub Pages workflow"
git push -u origin main
```

### 6. 確認部署結果

1. 進 repo → **Actions**，應該會看到 `Deploy GitHub Pages` 正在執行。
2. 等它變綠燈（約 1 分鐘）。點進去，`deploy` job 上方會顯示部署網址。
3. 開 `https://{帳號}.github.io/{repo 名稱}/hello/` 確認看得到畫面。
4. Settings → Pages 頁面上方也會顯示 `Your site is live at ...`。

第一次部署後 DNS / CDN 有時需要多等幾分鐘，出現 404 先等一下再重新整理。

### 7. 常見錯誤排除

| 症狀 | 原因與處理 |
| --- | --- |
| `Setup Pages` 失敗，訊息含 `Get Pages site failed` / `Not Found` | Pages 尚未啟用或 Source 不是 GitHub Actions → 回到步驟 2 |
| `Deploy to GitHub Pages` 失敗，訊息含 `Branch "xxx" is not allowed to deploy to github-pages` | Settings → **Environments** → `github-pages` → **Deployment branches and tags**，加入 `main` |
| `Deploy` 失敗，訊息含 `permission` / `id-token` | workflow 檔缺少 `permissions:` 區塊 → 對照步驟 4 補上 |
| Actions 頁面完全沒有執行紀錄 | 檔案路徑不是 `.github/workflows/*.yml`、分支不是 `main`，或 Actions 被停用（步驟 3） |
| 綠燈但網址 404 | 該資料夾沒有 `index.html`、網址大小寫不符、結尾少了 `/`，或 CDN 尚未更新 |
| 綠燈但畫面是舊的 | 瀏覽器快取 → `Ctrl` + `F5` 強制重新整理 |
| Settings 裡沒有 Pages 選項可選 | repo 是 Private 且帳號為免費方案 → 改成 Public 或升級方案 |

手動重新部署：Actions → `Deploy GitHub Pages` → 右側 **Run workflow** → 選 `main` → **Run workflow**。

# 注意事項

- **單檔優先**：CSS / JS 盡量內嵌在同一份 HTML，減少檔案散落與路徑問題。
- **外部套件走 CDN**：必須是 `https://`，例如目前 `tsghb-dashboard` 使用的
  `https://cdn.jsdelivr.net/npm/d3@7/...`。用 `http://` 會被瀏覽器擋掉。
- **不要放機密資訊**：API Key、Token、內網 IP、真實病患資料一律不可進 repo。
  展示用資料請自行造假資料（mock data）。
- **瀏覽器快取**：更新後看到舊畫面時，用強制重新整理（`Ctrl` + `F5`）再確認。
- **圖片等資產**：放在該原型資料夾底下，用相對路徑引用，不要引用其他專案資料夾的檔案。
