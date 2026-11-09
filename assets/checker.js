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
    "http-redirect": "http:// と https:// の両方で同じページが見られると、検索エンジンが別のページと考えて評価が分かれることがあります。",
    "hsts": "ブラウザに「このサイトは必ず https で開いて」と覚えさせる指定です。安全性が上がり、無駄な転送も減ります。",
    "soft-404": "ないページを開いたときに「ありません(404)」と返さないと、中身のないページが大量に検索エンジンに登録されてしまうことがあります。",
    "viewport": "スマホの画面幅に合わせて表示するための指定です。Google はスマホで見たときのページを基準に評価します。",
    "img-alt": "alt は画像の説明文です。目の見えない方の読み上げ、画像検索、AIが図の意味を理解するのに使われます。",
    "in-sitemap": "サイトマップに入っているページは、検索エンジンに見つけてもらいやすくなります。",
    "breadcrumb": "「ホーム > カテゴリ > このページ」という位置情報です。検索結果にも表示され、サイトの構造が伝わります。",
    "question-headings": "人はAIや検索に「〇〇とは?」「〇〇のやり方は?」と質問します。見出しが同じ形だと、その見出しの下が答えとして選ばれやすくなります。",
    "answer-first": "AIや検索結果の要約は、ページの最初のほうの文を使うことが多いです。最初に結論を書くと、そのまま引用されやすくなります。",
    "faq": "記事の最後に「よくある質問」をまとめると、関連する細かい質問の検索からも見つけてもらえます。",
    "lists-tables": "手順は番号付きの箇条書き、比較は表にすると、人にもAIにも要点が伝わりやすくなります。",
    "internal-links": "サイトの中のページ同士をリンクでつなぐと、検索エンジンが関連を理解し、評価がサイト全体に回ります。",
    "citations": "数字や仕様の根拠となる公式ページへのリンクがあると、信頼できる記事だと判断されやすくなります。",
    "html-size": "HTMLが大きすぎると、ロボットが途中までしか読まなかったり、表示が遅くなったりします。",
    "depth": "読者の疑問にどこまで答えているかの目安です。上位のページやAIの回答が触れている論点が抜けていると、関連する検索で表示されにくくなります。",
    "first-party": "自分で試した結果・自社のデータ・事例など、ほかのサイトにない情報です。Google の E-E-A-T(経験)の評価でも、AIが引用元を選ぶときにも一番の差になります。",
    "visuals": "実際の画面や図解、比較表は文章より伝わりやすく、画像検索やAIの回答に使われる入口が増えます。",
    "coverage": "一緒に知りたい論点を h2・h3 に分けて書くと、関連キーワードでの表示回数とAIに拾われる場面が増えます。",
    "byline": "誰が書いたかを読者に見える形で示すと、信頼性の評価につながります。名前・経歴・プロフィールへのリンクを記事の上か下に置きます。",
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
    "viewport": "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "img-alt": "<img src=\"chart.png\" alt=\"2026年の月別アクセス数の推移。10月に前月比1.5倍\" width=\"800\" height=\"450\">",
    "breadcrumb": "<script type=\"application/ld+json\">\n{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"BreadcrumbList\",\n  \"itemListElement\": [\n    {\"@type\": \"ListItem\", \"position\": 1, \"name\": \"ホーム\", \"item\": \"https://example.com/\"},\n    {\"@type\": \"ListItem\", \"position\": 2, \"name\": \"記事\", \"item\": \"https://example.com/blog/\"}\n  ]\n}\n</script>",
    "answer-first": "<h1>AIO対策とは?</h1>\n<p>AIO対策とは、ChatGPT や Google の AI による概要などのAI検索で、自社の情報が引用されるように整えることです。</p>",
    "faq": "<h2>よくある質問</h2>\n<h3>費用はどれくらい?</h3>\n<p>月5万円〜が目安です。内容により変わります。</p>",
    "http-redirect": "# .htaccess(Apache)の例\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]",
    "hsts": "# レスポンスヘッダーの例\nStrict-Transport-Security: max-age=31536000; includeSubDomains",
    "headings": "<h1>AIO対策とは?</h1>\n<h2>AIO対策で何が変わる?</h2>\n<h2>今日からできる5つの手順は?</h2>\n<h2>よくある質問</h2>"
  };
  var VERDICT = {
    A: "土台はしっかり整っています。ただし点数は「土台」の評価です。表示回数・クリック・順位・AIでの引用は、下の「強化プラン」でさらに伸ばせます。",
    B: "土台はおおむね整っています。「まずやること」を直すと、AIにさらに読まれやすくなります。",
    C: "いくつか大事な設定が抜けています。「まずやること」から順に直していきましょう。",
    D: "AI検索に出るのを妨げている設定があります。まず「NG」の項目を直してください。"
  };

  var GRADE_TEXT = { A: "とても良い", B: "良い", C: "改善の余地あり", D: "要改善" };
  var ICON = { ok: "✓", warn: "!", ng: "✕", info: "i" };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function pctClass(p) { return p >= 85 ? "lv-ok" : p >= 60 ? "lv-good" : p >= 40 ? "lv-warn" : "lv-ng"; }

  // 円グラフ(点数)
  function gauge(score, grade) {
    var g = el("div", "cr-gauge grade-" + grade);
    g.setAttribute("role", "img");
    g.setAttribute("aria-label", "100点中 " + score + "点、判定 " + grade);
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 120 120");
    svg.setAttribute("aria-hidden", "true");
    [["g-bg"], ["g-fg"]].forEach(function (c) {
      var ci = document.createElementNS(ns, "circle");
      ci.setAttribute("class", c[0]);
      ci.setAttribute("cx", "60"); ci.setAttribute("cy", "60"); ci.setAttribute("r", "52");
      ci.setAttribute("pathLength", "100");
      svg.appendChild(ci);
    });
    g.appendChild(svg);
    var num = el("div", "g-num");
    var b = el("b", null, reduceMotion ? String(score) : "0");
    num.appendChild(b);
    num.appendChild(el("span", null, "/100"));
    g.appendChild(num);
    g.style.setProperty("--p", reduceMotion ? score : 0);
    if (!reduceMotion) {
      requestAnimationFrame(function () { requestAnimationFrame(function () { g.style.setProperty("--p", score); }); });
      var t0 = null;
      var step = function (t) {
        if (t0 == null) t0 = t;
        var k = Math.min(1, (t - t0) / 900);
        b.textContent = String(Math.round(score * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    return g;
  }

  // 横棒(ラベル・バー・数字)
  function barRow(label, got, max, href) {
    var pct = max ? Math.round(got / max * 100) : 0;
    var li = el("li", "cr-brow " + pctClass(pct));
    var name = href ? el("a", "cr-bname", label) : el("span", "cr-bname", label);
    if (href) name.href = href;
    li.appendChild(name);
    var track = el("span", "cr-track");
    var fill = el("span", "cr-fill");
    fill.style.width = (reduceMotion ? pct : 0) + "%";
    if (!reduceMotion) setTimeout(function () { fill.style.width = pct + "%"; }, 60);
    track.appendChild(fill);
    li.appendChild(track);
    li.appendChild(el("span", "cr-bval", max === 100 && got === pct ? pct + "%" : got + " / " + max));
    return li;
  }

  // 点数の内訳: API の breakdown があればそれを、なければグループごとの達成率を出す
  function breakdown(r, groups) {
    var box = el("div", "cr-break");
    var ul = el("ul", "cr-bars");
    if (r.breakdown && r.breakdown.length) {
      box.appendChild(el("p", "cr-break-h", "点数の内訳"));
      r.breakdown.forEach(function (b) { ul.appendChild(barRow(b.label, b.score, b.max)); });
    } else {
      box.appendChild(el("p", "cr-break-h", "分類ごとの達成度"));
      groups.forEach(function (g, i) {
        var cs = r.checks.filter(function (c) { return c.group === g && c.weight > 0; });
        var tot = cs.reduce(function (s, c) { return s + c.weight; }, 0);
        if (!tot) return;
        var got = cs.reduce(function (s, c) { return s + (c.status === "ok" ? c.weight : c.status === "warn" ? c.weight * 0.4 : 0); }, 0);
        ul.appendChild(barRow(g, Math.round(got / tot * 100), 100, "#cr-g" + i));
      });
    }
    box.appendChild(ul);
    return box;
  }

  function stack(counts) {
    var total = counts.ok + counts.warn + counts.ng;
    var bar = el("div", "cr-stack");
    bar.setAttribute("aria-hidden", "true");
    ["ok", "warn", "ng"].forEach(function (k) {
      if (!counts[k]) return;
      var s = el("span", "s-" + k);
      s.style.flexGrow = counts[k];
      bar.appendChild(s);
    });
    var pills = el("ul", "cr-pills");
    [["ok", "OK"], ["warn", "注意"], ["ng", "NG"]].forEach(function (p) {
      var li = el("li", "pill " + p[0]);
      li.appendChild(el("span", "pill-i", ICON[p[0]]));
      li.appendChild(document.createTextNode(p[1] + " "));
      li.appendChild(el("b", null, String(counts[p[0]])));
      pills.appendChild(li);
    });
    return total ? [bar, pills] : [pills];
  }

  function render(r) {
    out.textContent = "";
    var groups = [];
    r.checks.forEach(function (c) { if (groups.indexOf(c.group) < 0) groups.push(c.group); });

    // 1. 点数のまとめ
    var box = el("section", "cr-summary");
    box.setAttribute("aria-label", "診断結果のまとめ");
    var top = el("div", "cr-sum-top");
    top.appendChild(gauge(r.score, r.grade));
    var info = el("div", "cr-info");
    var gl = el("p", "cr-grade-line");
    gl.appendChild(el("span", "cr-grade-badge grade-" + r.grade, r.grade));
    gl.appendChild(el("span", "cr-grade-txt", "判定 " + r.grade + "・" + (GRADE_TEXT[r.grade] || "")));
    info.appendChild(gl);
    info.appendChild(el("p", "cr-verdict", VERDICT[r.grade] || ""));
    var u = el("p", "cr-url");
    var a = el("a", null, r.finalUrl);
    a.href = r.finalUrl;
    a.target = "_blank";
    a.rel = "noopener nofollow";
    u.appendChild(a);
    info.appendChild(u);
    stack(r.counts).forEach(function (n) { info.appendChild(n); });
    top.appendChild(info);
    box.appendChild(top);
    box.appendChild(breakdown(r, groups));
    out.appendChild(box);

    // 2. まずやること(影響の大きい順に3つ)
    var todo = r.checks.filter(function (c) { return c.status === "ng" || c.status === "warn"; })
      .sort(function (x, y) { return (x.status === y.status ? 0 : x.status === "ng" ? -1 : 1) || (y.weight || 0) - (x.weight || 0); })
      .slice(0, 3);
    if (r.plan) todo = r.plan.fixes.slice(0, 3);
    var pri = el("section", "cr-todo");
    pri.appendChild(el("h2", "cr-h", todo.length ? "まずやること" : "まずやること:ありません"));
    if (todo.length) {
      var ol = el("ol", "cr-todo-list");
      todo.forEach(function (c, i) {
        var li = el("li", "cr-todo-card st-" + (c.status || "warn"));
        li.appendChild(el("span", "cr-todo-n", String(i + 1)));
        var body = el("div");
        var head = el("p", "cr-todo-t");
        if (c.impact) head.appendChild(el("span", "cr-impact imp-" + c.impact, "効果 " + c.impact));
        var jump = el("a", null, c.label);
        jump.href = "#cr-" + c.id;
        head.appendChild(jump);
        body.appendChild(head);
        body.appendChild(el("p", "cr-todo-d", c.advice || c.detail));
        if (c.effort) body.appendChild(el("p", "cr-todo-e", "目安 " + c.effort));
        li.appendChild(body);
        ol.appendChild(li);
      });
      pri.appendChild(ol);
    } else {
      pri.appendChild(el("p", "cr-allgood", "大きな問題は見つかりませんでした。次は、質問にずばり答える文章や一次情報(実際に試した結果・数字)を増やすと、AIに引用されやすくなります。"));
    }
    out.appendChild(pri);
    if (r.plan && r.plan.rank && r.plan.rank.length) out.appendChild(rankSection(r.plan.rank));
    if (r.plan) out.appendChild(planSection(r.plan));

    // 3. 全項目
    var all = el("section", "cr-all");
    all.appendChild(el("h2", "cr-h", "すべてのチェック結果"));
    var bar = el("div", "cr-bar");
    var seg = el("div", "cr-seg");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "表示する項目");
    [["all", "すべて"], ["bad", "問題のある項目だけ"]].forEach(function (o) {
      var b = el("button", "cr-seg-b" + (o[0] === "all" ? " on" : ""), o[1]);
      b.type = "button";
      b.setAttribute("aria-pressed", o[0] === "all" ? "true" : "false");
      b.addEventListener("click", function () {
        seg.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("on");
        b.setAttribute("aria-pressed", "true");
        out.classList.toggle("cr-hide-ok", o[0] === "bad");
      });
      seg.appendChild(b);
    });
    bar.appendChild(seg);
    var jumps = el("nav", "cr-jumps");
    jumps.setAttribute("aria-label", "分類へ移動");
    groups.forEach(function (g, i) {
      var j = el("a", null, g.replace(/\s*[(\uFF08][^()\uFF08\uFF09]*[)\uFF09]$/, ""));
      j.href = "#cr-g" + i;
      jumps.appendChild(j);
    });
    bar.appendChild(jumps);
    all.appendChild(bar);

    var order = { ng: 0, warn: 1, ok: 2, info: 3 };
    groups.forEach(function (g, gi) {
      var items = r.checks.filter(function (c) { return c.group === g; });
      var sec = el("section", "cr-group");
      sec.id = "cr-g" + gi;
      var gh = el("div", "cr-group-h");
      gh.appendChild(el("h3", null, g));
      var cnt = { ok: 0, warn: 0, ng: 0 };
      items.forEach(function (c) { if (c.status in cnt) cnt[c.status]++; });
      var mini = el("span", "cr-mini");
      ["ng", "warn", "ok"].forEach(function (k) {
        if (cnt[k]) mini.appendChild(el("span", "pill sm " + k, { ok: "OK", warn: "注意", ng: "NG" }[k] + " " + cnt[k]));
      });
      gh.appendChild(mini);
      sec.appendChild(gh);
      var ul = el("ul", "cr-list");
      items.sort(function (x, y) { return order[x.status] - order[y.status]; })
        .forEach(function (c) {
          var li = el("li", "cr-item st-" + c.status);
          li.id = "cr-" + c.id;
          li.appendChild(el("span", "cr-ico", ICON[c.status] || "i"));
          var main = el("div", "cr-main");
          var head = el("div", "cr-head");
          head.appendChild(el("strong", null, c.label));
          head.appendChild(el("span", "cr-badge", LABEL[c.status]));
          main.appendChild(head);
          main.appendChild(el("p", "cr-detail", c.detail));
          if (c.advice && c.status !== "ok") main.appendChild(el("p", "cr-advice", c.advice));
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
          if (extra.childNodes.length) main.appendChild(extra);
          li.appendChild(main);
          ul.appendChild(li);
        });
      sec.appendChild(ul);
      if (g.indexOf("AIクローラー") === 0 && r.bots) sec.appendChild(botGrid(r.bots));
      all.appendChild(sec);
    });
    out.appendChild(all);
    if (r.raw) out.appendChild(techSection(r));
    out.appendChild(el("p", "small cr-foot", "結果は " + new Date(r.checkedAt).toLocaleString("ja-JP") + " 時点です。同じURLの結果は10分間キャッシュされます。"));
    out.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  // 強化プラン: 目的(表示回数・クリック率・順位・AI引用)ごとに絞り込める
  // 順位を上げるためのアクション(このページの中身から作った具体的な行動)
  function rankSection(list) {
    var sec = el("section", "cr-plan cr-rank g-rank");
    sec.appendChild(el("h2", "cr-h", "順位を上げるためのアクション"));
    sec.appendChild(el("p", "cr-sub", "このページの中身から、検索順位を上げるためにやることを、効きやすい順に並べました。上から1つずつ進めてください。"));
    var ol = el("ol", "cr-growth cr-rank-list");
    list.forEach(function (x, i) {
      var li = el("li", "cr-grow g-rank");
      var head = el("div", "cr-grow-h");
      head.appendChild(el("span", "cr-rank-n", String(i + 1)));
      head.appendChild(el("span", "cr-impact imp-" + x.priority, x.priority === "最優先" ? "最優先" : "効果 " + x.priority));
      if (x.from) head.appendChild(el("span", "cr-from", x.from));
      if (x.effort) head.appendChild(el("span", "cr-effort", "⏱ " + x.effort));
      li.appendChild(head);
      li.appendChild(el("strong", "cr-grow-t", x.title));
      li.appendChild(el("p", null, x.why));
      var steps = el("ol", "cr-steps-n");
      x.steps.forEach(function (st) { steps.appendChild(el("li", null, st)); });
      li.appendChild(steps);
      ol.appendChild(li);
    });
    sec.appendChild(ol);
    sec.appendChild(el("p", "cr-sub cr-rank-note", "実際の順位は、このツールでは測れません。Search Console の「検索パフォーマンス」で、直す前と4週間後を比べてください。"));
    return sec;
  }

  function planSection(plan) {
    var sec = el("section", "cr-plan");
    sec.appendChild(el("h2", "cr-h", "強化プラン"));
    sec.appendChild(el("p", "cr-sub", "点数が高くても、ここから伸ばせます。目的を選ぶと、それに効く打ち手だけを表示します。"));
    var tabs = el("div", "cr-tabs");
    tabs.setAttribute("role", "group");
    tabs.setAttribute("aria-label", "目的で絞り込む");
    var keys = ["all"].concat(Object.keys(plan.goals));
    var buttons = [];
    keys.forEach(function (k) {
      var b = el("button", "cr-tab" + (k === "all" ? " on" : "") + (k === "all" ? "" : " g-" + k), k === "all" ? "すべて" : plan.goals[k]);
      b.type = "button";
      b.setAttribute("aria-pressed", k === "all" ? "true" : "false");
      b.addEventListener("click", function () {
        buttons.forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("on");
        b.setAttribute("aria-pressed", "true");
        sec.querySelectorAll("[data-goals]").forEach(function (item) {
          item.hidden = k !== "all" && item.getAttribute("data-goals").split(" ").indexOf(k) < 0;
        });
      });
      buttons.push(b);
      tabs.appendChild(b);
    });
    sec.appendChild(tabs);
    function chips(goals) {
      var c = el("span", "cr-chips");
      goals.forEach(function (g) { c.appendChild(el("span", "cr-chip g-" + g, plan.goals[g])); });
      return c;
    }
    if (plan.fixes.length) {
      sec.appendChild(el("h3", null, "このページで直すこと(" + plan.fixes.length + "件)"));
      var ol = el("ol", "cr-fixes");
      plan.fixes.forEach(function (f) {
        var li = el("li", "cr-fix st-" + (f.status || "warn"));
        li.setAttribute("data-goals", f.goals.join(" "));
        var head = el("div", "cr-fix-h");
        head.appendChild(el("span", "cr-impact imp-" + f.impact, "効果 " + f.impact));
        var link = el("a", null, f.label);
        link.href = "#cr-" + f.id;
        head.appendChild(link);
        li.appendChild(head);
        li.appendChild(el("p", null, f.advice));
        var foot = el("div", "cr-fix-f");
        foot.appendChild(chips(f.goals));
        if (f.effort) foot.appendChild(el("span", "cr-effort", "⏱ " + f.effort));
        li.appendChild(foot);
        ol.appendChild(li);
      });
      sec.appendChild(ol);
    }
    if (plan.growth && plan.growth.length) {
      sec.appendChild(el("h3", null, "さらに伸ばすための次の一手"));
      var ul = el("ul", "cr-growth");
      plan.growth.forEach(function (g) {
        var li = el("li", "cr-grow g-" + g.goal);
        li.setAttribute("data-goals", g.goal);
        var head = el("div", "cr-grow-h");
        head.appendChild(el("span", "cr-chip g-" + g.goal, plan.goals[g.goal]));
        if (g.effort) head.appendChild(el("span", "cr-effort", "⏱ " + g.effort));
        li.appendChild(head);
        li.appendChild(el("strong", "cr-grow-t", g.title));
        li.appendChild(el("p", null, g.why));
        var steps = el("ol", "cr-steps-n");
        g.steps.forEach(function (st) { steps.appendChild(el("li", null, st)); });
        li.appendChild(steps);
        ul.appendChild(li);
      });
      sec.appendChild(ul);
    }
    return sec;
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

  // AIクローラーごとの判定(検索用と学習用に分けてカードで)
  function botGrid(bots) {
    var wrap = el("div", "cr-bots");
    [[true, "AI検索・検索エンジン用(許可が必要)"], [false, "AIの学習用(許可するかは方針しだい・点数に入れない)"]].forEach(function (kind) {
      var list = bots.filter(function (b) { return !!b.search === kind[0]; });
      if (!list.length) return;
      wrap.appendChild(el("p", "cr-bots-h", kind[1]));
      var ul = el("ul", "cr-botgrid");
      list.forEach(function (b) {
        var st = b.allowed ? "ok" : (b.search ? "ng" : "warn");
        var li = el("li", "cr-bot st-" + st);
        li.title = b.role + (b.rule ? "\n当たったルール: " + b.rule : "");
        li.appendChild(el("span", "cr-ico", b.allowed ? ICON.ok : ICON.ng));
        var t = el("span", "cr-bot-t");
        t.appendChild(el("b", null, b.ua));
        t.appendChild(el("span", null, b.owner + "・" + b.role));
        li.appendChild(t);
        li.appendChild(el("span", "cr-bot-s", b.allowed ? "許可" : "ブロック"));
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
    });
    return wrap;
  }

  function fail(msg) {
    out.textContent = "";
    var box = el("div", "cr-error");
    box.setAttribute("role", "alert");
    box.appendChild(el("span", "cr-ico", "!"));
    box.appendChild(el("p", null, msg));
    out.appendChild(box);
  }

  // 待っている間の表示(実際の処理の順番に合わせて、読み込み中の項目を進める)
  var STEPS_TEXT = ["ページを読み込んでいます", "robots.txt とAIクローラーの許可を確認しています", "llms.txt とサイトマップを探しています",
    "構造化データと見出しを読んでいます", "本文の書き方と中身を確かめています", "点数と強化プランをまとめています"];
  var loadingTimer = null;
  function loading() {
    out.textContent = "";
    var box = el("div", "cr-loading");
    box.setAttribute("role", "status");
    var head = el("div", "cr-load-h");
    head.appendChild(el("span", "cr-spin"));
    head.appendChild(el("strong", null, "診断しています…"));
    head.appendChild(el("span", "small", "10秒ほどかかることがあります"));
    box.appendChild(head);
    var ul = el("ul", "cr-load-steps");
    var lis = STEPS_TEXT.map(function (t) { var li = el("li", null, t); ul.appendChild(li); return li; });
    box.appendChild(ul);
    out.appendChild(box);
    var i = 0;
    lis[0].className = "now";
    clearInterval(loadingTimer);
    loadingTimer = setInterval(function () {
      if (i >= lis.length - 1) return clearInterval(loadingTimer);
      lis[i].className = "done";
      i++;
      lis[i].className = "now";
    }, 1400);
  }

  function run(url) {
    if (!api) return fail("診断用のサーバーを準備中です。");
    button.disabled = true;
    loading();
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
        window.dispatchEvent(new CustomEvent("aio:checked", { detail: r })); // 履歴とロードマップ(progress.js)
        var host = "";
        try { host = new URL(r.finalUrl).hostname; } catch (e) {}
        track("aio_check", { check_domain: host, check_score: r.score, check_grade: r.grade });
      })
      .catch(function () { fail("診断できませんでした。時間をおいてもう一度お試しください。"); })
      .then(function () {
        clearTimeout(timer);
        clearInterval(loadingTimer);
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
