// 動作確認: node test.mjs(ネットにつながる環境なら node test.mjs --live [URL...] で実在サイトも診断する)
import assert from "node:assert/strict";
import worker, { diagnose, buildReport, normalizeInput, isPrivateIPv4, isPrivateIPv6, parseRobots, robotsAllows, parseHtml, ldTypes } from "./src/index.js";

// URLの確認(SSRF対策)
for (const bad of ["http://localhost/", "http://127.0.0.1/", "http://10.0.0.1/", "http://[::1]/", "ftp://example.com/",
  "http://user:pw@example.com/", "http://example.com:8080/", "http://intranet/", "http://printer.local/", "http://0x7f000001/", "http://2130706433/", ""]) {
  assert.throws(() => normalizeInput(bad), undefined, bad);
}
assert.equal(normalizeInput("example.com").href, "https://example.com/");
assert.equal(normalizeInput(" https://Example.com/a#x ").href, "https://example.com/a");
assert.ok(isPrivateIPv4("192.168.1.1") && isPrivateIPv4("169.254.169.254") && isPrivateIPv4("100.64.0.1") && !isPrivateIPv4("8.8.8.8"));
assert.ok(isPrivateIPv6("::1") && isPrivateIPv6("fd00::1") && isPrivateIPv6("::ffff:127.0.0.1") && !isPrivateIPv6("2606:4700::1111"));

// robots.txt(RFC 9309)
const r = parseRobots(`User-agent: *
Disallow: /private/
Allow: /private/ok$

User-agent: GPTBot
User-agent: CCBot
Disallow: /

User-agent: PerplexityBot
Disallow:
Sitemap: https://example.com/sitemap.xml`);
assert.equal(robotsAllows(r, "GPTBot", "/").allowed, false);
assert.equal(robotsAllows(r, "ccbot", "/x").allowed, false);
assert.equal(robotsAllows(r, "PerplexityBot", "/private/").allowed, true);
assert.equal(robotsAllows(r, "ClaudeBot", "/private/a").allowed, false);
assert.equal(robotsAllows(r, "ClaudeBot", "/private/ok").allowed, true);
assert.equal(robotsAllows(r, "ClaudeBot", "/").allowed, true);
assert.deepEqual(r.sitemaps, ["https://example.com/sitemap.xml"]);

// HTML
const h = parseHtml(`<!doctype html><html lang="ja"><head><title>テスト &amp; ページ</title>
<meta name="description" content="説明"><meta name=robots content="index,nosnippet"><link rel="canonical" href="/a">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Article","author":{"@type":"Person","name":"x"}},{"@type":"BreadcrumbList"}]}</script>
</head><body><h1>見出し</h1><h2>a</h2><h2>b</h2><p>本文</p><script>var x="<h2>no</h2>"</script></body></html>`);
assert.equal(h.title, "テスト & ページ");
assert.equal(h.lang, "ja");
assert.equal(h.canonical, "/a");
assert.equal(h.h2.length, 2);
assert.deepEqual(ldTypes(h.ld).types.sort(), ["Article", "BreadcrumbList", "Person"]);
// 対策ができていないサイト
const resp = (status, text, type = "text/html") => ({ status, text, headers: new Headers({ "Content-Type": type }), chain: [], ms: 2500, finalUrl: "" });
const bad = buildReport({
  target: new URL("http://bad.example.com/"),
  page: { ...resp(200, `<html><head><meta name="robots" content="noindex"><title>x</title></head><body><div id="root"></div><script src=a></script><script src=b></script><script src=c></script><script src=d></script><script src=e></script></body></html>`), finalUrl: "http://bad.example.com/" },
  robotsRes: resp(200, "User-agent: *\nDisallow: /\n", "text/plain"),
  llmsRes: resp(404, "<html>404</html>"),
  sitemapRes: resp(404, ""),
});
const st = Object.fromEntries(bad.checks.map((c) => [c.id, c.status]));
assert.equal(st["ai-search-bots"], "ng");
assert.equal(st.indexable, "ng");
assert.equal(st.text, "ng");
assert.equal(st.https, "ng");
assert.equal(st.llms, "warn");
assert.ok(bad.score < 30, String(bad.score));
const notFound = buildReport({
  target: new URL("https://ok.example.com/x"),
  page: { ...resp(404, "not found", "text/plain"), ms: 100, finalUrl: "https://ok.example.com/x" },
  robotsRes: resp(200, "User-agent: *\nAllow: /\nSitemap: https://ok.example.com/sitemap.xml\n", "text/plain"),
  llmsRes: resp(200, "# ok\n", "text/plain"),
  sitemapRes: resp(404, ""),
});
assert.ok(notFound.score <= 30, "404 のページは高得点にしない: " + notFound.score);
assert.ok(notFound.raw && notFound.raw.redirects.length === 1);
// よくある「普通の」企業ブログ記事(技術的な土台は整っているが、中身は平均的)→ 60〜75点に収まるはず
const para = (n) => "<p>" + "制作会社の選び方について説明します。料金は30万円から100万円ほどが目安で、公開まで約3か月かかります。".repeat(n) + "</p>";
const avgHtml = `<!doctype html><html lang="ja"><head><title>ホームページ制作会社の選び方|失敗しない5つのポイント</title>
<meta name="description" content="ホームページ制作会社の選び方を解説します。料金の相場、実績の見方、サポート体制など、失敗しないために確認したい5つのポイントをまとめました。">
<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://avg.example.com/blog/how-to-choose/">
<meta property="og:title" content="t"><meta property="og:description" content="d"><meta property="og:image" content="https://avg.example.com/i.png">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"BlogPosting","headline":"h","datePublished":"2026-02-01","dateModified":"2026-06-01","author":{"@type":"Organization","name":"株式会社A"}},{"@type":"BreadcrumbList"},{"@type":"Organization","name":"株式会社A"}]}</script>
</head><body><header><a href="/about/">会社概要</a></header><article><h1>ホームページ制作会社の選び方</h1><p>制作会社は、料金・実績・サポートの3つで選ぶのが基本です。この記事では当社の事例も交えて、比べ方を説明します。</p>
<h2>ホームページ制作会社にはどんな種類がある?</h2>${para(8)}<img src="a.png" alt="図"><h2>料金の相場はいくら?</h2>${para(8)}<table><tr><td>a</td></tr></table>
<h2>実績の見方</h2>${para(8)}<ul><li>a</li></ul><h3>a</h3><h3>b</h3><h2>サポート体制</h2>${para(6)}<h2>依頼までの流れ</h2>${para(6)}<ol><li>a</li></ol><h2>まとめ</h2>${para(2)}
<a href="/service/">サービス</a><a href="/blog/a/">関連</a><a href="/blog/b/">関連</a><a href="/contact/">お問い合わせ</a><a href="https://www.example.org/">参考</a><a href="https://www.example.net/">参考</a></article></body></html>`;
const avg = buildReport({
  target: new URL("https://avg.example.com/blog/how-to-choose/"),
  page: { ...resp(200, avgHtml), ms: 300, finalUrl: "https://avg.example.com/blog/how-to-choose/", headers: new Headers({ "Content-Type": "text/html", "Strict-Transport-Security": "max-age=1" }) },
  robotsRes: resp(200, "User-agent: *\nAllow: /\nSitemap: https://avg.example.com/sitemap.xml\n", "text/plain"),
  llmsRes: resp(404, ""),
  sitemapRes: resp(200, "<urlset><url><loc>https://avg.example.com/blog/how-to-choose/</loc></url></urlset>", "application/xml"),
  httpRes: { status: 301, location: "https://avg.example.com/blog/how-to-choose/", headers: new Headers() },
  notFoundRes: { status: 404, headers: new Headers(), text: "" },
  now: new Date("2026-11-09"),
});
assert.equal(avg.pageType, "article");
assert.ok(avg.score >= 55 && avg.score <= 75, "平均的な記事は60〜70点台: " + avg.score + " " + JSON.stringify(avg.breakdown));
assert.equal(avg.breakdown.reduce((s, b) => s + b.max, 0), 100);
console.log("unit: OK(対策なしサイト score", bad.score + "、404ページ score", notFound.score + "、平均的な記事 score", avg.score + ")");

