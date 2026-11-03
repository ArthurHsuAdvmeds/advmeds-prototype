# tsghb-dashboard/real-data/20261103

三總北投精神健康個案通報管理儀表板的**真實資料版**。版面沿用 v7（已移除只屬於優化計畫／HIS 的頁面，只保留緊急醫療），
但畫面上的每個數字都由 `data/` 內的 JSON 即時計算，HTML 裡原型留下的數字只是佔位，載入完成前整頁隱藏。

程式集中在 `index.html` 檔尾的 `<script id="real-data">`（載入、正規化、日期篩選、各頁繪製）與 `<style id="real-data">`。
熱點地圖仍在主腳本的地圖模組裡，透過 `window.RD.basicCases()` 取資料（`geoCases()`）。

> **repo 是公開的。** `data/` 裡放真實資料再 push，就會公開在 GitHub 與 Pages 上。
> 目前 `data/` 內是 `"sample": true` 的虛構範例資料。

---

## 1. 檔案

全部放在 `data/`，每個檔案都是單一 JSON。內容可以是**記錄陣列**，或 `{"records": [...]}`；
最外層有 `"sample": true` 時，頁首會顯示「範例資料（虛構）」。

| 檔案 | 必要 | 內容 | 對應 DB（`../../db_desc/pgsql.dbml`） |
| --- | --- | --- | --- |
| `cases.json` | ✔ | 通報案件，一筆通報一列 | `pf_case`＋主要地址 `pf_case_address`＋`pf_person.gender`＋`mart_case_timeline` |
| `assessments.json` | | 初評量表分級 | `pf_assessment`（只用 `timepoint = initial`） |
| `surveys.json` | | 滿意度問卷 | `pf_satisfaction_survey` |
| `meta.json` | | 資料截止日等設定（物件，不是陣列） | — |

缺少選填檔案時，用到它的圖表顯示「未提供 xxx.json」，頁首也會列出。缺 `cases.json` 時整頁不顯示，頁首顯示錯誤。

### meta.json

| 欄位 | 說明 |
| --- | --- |
| `as_of` | 資料截止日 `YYYY-MM-DD`。本日／本月／本季／本年度都以這天為「今天」；省略時取最晚一筆通報的日期 |
| `data_start` | 資料起日 `YYYY-MM-DD`，指揮板預設區間與結案率的起始年度；省略時取最早一筆通報的日期 |

### cases.json（一筆通報一列）

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `case_id` | 字串 | 案件識別碼，`assessments`／`surveys` 用它對應 |
| `category_code` | 字串 | `emergency` 以外（`opt_1`…）**載入時排除**；省略視為 emergency |
| `is_void` | 布林 | `true` 的作廢／測試案件排除 |
| `reported_at` | 時間 | 網絡完成通報時間。**所有日期篩選與時效指標的起點**；無法解析的列排除 |
| `age_at_report` | 整數 | 通報時年齡；空值歸「未填」 |
| `gender` | 字串 | `M`／`F`（也接受 `男`／`女`），其他一律算「不明」 |
| `status_code` | 字串 | `pending_assign` 待派｜`assigned` 已派｜`closed` 結案｜`not_referred` 未轉介／未開案 |
| `initial_risk_level` | 字串 | `low`／`medium`／`high`，通報時的初評風險（效率頁總覽、地圖點位顏色） |
| `network_code` | 字串 | `social` 社政｜`police` 警察｜`civil` 民政｜`health` 衛政｜`education` 教育｜`fire` 消防｜`labor` 勞政；其他或空值歸「未填」 |
| `county_name` | 字串 | 縣市全名，例如 `臺北市`（`台` 會自動換成 `臺`）；空值但 `district_name` 是臺北市 12 區時視為臺北市 |
| `district_name` | 字串 | 行政區全名，例如 `北投區`，要和 taiwan-atlas 圖資的 `TOWNNAME` 一致 |
| `latitude`／`longitude` | 數字 | 地址座標，熱點地圖點位用；沒有座標的案件不畫點，但仍算進各區件數 |
| `address_key` | 字串 | 正規化地址的雜湊，同值的通報合併成一個點位；省略時以座標（小數 5 位）判斷同址 |
| `assigned_at` | 時間 | 首次完成指派醫師／護理師 |
| `em_intake_method` | 字串 | `phone` 電話諮詢｜`phone_dispatch` 電話＋緊急醫療出勤（首次完成的受理方式） |
| `em_intake_at` | 時間 | 首次完成受理方式表單（＝處理完成時間） |
| `em_dispatched_at` | 時間 | 出勤單填寫的實際出勤時間 |
| `closed_at` | 時間 | 結案時間（目前畫面沒有用到，結案一律看 `status_code`） |

