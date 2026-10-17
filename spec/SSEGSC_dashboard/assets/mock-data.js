/* ============================================================================
   沙崙智慧健康照護站儀表板：虛構資料產生器
   ----------------------------------------------------------------------------
   原站（https://shalun-care.docloop.pro/）每次開啟都會從 S3 抓一份 user.json，
   再由頁面即時計算所有指標。這個 repo 是公開的，不能放實際資料，
   所以改由這支程式用固定亂數種子產生「同格式、同量級」的虛構 user.json，
   結果放在 window.SL_USER_DATA，儀表板的計算邏輯完全不用改。

   - 格式與原站 user.json 相同（欄位說明見同資料夾 CLAUDE.md 第 3 節）。
   - 種子固定，每次開啟的數字都一樣，方便在規格裡引用。
   - 各項比例（性別、年齡、設備使用、異常率、推播類型、開啟率、滿意度…）
     依 2026-10-16 版原站資料的分布調整；個人層級的數值全部是亂數產生。
   - 資料截止日固定為 DATA_THROUGH。超過 14 天沒更新，頁面會依原站行為
     顯示「資料已 N 天未更新」的橘色提示，要消掉就把日期往後改。
   ============================================================================ */
(function () {
  'use strict';

  var DATA_THROUGH = '2026-10-16';
  var SEED = 20261016;

  /* ---------- 亂數工具 ---------- */
  var rand = (function (a) {
    return function () { // mulberry32
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })(SEED);
  function normal(m, sd) {
    var u = 1 - rand(), v = rand();
    return m + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function uniform(lo, hi) { return lo + (hi - lo) * rand(); }
  function int(lo, hi) { return Math.floor(uniform(lo, hi + 1)); }
  function chance(p) { return rand() < p; }
  function clip(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  function round(x, d) { var p = Math.pow(10, d || 0); return Math.round(x * p) / p; }
  function pick(pairs) { // [[值, 權重], ...]
    var total = 0, i;
    for (i = 0; i < pairs.length; i++) total += pairs[i][1];
    var r = rand() * total;
    for (i = 0; i < pairs.length; i++) { r -= pairs[i][1]; if (r < 0) return pairs[i][0]; }
    return pairs[pairs.length - 1][0];
  }

  /* ---------- 日期工具（一律用本地時間的 YYYY-MM-DD） ---------- */
  function parse(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function fmt(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  var END = parse(DATA_THROUGH);
  function daysAgo(n) { return fmt(new Date(END.getFullYear(), END.getMonth(), END.getDate() - n)); }
  function addDays(s, n) { var d = parse(s); return fmt(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); }
  function minDate(a, b) { return a < b ? a : b; }
  function maxDate(a, b) { return a > b ? a : b; }

  /* ---------- 分布參數（依原站資料調整） ---------- */
  // 原站資料分成兩段：截止日前 30 天以前每週約 300 位新訪客、每次到站量 3–4 項；
  // 最近 30 天每天只有 3–4 位新訪客，每次到站平均只量 1.2 項。這裡照樣模擬，
  // 讓「近7日／近30日」的量級接近原站。
  var RECENT_DAYS = 30;
  var RECENT_VISITORS = 109;
  // 低量期之前的每週新訪客，索引 0 = 截止日往前 30–36 天，往前共 21 週（約 4 月下旬開站）
  var WEEKLY_VISITORS = [226, 578, 426, 344, 265, 375, 343, 269, 301, 325, 366, 292, 281,
    321, 305, 337, 271, 231, 278, 279, 231];
  var WEEKDAY_W = [562, 881, 1023, 1082, 1322, 986, 897]; // 週日…週六
  var RECENT_DEVICES_PER_DAY = [[1, 85], [2, 10], [3, 5]];
  var RECENT_REVISIT_KEEP = 0.6; // 回訪日、事後推播落在低量期時保留的比例
  var AGE_BANDS = [[[22, 29], 493], [[30, 39], 728], [[40, 49], 1122], [[50, 59], 1406], [[60, 69], 1628], [[70, 88], 1376]];
  var VISITOR_SOURCES = [['自主到站', 1795], ['社區導流', 1489], ['企業健康促進', 915], ['活動／講座', 804],
    ['親友推薦', 678], ['醫療單位轉介', 618], ['其他', 454]];
  var LINE_SOURCES = [['現場', 1349], ['社區', 923], ['企業', 528], ['活動', 452], ['親友', 384], ['轉介', 339], ['自然', 196], ['其他', 129]];
  var DEVICE_ORDER = ['bp', 'inbody', 'bmi', 'spo2', 'temp', 'grip', 'cog', 'fundus'];
  var DEVICE_W = { bp: 40, inbody: 9, bmi: 8.6, spo2: 8.2, temp: 4.2, fundus: 3.8, grip: 3.3, cog: 2.4 };
  var DEVICES_PER_DAY = [[1, 450], [2, 520], [3, 1250], [4, 1800], [5, 1400], [6, 620], [7, 130], [8, 6]];
  // 回訪間隔（週），最後一格是 12 週以上
  var REVISIT_GAP_WEEKS = [[0, 152], [1, 174], [2, 182], [3, 141], [4, 141], [5, 143], [6, 122], [7, 103],
    [8, 95], [9, 100], [10, 94], [11, 99], [12, 332]];
  var SAT_MEAN = { '操作便利性': 4.736, '智慧設備體驗': 4.67, '健康資訊實用性': 4.589, '服務人員專業度': 4.829,
    'AI 報告易理解度': 4.365, 'LINE 健康服務便利性': 4.713, '整體服務體驗': 4.722 };
  var EYE_RISK_WATCH = [['影像品質不足', 13], ['其他眼底異常', 10], ['青光眼風險', 4], ['黃斑部病變風險', 4], ['糖尿病視網膜病變風險', 4]];
  var EYE_RISK_ABNORMAL = [['其他眼底異常', 10], ['糖尿病視網膜病變風險', 4], ['青光眼風險', 3], ['黃斑部病變風險', 3]];
  // 推播（2026-10-17 調整：新增照護站預約、健康商城通知，總量維持與原站相近，約 8,400 則）
  // 儀表板分類：照護站預約、健康商城通知、AI 關懷（異常提醒／轉介／再次量測／追蹤）、生理量測結果（AI 健康報告）、其他
  // 第一次量測當天一定收到一則，類型依下列權重
  var PUSH_FIRST_VISIT = [['AI 健康報告', 36], ['再次量測提醒', 23], ['健康追蹤提醒', 10], ['健康衛教', 14], ['個人化健康建議', 12], ['活動／健康促進', 5]];
  var PUSH_REVISIT_RESULT_P = 0.4; // 回訪量測當天收到 AI 健康報告的機率
  var PUSH_LINE_ONLY_P = 0.15;     // 只加 LINE、還沒量測的人收到衛教類推播
  var PUSH_LINE_ONLY = [['健康衛教', 300], ['活動／健康促進', 150], ['個人化健康建議', 50]];
  var BOOKING_REVISIT_P = 0.7;     // 回訪前 0–3 天收到照護站預約通知
  var BOOKING_LINE_ONLY_P = 0.15;  // 只加 LINE、還沒量測的人收到預約通知
  var MALL_P = 0.26;               // 有加 LINE 的人收到健康商城通知（加入後越久越少，平均 45 天）

  /* ---------- 個人基準值與每次量測 ---------- */
  function makeProfile(gender, age) {
    var male = gender === '男';
    var cogLow = chance(0.015);
    return {
      male: male,
      height: clip(normal(male ? 170.2 : 156.9, male ? 6.1 : 5.5), male ? 155 : 143, male ? 190 : 173),
      bmi: clip(chance(0.07) ? normal(27.5, 2.5) : normal(21.3, 1.5), 18.8, 33.5), // 約 7% 屬於過重／肥胖族群
      fat: clip(normal(male ? 20.2 : 28.3, male ? 3.9 : 4.05), male ? 14 : 22, male ? 35.5 : 43.9),
      visc: clip(normal(7.7, 2.4), 4, 17.9),
      smm: clip(normal(male ? 29.6 : 21.7, male ? 2.75 : 2.05), male ? 20 : 13.1, male ? 34 : 25.2),
      muscle: normal(male ? 47.8 : 35, male ? 4.5 : 3.4),
      water: normal(male ? 32.8 : 28, male ? 4 : 3.4),
      bmr: normal(male ? 1412 : 1073, male ? 132 : 122),
      smi: normal(male ? 10.26 : 8.88, male ? 1.2 : 1.07),
      protein: normal(male ? 10.15 : 8.66, male ? 1.3 : 1.12),
      mineral: normal(male ? 3.31 : 2.83, male ? 0.44 : 0.36),
      bodyAge: age + normal(-1, 3.5),
      sys: chance(0.085) ? normal(147, 8) : normal(118, 7), // 約 8.5% 屬於高血壓族群；舒張壓在 measure() 依收縮壓推
      pulse: normal(76.3, 7.4),
      grip: clip(normal(male ? 37 : 26.5, 6.8), male ? 15.3 : 4.6, male ? 49 : 39),
      cog: cogLow ? uniform(45, 62) : normal(81, 6),
      spo2Low: chance(0.04),
      feverish: chance(0.02),
      fundus: pick([['normal', 972], ['watch', 18], ['abnormal', 10]])
    };
  }

  // 第二次到站時，偏離正常範圍的數值有一定機率往正常方向改善
  function revisitProfile(p) {
    var q = Object.assign({}, p);
    q.sys = p.sys + normal(-1.5, 4);
    q.bmi = p.bmi >= 23.5 ? p.bmi * (1 - normal(0.02, 0.025)) : p.bmi * (1 + normal(0, 0.01));
    var fatHigh = p.fat >= (p.male ? 26 : 34);
    q.fat = fatHigh ? p.fat - normal(0.8, 1.4) : p.fat + normal(0, 0.8);
    q.visc = p.visc >= 11 ? p.visc - normal(0.5, 0.9) : p.visc + normal(0, 0.4);
    q.smm = p.smm < (p.male ? 25.5 : 18.5) ? p.smm + normal(0.4, 0.6) : p.smm + normal(0, 0.4);
    q.grip = p.grip < (p.male ? 29 : 19) ? p.grip + normal(1, 2.2) : p.grip + normal(0, 1.5);
    return q;
  }

  function measure(device, p) {
    switch (device) {
      case 'bp': {
        var sys = clip(Math.round(p.sys + normal(0, 4)), 98, 169);
        var dia = clip(Math.round(76 + (sys - 121) * 0.6 + normal(0, 3)), 56, 99);
        return { '收縮壓': sys, '舒張壓': dia, '脈搏': clip(Math.round(p.pulse + normal(0, 3)), 60, 102) };
      }
      case 'bmi': {
        var h = round(p.height + normal(0, 0.3), 1);
        var bmi = round(clip(p.bmi + normal(0, 0.15), 18.8, 33.5), 1);
        var w = round(bmi * h * h / 10000, 1);
        return { '身高': h, '體重': w, 'BMI': round(w / (h * h / 10000), 1) };
      }
      case 'inbody': {
        var fat = round(clip(p.fat + normal(0, 0.5), 13, 45), 1);
        return {
          '體脂率': fat,
          '體脂肪': round(clip(p.male ? 12.65 + (fat - 20.2) * 0.55 : 15.1 + (fat - 28.3) * 0.55, 6.8, 27.4), 1),
          '內臟脂肪': round(clip(p.visc + normal(0, 0.3), 4, 17.9), 1),
          '骨骼肌': round(clip(p.smm + normal(0, 0.3), 13, 34), 1),
          '肌肉量': round(p.muscle + normal(0, 0.3), 1),
          '體水分': round(p.water + normal(0, 0.3), 1),
          '基礎代謝': Math.round(p.bmr + normal(0, 10)),
          'BMI': round(clip(p.bmi * 0.98 + normal(0, 0.15), 18.8, 33.4), 1),
          'SMI': round(p.smi + normal(0, 0.05), 2),
          '蛋白質': round(p.protein + normal(0, 0.1), 1),
          '礦物質': round(p.mineral + normal(0, 0.03), 1),
          '身體年齡': clip(Math.round(p.bodyAge), 16, 96)
        };
      }
      case 'spo2': {
        var s = p.spo2Low ? (chance(0.42) ? uniform(90, 93.9) : uniform(94, 95.9)) : clip(normal(97.8, 0.95), 96, 100);
        return { 'SpO₂': round(s, 1) };
      }
      case 'temp':
        return { '體溫': round(p.feverish ? uniform(37.5, 38.6) : clip(normal(36.5, 0.3), 35.8, 37.4), 1) };
      case 'grip': {
        var g = p.grip + normal(0, 1.2);
        return { '左手握力': round(clip(g + normal(0, 1.5), 4.6, 49), 1), '右手握力': round(clip(g + normal(0, 1.5), 4.6, 49), 1) };
      }
      case 'cog': {
        var sub = function () { return clip(Math.round(p.cog + normal(0, 7)), 35, 100); };
        return { '反應力': sub(), '注意力': sub(), '協調力': sub(), '記憶力': sub(),
          '總體認知表現': clip(Math.round(p.cog + normal(0, 2.5)), 45, 98) };
      }
    }
    return {};
  }

  // 與儀表板相同的異常判定，只用來決定推播類型與 followUp
  function isAbnormal(rec, male) {
    var v = rec.values || {};
    switch (rec.device) {
      case 'bp': return v['收縮壓'] >= 140 || v['舒張壓'] >= 90;
      case 'bmi': return v.BMI >= 27;
      case 'spo2': return v['SpO₂'] < 94;
      case 'temp': return v['體溫'] >= 37.5;
      case 'grip': return Math.max(v['左手握力'], v['右手握力']) < (male ? 28 : 18);
      case 'inbody': return v['體脂率'] >= (male ? 27 : 35) || v['內臟脂肪'] >= 12 || v['骨骼肌'] < (male ? 25 : 18);
      case 'cog': return v['總體認知表現'] < 60;
      case 'fundus': return rec.status !== 'normal';
    }
    return false;
  }

  function pickDevices(k) {
    var pool = DEVICE_ORDER.slice(), out = [];
    while (out.length < k && pool.length) {
      var d = pick(pool.map(function (id) { return [id, DEVICE_W[id]]; }));
      out.push(d); pool.splice(pool.indexOf(d), 1);
    }
    return DEVICE_ORDER.filter(function (id) { return out.indexOf(id) >= 0; });
  }

  function makePush(date, type) {
    var opened = chance(0.767);
    var p = { date: date, type: type, opened: opened };
    if (opened && chance(0.88)) p.reportViewed = true;
    return p;
  }

  /* ---------- 產生每位民眾 ---------- */
  var RECENT_START = daysAgo(RECENT_DAYS - 1); // 低量期第一天
  var isRecent = function (ds) { return ds >= RECENT_START; };
  function spread(count, fromAgo, toAgo) { // 依星期權重把 count 位訪客分到「往前 fromAgo–toAgo 天」
    var days = [];
    for (var i = fromAgo; i <= toAgo; i++) {
      var ds = daysAgo(i);
      days.push([ds, WEEKDAY_W[parse(ds).getDay()]]);
    }
    for (var n = 0; n < count; n++) visits.push(pick(days));
  }
  var visits = [];
  WEEKLY_VISITORS.forEach(function (count, week) {
    spread(count, RECENT_DAYS + week * 7, RECENT_DAYS + week * 7 + 6);
  });
  spread(RECENT_VISITORS, 0, RECENT_DAYS - 1);
  visits.sort();

  var users = [], nextId = 10000;
  visits.forEach(function (visitDate) {
    var gender = chance(0.517) ? '女' : '男';
    var band = pick(AGE_BANDS);
    var age = int(band[0], band[1]);
    var user = { id: 'SL-' + nextId, gender: gender, age: age, visitorSource: pick(VISITOR_SOURCES), visitDate: visitDate };
    nextId += chance(0.37) ? 2 : 1;

    var served = chance(0.632);
    if (chance(served ? 0.712 : 0.507)) {
      var join = chance(0.989) ? visitDate : minDate(addDays(visitDate, int(1, 27)), DATA_THROUGH);
      user.line = { source: pick(LINE_SOURCES), joinDate: join, bound: isRecent(join) || chance(0.837) }; // 原站低量期加入 LINE 的人全部有綁定
    }

    var pushes = [];
    if (served) {
      var profile = makeProfile(gender, age);
      var male = profile.male;
      var first = chance(0.91) ? visitDate : minDate(addDays(visitDate, int(2, 14)), DATA_THROUGH);
      var dayList = [first];
      if (chance(0.52)) {
        for (var tries = 0; tries < 4; tries++) { // 回訪日超過截止日就重抽間隔
          var gw = pick(REVISIT_GAP_WEEKS);
          var gap = gw === 0 ? int(1, 6) : gw === 12 ? int(84, 150) : int(gw * 7, gw * 7 + 6);
          var second = addDays(first, gap);
          if (second <= DATA_THROUGH) {
            if (!isRecent(second) || chance(RECENT_REVISIT_KEEP)) dayList.push(second);
            break;
          }
        }
      }
      var records = [], anyAbnormal = false;
      dayList.forEach(function (date, idx) {
        var p = idx === 0 ? profile : revisitProfile(profile);
        var dayAbnormal = false;
        pickDevices(pick(isRecent(date) ? RECENT_DEVICES_PER_DAY : DEVICES_PER_DAY)).forEach(function (device) {
          var rec = { date: date, device: device };
          if (device === 'fundus') {
            rec.status = idx === 0 ? profile.fundus : (profile.fundus === 'normal' || chance(0.5) ? 'normal' : profile.fundus);
            if (rec.status !== 'normal') rec.eyeRisk = pick(rec.status === 'watch' ? EYE_RISK_WATCH : EYE_RISK_ABNORMAL);
          } else {
            if (chance(0.35)) rec.aiAnalysis = true;
            rec.values = measure(device, p);
          }
          if (isAbnormal(rec, male)) dayAbnormal = true;
          records.push(rec);
        });
        anyAbnormal = anyAbnormal || dayAbnormal;
        if (idx === 0) pushes.push(makePush(date, pick(PUSH_FIRST_VISIT)));
        else {
          if (chance(BOOKING_REVISIT_P)) pushes.push(makePush(maxDate(first, addDays(date, -int(0, 3))), '照護站預約'));
          if (chance(PUSH_REVISIT_RESULT_P)) pushes.push(makePush(date, 'AI 健康報告'));
        }
        if (dayAbnormal && chance(0.36)) pushes.push(makePush(date, '健康異常提醒'));
        if (dayAbnormal && chance(0.18)) pushes.push(makePush(date, '異常轉介'));
      });
      user.records = records;
      var last = dayList[dayList.length - 1];
      if (chance(0.372)) {
        var shift = normal(0, 0.12), sat = { date: chance(0.96) ? last : minDate(addDays(last, int(1, 9)), DATA_THROUGH) };
        Object.keys(SAT_MEAN).forEach(function (dim) { sat[dim] = round(clip(SAT_MEAN[dim] + shift + normal(0, 0.14), 3.7, 5), 2); });
        user.sat = sat;
        user.nps = pick([[10, 770], [9, 813], [8, 3], [7, 2]]);
      }
      if (chance(anyAbnormal ? 0.7 : 0.115)) user.followUp = true;
    } else if (user.line) {
      if (chance(PUSH_LINE_ONLY_P)) {
        var n2 = chance(0.75) ? 1 : 2;
        for (var j = 0; j < n2; j++) {
          var pd = addDays(user.line.joinDate, int(0, 60));
          if (pd <= DATA_THROUGH) pushes.push(makePush(pd, pick(PUSH_LINE_ONLY)));
        }
      }
      if (chance(BOOKING_LINE_ONLY_P)) {
        var bd = addDays(user.line.joinDate, int(0, 14));
        if (bd <= DATA_THROUGH) pushes.push(makePush(bd, '照護站預約'));
      }
    }
    if (user.line && chance(MALL_P)) {
      var nm = chance(0.15) ? 2 : 1;
      for (var m = 0; m < nm; m++) {
        var md = addDays(user.line.joinDate, Math.min(150, 1 + Math.floor(-Math.log(1 - rand()) * 45)));
        if (md <= DATA_THROUGH && (!isRecent(md) || chance(RECENT_REVISIT_KEEP))) pushes.push(makePush(md, '健康商城通知'));
      }
    }
    if (pushes.length) {
      pushes.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      user.pushes = pushes;
    }
    users.push(user);
  });

  window.SL_USER_DATA = { dataThrough: DATA_THROUGH, users: users };
})();
