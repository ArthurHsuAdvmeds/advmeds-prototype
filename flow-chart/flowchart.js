/*!
 * FlowScript — 極簡流程圖語法（解析 / 佈局 / SVG 繪製）
 * 純前端單檔、無外部相依，供 flow-chart/edit 與 flow-chart/view 共用。
 */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,-apple-system,"Segoe UI",sans-serif';
  // 具名顏色（中英皆可）＋ 舊有的語意樣式別名
  var COLORS = {
    red: '#ef4444', 紅: '#ef4444', 紅色: '#ef4444',
    orange: '#f97316', 橙: '#f97316', 橘: '#f97316',
    amber: '#f59e0b', yellow: '#eab308', 黃: '#f59e0b',
    green: '#22c55e', 綠: '#22c55e',
    teal: '#14b8a6', 青: '#14b8a6',
    blue: '#3b82f6', 藍: '#3b82f6',
    indigo: '#6366f1', 靛: '#6366f1',
    purple: '#a855f7', 紫: '#a855f7',
    pink: '#ec4899', 粉: '#ec4899',
    brown: '#a16207', 棕: '#a16207',
    gray: '#94a3b8', grey: '#94a3b8', 灰: '#94a3b8',
    black: '#334155', 黑: '#334155',
    primary: '#3b82f6', success: '#22c55e', warn: '#f59e0b', danger: '#ef4444', muted: '#94a3b8'
  };
  var COLOR_NAMES = ['red', 'orange', 'amber', 'yellow', 'green', 'teal', 'blue',
    'indigo', 'purple', 'pink', 'brown', 'gray', 'black'];
  var KEY_ALIAS = {
    fill: 'fill', bg: 'fill', background: 'fill', 底: 'fill', 底色: 'fill', 背景: 'fill',
    stroke: 'stroke', border: 'stroke', 框: 'stroke', 框線: 'stroke', 線: 'stroke', 邊框: 'stroke',
    text: 'text', color: 'text', 字: 'text', 文字: 'text'
  };

  /* =========================================================
   * 1) 給 AI 讀的語法說明（可整段複製貼給 GPT / Claude）
   * =======================================================*/
  var SPEC = [
    '# FlowScript 流程圖語法說明（v1）',
    '',
    '你會依照下列語法輸出「流程圖原始碼」。這段原始碼會被 FlowScript 解析器畫成流程圖，',
    '所以請只輸出符合語法的純文字，不要輸出語法以外的說明。',
    '',
    '## 一、基本規則',
    '',
    '- 一行一個敘述；空行會被忽略。',
    '- `//` 之後、或整行以 `#` 開頭的內容是註解。',
    '- 節點 id 代表一個節點，建議用英數與底線（例：`A`、`step1`、`check_bp`），也可以用中文。',
    '  id 內不可有空白，也不可出現這些符號： - . : ( ) [ ] { } | 以及引號。',
    '- 同一個 id 只要定義一次形狀與文字，之後直接寫 id 即可。',
    '- 節點文字若含 `)`、`]`、`}`、`|` 等符號，請用雙引號包起來，例：`A("批價(含自費)")`。',
    '- 文字要換行時寫 `\\n`，例：`A(第一行\\n第二行)`。',
    '',
    '## 二、設定（可省略，寫在最前面）',
    '',
    '```',
    'title 門診批價流程        // 圖表標題',
    'direction TD             // TD = 由上往下（預設）；LR = 由左往右',
    '```',
    '',
    '## 三、節點形狀（只有三種）',
    '',
    '| 寫法 | 形狀 | 用途 |',
    '| --- | --- | --- |',
    '| `A(文字)` | 圓角方形 | 一般流程步驟 |',
    '| `B{文字}` | 菱形 | 判斷、流程分流 |',
    '| `C[文字]` | 正方形 | 某步驟的補充說明 |',
    '',
    '若某個 id 從頭到尾都沒定義形狀，會預設為圓角方形，文字就是 id 本身。',
    '',
    '## 四、連接線（只有四種）',
    '',
    '| 寫法 | 樣式 |',
    '| --- | --- |',
    '| `A --> B` | 單向實線箭頭 |',
    '| `A -.-> B` | 單向虛線箭頭 |',
    '| `A --- B` | 實線連接線（無箭頭）|',
    '| `A -.- B` | 虛線連接線（無箭頭）|',
    '',
    '- 線上文字：在連接線後面接 `|文字|`，例：`B -->|是| C`、`B -.->|例外| D`。',
    '- 可以串接：`A --> B --> C`，等同分兩行寫。',
    '- 箭頭方向就是書寫方向（左邊指向右邊）。',
    '',
    '## 五、補充說明的擺放規則',
    '',
    '正方形節點（`C[文字]`）若只連接一個節點，會自動被放到該節點的側邊，',
    '不佔用流程層級，適合當旁註。建議搭配無箭頭的線使用：',
    '',
    '```',
    'P(批價收費) -.- N[自費項目需另行說明]',
    '```',
    '',
    '## 六、顏色（可省略）',
    '',
    '在節點或連接線後面加 `:::顏色`，三種寫法擇一：',
    '',
    '| 寫法 | 說明 |',
    '| --- | --- |',
    '| `:::red` 或 `:::紅` | 具名顏色，中英文皆可 |',
    '| `:::#ef4444` | 直接給色碼（`#rgb` 或 `#rrggbb`）|',
    '| `:::fill=#fff1f2,stroke=#ef4444,text=#7f1d1d` | 分別指定底色／框線／文字 |',
    '',
    '- 可用的顏色名：`red 紅`、`orange 橙`、`amber 黃`、`green 綠`、`teal 青`、`blue 藍`、',
    '  `indigo 靛`、`purple 紫`、`pink 粉`、`brown 棕`、`gray 灰`、`black 黑`。',
    '  另外保留五個語意名稱：`primary`（藍）、`success`（綠）、`warn`（黃）、`danger`（紅）、`muted`（灰）。',
    '- 只給一個顏色時，會自動配成「淡底色 + 該色框線 + 深色文字」，不必自己調三個值。',
    '- 節點上色：寫在節點後面。連接線上色：寫在連接線（或線上文字）後面。',
    '',
    '```',
    'A(重要步驟):::blue',
    'B(異常處理):::#ef4444',
    'C(自訂):::fill=#f0fdf4,stroke=#16a34a,text=#14532d',
    'A -->|正常| C',
    'A -.->|逾時|:::red B          // 連接線與線上文字都會變紅色',
    '```',
    '',
    '沒有指定顏色時，圓角方形是白底、菱形是淡紫、正方形是淡黃，維持一致的預設外觀。',
    '',
    '## 七、完整範例',
    '',
    '```',
    'title 門診批價流程',
    'direction TD',
    '',
    'S(病人報到) --> C{是否已預約?}',
    'C -->|是| A(讀取預約資料)',
    'C -->|否| B(現場掛號)',
    'B --> A',
    'A --> P(批價收費):::blue',
    'P -.- N[自費項目需另行\\n向病人說明]',
    'P --> D{付款方式}',
    'D -->|現金| E(收現金)',
    'D -->|刷卡|:::orange F(刷卡機結帳):::#f97316',
    'E --> G(列印收據)',
    'F --> G',
    'G --- H[收據需蓋章]',
    'G --> Z(完成):::green',
    '```',
    '',
    '## 八、輸出時的注意事項',
    '',
    '1. 只輸出流程圖原始碼，不要加入語法以外的文字。',
    '2. 判斷節點請用菱形，且每條分支都要用 `|文字|` 標示條件。',
    '3. 補充說明請用正方形，不要塞進流程主線。',
    '4. 節點文字盡量精簡（建議 20 字以內），長句用 `\\n` 斷行。',
    '5. 一張圖建議 30 個節點以內；流程太長請拆成多張圖。'
  ].join('\n');

  var EXAMPLE = [
    'title 門診批價流程',
    'direction TD',
    '',
    'S(病人報到) --> C{是否已預約?}',
    'C -->|是| A(讀取預約資料)',
    'C -->|否| B(現場掛號)',
    'B --> A',
    'A --> P(批價收費):::blue',
    'P -.- N[自費項目需另行\\n向病人說明]',
    'P --> D{付款方式}',
    'D -->|現金| E(收現金)',
    'D -->|刷卡|:::orange F(刷卡機結帳):::#f97316',
    'E --> G(列印收據)',
    'F --> G',
    'G --- H[收據需蓋章]',
    'G --> Z(完成):::green',
    ''
  ].join('\n');

  /* =========================================================
   * 2) 解析器
   * =======================================================*/

  var ID_RE = /^[^\s()\[\]{}|<>\-.:"']+/;
  var CONN_RE = /^(-+\.-+>|-{2,}>|-+\.-+|-{3,})/;
  var OPEN = { '(': [')', 'round'], '{': ['}', 'diamond'], '[': [']', 'note'] };

  /* ---- 顏色 ---- */

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function rgbToHex(rgb) {
    return '#' + rgb.map(function (v) {
      var s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length < 2 ? '0' + s : s;
    }).join('');
  }

  // 把 a 與 b 依比例 t 混合（t = 1 時完全是 b）
  function mix(a, b, t) {
    var x = hexToRgb(a), y = hexToRgb(b);
    return rgbToHex([0, 1, 2].map(function (i) { return x[i] * (1 - t) + y[i] * t; }));
  }

  // 允許：具名色、#rgb / #rrggbb、瀏覽器認得的 CSS 顏色字（如 tomato）
  function toHex(value) {
    if (!value) return null;
    var v = String(value).trim();
    var named = COLORS[v] || COLORS[v.toLowerCase()];
    if (named) return named;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v.toLowerCase();
    try {
      var probe = document.createElement('span');
      probe.style.color = '';
      probe.style.color = v;
      if (!probe.style.color) return null;
      probe.style.display = 'none';
      document.body.appendChild(probe);
      var computed = getComputedStyle(probe).color;
      document.body.removeChild(probe);
      var m = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(computed);
      return m ? rgbToHex([+m[1], +m[2], +m[3]]) : null;
    } catch (err) {
      return null;
    }
  }

  // 由一個主色推出「淡底 + 主色框線 + 深色文字」
  function paletteFrom(hex) {
    return {
      base: hex,
      fill: mix(hex, '#ffffff', 0.88),
      stroke: hex,
      text: mix(hex, '#000000', 0.45)
    };
  }

  // :::紅 / :::#ef4444 / :::fill=#fff,stroke=#ef4444,text=#7f1d1d
  function resolveStyle(spec, lineNo, errors) {
    if (/[=:]/.test(spec)) {
      var got = {}, any = false;
      spec.split(',').forEach(function (part) {
        if (!part.trim()) return;
        var at = part.search(/[=:]/);
        var key = KEY_ALIAS[part.slice(0, at).trim().toLowerCase()];
        var val = toHex(part.slice(at + 1));
        if (!key || !val) {
          errors.push({
            line: lineNo, warn: true,
            msg: '看不懂的顏色設定「' + part.trim() + '」，格式為 fill=顏色、stroke=顏色、text=顏色'
          });
          return;
        }
        got[key] = val; any = true;
      });
      if (!any) return null;
      var base = got.stroke || got.text || got.fill;
      var auto = paletteFrom(base);
      return {
        base: base,
        fill: got.fill || auto.fill,
        stroke: got.stroke || auto.stroke,
        text: got.text || auto.text
      };
    }
    var hex = toHex(spec);
    if (!hex) {
      errors.push({
        line: lineNo, warn: true,
        msg: '未知的顏色「:::' + spec + '」，可用色碼（#ef4444）或顏色名（' + COLOR_NAMES.slice(0, 6).join('、') + ' …）'
      });
      return null;
    }
    return paletteFrom(hex);
  }

  // 讀取 ::: 後面的樣式字串（遇到連接線就停）
  function readStyleToken(s, pos) {
    var m = /^[^\s()\[\]{}|<>"']+/.exec(s.slice(pos));
    if (!m) return null;
    var tok = m[0], cut = tok.length;
    ['--', '-.'].forEach(function (sep) {
      var i = tok.indexOf(sep);
      if (i > 0 && i < cut) cut = i;
    });
    tok = tok.slice(0, cut);
    return tok || null;
  }

  function stripComment(line) {
    var depth = 0, q = null;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) { if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      else if (ch === '/' && line[i + 1] === '/' && depth <= 0) return line.slice(0, i);
    }
    return line;
  }

  function skipSpace(s, pos) {
    while (pos < s.length && /\s/.test(s[pos])) pos++;
    return pos;
  }

  function readNode(s, pos, model, lineNo, errors) {
    pos = skipSpace(s, pos);
    var m = ID_RE.exec(s.slice(pos));
    if (!m) return null;
    var id = m[0];
    pos += id.length;

    var shape = null, text = null;
    var pair = OPEN[s[pos]];
    if (pair) {
      var close = pair[0], buf = '', q = null, found = false, i = pos + 1;
      for (; i < s.length; i++) {
        var ch = s[i];
        if (q) { if (ch === q) q = null; else buf += ch; continue; }
        if (ch === '"' || ch === "'") { q = ch; continue; }
        if (ch === close) { found = true; break; }
        buf += ch;
      }
      if (!found) {
        errors.push({ line: lineNo, msg: '節點「' + id + '」缺少對應的「' + close + '」' });
        return null;
      }
      shape = pair[1];
      text = buf.trim();
      pos = i + 1;
    }

    var styleName = null, style = null;
    if (s.slice(pos, pos + 3) === ':::') {
      var tok = readStyleToken(s, pos + 3);
      if (!tok) {
        errors.push({ line: lineNo, warn: true, msg: '「:::」後面少了顏色或樣式名稱' });
        pos += 3;
      } else {
        pos += 3 + tok.length;
        styleName = tok;
        style = resolveStyle(tok, lineNo, errors);
      }
    }

    var node = model.nodes.get(id);
    if (!node) {
      node = { id: id, type: 'round', text: id, style: null, styleName: null, defined: false, line: lineNo };
      model.nodes.set(id, node);
    }
    if (shape) {
      var newText = text === '' ? id : text;
      if (node.defined && (node.type !== shape || node.text !== newText)) {
        errors.push({ line: lineNo, warn: true, msg: '節點「' + id + '」被重複定義，會以最後一次為準' });
      }
      node.type = shape;
      node.text = newText;
      node.defined = true;
    }
    if (style) { node.style = style; node.styleName = styleName; }
    return { id: id, pos: pos };
  }

  function parseStatement(line, lineNo, model, errors) {
    var before = errors.length;
    var first = readNode(line, 0, model, lineNo, errors);
    if (!first) {
      // 若 readNode 已經回報過更明確的原因（例如括號沒關），就不再重複提示
      if (errors.length === before) errors.push({ line: lineNo, msg: '無法解析這一行：' + line });
      return;
    }
    var pos = first.pos;
    var prev = first.id;

    while (true) {
      pos = skipSpace(line, pos);
      if (pos >= line.length) break;

      var cm = CONN_RE.exec(line.slice(pos));
      if (!cm) {
        errors.push({ line: lineNo, msg: '看不懂「' + line.slice(pos) + '」；連接線只能是 -->、-.->、--- 或 -.-' });
        return;
      }
      var tok = cm[0];
      pos += tok.length;

      // 連接線後面可接 |文字| 與 :::顏色（順序不拘）
      var label = '', edgeStyle = null, edgeStyleName = null;
      for (var slot = 0; slot < 2; slot++) {
        pos = skipSpace(line, pos);
        if (line[pos] === '|' && !label) {
          var end = line.indexOf('|', pos + 1);
          if (end < 0) { errors.push({ line: lineNo, msg: '線上文字缺少結尾的「|」' }); return; }
          label = line.slice(pos + 1, end).trim().replace(/^["']|["']$/g, '');
          pos = end + 1;
          continue;
        }
        if (line.slice(pos, pos + 3) === ':::' && !edgeStyle) {
          var st = readStyleToken(line, pos + 3);
          if (!st) { errors.push({ line: lineNo, warn: true, msg: '「:::」後面少了顏色或樣式名稱' }); pos += 3; break; }
          pos += 3 + st.length;
          edgeStyleName = st;
          edgeStyle = resolveStyle(st, lineNo, errors);
          continue;
        }
        break;
      }

      var next = readNode(line, pos, model, lineNo, errors);
      if (!next) { errors.push({ line: lineNo, msg: '連接線後面少了節點' }); return; }
      pos = next.pos;

      model.edges.push({
        from: prev, to: next.id,
        dashed: tok.indexOf('.') >= 0,
        arrow: tok.charAt(tok.length - 1) === '>',
        label: label, style: edgeStyle, styleName: edgeStyleName, line: lineNo
      });
      prev = next.id;
    }
  }

  function parse(src) {
    var model = { title: '', direction: 'TD', nodes: new Map(), edges: [] };
    var errors = [];
    var lines = String(src == null ? '' : src).split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {
      var lineNo = i + 1;
      if (/^\s*#/.test(lines[i])) continue;
      var line = stripComment(lines[i]).trim();
      if (!line) continue;

      var d = /^direction\s*:?\s*(\S+)\s*$/i.exec(line);
      if (d) {
        var v = d[1].toUpperCase();
        if (v === 'TD' || v === 'TB') model.direction = 'TD';
        else if (v === 'LR') model.direction = 'LR';
        else errors.push({ line: lineNo, msg: 'direction 只能是 TD 或 LR' });
        continue;
      }
      var t = /^title\s*:?\s+(.+)$/i.exec(line);
      if (t) { model.title = t[1].trim().replace(/^["']|["']$/g, ''); continue; }

      parseStatement(line, lineNo, model, errors);
    }
    return { model: model, errors: errors };
  }

  /* =========================================================
   * 3) 文字量測與節點尺寸
   * =======================================================*/

  var measureSvg = null;
  function textWidth(str, size, weight) {
    if (!measureSvg) {
      measureSvg = document.createElementNS(NS, 'svg');
      measureSvg.setAttribute('aria-hidden', 'true');
      measureSvg.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden';
      document.body.appendChild(measureSvg);
    }
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('font-family', FONT);
    t.setAttribute('font-size', size);
    t.setAttribute('font-weight', weight || 400);
    t.textContent = str || ' ';
    measureSvg.appendChild(t);
    var w = 0;
    try { w = t.getComputedTextLength(); } catch (err) { w = (str || '').length * size * 0.9; }
    measureSvg.removeChild(t);
    return w;
  }

  var STYLE_BY_TYPE = {
    round: { size: 14, lh: 21, padX: 22, padY: 13, minW: 100, minH: 46, weight: 500 },
    diamond: { size: 14, lh: 21, padX: 30, padY: 16, minW: 124, minH: 68, weight: 500 },
    note: { size: 12.5, lh: 18, padX: 14, padY: 10, minW: 84, minH: 40, weight: 400 }
  };

  function sizeNode(node) {
    var st = STYLE_BY_TYPE[node.type] || STYLE_BY_TYPE.round;
    var lines = String(node.text).split(/\\n/).map(function (s) { return s.trim(); });
    if (!lines.length) lines = [''];
    var tw = 0;
    for (var i = 0; i < lines.length; i++) tw = Math.max(tw, textWidth(lines[i], st.size, st.weight));
    var th = lines.length * st.lh;
    var w, h;
    if (node.type === 'diamond') {
      w = Math.max(st.minW, tw * 1.5 + st.padX * 2);
      h = Math.max(st.minH, th * 1.7 + st.padY);
    } else {
      w = Math.max(st.minW, tw + st.padX * 2);
      h = Math.max(st.minH, th + st.padY * 2);
    }
    node.lines = lines;
    node.fontSize = st.size;
    node.lineHeight = st.lh;
    node.fontWeight = st.weight;
    node.w = Math.round(w);
    node.h = Math.round(h);
  }

  /* =========================================================
   * 4) 佈局（分層 + 重心排序 + 座標微調）
   * =======================================================*/

  var NODE_GAP = 40;   // 同一層節點間距
  var RANK_GAP = 66;   // 層與層之間的距離
  var PAD = 28;        // 畫布留白

  function median(arr) {
    if (!arr.length) return null;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function clipToNode(node, center, toward) {
    var dx = toward.x - center.x, dy = toward.y - center.y;
    if (!dx && !dy) return { x: center.x, y: center.y };
    var hw = node.w / 2, hh = node.h / 2, t;
    if (node.type === 'diamond') {
      t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
    } else {
      t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    }
    return { x: center.x + dx * t, y: center.y + dy * t };
  }

  function layout(model) {
    var dir = model.direction === 'LR' ? 'LR' : 'TD';
    var nodes = Array.from(model.nodes.values());
    nodes.forEach(sizeNode);

    var byId = model.nodes;
    var edges = model.edges.filter(function (e) { return byId.has(e.from) && byId.has(e.to); });
    var selfEdges = [], linkEdges = [];
    edges.forEach(function (e) { (e.from === e.to ? selfEdges : linkEdges).push(e); });

    /* --- 4-1 找出「側邊補充說明」：只連一條線的正方形節點 --- */
    var degree = {};
    linkEdges.forEach(function (e) {
      degree[e.from] = (degree[e.from] || 0) + 1;
      degree[e.to] = (degree[e.to] || 0) + 1;
    });
    var sideOf = new Map();
    nodes.forEach(function (n) {
      if (n.type !== 'note' || degree[n.id] !== 1) return;
      for (var i = 0; i < linkEdges.length; i++) {
        var e = linkEdges[i];
        if (e.from === n.id) { sideOf.set(n.id, e.to); return; }
        if (e.to === n.id) { sideOf.set(n.id, e.from); return; }
      }
    });
    // 補充說明不可以掛在另一個補充說明上
    Array.from(sideOf.keys()).forEach(function (id) {
      if (sideOf.has(sideOf.get(id))) sideOf.delete(id);
    });

    var mainNodes = nodes.filter(function (n) { return !sideOf.has(n.id); });
    if (!mainNodes.length) {
      return { nodes: [], edges: [], width: 320, height: 160, direction: dir, title: model.title, empty: true };
    }

    var mainEdges = linkEdges.filter(function (e) { return !sideOf.has(e.from) && !sideOf.has(e.to); });
    var sideEdges = linkEdges.filter(function (e) { return sideOf.has(e.from) || sideOf.has(e.to); });

    /* --- 4-2 移除迴圈用的 back edge，再做最長路徑分層 --- */
    var out = new Map();
    mainNodes.forEach(function (n) { out.set(n.id, []); });
    mainEdges.forEach(function (e) { e.back = false; out.get(e.from).push(e); });

    var state = {};
    mainNodes.forEach(function (root) {
      if (state[root.id]) return;
      state[root.id] = 1;
      var stack = [{ id: root.id, i: 0 }];
      while (stack.length) {
        var top = stack[stack.length - 1];
        var list = out.get(top.id);
        if (top.i >= list.length) { state[top.id] = 2; stack.pop(); continue; }
        var e = list[top.i++];
        var s = state[e.to] || 0;
        if (s === 1) e.back = true;
        else if (s === 0) { state[e.to] = 1; stack.push({ id: e.to, i: 0 }); }
      }
    });

    var indeg = {}, rank = {};
    mainNodes.forEach(function (n) { indeg[n.id] = 0; rank[n.id] = 0; });
    mainEdges.forEach(function (e) { if (!e.back) indeg[e.to]++; });
    var queue = mainNodes.filter(function (n) { return !indeg[n.id]; }).map(function (n) { return n.id; });
    var visited = 0;
    while (queue.length) {
      var u = queue.shift();
      visited++;
      out.get(u).forEach(function (e) {
        if (e.back) return;
        if (rank[u] + 1 > rank[e.to]) rank[e.to] = rank[u] + 1;
        if (--indeg[e.to] === 0) queue.push(e.to);
      });
    }
    if (visited < mainNodes.length) {
      mainNodes.forEach(function (n) { if (indeg[n.id] > 0) rank[n.id] = rank[n.id] || 0; });
    }
    sideOf.forEach(function (anchorId, id) { rank[id] = rank[anchorId] || 0; });

    var maxRank = 0;
    mainNodes.forEach(function (n) { maxRank = Math.max(maxRank, rank[n.id]); });

    /* --- 4-3 建立每一層的項目（節點 / 轉折用虛擬點 / 側邊補充） --- */
    var layers = [];
    for (var r = 0; r <= maxRank; r++) layers.push([]);

    var itemOf = new Map();
    mainNodes.forEach(function (n) {
      var item = { kind: 'node', node: n, layer: rank[n.id], pos: 0 };
      itemOf.set(n.id, item);
      layers[item.layer].push(item);
    });

    var anchorCount = {};
    nodes.forEach(function (n) {
      if (!sideOf.has(n.id)) return;
      var anchorId = sideOf.get(n.id);
      var k = anchorCount[anchorId] = (anchorCount[anchorId] || 0);
      anchorCount[anchorId]++;
      var item = {
        kind: 'node', node: n, layer: rank[n.id], pos: 0,
        pinAnchor: anchorId,
        pinOffset: (k % 2 ? -1 : 1) * (0.22 + 0.08 * Math.floor(k / 2))
      };
      itemOf.set(n.id, item);
      var layer = layers[item.layer];
      var at = layer.indexOf(itemOf.get(anchorId));
      if (at < 0) layer.push(item); else layer.splice(at + 1, 0, item);
    });

    var upNb = new Map(), downNb = new Map();
    function connect(a, b) { // a、b 位於相鄰層
      var lo = a.layer < b.layer ? a : b, hi = lo === a ? b : a;
      if (!downNb.has(lo)) downNb.set(lo, []);
      if (!upNb.has(hi)) upNb.set(hi, []);
      downNb.get(lo).push(hi);
      upNb.get(hi).push(lo);
    }

    var dummySeq = 0;
    mainEdges.forEach(function (e) {
      var a = itemOf.get(e.from), b = itemOf.get(e.to);
      var chain = [a];
      var step = b.layer > a.layer ? 1 : -1;
      if (Math.abs(b.layer - a.layer) > 1) {
        for (var lr = a.layer + step; lr !== b.layer; lr += step) {
          var d = { kind: 'dummy', id: 'd' + (dummySeq++), edge: e, layer: lr, pos: 0 };
          // 轉折點放在「上一節」附近，而不是整層的最後面，初始排序才不會太亂
          var prev = chain[chain.length - 1];
          var at = layers[prev.layer].indexOf(prev);
          layers[lr].splice(at < 0 ? layers[lr].length : Math.min(layers[lr].length, at + 1), 0, d);
          chain.push(d);
        }
      }
      chain.push(b);
      e.chain = chain;
      if (a.layer !== b.layer) for (var i = 1; i < chain.length; i++) connect(chain[i - 1], chain[i]);
    });
    sideEdges.forEach(function (e) { e.chain = [itemOf.get(e.from), itemOf.get(e.to)]; });

    function setPos(layer) { layer.forEach(function (it, i) { it.pos = i; }); }
    layers.forEach(setPos);

    /* --- 4-4 重心法降低交錯 --- */
    function reorder(layer, nbr) {
      if (layer.length < 2) return;
      var base = new Map();
      layer.forEach(function (it) {
        if (it.pinAnchor) return;
        var ns = nbr.get(it);
        var v = (ns && ns.length) ? median(ns.map(function (n) { return n.pos; })) : it.pos;
        base.set(it, v);
      });
      layer.forEach(function (it) {
        if (!it.pinAnchor) return;
        var anchor = itemOf.get(it.pinAnchor);
        var av = base.has(anchor) ? base.get(anchor) : (anchor ? anchor.pos : it.pos);
        base.set(it, av + it.pinOffset);
      });
      layer.sort(function (a, b) {
        var d = base.get(a) - base.get(b);
        return d || (a.pos - b.pos);
      });
      setPos(layer);
    }

    // v、w 相鄰時，v 在前造成的交錯數
    function pairCross(v, w, nbr) {
      var vs = nbr.get(v), ws = nbr.get(w);
      if (!vs || !ws || !vs.length || !ws.length) return 0;
      var c = 0;
      for (var i = 0; i < vs.length; i++) {
        for (var j = 0; j < ws.length; j++) if (vs[i].pos > ws[j].pos) c++;
      }
      return c;
    }

    // 重心法收斂後，再試著對調相鄰節點；這一步才是真正把交錯壓下來的關鍵
    // allowEqual：連「一樣好」的對調也接受，用來跨過平手的局面
    // （例如分流出去的兩條支線要整組左右換位，中間每一步都不會立刻變好）
    function transpose(allowEqual) {
      var changed = true, guard = 0;
      while (changed && guard++ < 12) {
        changed = false;
        layers.forEach(function (layer) {
          for (var i = 0; i + 1 < layer.length; i++) {
            var v = layer[i], w = layer[i + 1];
            if (v.pinAnchor || w.pinAnchor) continue;   // 側邊補充說明要黏著來源節點
            var keep = pairCross(v, w, upNb) + pairCross(v, w, downNb);
            var swap = pairCross(w, v, upNb) + pairCross(w, v, downNb);
            if (swap < keep || (allowEqual && swap === keep && keep > 0)) {
              layer[i] = w; layer[i + 1] = v;
              w.pos = i; v.pos = i + 1;
              changed = true;
            }
          }
        });
      }
    }

    function totalCrossings() {
      var total = 0;
      layers.forEach(function (layer) {
        var seq = [];
        layer.forEach(function (item) {
          var ns = downNb.get(item);
          if (!ns || !ns.length) return;
          ns.slice().sort(function (a, b) { return a.pos - b.pos; })
            .forEach(function (n) { seq.push(n.pos); });
        });
        for (var i = 0; i < seq.length; i++) {
          for (var j = i + 1; j < seq.length; j++) if (seq[i] > seq[j]) total++;
        }
      });
      return total;
    }

    function snapshot() { return layers.map(function (l) { return l.slice(); }); }
    function restore(snap) {
      snap.forEach(function (l, r) { layers[r] = l; setPos(l); });
    }

    // 每一輪都記錄交錯數，最後採用最好的一輪（而不是最後一輪）
    var best = snapshot(), bestCross = totalCrossings();
    for (var it = 0; it < 14; it++) {
      var r;
      if (it % 2 === 0) { for (r = 1; r <= maxRank; r++) reorder(layers[r], upNb); }
      else { for (r = maxRank - 1; r >= 0; r--) reorder(layers[r], downNb); }
      transpose(it % 4 === 3);
      var now = totalCrossings();
      if (now < bestCross) { bestCross = now; best = snapshot(); }
    }
    restore(best);

    /* --- 4-5 座標 --- */
    function cross(item) { return item.kind === 'dummy' ? 1 : (dir === 'TD' ? item.node.w : item.node.h); }
    function along(item) { return item.kind === 'dummy' ? 1 : (dir === 'TD' ? item.node.h : item.node.w); }

    // 線上文字也要佔位子：替兩端的節點多留一點橫向空間，
    // 否則同一個分流點拉出的幾條線，標籤會互相覆蓋或壓到節點。
    linkEdges.forEach(function (e) {
      if (!e.label) { e.labelW = 0; e.labelH = 0; return; }
      e.labelW = Math.round(textWidth(e.label, 12, 500)) + 12;
      e.labelH = 20;
      var pad = (dir === 'TD' ? e.labelW : e.labelH) * 0.35;
      [itemOf.get(e.from), itemOf.get(e.to)].forEach(function (item) {
        if (item) item.labelPad = Math.max(item.labelPad || 0, pad);
      });
    });
    function halfCross(item) { return cross(item) / 2 + (item.labelPad || 0); }

    layers.forEach(function (layer) {
      var x = 0;
      layer.forEach(function (item) {
        x += halfCross(item);
        item.c = x;
        x += halfCross(item) + NODE_GAP;
      });
    });

    function refine(layer, nbr) {
      if (!layer.length) return;
      var want = layer.map(function (item) {
        if (item.pinAnchor) {
          var anchor = itemOf.get(item.pinAnchor);
          if (anchor) return anchor.c + item.pinOffset * 400;
        }
        var ns = nbr.get(item);
        if (!ns || !ns.length) return item.c;
        var sum = 0;
        ns.forEach(function (n) { sum += n.c; });
        return sum / ns.length;
      });
      var i;
      for (i = 1; i < layer.length; i++) {
        var minC = want[i - 1] + halfCross(layer[i - 1]) + halfCross(layer[i]) + NODE_GAP;
        if (want[i] < minC) want[i] = minC;
      }
      for (i = layer.length - 2; i >= 0; i--) {
        var maxC = want[i + 1] - halfCross(layer[i + 1]) - halfCross(layer[i]) - NODE_GAP;
        if (want[i] > maxC) want[i] = maxC;
      }
      for (i = 1; i < layer.length; i++) {
        var minC2 = want[i - 1] + halfCross(layer[i - 1]) + halfCross(layer[i]) + NODE_GAP;
        if (want[i] < minC2) want[i] = minC2;
      }
      layer.forEach(function (item, k) { item.c = want[k]; });
    }

    for (var p = 0; p < 8; p++) {
      for (var ra = 1; ra <= maxRank; ra++) refine(layers[ra], upNb);
      for (var rb = maxRank - 1; rb >= 0; rb--) refine(layers[rb], downNb);
    }

    // 層與層之間的距離，至少要放得下跨過這裡的線上文字（LR 時標籤是橫躺的，特別吃空間）
    var gapAfter = [];
    for (var gi = 0; gi < Math.max(1, maxRank); gi++) gapAfter[gi] = RANK_GAP;
    linkEdges.forEach(function (e) {
      if (!e.label) return;
      var ra = rank[e.from], rb = rank[e.to];
      if (ra == null || rb == null || ra === rb) return;
      var need = (dir === 'TD' ? e.labelH : e.labelW) + 26;
      for (var r = Math.min(ra, rb); r < Math.max(ra, rb); r++) {
        gapAfter[r] = Math.max(gapAfter[r] || RANK_GAP, need);
      }
    });

    var acc = 0;
    layers.forEach(function (layer, r) {
      var thick = 1;
      layer.forEach(function (item) { thick = Math.max(thick, along(item)); });
      layer.forEach(function (item) { item.a = acc + thick / 2; });
      acc += thick + (gapAfter[r] || RANK_GAP);
    });

    var all = [];
    layers.forEach(function (layer) { layer.forEach(function (item) { all.push(item); }); });
    all.forEach(function (item) {
      if (dir === 'TD') { item.x = item.c; item.y = item.a; }
      else { item.x = item.a; item.y = item.c; }
      if (item.kind === 'node') { item.node.x = item.x; item.node.y = item.y; }
    });

    /* --- 4-6 邊的座標 --- */
    var outEdges = [];
    linkEdges.forEach(function (e) {
      var chain = e.chain;
      if (!chain) return;
      var pts = chain.map(function (item) { return { x: item.x, y: item.y }; });
      var a = byId.get(e.from), b = byId.get(e.to);
      pts[0] = clipToNode(a, pts[0], pts[1]);
      pts[pts.length - 1] = clipToNode(b, pts[pts.length - 1], pts[pts.length - 2]);
      outEdges.push({
        from: e.from, to: e.to, dashed: e.dashed, arrow: e.arrow,
        label: e.label, labelW: e.labelW, labelH: e.labelH,
        style: e.style, styleName: e.styleName, pts: pts, line: e.line
      });
    });
    selfEdges.forEach(function (e) {
      var n = byId.get(e.from);
      outEdges.push({
        from: e.from, to: e.to, dashed: e.dashed, arrow: e.arrow,
        label: e.label,
        labelW: e.label ? Math.round(textWidth(e.label, 12, 500)) + 12 : 0,
        labelH: e.label ? 20 : 0,
        style: e.style, styleName: e.styleName, selfLoop: true, node: n, pts: [], line: e.line
      });
    });

    placeLabels(nodes, outEdges);

    /* --- 4-7 邊界 --- */
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function (n) {
      if (n.x == null) return;
      minX = Math.min(minX, n.x - n.w / 2); maxX = Math.max(maxX, n.x + n.w / 2);
      minY = Math.min(minY, n.y - n.h / 2); maxY = Math.max(maxY, n.y + n.h / 2);
    });
    outEdges.forEach(function (ed) {
      ed.pts.forEach(function (pt) {
        minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x);
        minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
      });
      if (ed.selfLoop && ed.node) maxX = Math.max(maxX, ed.node.x + ed.node.w / 2 + 60);
      if (ed.labelPos) {
        minX = Math.min(minX, ed.labelPos.x - ed.labelW / 2);
        maxX = Math.max(maxX, ed.labelPos.x + ed.labelW / 2);
        minY = Math.min(minY, ed.labelPos.y - ed.labelH / 2);
        maxY = Math.max(maxY, ed.labelPos.y + ed.labelH / 2);
      }
    });
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }

    var dx = PAD - minX, dy = PAD - minY;
    nodes.forEach(function (n) { if (n.x != null) { n.x += dx; n.y += dy; } });
    outEdges.forEach(function (ed) {
      ed.pts.forEach(function (pt) { pt.x += dx; pt.y += dy; });
      if (ed.labelPos) { ed.labelPos.x += dx; ed.labelPos.y += dy; }
    });

    return {
      nodes: nodes.filter(function (n) { return n.x != null; }),
      edges: outEdges,
      width: Math.round(maxX - minX + PAD * 2),
      height: Math.round(maxY - minY + PAD * 2),
      direction: dir,
      title: model.title,
      crossings: bestCross
    };
  }

  /* =========================================================
   * 5) SVG 繪製
   * =======================================================*/

  var SVG_CSS = [
    '.fc-text{font-family:' + FONT + ';}',
    '.fc-title{font-size:17px;font-weight:700;fill:#0f172a;}',
    '.fc-shape{fill:#ffffff;stroke:#94a3b8;stroke-width:1.5;}',
    '.fc-label{fill:#0f172a;font-weight:500;}',
    '.fc-diamond .fc-shape{fill:#eef2ff;stroke:#818cf8;}',
    '.fc-diamond .fc-label{fill:#312e81;}',
    '.fc-note .fc-shape{fill:#fefce8;stroke:#eab308;stroke-width:1.2;}',
    '.fc-note .fc-label{fill:#713f12;font-weight:400;}',
    '.fc-line{fill:none;stroke:#64748b;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}',
    '.fc-line.dashed{stroke-dasharray:7 5;}',
    '.fc-arrow{fill:#64748b;stroke:none;}',
    '.fc-edge-label-bg{fill:#ffffff;stroke:#e2e8f0;stroke-width:1;}',
    '.fc-edge-label-text{fill:#475569;font-size:12px;font-weight:500;}',
    '.fc-empty{fill:#94a3b8;font-size:14px;}'
  ].join('\n');

  function el(tag, attrs, text) {
    var node = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    if (text != null) node.textContent = text;
    return node;
  }

  function norm(v) {
    var len = Math.sqrt(v.x * v.x + v.y * v.y) || 1;
    return { x: v.x / len, y: v.y / len };
  }

  // 沿著折線取 t（0~1）位置的點，並回傳該處的法線方向
  function pointAlong(pts, t) {
    var seg = [], total = 0, i, d;
    for (i = 1; i < pts.length; i++) {
      d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      seg.push(d); total += d;
    }
    var want = total * t, acc = 0;
    for (i = 0; i < seg.length; i++) {
      if (acc + seg[i] >= want || i === seg.length - 1) {
        var len = seg[i] || 1;
        var r = Math.max(0, Math.min(1, (want - acc) / len));
        var a = pts[i], b = pts[i + 1];
        return {
          x: a.x + (b.x - a.x) * r,
          y: a.y + (b.y - a.y) * r,
          nx: -(b.y - a.y) / len,
          ny: (b.x - a.x) / len
        };
      }
      acc += seg[i];
    }
    return { x: pts[0].x, y: pts[0].y, nx: 0, ny: 0 };
  }

  function polyMid(pts) {
    var total = 0, i, seg = [];
    for (i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      seg.push(d); total += d;
    }
    var half = total / 2, acc = 0;
    for (i = 0; i < seg.length; i++) {
      if (acc + seg[i] >= half) {
        var t = seg[i] ? (half - acc) / seg[i] : 0;
        return {
          x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
          y: pts[i].y + (pts[i + 1].y - pts[i].y) * t
        };
      }
      acc += seg[i];
    }
    return pts[0];
  }

  var ARROW_LEN = 10, ARROW_HALF = 4.2;

  function edgeGeometry(ed, dir) {
    if (ed.selfLoop) {
      var n = ed.node;
      var x0 = n.x + n.w / 2 - 2, y0 = n.y - n.h / 4;
      var x1 = n.x + n.w / 2 - 2, y1 = n.y + n.h / 4;
      var bulge = 58;
      return {
        d: 'M' + x0 + ' ' + y0 + 'C' + (x0 + bulge) + ' ' + (y0 - 16) + ' ' +
           (x1 + bulge) + ' ' + (y1 + 16) + ' ' + x1 + ' ' + y1,
        tip: { x: x1, y: y1 },
        tangent: { x: -1, y: 0 },
        mid: { x: x0 + bulge * 0.78, y: n.y }
      };
    }

    var pts = ed.pts.map(function (p) { return { x: p.x, y: p.y }; });
    var last = pts[pts.length - 1], prev = pts[pts.length - 2] || pts[0];
    var tangent;
    if (pts.length === 2) {
      tangent = norm({ x: last.x - prev.x, y: last.y - prev.y });
    } else {
      var ctrl = dir === 'TD'
        ? { x: last.x, y: (prev.y + last.y) / 2 }
        : { x: (prev.x + last.x) / 2, y: last.y };
      var t = { x: last.x - ctrl.x, y: last.y - ctrl.y };
      tangent = (t.x || t.y) ? norm(t) : norm({ x: last.x - prev.x, y: last.y - prev.y });
    }

    var tip = { x: last.x, y: last.y };
    if (ed.arrow) {
      last.x -= tangent.x * (ARROW_LEN - 2);
      last.y -= tangent.y * (ARROW_LEN - 2);
    }

    var d = 'M' + pts[0].x + ' ' + pts[0].y;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      if (pts.length === 2) { d += 'L' + b.x + ' ' + b.y; break; }
      if (dir === 'TD') {
        var my = (a.y + b.y) / 2;
        d += 'C' + a.x + ' ' + my + ' ' + b.x + ' ' + my + ' ' + b.x + ' ' + b.y;
      } else {
        var mx = (a.x + b.x) / 2;
        d += 'C' + mx + ' ' + a.y + ' ' + mx + ' ' + b.y + ' ' + b.x + ' ' + b.y;
      }
    }
    return { d: d, tip: tip, tangent: tangent, mid: polyMid(pts), pts: pts };
  }

  /* 線上文字的擺放：同一個分流點拉出的線在中點附近很近，
     標籤一長就會互相覆蓋，所以讓每個標籤沿著自己的線找一個沒人佔的位置。 */
  var LABEL_T = [0.5, 0.42, 0.58, 0.34, 0.66, 0.27, 0.73, 0.2, 0.8];
  var LABEL_OFFSET = [0, 13, -13];

  function boxHit(a, b, pad) {
    return Math.abs((a.x + a.w / 2) - (b.x + b.w / 2)) < (a.w + b.w) / 2 + pad &&
           Math.abs((a.y + a.h / 2) - (b.y + b.h / 2)) < (a.h + b.h) / 2 + pad;
  }

  function placeLabels(nodes, edges) {
    var placed = [];
    var nodeBoxes = nodes.filter(function (n) { return n.x != null; }).map(function (n) {
      return { x: n.x - n.w / 2, y: n.y - n.h / 2, w: n.w, h: n.h };
    });

    edges.forEach(function (ed) {
      if (!ed.label) return;
      var w = ed.labelW, h = ed.labelH;
      function boxAt(pt) { return { x: pt.x - w / 2, y: pt.y - h / 2, w: w, h: h }; }

      if (ed.selfLoop) {
        ed.labelPos = { x: ed.node.x + ed.node.w / 2 + 43, y: ed.node.y };
        placed.push(boxAt(ed.labelPos));
        return;
      }
      if (!ed.pts || ed.pts.length < 2) return;

      var fallback = polyMid(ed.pts);
      var best = null, freeOfLabels = null;
      for (var oi = 0; oi < LABEL_OFFSET.length && !best; oi++) {
        for (var ti = 0; ti < LABEL_T.length; ti++) {
          var p = pointAlong(ed.pts, LABEL_T[ti]);
          var c = { x: p.x + p.nx * LABEL_OFFSET[oi], y: p.y + p.ny * LABEL_OFFSET[oi] };
          var box = boxAt(c);
          var k, bad = false;
          for (k = 0; k < placed.length; k++) if (boxHit(box, placed[k], 4)) { bad = true; break; }
          if (bad) continue;
          if (!freeOfLabels) freeOfLabels = { c: c, box: box };
          for (k = 0; k < nodeBoxes.length; k++) if (boxHit(box, nodeBoxes[k], 0)) { bad = true; break; }
          if (bad) continue;
          best = { c: c, box: box };
          break;
        }
      }

      var chosen = best || freeOfLabels || { c: fallback, box: boxAt(fallback) };
      ed.labelPos = chosen.c;
      placed.push(chosen.box);
    });
  }

  function arrowPath(tip, tangent) {
    var bx = tip.x - tangent.x * ARROW_LEN, by = tip.y - tangent.y * ARROW_LEN;
    var nx = -tangent.y, ny = tangent.x;
    return 'M' + tip.x + ' ' + tip.y +
      'L' + (bx + nx * ARROW_HALF) + ' ' + (by + ny * ARROW_HALF) +
      'L' + (bx - nx * ARROW_HALF) + ' ' + (by - ny * ARROW_HALF) + 'Z';
  }

  function drawNode(n) {
    var g = el('g', {
      class: 'fc-node fc-' + n.type, 'data-id': n.id,
      'data-style': n.styleName || null
    });
    // 自訂顏色要用 inline style，否則會被 <style> 裡的預設值蓋掉
    var shapeStyle = n.style
      ? 'fill:' + n.style.fill + ';stroke:' + n.style.stroke + ';stroke-width:2'
      : null;
    var hw = n.w / 2, hh = n.h / 2;
    if (n.type === 'diamond') {
      g.appendChild(el('polygon', {
        class: 'fc-shape', style: shapeStyle,
        points: [n.x + ' ' + (n.y - hh), (n.x + hw) + ' ' + n.y, n.x + ' ' + (n.y + hh), (n.x - hw) + ' ' + n.y].join(' ')
      }));
    } else {
      g.appendChild(el('rect', {
        class: 'fc-shape', style: shapeStyle,
        x: n.x - hw, y: n.y - hh, width: n.w, height: n.h,
        rx: n.type === 'round' ? 12 : 2, ry: n.type === 'round' ? 12 : 2
      }));
    }
    var text = el('text', {
      class: 'fc-text fc-label', x: n.x, y: n.y,
      style: n.style ? 'fill:' + n.style.text : null,
      'font-size': n.fontSize, 'font-weight': n.fontWeight,
      'text-anchor': 'middle', 'dominant-baseline': 'central'
    });
    var start = -(n.lines.length - 1) * n.lineHeight / 2;
    n.lines.forEach(function (line, i) {
      text.appendChild(el('tspan', { x: n.x, dy: i === 0 ? start : n.lineHeight }, line));
    });
    g.appendChild(text);
    return g;
  }

  function drawEdge(ed, geo) {
    var g = el('g', { class: 'fc-edge', 'data-style': ed.styleName || null });
    var color = ed.style ? ed.style.stroke : null;
    g.appendChild(el('path', {
      class: 'fc-line' + (ed.dashed ? ' dashed' : ''), d: geo.d,
      style: color ? 'stroke:' + color : null
    }));
    if (ed.arrow) {
      g.appendChild(el('path', {
        class: 'fc-arrow', d: arrowPath(geo.tip, geo.tangent),
        style: color ? 'fill:' + color : null
      }));
    }
    if (ed.label) {
      var at = ed.labelPos || geo.mid;
      var w = ed.labelW || (textWidth(ed.label, 12, 500) + 12), h = ed.labelH || 20;
      g.appendChild(el('rect', {
        class: 'fc-edge-label-bg', x: at.x - w / 2, y: at.y - h / 2,
        width: w, height: h, rx: 5, ry: 5,
        style: color ? 'stroke:' + mix(color, '#ffffff', 0.6) : null
      }));
      g.appendChild(el('text', {
        class: 'fc-text fc-edge-label-text', x: at.x, y: at.y,
        style: ed.style ? 'fill:' + ed.style.text : null,
        'text-anchor': 'middle', 'dominant-baseline': 'central'
      }, ed.label));
    }
    return g;
  }

  // 產生一張圖的 <svg>。回傳 {svg, width, height, layout}
  function draw(model) {
    var lay = layout(model);
    var titleH = lay.title ? 46 : 0;
    var W = Math.max(lay.width, lay.title ? textWidth(lay.title, 17, 700) + 80 : 0);
    var H = lay.height + titleH;

    var svg = el('svg', {
      xmlns: NS, class: 'fc-svg', width: '100%', height: '100%',
      'data-width': W, 'data-height': H
    });
    svg.appendChild(el('style', null, SVG_CSS));

    var root = el('g', { class: 'fc-root' });
    svg.appendChild(root);

    if (lay.title) {
      root.appendChild(el('text', {
        class: 'fc-text fc-title', x: W / 2, y: 26, 'text-anchor': 'middle', 'dominant-baseline': 'central'
      }, lay.title));
    }

    var body = el('g', { class: 'fc-body', transform: 'translate(' + ((W - lay.width) / 2) + ',' + titleH + ')' });
    root.appendChild(body);

    if (lay.empty) {
      body.appendChild(el('text', {
        class: 'fc-text fc-empty', x: W / 2, y: 60, 'text-anchor': 'middle'
      }, '目前沒有任何節點'));
    }

    var gEdges = el('g', { class: 'fc-edges' });
    var gNodes = el('g', { class: 'fc-nodes' });
    body.appendChild(gEdges);
    body.appendChild(gNodes);

    lay.edges.forEach(function (ed) {
      gEdges.appendChild(drawEdge(ed, edgeGeometry(ed, lay.direction)));
    });
    lay.nodes.forEach(function (n) { gNodes.appendChild(drawNode(n)); });

    return { svg: svg, width: W, height: H, layout: lay };
  }

  // 解析 + 繪製並塞進容器
  function renderInto(container, source) {
    var res = parse(source);
    var drawn;
    try {
      drawn = draw(res.model);
    } catch (err) {
      res.errors.push({ line: 0, msg: '繪製失敗：' + (err && err.message ? err.message : err) });
      drawn = draw({ title: '', direction: 'TD', nodes: new Map(), edges: [] });
    }
    container.innerHTML = '';
    container.appendChild(drawn.svg);
    return {
      model: res.model, errors: res.errors, svg: drawn.svg,
      width: drawn.width, height: drawn.height, layout: drawn.layout
    };
  }

  /* =========================================================
   * 6) 縮放 / 平移
   * =======================================================*/

  function attachViewport(svg, width, height) {
    var root = svg.querySelector('.fc-root');
    var st = { k: 1, tx: 0, ty: 0 };
    var dragging = false, last = null;

    function apply() {
      root.setAttribute('transform', 'translate(' + st.tx + ',' + st.ty + ') scale(' + st.k + ')');
    }
    function box() {
      var r = svg.getBoundingClientRect();
      return { w: r.width || 800, h: r.height || 600 };
    }
    function fit() {
      var b = box();
      st.k = Math.min(b.w / (width + 24), b.h / (height + 24), 1.4);
      if (!isFinite(st.k) || st.k <= 0) st.k = 1;
      st.tx = (b.w - width * st.k) / 2;
      st.ty = (b.h - height * st.k) / 2;
      apply();
    }
    function zoomAt(factor, cx, cy) {
      var k2 = Math.min(4, Math.max(0.15, st.k * factor));
      var ratio = k2 / st.k;
      st.tx = cx - (cx - st.tx) * ratio;
      st.ty = cy - (cy - st.ty) * ratio;
      st.k = k2;
      apply();
    }
    function zoom(factor) {
      var b = box();
      zoomAt(factor, b.w / 2, b.h / 2);
    }

    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = svg.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    svg.addEventListener('pointerdown', function (e) {
      dragging = true; last = { x: e.clientX, y: e.clientY };
      svg.setPointerCapture(e.pointerId);
      svg.style.cursor = 'grabbing';
    });
    svg.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      st.tx += e.clientX - last.x;
      st.ty += e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      apply();
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      svg.style.cursor = 'grab';
      try { svg.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    svg.style.cursor = 'grab';
    svg.style.touchAction = 'none';

    // 視窗大小改變後，避免整張圖被推出畫面外
    function clamp() {
      var b = box();
      var w = width * st.k, h = height * st.k;
      st.tx = Math.min(b.w - 80, Math.max(80 - w, st.tx));
      st.ty = Math.min(b.h - 80, Math.max(80 - h, st.ty));
      apply();
    }

    fit();
    return {
      fit: fit,
      zoom: zoom,
      clamp: clamp,
      scale: function () { return st.k; },
      get: function () { return { k: st.k, tx: st.tx, ty: st.ty }; },
      set: function (s) {
        if (!s) return;
        st.k = s.k; st.tx = s.tx; st.ty = s.ty;
        apply();
      }
    };
  }

  /* =========================================================
   * 7) 匯出 / 編碼 / 小工具
   * =======================================================*/

  function toSVGString(svg, width, height) {
    var clone = svg.cloneNode(true);
    var root = clone.querySelector('.fc-root');
    if (root) root.removeAttribute('transform');
    clone.setAttribute('xmlns', NS);
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);
    clone.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    var bg = el('rect', { x: 0, y: 0, width: width, height: height, fill: '#ffffff' });
    clone.insertBefore(bg, clone.querySelector('.fc-root'));
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
  }

  function toPNGBlob(svgString, width, height, scale, cb) {
    var url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }));
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (blob) { cb(blob); }, 'image/png');
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function encode(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decode(str) {
    var s = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // 從網址取出原始碼：?src=（base64url）、?text=（URL 編碼）、或 #src=
  function sourceFromLocation(loc) {
    loc = loc || global.location;
    var out = null;
    try {
      var q = new URLSearchParams(loc.search);
      if (q.get('src')) out = decode(q.get('src'));
      else if (q.get('text')) out = q.get('text');
      if (out == null && loc.hash && loc.hash.length > 1) {
        var h = new URLSearchParams(loc.hash.slice(1));
        if (h.get('src')) out = decode(h.get('src'));
        else if (h.get('text')) out = h.get('text');
      }
    } catch (err) { return null; }
    return out;
  }

  function buildViewURL(text, base) {
    var href = base || new URL('../view/', global.location.href).href;
    return href + (href.indexOf('?') >= 0 ? '&' : '?') + 'src=' + encode(text);
  }

  function copyText(text) {
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  global.FlowScript = {
    SPEC: SPEC,
    EXAMPLE: EXAMPLE,
    COLORS: COLORS,
    COLOR_NAMES: COLOR_NAMES,
    resolveStyle: resolveStyle,
    parse: parse,
    layout: layout,
    draw: draw,
    renderInto: renderInto,
    attachViewport: attachViewport,
    toSVGString: toSVGString,
    toPNGBlob: toPNGBlob,
    download: download,
    encode: encode,
    decode: decode,
    sourceFromLocation: sourceFromLocation,
    buildViewURL: buildViewURL,
    copyText: copyText
  };
})(window);
