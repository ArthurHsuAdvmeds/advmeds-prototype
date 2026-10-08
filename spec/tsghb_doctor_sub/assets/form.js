/* 編輯帳號（前臺 front/）與基本資料（後臺 back/）共用的表單行為：
   次專科多選下拉、市內電話區碼、簽章圖片預覽、儲存。兩頁的欄位 id 相同，這支腳本不分前後臺。 */
(function () {
  "use strict";

  // 次專科選項。color 是選項色塊與已選標籤的底色；五個都是群組標籤，目前同一個顏色
  var SUB_SPECIALTIES = [
    { id: "child", name: "兒童青少年精神科", color: "#12ACAC" },
    { id: "addiction", name: "藥酒癮精神科", color: "#12ACAC" },
    { id: "geriatric", name: "老人精神科", color: "#12ACAC" },
    { id: "community", name: "社區精神科", color: "#12ACAC" },
    { id: "forensic", name: "司法精神科", color: "#12ACAC" }
  ];

  var AREA_CODES = ["02", "03", "037", "04", "049", "05", "06", "07", "08", "089", "082", "0826", "0836"];

  // 前臺與後臺改的是同一個帳號：存在 sessionStorage，兩頁讀同一份，關掉分頁就清空。資料為虛構
  var STORE_KEY = "tsghb-doctor-sub:profile";
  var DEFAULT_PROFILE = { name: "王大明", mobile: "0911223345", area: "", tel: "", email: "wang.daming@example.com", sub: [] };

  var ICON = {
    tag: '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill="currentColor" fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h7.1a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8l-6.6 6.6a2 2 0 0 1-2.8 0L2.6 12a2 2 0 0 1-.6-1.4V3.5zM6.5 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>' +
      '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M14.5 2.5l7.3 7.3a2.6 2.6 0 0 1 0 3.6l-6.3 6.3"/></svg>',
    x: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    caret: '<svg class="ss-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>'
  };

  /* ---------- 次專科多選下拉 ---------- */
  function initSubSelect(root, initial) {
    var selected = initial.slice();
    var visible = SUB_SPECIALTIES;   // 搜尋後還看得到的選項
    var active = -1;                 // 鍵盤移到 visible 的第幾個，-1 是還沒移
    var open = false;
    var listId = root.id + "-list";

    root.innerHTML =
      '<div class="ss-control" tabindex="0" role="combobox" aria-haspopup="listbox" aria-expanded="false"' +
        ' aria-controls="' + listId + '" aria-labelledby="' + root.getAttribute("data-labelledby") + '">' +
        '<div class="ss-chips"></div>' + ICON.caret +
      '</div>' +
      '<div class="ss-panel" hidden>' +
        '<div class="ss-search">' +
          '<input type="text" placeholder="搜尋" aria-label="搜尋次專科" autocomplete="off" aria-controls="' + listId + '">' +
          '<span class="ss-search-ico">' + ICON.search + '</span>' +
        '</div>' +
        '<ul class="ss-list" id="' + listId + '" role="listbox" aria-multiselectable="true" aria-label="次專科"></ul>' +
        '<p class="ss-empty" hidden>查無符合的次專科</p>' +
      '</div>';

    var control = root.querySelector(".ss-control");
    var chips = root.querySelector(".ss-chips");
    var panel = root.querySelector(".ss-panel");
    var search = root.querySelector(".ss-search input");
    var list = root.querySelector(".ss-list");
    var empty = root.querySelector(".ss-empty");

    function isSelected(id) { return selected.indexOf(id) !== -1; }

    // 已選的標籤照選項清單的順序排，不照點選的先後
    function renderChips() {
      chips.textContent = "";
      var picked = SUB_SPECIALTIES.filter(function (o) { return isSelected(o.id); });
      if (!picked.length) {
        var ph = document.createElement("span");
        ph.className = "ss-placeholder";
        ph.textContent = "請選擇";
        chips.appendChild(ph);
        return;
      }
      picked.forEach(function (o) {
        var chip = document.createElement("span");
        chip.className = "ss-chip";
        chip.style.setProperty("--ss-color", o.color);
        chip.innerHTML = ICON.tag + '<span class="ss-chip-text"></span>' +
          '<button type="button" class="ss-chip-x">' + ICON.x + '</button>';
        chip.querySelector(".ss-chip-text").textContent = o.name;
        var x = chip.querySelector(".ss-chip-x");
        x.setAttribute("data-id", o.id);
        x.setAttribute("aria-label", "移除" + o.name);
        chips.appendChild(chip);
      });
    }

    function renderList() {
      var q = search.value.trim().toLowerCase();
      visible = SUB_SPECIALTIES.filter(function (o) { return o.name.toLowerCase().indexOf(q) !== -1; });
      if (active >= visible.length) active = visible.length - 1;

      list.textContent = "";
      visible.forEach(function (o, i) {
        var li = document.createElement("li");
        li.className = "ss-opt" + (i === active ? " is-active" : "");
        li.id = listId + "-" + o.id;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(isSelected(o.id)));
        li.setAttribute("data-id", o.id);
        var swatch = document.createElement("span");
        swatch.className = "ss-swatch";
        swatch.style.setProperty("--ss-color", o.color);
        var text = document.createElement("span");
        text.textContent = o.name;
        li.appendChild(swatch);
        li.appendChild(text);
        list.appendChild(li);
      });
      list.hidden = !visible.length;
      empty.hidden = !!visible.length;

      if (visible[active]) search.setAttribute("aria-activedescendant", listId + "-" + visible[active].id);
      else search.removeAttribute("aria-activedescendant");
    }

    function toggle(id) {
      var at = selected.indexOf(id);
      if (at === -1) selected.push(id); else selected.splice(at, 1);
      renderChips();
      renderList();
    }

    function setOpen(next) {
      if (open === next) return;
      open = next;
      root.classList.toggle("is-open", open);
      control.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
      if (!open) { root.classList.remove("is-up"); return; }

      search.value = "";
      active = -1;
      renderList();
      // 下方放不下、上方又比較寬的時候往上開
      var box = control.getBoundingClientRect();
      var below = window.innerHeight - box.bottom;
      root.classList.toggle("is-up", below < panel.offsetHeight + 12 && box.top > below);
      // 觸控裝置不自動進搜尋框，免得螢幕鍵盤一彈出來就把選項蓋住
      if (window.matchMedia("(pointer: fine)").matches) search.focus();
    }

    function move(step) {
      if (!visible.length) return;
      if (active === -1) active = step > 0 ? 0 : visible.length - 1;
      else active = (active + step + visible.length) % visible.length;
      renderList();
      list.children[active].scrollIntoView({ block: "nearest" });
    }

    control.addEventListener("click", function (e) {
      var x = e.target.closest(".ss-chip-x");
      if (!x) { setOpen(!open); return; }
      toggle(x.getAttribute("data-id"));
      control.focus();   // 被按的 × 已經重畫掉了，焦點放回控制項
    });

    // mousedown 先擋掉，點選項時焦點才會留在搜尋框
    list.addEventListener("mousedown", function (e) { e.preventDefault(); });
    list.addEventListener("click", function (e) {
      var li = e.target.closest(".ss-opt");
      if (li) toggle(li.getAttribute("data-id"));
    });

    search.addEventListener("input", function () {
      active = search.value.trim() ? 0 : -1;   // 有打字就先停在第一個符合的，按 Enter 直接選
      renderList();
    });

    root.addEventListener("keydown", function (e) {
      var onRemove = !!e.target.closest(".ss-chip-x");
      if (!open) {
        if (e.target === control && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        control.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        move(e.key === "ArrowDown" ? 1 : -1);
      } else if (e.key === "Enter" && !onRemove) {
        e.preventDefault();   // 不要送出整張表單
        if (visible[active]) toggle(visible[active].id);
      } else if (e.key === "Tab") {
        setOpen(false);
      }
    });

    document.addEventListener("pointerdown", function (e) {
      if (open && !root.contains(e.target)) setOpen(false);
    });

    renderChips();
    return { get: function () { return selected.slice(); } };
  }

  /* ---------- 帳號資料 ---------- */
  function loadProfile() {
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null"); } catch (err) {}
    var p = {};
    Object.keys(DEFAULT_PROFILE).forEach(function (k) {
      p[k] = saved && typeof saved[k] === typeof DEFAULT_PROFILE[k] ? saved[k] : DEFAULT_PROFILE[k];
    });
    // 只留清單裡還有的次專科
    p.sub = (Array.isArray(p.sub) ? p.sub : []).filter(function (id) {
      return SUB_SPECIALTIES.some(function (o) { return o.id === id; });
    });
    return p;
  }

  function setUserName(name) {
    document.querySelectorAll("[data-user-name]").forEach(function (el) { el.textContent = name; });
  }

  var toastEl, toastTimer;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "f-toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2000);
  }

  var form = document.getElementById("profile-form");
  var f = {
    name: document.getElementById("f-name"),
    mobile: document.getElementById("f-mobile"),
    area: document.getElementById("f-area"),
    tel: document.getElementById("f-tel"),
    email: document.getElementById("f-email")
  };
  var nameError = document.getElementById("f-name-error");
  var profile = loadProfile();

  AREA_CODES.forEach(function (code) {
    var opt = document.createElement("option");
    opt.value = opt.textContent = code;
    f.area.appendChild(opt);
  });
  Object.keys(f).forEach(function (k) { f[k].value = profile[k]; });
  setUserName(profile.name);
  var sub = initSubSelect(document.getElementById("f-sub"), profile.sub);

  /* ---------- 簽章圖片：只做本機預覽，不存 ---------- */
  var signInput = document.getElementById("f-sign");
  var signBox = signInput.closest(".f-upload");
  var signError = document.getElementById("f-sign-error");

  function clearSign() {
    signInput.value = "";
    signBox.parentNode.querySelectorAll("img, .f-upload-remove").forEach(function (el) { el.remove(); });
  }

  function showSign(src) {
    clearSign();
    var img = document.createElement("img");
    img.src = src;
    img.alt = "簽章圖片預覽";
    signBox.appendChild(img);

    var remove = document.createElement("button");
    remove.type = "button";
    remove.className = "f-upload-remove";
    remove.setAttribute("aria-label", "移除簽章圖片");
    remove.innerHTML = ICON.x;
    remove.addEventListener("click", clearSign);
    signBox.parentNode.appendChild(remove);
  }

  signInput.addEventListener("change", function () {
    var file = signInput.files[0];
    if (!file) return;
    clearSign();
    signError.hidden = file.type === "image/png";
    if (file.type !== "image/png") return;

    // 用 data URL 預覽而不是 blob 網址，移除或換圖時就不必管 revokeObjectURL 的時機
    var reader = new FileReader();
    reader.onload = function () { showSign(reader.result); };
    reader.readAsDataURL(file);
  });

  /* ---------- 儲存：必填只有姓名 ---------- */
  f.name.addEventListener("input", function () {
    f.name.classList.remove("is-invalid");
    f.name.removeAttribute("aria-invalid");
    nameError.hidden = true;
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = f.name.value.trim();
    if (!name) {
      f.name.classList.add("is-invalid");
      f.name.setAttribute("aria-invalid", "true");
      nameError.hidden = false;
      f.name.focus();
      return;
    }
    profile = {
      name: name,
      mobile: f.mobile.value.trim(),
      area: f.area.value,
      tel: f.tel.value.trim(),
      email: f.email.value.trim(),
      sub: sub.get()
    };
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(profile)); } catch (err) {}
    f.name.value = name;
    setUserName(name);
    toast("已儲存");
  });
})();
