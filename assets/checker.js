// AIO診断ツールの画面(/aio-checker/)。診断そのものは worker/ の API が行う。
(function () {
  "use strict";
  var form = document.getElementById("checker");
  var out = document.getElementById("checker-result");
  if (!form || !out) return;
  var api = (form.getAttribute("data-api") || "").replace(/\/$/, "");
  var input = document.getElementById("checker-url");
  var button = form.querySelector("button");
  var LABEL = { ok: "OK", warn: "注意", ng: "NG", info: "参考" };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function track(name, params) {
    if (typeof window.gtag === "function") window.gtag("event", name, params);
  }

  function render(r) {
    out.textContent = "";
    var box = el("section", "cr-summary");
    var score = el("div", "cr-score grade-" + r.grade);
    score.appendChild(el("strong", null, String(r.score)));
    score.appendChild(el("span", null, "/100"));
    box.appendChild(score);
    var info = el("div", "cr-info");
    info.appendChild(el("p", "cr-grade", "判定 " + r.grade + "(OK " + r.counts.ok + "・注意 " + r.counts.warn + "・NG " + r.counts.ng + ")"));
    var u = el("p", "small");
    u.appendChild(document.createTextNode("診断したURL: "));
    var a = el("a", null, r.finalUrl);
    a.href = r.finalUrl;
    a.target = "_blank";
    a.rel = "noopener nofollow";
    u.appendChild(a);
    info.appendChild(u);
    box.appendChild(info);
    out.appendChild(box);

    var groups = [];
    r.checks.forEach(function (c) {
      if (groups.indexOf(c.group) < 0) groups.push(c.group);
    });
    var order = { ng: 0, warn: 1, ok: 2, info: 3 };
    groups.forEach(function (g) {
      var sec = el("section", "cr-group");
      sec.appendChild(el("h2", null, g));
      var ul = el("ul", "cr-list");
      r.checks.filter(function (c) { return c.group === g; })
        .sort(function (x, y) { return order[x.status] - order[y.status]; })
        .forEach(function (c) {
          var li = el("li", "cr-item st-" + c.status);
          var head = el("div", "cr-head");
          head.appendChild(el("span", "cr-badge", LABEL[c.status]));
          head.appendChild(el("strong", null, c.label));
          li.appendChild(head);
          li.appendChild(el("p", "cr-detail", c.detail));
          if (c.advice) li.appendChild(el("p", "cr-advice", c.advice));
          if (c.link) {
            var more = el("a", "cr-more", "くわしい解説を読む");
            more.href = c.link;
            li.appendChild(more);
          }
          ul.appendChild(li);
        });
      sec.appendChild(ul);
      if (g.indexOf("AIクローラー") === 0 && r.bots) sec.appendChild(botTable(r.bots));
      out.appendChild(sec);
    });
    var note = el("p", "small", "結果は " + new Date(r.checkedAt).toLocaleString("ja-JP") + " 時点です。同じURLの結果は10分間キャッシュされます。");
    out.appendChild(note);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function botTable(bots) {
    var d = el("details", "cr-bots");
    d.appendChild(el("summary", null, "AIクローラーごとの robots.txt の判定を見る"));
    var wrap = el("div", "table");
    var t = el("table");
    var tr = el("tr");
    ["クローラー", "用途", "判定"].forEach(function (h) { tr.appendChild(el("th", null, h)); });
    t.appendChild(tr);
    bots.forEach(function (b) {
      var row = el("tr");
      row.appendChild(el("td", null, b.ua + "(" + b.owner + ")"));
      row.appendChild(el("td", null, b.role + (b.search ? "" : "・学習用")));
      row.appendChild(el("td", b.allowed ? "ok" : (b.search ? "ng" : "warn"), (b.allowed ? "許可" : "ブロック") + (b.rule ? "(" + b.rule + ")" : "")));
      t.appendChild(row);
    });
    wrap.appendChild(t);
    d.appendChild(wrap);
    return d;
  }

  function fail(msg) {
    out.textContent = "";
    out.appendChild(el("p", "cr-error", msg));
  }

  function run(url) {
    if (!api) return fail("診断用のサーバーを準備中です。");
    button.disabled = true;
    out.textContent = "";
    out.appendChild(el("p", "cr-loading", "診断しています…(10秒ほどかかることがあります)"));
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 45000);
    fetch(api + "/api/check?url=" + encodeURIComponent(url), ctrl ? { signal: ctrl.signal } : {})
      .then(function (res) {
        return res.json().catch(function () { return { error: "診断サーバーから正しい応答がありませんでした。" }; });
      })
      .then(function (r) {
        if (r.error) {
          track("aio_check_error", { reason: r.error.slice(0, 90) });
          return fail(r.error);
        }
        render(r);
        var host = "";
        try { host = new URL(r.finalUrl).hostname; } catch (e) {}
        track("aio_check", { check_domain: host, check_score: r.score, check_grade: r.grade });
      })
      .catch(function () { fail("診断できませんでした。時間をおいてもう一度お試しください。"); })
      .then(function () {
        clearTimeout(timer);
        button.disabled = false;
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var url = input.value.trim();
    if (!url) return;
    try {
      var q = new URL(location.href);
      q.searchParams.set("url", url);
      history.replaceState(null, "", q.pathname + q.search);
    } catch (err) {}
    run(url);
  });

  var start = new URLSearchParams(location.search).get("url");
  if (start) {
    input.value = start;
    run(start);
  }
})();