// API(バインディングなし・キャッシュなし)
const env = { ALLOWED_ORIGINS: "https://aio.shiokonbu.com" };
const ctx = { waitUntil() {} };
const call = (q, origin) => worker.fetch(new Request("https://w.example/api/check?url=" + encodeURIComponent(q), { headers: origin ? { Origin: origin } : {} }), env, ctx);
assert.equal((await call("https://example.com/", "https://evil.example")).status, 403);
assert.equal((await call("http://127.0.0.1/")).status, 400);

// このリポジトリの生成済みファイルを「サイト」として診断する(ネットなしで確認できる)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const repo = path.resolve(import.meta.dirname, "..");
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/old/") { res.writeHead(301, { Location: "/" }); return res.end(); }
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(repo, p);
  if (!f.startsWith(repo) || !fs.existsSync(f)) { res.writeHead(404); return res.end("not found"); }
  const type = f.endsWith(".html") ? "text/html; charset=utf-8" : f.endsWith(".xml") ? "application/xml" : "text/plain; charset=utf-8";
  res.writeHead(200, { "Content-Type": type });
  res.end(fs.readFileSync(f));
});
await new Promise((ok) => server.listen(0, ok));
const port = server.address().port;
const local = { checkHost: async () => {}, fetchImpl: (u, init) => { const x = new URL(u); return fetch(`http://127.0.0.1:${port}${x.pathname}${x.search}`, init); } };
for (const p of ["https://aio.shiokonbu.com/old/", "https://aio.shiokonbu.com/aio/ai-overviews/"]) {
  const j = await diagnose(normalizeInput(p), local);
  console.log("\n==", p, "→", j.finalUrl, "score", j.score, j.grade, j.counts);
  for (const c of j.checks) console.log(` [${c.status}] ${c.label}: ${c.detail}`);
  assert.ok(j.score >= 75, "このサイト自身は B 以上のはず(中身にまだ伸びしろがある)");
  assert.ok(j.plan.growth.length >= 6, "高得点でも強化プランの次の一手を出す");
}
server.close();

if (process.argv[2] === "--live") {
  for (const site of process.argv.slice(3).length ? process.argv.slice(3) : ["https://aio.shiokonbu.com/", "https://www.nytimes.com/"]) {
    const res = await call(site, "https://aio.shiokonbu.com");
    const j = await res.json();
    console.log("\n==", site, res.status, res.headers.get("Access-Control-Allow-Origin"));
    if (j.error) { console.log(j.error); continue; }
    console.log("score", j.score, j.grade, j.counts);
    for (const c of j.checks) console.log(` [${c.status}] ${c.group} / ${c.label}: ${c.detail}`);
    console.log(" blocked:", j.bots.filter((b) => !b.allowed).map((b) => b.ua).join(", ") || "none");
  }
}
