// ロードマップの進み具合と、AIO診断の履歴(このブラウザの localStorage だけに保存。サーバーには送らない)
// 使う場所: /roadmap/(チェックリスト)、/aio-checker/(前回との比較・次にやるステップ)、トップと記事(進み具合・チェック)
(function () {
  "use strict";
  var KEY_DONE = "aio-roadmap-done";
  var KEY_HIST = "aio-check-history";
  var KEY_LAST = "aio-check-last";

  function load(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; }
  }
  function save(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function a(text, href) {
    var x = el("a", null, text);
    x.href = href;
    return x;
  }
  function day(t) {
    var d = new Date(t);
    return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
  }
  function host(u) {
    try { return new URL(u).hostname; } catch (e) { return u; }
  }

  var STEPS = [];
  try { STEPS = JSON.parse(document.getElementById("roadmap-data").textContent); } catch (e) {}
  var done = load(KEY_DONE, {});

  function lastCheck() {
    var url = load(KEY_LAST, "");
    var h = load(KEY_HIST, {})[url];
    return h && h.length ? { url: url, entry: h[h.length - 1] } : null;
  }

  // ---------------------------------------------------------------- チェックと進み具合
  function refresh() {
    var boxes = document.querySelectorAll("input[data-step]");
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].checked = !!done[boxes[i].getAttribute("data-step")];
      var li = boxes[i].closest(".rm-step");
      if (li) li.classList.toggle("is-done", boxes[i].checked);
    }
    var n = STEPS.filter(function (s) { return done[s.id]; }).length;
    var last = lastCheck();
    var totals = document.querySelectorAll(".rm-total");
    for (var j = 0; j < totals.length; j++) {
      var t = totals[j];
      if (!n && !last && !document.querySelector(".rm-steps")) continue; // トップでは、使い始めた人にだけ出す
      t.hidden = false;
      t.querySelector(".rm-count").textContent = n + " / " + STEPS.length + " ステップ";
      t.querySelector(".rm-bar span").style.width = (STEPS.length ? Math.round(n / STEPS.length * 100) : 0) + "%";
      var lp = t.querySelector(".rm-last");
      lp.textContent = "";
      if (last) {
        lp.appendChild(document.createTextNode("最新の診断:" + host(last.url) + " " + last.entry.score + "点(" + day(last.entry.t) + ") "));
        lp.appendChild(a("もう一度診断する", "/aio-checker/?url=" + encodeURIComponent(last.url)));
      } else {
        lp.appendChild(document.createTextNode("まだ診断していません。 "));
        lp.appendChild(a("AIO診断ツールで診断する", "/aio-checker/"));
      }
    }
    // 各ステップに、最新の診断結果を出す
    var sts = document.querySelectorAll(".rm-status[data-checks]");
    for (var k = 0; k < sts.length; k++) {
      var p = sts[k];
      p.textContent = "";
      p.className = "rm-status small";
      if (!last || !last.entry.checks) continue;
      var ids = p.getAttribute("data-checks").split(" ");
      var c = { ng: 0, warn: 0, ok: 0 };
      ids.forEach(function (id) { var s = last.entry.checks[id]; if (s in c) c[s]++; });
      if (!c.ng && !c.warn && !c.ok) continue;
      var bad = c.ng || c.warn;
      p.classList.add(c.ng ? "st-ng" : c.warn ? "st-warn" : "st-ok");
      p.appendChild(document.createTextNode("最新の診断(" + host(last.url) + "):" +
        (bad ? (c.ng ? "NG " + c.ng + " " : "") + (c.warn ? "注意 " + c.warn + " " : "") + "→ 直すと点数が上がります " : "OK " + c.ok + " 項目 ")));
      p.appendChild(a(bad ? "診断結果を見る" : "診断し直す", "/aio-checker/?url=" + encodeURIComponent(last.url)));
    }
  }

  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t || !t.getAttribute || !t.getAttribute("data-step")) return;
    var id = t.getAttribute("data-step");
    if (t.checked) done[id] = Date.now(); else delete done[id];
    save(KEY_DONE, done);
    refresh();
    if (typeof window.gtag === "function") window.gtag("event", "roadmap_step", { step_id: id, checked: t.checked });
  });

  // ---------------------------------------------------------------- 診断のあと(/aio-checker/)
  window.addEventListener("aio:checked", function (ev) {
    var r = ev.detail;
    if (!r || !r.finalUrl || !r.checks) return;
    var statuses = {};
    r.checks.forEach(function (c) { statuses[c.id] = c.status; });
    var hist = load(KEY_HIST, {});
    var list = hist[r.finalUrl] || [];
    var t = r.checkedAt ? new Date(r.checkedAt).getTime() : Date.now();
    var prev = null;
    for (var i = list.length - 1; i >= 0; i--) { if (list[i].t !== t) { prev = list[i]; break; } }
    if (!list.length || list[list.length - 1].t !== t) list.push({ t: t, score: r.score, grade: r.grade, checks: statuses });
    hist[r.finalUrl] = list.slice(-12);
    var urls = Object.keys(hist);
    if (urls.length > 30) {
      urls.sort(function (x, y) { return hist[x][hist[x].length - 1].t - hist[y][hist[y].length - 1].t; });
      urls.slice(0, urls.length - 30).forEach(function (u) { delete hist[u]; });
    }
    save(KEY_HIST, hist);
    save(KEY_LAST, r.finalUrl);
    if (!done.check) { done.check = Date.now(); save(KEY_DONE, done); }
    renderPanel(r, prev, statuses);
    refresh();
  });

  function renderPanel(r, prev, now) {
    var out = document.getElementById("checker-result");
    if (!out) return;
    var old = out.querySelector(".cr-progress");
    if (old) old.remove();
    var box = el("section", "cr-progress");
    box.appendChild(el("h2", null, "前回からの変化と、次にやること"));

    // 前回との比較
    if (prev) {
      var diff = r.score - prev.score;
      box.appendChild(el("p", "cr-diff " + (diff > 0 ? "up" : diff < 0 ? "down" : ""),
        "前回(" + day(prev.t) + ")" + prev.score + "点 → 今回 " + r.score + "点(" + (diff > 0 ? "+" : "") + diff + ")"));
      var labels = {};
      r.checks.forEach(function (c) { labels[c.id] = c.label; });
      var fixed = Object.keys(now).filter(function (id) { return now[id] === "ok" && (prev.checks[id] === "ng" || prev.checks[id] === "warn"); });
      var broke = Object.keys(now).filter(function (id) { return (now[id] === "ng" || now[id] === "warn") && prev.checks[id] === "ok"; });
      if (fixed.length) box.appendChild(el("p", "small", "直った項目:" + fixed.map(function (id) { return labels[id]; }).join("、")));
      if (broke.length) box.appendChild(el("p", "small cr-broke", "前回OKだったのに悪くなった項目:" + broke.map(function (id) { return labels[id]; }).join("、") + "(サイトの更新で設定が変わっていないか確かめてください)"));
    } else {
      box.appendChild(el("p", null, "このURLの初めての診断です。結果はこのブラウザに保存されるので、直したあとにもう一度診断すると、点数の変化と直った項目が表示されます。"));
    }

    // ロードマップのどのステップを進めるか
    var todo = STEPS.map(function (s) {
      var ng = 0, warn = 0;
      s.checks.forEach(function (id) { if (now[id] === "ng") ng++; else if (now[id] === "warn") warn++; });
      return { s: s, ng: ng, warn: warn };
    }).filter(function (x) { return x.ng || x.warn; })
      .sort(function (x, y) { return (y.ng > 0) - (x.ng > 0) || x.s.n - y.s.n; });
    if (todo.length) {
      box.appendChild(el("p", null, "ロードマップで進めるステップ(解説と直し方があります):"));
      var ol = el("ul", "cr-steps");
      todo.slice(0, 4).forEach(function (x) {
        var li = el("li");
        li.appendChild(el("span", "lv lv-" + ({ "初級": "basic", "中級": "mid", "上級": "adv" }[x.s.level] || "basic"), x.s.level));
        li.appendChild(a("STEP " + x.s.n + " " + x.s.title, "/roadmap/#step-" + x.s.id));
        li.appendChild(el("span", "small", "(" + (x.ng ? "NG " + x.ng : "") + (x.ng && x.warn ? "・" : "") + (x.warn ? "注意 " + x.warn : "") + ")"));
        ol.appendChild(li);
      });
      box.appendChild(ol);
    } else {
      var p = el("p", null, "診断で確かめられる項目はすべてOKです。次は数字を見て伸ばす段階です。");
      p.appendChild(document.createTextNode(" "));
      p.appendChild(a("上級のステップへ進む", "/roadmap/#level-adv"));
      box.appendChild(p);
    }

    // また来る理由:1か月後の再診断
    var next = new Date(Date.now() + 30 * 864e5);
    var ymd = next.getFullYear() + String(next.getMonth() + 1).padStart(2, "0") + String(next.getDate()).padStart(2, "0");
    var next2 = new Date(next.getTime() + 864e5);
    var ymd2 = next2.getFullYear() + String(next2.getMonth() + 1).padStart(2, "0") + String(next2.getDate()).padStart(2, "0");
    var again = location.origin + "/aio-checker/?url=" + encodeURIComponent(r.finalUrl);
    var cal = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("AIO診断(" + host(r.finalUrl) + ")") +
      "&dates=" + ymd + "/" + ymd2 + "&details=" + encodeURIComponent("今回 " + r.score + "点。もう一度診断して比べる: " + again);
    var re = el("p", "small");
    re.appendChild(document.createTextNode("サイトの更新で設定が変わることがあるので、月に1回の再診断がおすすめです。 "));
    var c = a("1か月後の再診断をGoogleカレンダーに入れる", cal);
    c.target = "_blank";
    c.rel = "noopener";
    re.appendChild(c);
    re.appendChild(document.createTextNode(" ・ "));
    re.appendChild(a("ロードマップで進み具合を見る", "/roadmap/"));
    box.appendChild(re);

    var anchor = out.querySelector(".cr-summary");
    if (anchor && anchor.nextSibling) out.insertBefore(box, anchor.nextSibling);
    else out.appendChild(box);
  }

  refresh();
})();
