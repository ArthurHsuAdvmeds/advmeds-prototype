/* ============================================================================
   small_tool 共用：JSON 解析／輸出，以及各工具頁共用的畫面接線
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

  /* ---------- 解析 ---------- */

  function JsonError(message, pos, src) {
    this.name = 'JsonError';
    this.message = message;
    this.pos = pos;
    this.src = src;
    var before = src.slice(0, pos).split('\n');
    this.line = before.length;
    this.col = before[before.length - 1].length + 1;
  }
  JsonError.prototype = Object.create(Error.prototype);
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

  function escapeHtml(s) {
    return s.replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; });
  }
  function byKey(a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; }

  // indent 給空字串就是壓成一行；html 為 true 時每個值包一層 <span class="j-…"> 供上色
  function stringify(node, opt) {
    opt = opt || {};
    var indent = opt.indent == null ? '  ' : opt.indent;
    var pretty = indent !== '';
    var out = [];

    function tok(cls, raw) {
      out.push(opt.html ? '<span class="j-' + cls + '">' + escapeHtml(raw) + '</span>' : raw);
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

  /* ---------- 小工具 ---------- */

  function formatBytes(text) {
    var b = new Blob([text]).size;
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1024 / 1024).toFixed(2) + ' MB';
  }
  function lineCount(text) {
    var count = 1;
    for (var p = text.indexOf('\n'); p >= 0; p = text.indexOf('\n', p + 1)) count++;
    return count;
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }

  function download(text, name) {
    var url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  var toastTimer = 0;
  function toast(message) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
      el.offsetWidth;   // 先排版一次，第一次出現才有淡入
    }
    el.textContent = message;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2000);
  }

  // file:// 下瀏覽器不會自動載入目錄裡的 index.html，本機直接開檔時把結尾是 / 的相對連結補上
  function fixLocalLinks(root) {
    if (location.protocol !== 'file:') return;
    (root || document).querySelectorAll('a[href^="./"],a[href^="../"]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href.slice(-1) === '/') a.setAttribute('href', href + 'index.html');
    });
  }

  /* ---------- 工具頁接線 ----------
     頁面要有 #input、#output、#status、#inMeta、#outMeta，
     按鈕用 data-act（paste / sample / clear / copy / download），
     選項用 data-opt（radio 取 value、checkbox 取 checked），選項會記在 localStorage，輸入內容不會。

     cfg.convert(src, opts) 回傳 { node | text, notes, error, hint }，或直接丟 JsonError：
       node  → 依選項排版並上色；text → 原樣顯示（解開後不是 JSON 的字串）
       notes → 狀態列的說明；error → 有結果但內容有問題時附上的 JsonError
       hint  → { text, link, href }，點連結會把目前輸入帶到另一個工具頁                       */

  var OPT_KEY = 'small_tool.json.opts';
  var HANDOFF_KEY = 'small_tool.json.handoff';
  var HIGHLIGHT_LIMIT = 2000000;      // 結果超過這個字數就不上色，避免卡住
  var CHUNK_LINES = 100;
  var FILE_LIMIT = 20 * 1024 * 1024;
  var SNIP_RADIUS = 36;

  function mount(cfg) {
    var input = document.getElementById('input');
    var output = document.getElementById('output');
    var status = document.getElementById('status');
    var inMeta = document.getElementById('inMeta');
    var outMeta = document.getElementById('outMeta');
    var optEls = [].slice.call(document.querySelectorAll('[data-opt]'));
    var needResult = [].slice.call(document.querySelectorAll('[data-act="copy"],[data-act="download"]'));
    var plain = '', isJson = false, timer = 0;

    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }

    function storedOpts() {
      try { return JSON.parse(localStorage.getItem(OPT_KEY)) || {}; } catch (e) { return {}; }
    }
    function readOpts() {
      var o = {};
      optEls.forEach(function (c) {
        if (c.type === 'radio') { if (c.checked) o[c.dataset.opt] = c.value; }
        else o[c.dataset.opt] = c.checked;
      });
      return o;
    }
    function saveOpts() {
      var all = storedOpts(), now = readOpts();
      for (var k in now) all[k] = now[k];
      try { localStorage.setItem(OPT_KEY, JSON.stringify(all)); } catch (e) {}
    }
    function applyOpts(o) {
      optEls.forEach(function (c) {
        if (!(c.dataset.opt in o)) return;
        if (c.type === 'radio') { if (c.value === o[c.dataset.opt]) c.checked = true; }
        else c.checked = !!o[c.dataset.opt];
      });
    }

    // 結果每 CHUNK_LINES 行包成一塊，畫面外的區塊靠 CSS content-visibility 略過排版，幾 MB 的內容才不會卡住。
    // 值都不含換行（JSON 字串裡的換行一定是 \n 寫法），所以照行切不會切到 <span> 中間
    function chunked(html) {
      var lines = html.split('\n'), parts = [];
      for (var k = 0; k < lines.length; k += CHUNK_LINES) {
        var n = Math.min(CHUNK_LINES, lines.length - k);
        parts.push('<div class="chunk" style="--n:' + n + '">' + lines.slice(k, k + n).join('\n') + '</div>');
      }
      return parts.join('');
    }

    function setResult(text, json, html) {
      plain = text;
      isJson = json;
      if (html != null) output.innerHTML = chunked(html); else output.textContent = text;
      outMeta.textContent = text ? lineCount(text) + ' 行 · ' + formatBytes(text) : '';
      needResult.forEach(function (b) { b.disabled = !text; });
    }

    // 錯誤位置前後各取一小段，把出錯的那個字標起來
    function snippet(err) {
      var src = err.src, pos = err.pos;
      var ls = src.lastIndexOf('\n', pos - 1) + 1;
      var le = src.indexOf('\n', pos);
      if (le < 0) le = src.length;
      if (src[le - 1] === '\r') le--;
      var a = Math.max(ls, pos - SNIP_RADIUS), b = Math.min(le, pos + SNIP_RADIUS + 1);
      var pre = el('pre', 'status-snip');
      pre.appendChild(document.createTextNode((a > ls ? '…' : '') + src.slice(a, pos)));
      if (pos < le) {
        pre.appendChild(el('mark', '', src[pos]));
        pre.appendChild(document.createTextNode(src.slice(pos + 1, b) + (b < le ? '…' : '')));
      } else {
        pre.appendChild(el('mark', 'eof', ' '));
      }
      return pre;
    }

    function showStatus(kind, notes, err, hint) {
      status.textContent = '';
      status.className = 'status ' + kind;
      status.hidden = false;
      if (notes && notes.length) status.appendChild(el('div', 'status-msg', notes.join(' · ')));
      if (err) {
        var where = el('div', 'status-where', '第 ' + err.line + ' 行，第 ' + err.col + ' 個字元：' + err.message + ' ');
        // 錯誤位置對得上輸入框的原文時才提供跳轉（解開跳脫後的內容對不回去）
        if (err.src === input.value) {
          var jump = el('button', '', '跳到該位置');
          jump.type = 'button';
          jump.addEventListener('click', function () {
            input.setSelectionRange(err.pos, Math.min(err.pos + 1, input.value.length));
            input.blur();     // 先失焦再聚焦，瀏覽器才會把選取處捲進畫面
            input.focus();
          });
          where.appendChild(jump);
        }
        status.appendChild(where);
        status.appendChild(snippet(err));
      }
      if (hint) {
        var line = el('div', 'status-hint', hint.text);
        var link = el('a', '', hint.link);
        link.href = hint.href;
        link.addEventListener('click', function () {
          try { sessionStorage.setItem(HANDOFF_KEY, input.value); } catch (e) {}
        });
        line.appendChild(link);
        fixLocalLinks(line);
        status.appendChild(line);
      }
    }

    function render() {
      var src = input.value, opts = readOpts(), res;
      output.classList.toggle('wrap', !!opts.wrap);
      inMeta.textContent = src ? formatBytes(src) : '';
      if (!src.trim()) {
        status.hidden = true;
        setResult('', false);
        return;
      }
      try {
        res = cfg.convert(src, opts);
      } catch (e) {
        setResult('', false);
        if (e instanceof JsonError) showStatus('err', null, e, e.hint);
        else if (e instanceof RangeError) showStatus('err', ['巢狀層數太深，瀏覽器處理不了']);
        else throw e;
        return;
      }
      if (res.node) {
        var o = {
          indent: opts.indent === 'min' ? '' : opts.indent === 'tab' ? '\t' : opts.indent === '4' ? '    ' : '  ',
          sortKeys: !!opts.sort
        };
        var text = stringify(res.node, o);
        o.html = true;
        setResult(text, true, text.length <= HIGHLIGHT_LIMIT ? stringify(res.node, o) : escapeHtml(text));
      } else {
        setResult(res.text, false);
      }
      showStatus(res.error ? 'warn' : 'ok', res.notes, res.error, res.hint);
    }

    function setInput(text) {
      input.value = text;
      output.scrollTop = 0;
      render();
    }

    var actions = {
      paste: function () {
        var manual = '請直接在輸入框按 Ctrl + V 貼上';
        if (!navigator.clipboard || !navigator.clipboard.readText) { toast('這個瀏覽器不能直接讀取剪貼簿，' + manual); return; }
        navigator.clipboard.readText().then(setInput, function () { toast('沒有取得剪貼簿權限，' + manual); });
      },
      sample: function () { setInput(cfg.sample); },
      clear: function () { setInput(''); input.focus(); },
      copy: function () {
        copyText(plain).then(
          function () { toast('已複製結果'); },
          function () { toast('複製失敗，請在結果區按 Ctrl + A 全選後複製'); }
        );
      },
      download: function () { download(plain, isJson ? cfg.fileName : cfg.fileName.replace(/\.json$/, '.txt')); }
    };
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b && actions[b.dataset.act]) actions[b.dataset.act]();
    });

    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(render, input.value.length > 200000 ? 350 : 80);
    });
    optEls.forEach(function (c) {
      c.addEventListener('change', function () { saveOpts(); render(); });
    });

    // 結果區按 Ctrl + A 只選結果，不要選到整頁
    output.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        getSelection().selectAllChildren(output);
      }
    });

    // 把檔案拖進輸入區直接讀取
    var pane = input.closest('.pane');
    function hasFiles(e) { return e.dataTransfer && [].indexOf.call(e.dataTransfer.types, 'Files') >= 0; }
    pane.addEventListener('dragover', function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      pane.classList.add('drop');
    });
    pane.addEventListener('dragleave', function () { pane.classList.remove('drop'); });
    pane.addEventListener('drop', function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      pane.classList.remove('drop');
      var file = e.dataTransfer.files[0];
      if (!file) return;
      if (file.size > FILE_LIMIT) { toast('檔案超過 20 MB，瀏覽器處理不了'); return; }
      var reader = new FileReader();
      reader.onload = function () { setInput(String(reader.result)); };
      reader.readAsText(file);
    });

    applyOpts(storedOpts());
    fixLocalLinks();
    var handoff = null;
    try {
      handoff = sessionStorage.getItem(HANDOFF_KEY);
      sessionStorage.removeItem(HANDOFF_KEY);
    } catch (e) {}
    if (handoff) input.value = handoff;
    render();
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
