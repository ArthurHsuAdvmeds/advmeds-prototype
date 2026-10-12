/* ============================================================================
   small_tool 共用：工具頁的畫面接線
   ----------------------------------------------------------------------------
   「左邊輸入、右邊結果」的工具頁都用這一份：打字就即時轉換、狀態列、複製／下載、
   記住選項、把檔案拖進輸入區。轉換本身由各頁傳進來的 convert() 負責。

   window.SmallTool
     mount(cfg)                     → 接上畫面，回傳 tool：{ opts(), result(), setInput(text), setOpts(opts) }
     InputError(message, pos, src)  → 帶位置的錯誤（line / col 由 pos 算出），狀態列會標出那個字；
                                      不給 pos 就只顯示訊息
     escapeHtml(text)

   頁面要有 #input、#output、#status、#inMeta、#outMeta，
   按鈕用 data-act（paste / sample / clear / copy / download，或 cfg.actions 自訂的名稱），
   沒有結果時要停用的自訂按鈕加 data-needs-result，
   選項用 data-opt（radio 取 value、checkbox 取 checked）。選項會記在 localStorage，輸入內容不會。

   cfg
     convert(src, opts)  回傳 { text, html, notes, error, kind, hint, fileName }，或直接丟 InputError
         text      結果的純文字（複製、下載用的就是它）
         html      有給就用它顯示（上色用）；每一行都要是完整的 HTML，不能有跨行的標籤
         notes     狀態列的說明（字串陣列）
         error     有結果、但內容有問題時附上的 InputError
         kind      狀態列的顏色 ok / warn；沒給就看有沒有 error
         hint      { text, link, href } 連到另一個工具頁並把目前的輸入帶過去，
                   或 { text, link, action } 按下去執行 action(tool)
         fileName  這次結果的下載檔名（沒給就用 cfg.fileName）
     sample              範例內容，字串或 function (opts)
     fileName            下載檔名
     optKey              選項存在 localStorage 的鍵
     handoffKey          有給才支援工具之間帶輸入（sessionStorage 的鍵，兩頁要用同一個）
     actions             { 名稱: function (tool) }，對應 data-act
     onOptions(opts)     選項套用或變動後呼叫，讓頁面調整跟著選項變的文字
   ============================================================================ */
(function (global) {
  'use strict';

  function InputError(message, pos, src) {
    this.name = 'InputError';
    this.message = message;
    if (pos == null) return;
    this.pos = pos;
    this.src = src;
    var before = src.slice(0, pos).split('\n');
    this.line = before.length;
    this.col = before[before.length - 1].length + 1;
  }
  InputError.prototype = Object.create(Error.prototype);
  InputError.prototype.constructor = InputError;

  function escapeHtml(s) {
    return s.replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; });
  }

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
    var type = /\.json$/.test(name) ? 'application/json' : 'text/plain';
    var url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
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
    var needResult = [].slice.call(document.querySelectorAll('[data-act="copy"],[data-act="download"],[data-needs-result]'));
    var plain = '', fileName = cfg.fileName, timer = 0;
    var tool = {
      opts: readOpts,
      result: function () { return plain; },
      setInput: setInput,
      setOpts: function (o) { applyOpts(o); saveOpts(); optionsChanged(); render(); }
    };

    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }

    function storedOpts() {
      try { return JSON.parse(localStorage.getItem(cfg.optKey)) || {}; } catch (e) { return {}; }
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
      try { localStorage.setItem(cfg.optKey, JSON.stringify(all)); } catch (e) {}
    }
    function applyOpts(o) {
      optEls.forEach(function (c) {
        if (!(c.dataset.opt in o)) return;
        if (c.type === 'radio') { if (c.value === o[c.dataset.opt]) c.checked = true; }
        else c.checked = !!o[c.dataset.opt];
      });
    }
    function optionsChanged() {
      if (cfg.onOptions) cfg.onOptions(readOpts());
    }

    // 結果每 CHUNK_LINES 行包成一塊，畫面外的區塊靠 CSS content-visibility 略過排版，幾 MB 的內容才不會卡住
    function chunked(html) {
      var lines = html.split('\n'), parts = [];
      for (var k = 0; k < lines.length; k += CHUNK_LINES) {
        var n = Math.min(CHUNK_LINES, lines.length - k);
        parts.push('<div class="chunk" style="--n:' + n + '">' + lines.slice(k, k + n).join('\n') + '</div>');
      }
      return parts.join('');
    }

    function setResult(text, html, name) {
      plain = text;
      fileName = name || cfg.fileName;
      // 沒有結果時要讓結果區保持 :empty，提示文字才會出現
      if (text) output.innerHTML = chunked(html != null ? html : escapeHtml(text));
      else output.textContent = '';
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
        pre.appendChild(el('mark', 'eof', ' '));   // 內容到這裡就沒了：標一格不會被吃掉的空白
      }
      return pre;
    }

    function showStatus(kind, notes, err, hint) {
      status.textContent = '';
      status.className = 'status ' + kind;
      status.hidden = false;
      if (notes && notes.length) status.appendChild(el('div', 'status-msg', notes.join(' · ')));
      if (err && err.pos == null) {
        status.appendChild(el('div', 'status-msg', err.message));
      } else if (err) {
        var where = el('div', 'status-where', '第 ' + err.line + ' 行，第 ' + err.col + ' 個字元：' + err.message + ' ');
        // 錯誤位置對得上輸入框的原文時才提供跳轉（轉換過的內容對不回去）
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
        var line = el('div', 'status-hint', hint.text), link;
        if (hint.href) {
          link = el('a', '', hint.link);
          link.href = hint.href;
          link.addEventListener('click', function () {
            if (!cfg.handoffKey) return;
            try { sessionStorage.setItem(cfg.handoffKey, input.value); } catch (e) {}
          });
        } else {
          link = el('button', '', hint.link);
          link.type = 'button';
          link.addEventListener('click', function () { hint.action(tool); });
        }
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
        setResult('');
        return;
      }
      try {
        res = cfg.convert(src, opts);
      } catch (e) {
        if (!(e instanceof InputError)) throw e;
        setResult('');
        showStatus('err', null, e, e.hint);
        return;
      }
      setResult(res.text, res.html, res.fileName);
      showStatus(res.kind || (res.error ? 'warn' : 'ok'), res.notes, res.error, res.hint);
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
      sample: function () { setInput(typeof cfg.sample === 'function' ? cfg.sample(readOpts()) : cfg.sample); },
      clear: function () { setInput(''); input.focus(); },
      copy: function () {
        copyText(plain).then(
          function () { toast('已複製結果'); },
          function () { toast('複製失敗，請在結果區按 Ctrl + A 全選後複製'); }
        );
      },
      download: function () { download(plain, fileName); }
    };
    for (var name in cfg.actions) actions[name] = cfg.actions[name];
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b && actions[b.dataset.act]) actions[b.dataset.act](tool);
    });

    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(render, input.value.length > 200000 ? 350 : 80);
    });
    optEls.forEach(function (c) {
      c.addEventListener('change', function () { saveOpts(); optionsChanged(); render(); });
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
    optionsChanged();
    fixLocalLinks();
    var handoff = null;
    if (cfg.handoffKey) {
      try {
        handoff = sessionStorage.getItem(cfg.handoffKey);
        sessionStorage.removeItem(cfg.handoffKey);
      } catch (e) {}
    }
    if (handoff) input.value = handoff;
    render();
    return tool;
  }

  global.SmallTool = {
    InputError: InputError,
    escapeHtml: escapeHtml,
    mount: mount
  };
})(window);
