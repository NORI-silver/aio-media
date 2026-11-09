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

  // はじめての方向け: なぜ大事か(やさしい言葉で)
  var WHY = {
    "robots": "robots.txt は、サイトの入口に貼る「どのロボットが入ってよいか」の案内板です。AIや検索エンジンのロボットは、まずこれを読みます。",
    "ai-search-bots": "ChatGPT や Perplexity などは、専用のロボットでページを読んでから答えに引用します。ここで入場を断っていると、どれだけ良い記事でもAIの答えに出てきません。",
    "ai-train-bots": "AIの「勉強用」に読むロボットです。断ってもAI検索には出られます。自社の文章をAIの学習に使わせたくないかどうか、という方針の問題です。",
    "indexable": "noindex は「検索結果に出さないで」、nosnippet は「文章を抜き出さないで」という指示です。どちらもAIの答えに引用されなくなります。テスト用に付けたまま公開してしまう事故がよくあります。",
    "llms": "llms.txt は、AI向けにサイトの目次を書いておくファイルです。まだ新しい仕組みで、Google検索は使っていません。なくても大きな問題はありません。",
    "sitemap": "サイトマップは、サイトにあるページの一覧表です。新しいページや更新したページを、検索エンジンやAIに早く見つけてもらえます。",
    "status": "ページを開いたときにサーバーが返す「結果の番号」です。200 なら正常。403 や 500 だと、ロボットはページを読めません。",
    "https": "通信が暗号化されているかどうかです。Google は HTTPS を推奨していて、ブラウザも http のサイトには「保護されていない通信」と表示します。",
    "title": "タイトルは検索結果やAIの出典リンクにそのまま表示される、ページの「名札」です。",
    "description": "検索結果でタイトルの下に出る説明文の候補です。AIがページの要点をつかむ手がかりにもなります。",
    "canonical": "同じ内容のページが複数のURLで見られるとき、「本物はこのURLです」と伝える指定です。評価が分散するのを防ぎます。",
    "lang": "ページが何語で書かれているかの指定です。翻訳や読み上げ、検索エンジンの言語判定に使われます。",
    "ogp": "LINE・X・Slack などでURLを共有したときに出る、タイトルと画像の設定です。",
    "structured-data": "構造化データは、ページの中身(記事・会社情報・FAQなど)を機械が読める形で書き添えたものです。人間には見えませんが、検索エンジンやAIがページを正しく理解する助けになります。",
    "entity": "「誰が書いたか・どの会社の情報か」がわかると、信頼できる情報源として扱われやすくなります。",
    "date": "いつの情報かがわかると、AIは新しく正確な情報を選びやすくなります。",
    "headings": "見出しは本の目次のようなものです。h1 がページの題名、h2 が章の見出し。AIは見出しを手がかりに、質問の答えになる部分を探します。",
    "text": "多くのAIロボットは、JavaScript を動かさずにページを読みます。後から JavaScript で文章を表示するサイトだと、AIには中身が空っぽに見えることがあります。",
    "speed": "サーバーの応答が遅いと、ロボットが途中であきらめたり、読む量を減らしたりします。訪問者の離脱にもつながります。"
  };
  // 中級者・上級者向け: 直し方の例
  var FIX = {
    "robots": "User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml",
    "ai-search-bots": "# AI検索用のロボットを許可する例(robots.txt)\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /",
    "indexable": "<!-- 削除する -->\n<meta name=\"robots\" content=\"noindex\">\n\n<!-- 公開するならこれで十分(書かなくてもOK) -->\n<meta name=\"robots\" content=\"index,follow,max-snippet:-1\">",
    "llms": "# サイト名\n\n> サイトの概要を1〜2文で。\n\n## 主なページ\n- [サービス紹介](https://example.com/service/): 何ができるか\n- [料金](https://example.com/price/): 料金プラン",
    "sitemap": "# robots.txt の最後に1行足す\nSitemap: https://example.com/sitemap.xml",
    "https": "# 例: .htaccess(Apache)で http → https に転送\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]",
    "title": "<title>AIO対策とは?今日からできる5つの手順|会社名</title>",
    "description": "<meta name=\"description\" content=\"ページの要点を80〜120字で。誰の、どんな悩みに、何がわかるかを書く。\">",
    "canonical": "<link rel=\"canonical\" href=\"https://example.com/page/\">",
    "lang": "<html lang=\"ja\">",
    "ogp": "<meta property=\"og:title\" content=\"ページのタイトル\">\n<meta property=\"og:description\" content=\"説明文\">\n<meta property=\"og:image\" content=\"https://example.com/og.png\">",
    "structured-data": "<script type=\"application/ld+json\">\n{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"Article\",\n  \"headline\": \"記事のタイトル\",\n  \"datePublished\": \"2026-11-09\",\n  \"dateModified\": \"2026-11-09\",\n  \"author\": {\"@type\": \"Organization\", \"name\": \"会社名\", \"url\": \"https://example.com/about/\"}\n}\n</script>",
    "entity": "<script type=\"application/ld+json\">\n{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"Organization\",\n  \"name\": \"会社名\",\n  \"url\": \"https://example.com/\",\n  \"logo\": \"https://example.com/logo.png\",\n  \"sameAs\": [\"https://x.com/example\"]\n}\n</script>",
    "date": "<p>公開 <time datetime=\"2026-11-09\">2026年11月9日</time> ・ 更新 <time datetime=\"2026-11-20\">2026年11月20日</time></p>",
    "headings": "<h1>AIO対策とは?</h1>\n<h2>AIO対策で何が変わる?</h2>\n<h2>今日からできる5つの手順は?</h2>\n<h2>よくある質問</h2>"
  };
  var VERDICT = {
    A: "AI検索に読まれるための土台は、しっかり整っています。あとは中身(一次情報・具体的な答え)で差がつきます。",
    B: "土台はおおむね整っています。「まずやること」を直すと、AIにさらに読まれやすくなります。",
    C: "いくつか大事な設定が抜けています。「まずやること」から順に直していきましょう。",
    D: "AI検索に出るのを妨げている設定があります。まず「NG」の項目を直してください。"
  };

  function render(r) {
    out.textContent = "";
    var box = el("section", "cr-summary");
    var score = el("div", "cr-score grade-" + r.grade);
    score.appendChild(el("strong", null, String(r.score)));
    score.appendChild(el("span", null, "/100"));
    box.appendChild(score);
    var info = el("div", "cr-info");
    info.appendChild(el("p", "cr-grade", "判定 " + r.grade + "(OK " + r.counts.ok + "・注意 " + r.counts.warn + "・NG " + r.counts.ng + ")"));
    info.appendChild(el("p", "cr-verdict", VERDICT[r.grade] || ""));
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

    // まずやること(影響の大きい順に3つ)
    var todo = r.checks.filter(function (c) { return c.status === "ng" || c.status === "warn"; })
      .sort(function (x, y) { return (x.status === y.status ? 0 : x.status === "ng" ? -1 : 1) || (y.weight || 0) - (x.weight || 0); })
      .slice(0, 3);
    var pri = el("section", "cr-todo");
    pri.appendChild(el("h2", null, todo.length ? "まずやること" : "まずやること:ありません"));
    if (todo.length) {
      var ol = el("ol");
      todo.forEach(function (c) {
        var li = el("li");
        var jump = el("a", null, c.label);
        jump.href = "#cr-" + c.id;
        li.appendChild(jump);
        li.appendChild(el("span", "small", " — " + (c.advice || c.detail)));
        ol.appendChild(li);
      });
      pri.appendChild(ol);
    } else {
      pri.appendChild(el("p", null, "大きな問題は見つかりませんでした。次は、質問にずばり答える文章や一次情報(実際に試した結果・数字)を増やすと、AIに引用されやすくなります。"));
    }
    out.appendChild(pri);

    // 表示の切り替え
    var bar = el("div", "cr-bar");
    var lab = el("label");
    var hide = el("input");
    hide.type = "checkbox";
    hide.addEventListener("change", function () { out.classList.toggle("cr-hide-ok", hide.checked); });
    lab.appendChild(hide);
    lab.appendChild(document.createTextNode(" 問題のある項目だけ表示"));
    bar.appendChild(lab);
    out.appendChild(bar);

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
          li.id = "cr-" + c.id;
          var head = el("div", "cr-head");
          head.appendChild(el("span", "cr-badge", LABEL[c.status]));
          head.appendChild(el("strong", null, c.label));
          li.appendChild(head);
          li.appendChild(el("p", "cr-detail", c.detail));
          if (c.advice) li.appendChild(el("p", "cr-advice", c.advice));
          var extra = el("div", "cr-extra");
          if (WHY[c.id]) {
            var w = el("details");
            w.appendChild(el("summary", null, "これは何?なぜ大事?"));
            w.appendChild(el("p", null, WHY[c.id]));
            extra.appendChild(w);
          }
          if (FIX[c.id] && (c.status === "ng" || c.status === "warn")) {
            var f = el("details");
            f.appendChild(el("summary", null, "直し方の例(コード)"));
            f.appendChild(codeBlock(FIX[c.id]));
            extra.appendChild(f);
          }
          if (c.link) {
            var more = el("a", "cr-more", "くわしい解説を読む");
            more.href = c.link;
            extra.appendChild(more);
          }
          if (extra.childNodes.length) li.appendChild(extra);
          ul.appendChild(li);
        });
      sec.appendChild(ul);
      if (g.indexOf("AIクローラー") === 0 && r.bots) sec.appendChild(botTable(r.bots));
      out.appendChild(sec);
    });
    if (r.raw) out.appendChild(techSection(r));
    var note = el("p", "small", "結果は " + new Date(r.checkedAt).toLocaleString("ja-JP") + " 時点です。同じURLの結果は10分間キャッシュされます。");
    out.appendChild(note);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function codeBlock(text) {
    var wrap = el("div", "cr-code");
    var pre = el("pre");
    pre.appendChild(el("code", null, text));
    wrap.appendChild(pre);
    var b = el("button", "cr-copy", "コピー");
    b.type = "button";
    b.addEventListener("click", function () {
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { b.textContent = "コピーしました"; });
    });
    wrap.appendChild(b);
    return wrap;
  }

  // 上級者向け: 診断に使った生の値
  function techSection(r) {
    var raw = r.raw;
    var d = el("details", "cr-tech");
    d.appendChild(el("summary", null, "技術情報を見る(上級者向け)"));
    var rows = [
      ["リダイレクト", (raw.redirects || []).join("\n")],
      ["応答時間", raw.timing ? "最初の応答 " + raw.timing.firstByteMs + "ms / 合計 " + raw.timing.totalMs + "ms / HTML " + raw.timing.htmlBytes.toLocaleString("ja-JP") + " bytes" + (raw.timing.truncated ? "(上限で打ち切り)" : "") : ""],
    ];
    Object.keys(raw.headers || {}).forEach(function (k) { rows.push(["ヘッダー " + k, raw.headers[k]]); });
    if (raw.html) {
      var hh = raw.html;
      rows.push(["meta robots", hh.metaRobots || "(なし)"]);
      rows.push(["canonical", hh.canonical || "(なし)"]);
      rows.push(["h1", (hh.h1 || []).join("\n") || "(なし)"]);
      rows.push(["h2(最大20)", (hh.h2 || []).join("\n") || "(なし)"]);
      rows.push(["JSON-LD", hh.jsonLdBlocks + " ブロック / 種類: " + ((hh.jsonLdTypes || []).join(", ") || "なし") + (hh.jsonLdBroken ? " / 壊れている: " + hh.jsonLdBroken : "")]);
      rows.push(["本文の文字数 / script タグ", hh.textChars + " 字 / " + hh.scriptTags + " 個"]);
    }
    if (raw.robotsTxt) rows.push(["robots.txt(先頭30行)", raw.robotsTxt.head || ("取得できません(" + (raw.robotsTxt.status || raw.robotsTxt.error) + ")")]);
    if (raw.llmsTxt) rows.push(["llms.txt(先頭12行)", raw.llmsTxt.head || ("なし(" + raw.llmsTxt.status + ")")]);
    var wrap = el("div", "table");
    var t = el("table");
    rows.forEach(function (row) {
      if (!row[1]) return;
      var tr = el("tr");
      tr.appendChild(el("th", null, row[0]));
      var td = el("td");
      td.appendChild(el("pre", "cr-raw", String(row[1])));
      tr.appendChild(td);
      t.appendChild(tr);
    });
    wrap.appendChild(t);
    d.appendChild(wrap);
    var dl = el("button", "cr-copy", "結果をJSONでダウンロード");
    dl.type = "button";
    dl.addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      var host = "";
      try { host = new URL(r.finalUrl).hostname; } catch (e) {}
      link.download = "aio-check-" + host + ".json";
      link.click();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    });
    d.appendChild(dl);
    return d;
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