**時間格式**：ISO 8601。有時區（`2026-10-31T14:22:00+08:00`、`…Z`）照時區；沒有時區（`2026-10-31 14:22:00`、`2026-10-31`）一律當臺北時間。
日期篩選以**臺北時間**切日。

### assessments.json

| 欄位 | 說明 |
| --- | --- |
| `case_id` | 對應 `cases.json` |
| `scale_code` | `risk_triage` 風險檢傷評估｜`gaf`｜`bsrs5`｜`cgis` |
| `timepoint` | 只取 `initial`；省略視為 initial |
| `severity_level` | `low`／`medium`／`high`；分級規則在匯出端算好（見 `ref_scale_level_rule`），其他值忽略 |

### surveys.json

| 欄位 | 說明 |
| --- | --- |
| `case_id` | 對應 `cases.json`；一個案件可以有多份 |
| `completed_at` | 完成填寫時間；空值＝未回收 |
| `ui_score`／`care_score` | 兩題分數 1–5，只計已回收的問卷 |

---

## 2. 指標怎麼算

所有分頁都先依該頁的日期區間（`reported_at` 的臺北日期，含頭尾）篩出案件；只有「結案率」不受日期篩選影響。

| 分頁 | 指標 | 算法 |
| --- | --- | --- |
| 基本資料 | 五張數值卡 | 案件數；依 `status_code` 分別計數 |
| | 臺北市各行政區 | 臺北市 12 區（0 件也列出）由多到少；有外縣市、未填地址的案件時多列「外縣市」「未填」，總和＝總收案件數 |
| | 年齡 | 0-10 表示 0–9 歲…80+；空值另列「未填」 |
| | 性別 | 男／女／不明（不明 > 0 才出現在圖例） |
| | 熱點地圖 | 全臺：各縣市件數；縣市內：各區件數＋初評風險組成，點位只畫有座標的案件，沒有座標的件數寫在圖例 |
| 風險分析 | 四種量表 | 該區間案件的初評 `severity_level` 人次占比（三級合計 100%） |
| 效率：處置結果 | 結案率／電話處置率／出勤處置率 | 分母＝受理方式為 phone 或 phone_dispatch 的案件；分子分別為 `closed`、phone、phone_dispatch |
| 效率：處理流程 | 各段平均（小時） | 電話流程用 phone 案件、出勤流程用 phone_dispatch 案件，**只取該流程每個時間點都有、且先後順序正確的案件**，所以各段平均相加＝總反應時間；樣本數在流程區塊的滑鼠提示 |
| 效率：總覽 | 高／中／低風險處理時間 | 依 `initial_risk_level` 分組，`em_intake_at − reported_at` 平均（小時），N＝有兩個時間的案件數 |
| | 摘要卡 | 結案率、出勤總反應時間（同上） |
| 通報者 | 占比、轉介數量 | 依 `network_code` 計數；「未填」一律排最後、灰色 |
| | 回收率 | 已回收問卷 ÷ 發出問卷（該網絡、該區間案件的問卷） |
| | 滿意度分數 | 已回收問卷兩題分數全部取平均 |
| 指揮板 | 各卡片 | 只有緊急醫療一類，左側總數＝緊急醫療列；預設區間為 `data_start`～`as_of` |
| 結案率 | 各年度 | 依通報年度：`closed` 件數 ÷ 該年度通報件數，從 `data_start` 的年度列到 `as_of` 的年度 |

時間差為負（資料錯誤）或缺任一端時不列入平均；沒有樣本時顯示「—」。

---

## 3. 開啟與驗證

- **file:// 直接開檔**：瀏覽器不允許網頁讀 JSON，頁首會出現「選擇 data 資料夾」，選了就會載入（不上傳，只在瀏覽器內讀取）。
- **本機伺服器**：在 repo 根目錄跑 `python -m http.server`（本機用 `cd .tool && uv run python -I -m http.server 8765 --directory ..`），
  開 `http://127.0.0.1:8765/tsghb-dashboard/real-data/20261103/`。GitHub Pages 上直接可用。
- 換資料後檢查：頁首的資料截止日、件數、「已排除」與「未提供」提示是否符合預期；console 不應有錯誤。
- 若要擴充回優化計畫：`category_code` 的排除在 `build()`，指揮板目前只有 emergency 一列（`renderCommand()`），
  被移除的頁面與頁籤可以從 `../../v7/` 對照取回。
