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
console.log("unit: OK(対策なしサイト score", bad.score + "、404ページ score", notFound.score + ")");

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
  assert.ok(j.score >= 85, "このサイト自身は A 判定のはず");
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
