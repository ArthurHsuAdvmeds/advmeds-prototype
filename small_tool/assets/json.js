/* ============================================================================
   small_tool 共用：JSON 解析／輸出（兩個 JSON 工具頁用，要先載入 tool.js）
   ----------------------------------------------------------------------------
   排版不走 JSON.parse → JSON.stringify，因為那樣會改到資料的寫法：
   40.0 會變成 40、超過 2^53 的整數會失真、重複的鍵會被吃掉。
   這裡把 JSON 讀成「保留原始寫法」的樹（數字與字串原樣留著），輸出時只動空白，
   語法有錯時回報第幾行第幾個字元。

   window.JsonTool
     parse(text)                           → 節點樹；不合法時丟 JsonError（message / pos / line / col / src）
     stringify(node, {indent, sortKeys, html})
     mount({ convert, sample, fileName })  → 接上輸入框、選項、結果區與按鈕

   節點：{t:'obj', members:[{key, value}]}、{t:'arr', items:[…]}、
        {t:'str'|'num'|'bool'|'null', raw}；key 與 raw 都是原文（字串含外層引號）。
   ============================================================================ */
(function (global) {
  'use strict';
  var T = global.SmallTool;

  /* ---------- 解析 ---------- */

  // 是 tool.js 的 InputError，狀態列才會標出錯誤位置
  function JsonError(message, pos, src) {
    T.InputError.call(this, message, pos, src);
    this.name = 'JsonError';
  }
  JsonError.prototype = Object.create(T.InputError.prototype);
  JsonError.prototype.constructor = JsonError;

  var RE_WS = /[ \t\n\r]*/y;
  var RE_NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
  var RE_PLAIN = /[^"\\\u0000-\u001f]*/y;   // 字串裡不需要特別處理的一段
  var RE_HEX4 = /[0-9a-fA-F]{4}/y;
  var RE_WORD = /[A-Za-z_$][\w$]*/y;

  function parse(src) {
    var i = src.charCodeAt(0) === 0xFEFF ? 1 : 0;   // 檔案開頭的 BOM
    var n = src.length;

    function fail(message, at) { throw new JsonError(message, at == null ? i : at, src); }
    function skip(re) { re.lastIndex = i; re.exec(src); i = re.lastIndex; }
    function ws() { skip(RE_WS); }

    function string() {
      var start = i;
      i++;
      for (;;) {
        skip(RE_PLAIN);
        if (i >= n) fail('字串少了結尾的雙引號', start);
        var c = src.charCodeAt(i);
        if (c === 34) { i++; return src.slice(start, i); }
        if (c === 92) {
          var e = src[i + 1];
          if (e === 'u') {
            RE_HEX4.lastIndex = i + 2;
            if (!RE_HEX4.test(src)) fail('\\u 後面要接 4 個十六進位數字');
            i += 6;
          } else if (e && '"\\/bfnrt'.indexOf(e) >= 0) {
            i += 2;
          } else {
            fail('不合法的跳脫寫法 \\' + (e || ''));
          }
        } else {
          fail(c === 10 || c === 13 ? '字串裡不能直接換行（要寫成 \\n）' : '字串裡有沒跳脫的控制字元');
        }
      }
    }

    function number() {
      var start = i;
      RE_NUM.lastIndex = i;
      var m = RE_NUM.exec(src);
      if (!m) fail('數字的寫法不對');
      i += m[0].length;
      // 01、1.、1e 這類寫法會在這裡停下來
      if (/[0-9.eE+\-]/.test(src[i] || '')) fail('數字的寫法不對', start);
      return m[0];
    }

    function object() {
      var members = [], comma = -1;
      i++;
      ws();
      if (src[i] === '}') { i++; return { t: 'obj', members: members }; }
      for (;;) {
        ws();
        if (i >= n) fail('物件少了結尾的 }');
        if (src[i] !== '"') {
          if (src[i] === '}' && comma >= 0) fail('最後一個項目後面多了逗號', comma);
          if (src[i] === "'") fail('鍵要用雙引號包起來，不能用單引號');
          fail('這裡應該是用雙引號包起來的鍵');
        }
        var key = string();
        ws();
        if (src[i] !== ':') fail(i >= n ? '鍵的後面少了冒號與值' : '鍵的後面應該接冒號 :');
        i++;
        members.push({ key: key, value: value() });
        ws();
        if (src[i] === ',') { comma = i; i++; continue; }
        if (src[i] === '}') { i++; return { t: 'obj', members: members }; }
        fail(i >= n ? '物件少了結尾的 }' : '這裡應該是逗號 , 或 }');
      }
    }

    function array() {
      var items = [], comma = -1;
      i++;
      ws();
      if (src[i] === ']') { i++; return { t: 'arr', items: items }; }
      for (;;) {
        ws();
        if (i >= n) fail('陣列少了結尾的 ]');
        if (src[i] === ']' && comma >= 0) fail('最後一個項目後面多了逗號', comma);
        items.push(value());
        ws();
        if (src[i] === ',') { comma = i; i++; continue; }
        if (src[i] === ']') { i++; return { t: 'arr', items: items }; }
        fail(i >= n ? '陣列少了結尾的 ]' : '這裡應該是逗號 , 或 ]');
      }
    }

    function value() {
      ws();
      if (i >= n) fail('內容到這裡就結束了，還少一個值');
      var c = src[i];
      if (c === '{') return object();
      if (c === '[') return array();
      if (c === '"') return { t: 'str', raw: string() };
      if (c === '-' || (c >= '0' && c <= '9')) return { t: 'num', raw: number() };
      RE_WORD.lastIndex = i;
      var word = (RE_WORD.exec(src) || [''])[0];
      if (word === 'true' || word === 'false') { i += word.length; return { t: 'bool', raw: word }; }
      if (word === 'null') { i += 4; return { t: 'null', raw: word }; }
      if (c === "'") fail('字串要用雙引號，不能用單引號');
      if (word) fail('不認得的內容 ' + word + '（字串要用雙引號包起來）');
      if ('}],:'.indexOf(c) >= 0) fail('這裡少了一個值');
      fail('這裡不應該出現 ' + c);
    }

    ws();
    if (i >= n) fail('沒有內容');
    var root = value();
    ws();
    if (i < n) fail('JSON 已經結束，後面還有多餘的內容');
    return root;
  }

  /* ---------- 輸出 ---------- */

  function byKey(a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; }

  // indent 給空字串就是壓成一行；html 為 true 時每個值包一層 <span class="j-…"> 供上色
  function stringify(node, opt) {
    opt = opt || {};
    var indent = opt.indent == null ? '  ' : opt.indent;
    var pretty = indent !== '';
    var out = [];

    function tok(cls, raw) {
      out.push(opt.html ? '<span class="j-' + cls + '">' + T.escapeHtml(raw) + '</span>' : raw);
    }
    function walk(node, pad) {
      var inner = pad + indent, k;
      if (node.t === 'obj') {
        var ms = node.members;
        if (!ms.length) { out.push('{}'); return; }
        if (opt.sortKeys) ms = ms.slice().sort(byKey);
        out.push('{');
        for (k = 0; k < ms.length; k++) {
          if (pretty) out.push('\n' + inner);
          tok('key', ms[k].key);
          out.push(pretty ? ': ' : ':');
          walk(ms[k].value, inner);
          if (k < ms.length - 1) out.push(',');
        }
        if (pretty) out.push('\n' + pad);
        out.push('}');
      } else if (node.t === 'arr') {
        if (!node.items.length) { out.push('[]'); return; }
        out.push('[');
        for (k = 0; k < node.items.length; k++) {
          if (pretty) out.push('\n' + inner);
          walk(node.items[k], inner);
          if (k < node.items.length - 1) out.push(',');
        }
        if (pretty) out.push('\n' + pad);
        out.push(']');
      } else {
        tok(node.t, node.raw);
      }
    }
    walk(node, '');
    return out.join('');
  }

  /* ---------- 工具頁接線 ----------
     兩個 JSON 工具頁共用。cfg.convert(src, opts) 回傳 { node | text, notes, error, hint }，或直接丟 JsonError：
       node → 依縮排、排序選項排版並上色；text → 原樣顯示（解開後不是 JSON 的字串）
     狀態列、按鈕、選項記憶等其餘的事交給 tool.js 的 SmallTool.mount()，notes / error / hint 的意思見該檔開頭。 */

  var HIGHLIGHT_LIMIT = 2000000;      // 結果超過這個字數就不上色，避免卡住

  function mount(cfg) {
    return T.mount({
      sample: cfg.sample,
      fileName: cfg.fileName,
      optKey: 'small_tool.json.opts',
      handoffKey: 'small_tool.json.handoff',
      convert: function (src, opts) {
        try {
          var res = cfg.convert(src, opts);
          if (!res.node) {
            res.fileName = cfg.fileName.replace(/\.json$/, '.txt');
            return res;
          }
          var o = {
            indent: opts.indent === 'min' ? '' : opts.indent === 'tab' ? '\t' : opts.indent === '4' ? '    ' : '  ',
            sortKeys: !!opts.sort
          };
          res.text = stringify(res.node, o);
          o.html = true;
          // 值都不含換行（JSON 字串裡的換行一定是 \n 寫法），所以每一行都是完整的 HTML
          res.html = res.text.length <= HIGHLIGHT_LIMIT ? stringify(res.node, o) : null;
          return res;
        } catch (e) {
          if (e instanceof RangeError) throw new T.InputError('巢狀層數太深，瀏覽器處理不了');
          throw e;
        }
      }
    });
  }

  /* 範例資料（虛構）。checkCode 結尾的 \u001b 是儀器輸出常見的控制字元，用來示範跳脫寫法會原樣保留 */
  var SAMPLE = '{"deviceId":"DEMO-270","userId":"U000123","gender":"F","age":35.0,"height":160.0,"weight":55.0,' +
    '"bmi":21.5,"bodyFatPercentage":25.0,"skeletalMuscleMass":22.4,"basalMetabolicRate":1280,"score":78,' +
    '"testDate":"2026/01/01","testTime":"09:30:00","checkCode":"000/000/000\\u001b",' +
    '"segments":[{"part":"leftArm","leanMass":1.9,"fatMass":1.1},{"part":"trunk","leanMass":18.2,"fatMass":7.4}],' +
    '"mobilePhone":"","note":null,"synced":true}';

  global.JsonTool = {
    JsonError: JsonError,
    parse: parse,
    stringify: stringify,
    mount: mount,
    SAMPLE: SAMPLE
  };
})(window);
