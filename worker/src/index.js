// AIO診断ツールのAPI(Cloudflare Workers)。
// 使い方: GET /api/check?url=https://example.com/
// 診断ページ(https://aio.shiokonbu.com/aio-checker/)から呼ばれる。中身の説明は worker/README.md。
//
// 悪用を防ぐしくみ
// - 1つのIPから1分に CHECKS_PER_MINUTE 回まで(Rate Limiting バインディング LIMITER)
// - 同じサイトへの診断は1分に HOST_CHECKS_PER_MINUTE 回まで(HOST_LIMITER)。結果は CACHE_SECONDS 秒キャッシュ
// - http/https・80/443番ポートだけ。IPアドレス直書き・localhost・社内向けの名前・プライベートIPに解決される名前は拒否
// - リダイレクトは1回ずつ同じ確認をしてから追う(最大5回)。読み込みはサイズ上限とタイムアウトつき
// - 他のサイトからのブラウザ呼び出しは CORS で断る(ALLOWED_ORIGINS)

const UA = "AIOCheckerBot/1.0 (+https://aio.shiokonbu.com/aio-checker/)";
const TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_TEXT_BYTES = 500_000;
const MAX_REDIRECTS = 5;
const CACHE_SECONDS = 600;
const SITE = "https://aio.shiokonbu.com";

// AIクローラー。search=true は「AI検索に出るために必要なもの」、false は「学習用(許可するかは方針しだい)」
export const BOTS = [
  { ua: "OAI-SearchBot", owner: "OpenAI", role: "ChatGPT検索の索引", search: true },
  { ua: "ChatGPT-User", owner: "OpenAI", role: "ChatGPTがユーザーの質問でページを読む", search: true },
  { ua: "Claude-SearchBot", owner: "Anthropic", role: "Claudeの検索の索引", search: true },
  { ua: "Claude-User", owner: "Anthropic", role: "Claudeがユーザーの質問でページを読む", search: true },
  { ua: "PerplexityBot", owner: "Perplexity", role: "Perplexityの検索の索引", search: true },
  { ua: "Googlebot", owner: "Google", role: "Google検索とAI Overviews", search: true },
  { ua: "Bingbot", owner: "Microsoft", role: "Bing検索とCopilot", search: true },
  { ua: "GPTBot", owner: "OpenAI", role: "AIの学習", search: false },
  { ua: "ClaudeBot", owner: "Anthropic", role: "AIの学習", search: false },
  { ua: "Google-Extended", owner: "Google", role: "Geminiの学習・回答への利用", search: false },
  { ua: "Applebot-Extended", owner: "Apple", role: "Apple Intelligenceの学習", search: false },
  { ua: "CCBot", owner: "Common Crawl", role: "公開データセット(多くのAIの学習元)", search: false },
];

const ARTICLE = {
  robots: "/aio/ai-crawler-robots-txt/",
  llms: "/glossary/llms-txt/",
  sd: "/seo/structured-data/",
  aio: "/aio/ai-overviews/",
  basics: "/aio/aio-llmo-geo-aeo-difference/",
  sitemap: "/seo/xml-sitemap/",
  title: "/seo/title-meta-description/",
  canonical: "/seo/canonical-url/",
  eeat: "/seo/eeat/",
  answer: "/aio/answer-first-writing/",
  js: "/aio/javascript-ai-crawlers/",
  firstParty: "/seo/first-party-information/",
};

// ------------------------------------------------------------------ 入口
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowed = (env.ALLOWED_ORIGINS || SITE).split(",").map((s) => s.trim());
    const cors = origin && allowed.includes(origin)
      ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" }
      : {};
    if (origin && !allowed.includes(origin)) return json({ error: "このAPIは AIO対策ナビ の診断ページから使ってください。" }, 403);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "86400" } });
    }
    if (url.pathname === "/" || url.pathname === "/health") return json({ ok: true, page: SITE + "/aio-checker/" }, 200, cors);
    if (url.pathname !== "/api/check" || request.method !== "GET") return json({ error: "見つかりません" }, 404, cors);

    let target;
    try {
      target = normalizeInput(url.searchParams.get("url") || "");
    } catch (e) {
      return json({ error: e.message }, 400, cors);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (env.LIMITER) {
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return json({ error: "診断の回数が多すぎます。1分ほど待ってからもう一度お試しください。" }, 429, cors);
    }

    const cache = typeof caches !== "undefined" ? caches.default : null;
    const cacheKey = new Request("https://cache.aio-checker.invalid/v1?u=" + encodeURIComponent(target.href));
    if (cache) {
      const hit = await cache.match(cacheKey);
      if (hit) {
        const body = await hit.text();
        return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8", "X-Cache": "HIT", ...cors } });
      }
    }
    if (env.HOST_LIMITER) {
      const { success } = await env.HOST_LIMITER.limit({ key: target.hostname });
      if (!success) return json({ error: "このサイトへの診断が集中しています。少し待ってからお試しください。" }, 429, cors);
    }

    let result;
    try {
      result = await diagnose(target);
    } catch (e) {
      return json({ error: e.userMessage || "診断できませんでした。URLを確かめて、もう一度お試しください。" }, 422, cors);
    }
    const body = JSON.stringify(result);
    if (cache) {
      ctx.waitUntil(cache.put(cacheKey, new Response(body, {
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${CACHE_SECONDS}` },
      })));
    }
    return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8", "X-Cache": "MISS", ...cors } });
  },
};

function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });
}

class UserError extends Error {
  constructor(msg) {
    super(msg);
    this.userMessage = msg;
  }
}

// ------------------------------------------------------------------ URLの確認(SSRF対策)
export function normalizeInput(raw) {
  let s = String(raw).trim();
  if (!s) throw new UserError("URLを入力してください。");
  if (s.length > 2000) throw new UserError("URLが長すぎます。");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = "https://" + s;
  let u;
  try {
    u = new URL(s);
  } catch {
    throw new UserError("URLの形が正しくありません。例: https://example.com/");
  }
  checkUrlShape(u);
  u.hash = "";
  return u;
}

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".intranet", ".lan", ".home", ".corp", ".home.arpa", ".invalid", ".test", ".example", ".onion"];

export function checkUrlShape(u) {
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new UserError("http:// か https:// のURLを入力してください。");
  if (u.username || u.password) throw new UserError("ユーザー名やパスワードを含むURLは診断できません。");
  if (u.port && u.port !== "80" && u.port !== "443") throw new UserError("ポート番号つきのURLは診断できません。");
  const h = u.hostname.toLowerCase().replace(/\.$/, "");
  if (h.startsWith("[") || h.includes(":")) throw new UserError("IPアドレスではなくドメイン名で入力してください。");
  if (/^[\d.]+$/.test(h) || /^0x/i.test(h)) throw new UserError("IPアドレスではなくドメイン名で入力してください。");
  if (!h.includes(".") || h === "localhost" || BLOCKED_SUFFIXES.some((x) => h.endsWith(x))) {
    throw new UserError("インターネットに公開されているサイトのURLを入力してください。");
  }
}

export function isPrivateIPv4(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
}

export function isPrivateIPv6(ip) {
  const s = ip.toLowerCase();
  if (s === "::" || s === "::1") return true;
  if (s.startsWith("::ffff:")) return isPrivateIPv4(s.slice(7));
  return /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || s.startsWith("ff") || s.startsWith("2001:db8") || s.startsWith("64:ff9b");
}

const dnsMemo = new Map();
async function assertPublicHost(hostname) {
  const h = hostname.toLowerCase();
  if (dnsMemo.has(h)) {
    if (!dnsMemo.get(h)) throw new UserError("インターネットに公開されているサイトのURLを入力してください。");
    return;
  }
  let found = 0;
  let ok = true;
  let answered = false;
  for (const type of ["A", "AAAA"]) {
    let data;
    try {
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(h)}&type=${type}`, {
        headers: { Accept: "application/dns-json" },
      });
      if (!res.ok) continue;
      data = await res.json();
    } catch {
      continue; // DNSの確認ができないときは Workers 側の制限(プライベートIPへは届かない)に任せる
    }
    answered = true;
    if (data.Status === 3) break; // NXDOMAIN
    for (const ans of data.Answer || []) {
      if (ans.type === 1) {
        found++;
        if (isPrivateIPv4(ans.data)) ok = false;
      } else if (ans.type === 28) {
        found++;
        if (isPrivateIPv6(ans.data)) ok = false;
      }
    }
  }
  if (!answered) return;
  if (!found) throw new UserError(`「${h}」というドメインが見つかりません。URLを確かめてください。`);
  dnsMemo.set(h, ok);
  if (!ok) throw new UserError("インターネットに公開されているサイトのURLを入力してください。");
}

// サイズ上限・タイムアウトつきで取得。リダイレクトは1回ずつ確認してから追う
export async function safeFetch(startUrl, { maxBytes = MAX_TEXT_BYTES, fetchImpl = fetch, checkHost = assertPublicHost, noFollow = false } = {}) {
  let current = new URL(startUrl);
  const chain = [];
  const t0 = Date.now();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    checkUrlShape(current);
    await checkHost(current.hostname);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res;
    const hopStart = Date.now();
    try {
      res = await fetchImpl(current.href, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,text/plain,application/xml;q=0.9,*/*;q=0.5", "Accept-Language": "ja,en;q=0.8" },
      });
    } catch (e) {
      clearTimeout(timer);
      if (e.name === "AbortError") return { error: "timeout", chain, finalUrl: current.href };
      return { error: "network", chain, finalUrl: current.href };
    }
    const headerMs = Date.now() - hopStart;
    if (res.status >= 300 && res.status < 400 && res.headers.get("Location")) {
      clearTimeout(timer);
      if (noFollow) {
        try { await res.body?.cancel(); } catch {}
        return { status: res.status, headers: res.headers, text: "", location: new URL(res.headers.get("Location"), current).href, chain, finalUrl: current.href, ms: Date.now() - hopStart };
      }
      chain.push({ url: current.href, status: res.status });
      try { await res.body?.cancel(); } catch {}
      current = new URL(res.headers.get("Location"), current);
      current.hash = "";
      continue;
    }
    let text = "";
    let truncated = false;
    try {
      ({ text, truncated } = await readLimited(res, maxBytes));
    } catch (e) {
      clearTimeout(timer);
      return { error: e.name === "AbortError" ? "timeout" : "network", chain, finalUrl: current.href };
    }
    clearTimeout(timer);
    return { status: res.status, headers: res.headers, text, truncated, finalUrl: current.href, chain, ms: headerMs, totalMs: Date.now() - t0 };
  }
  return { error: "redirects", chain, finalUrl: current.href };
}

async function readLimited(res, maxBytes) {
  if (!res.body) return { text: "", truncated: false };
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    if (size >= maxBytes) {
      truncated = true;
      try { await reader.cancel(); } catch {}
      break;
    }
  }
  const buf = new Uint8Array(Math.min(size, maxBytes));
  let off = 0;
  for (const c of chunks) {
    const take = Math.min(c.byteLength, buf.length - off);
    buf.set(c.subarray(0, take), off);
    off += take;
    if (off >= buf.length) break;
  }
  const ct = res.headers.get("Content-Type") || "";
  let charset = (/charset=([\w-]+)/i.exec(ct) || [])[1];
  if (!charset) {
    const head = new TextDecoder("latin1").decode(buf.subarray(0, 2048));
    charset = (/<meta[^>]+charset=["']?([\w-]+)/i.exec(head) || [])[1] || "utf-8";
  }
  let text;
  try {
    text = new TextDecoder(charset.toLowerCase()).decode(buf);
  } catch {
    text = new TextDecoder("utf-8").decode(buf);
  }
  return { text, truncated };
}

// ------------------------------------------------------------------ robots.txt
export function parseRobots(text) {
  const groups = [];
  let cur = null;
  let lastWasAgent = false;
  const sitemaps = [];
  for (let line of text.split(/\r?\n/)) {
    line = line.replace(/#.*$/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === "sitemap") sitemaps.push(val);
    else if ((key === "allow" || key === "disallow") && cur) cur.rules.push({ allow: key === "allow", path: val });
  }
  return { groups, sitemaps };
}

function ruleMatches(pattern, path) {
  if (pattern === "") return false;
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp("^" + body.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""));
  return re.test(path);
}

// RFC 9309: 名前が一致するグループ(なければ *)の中で、いちばん長く一致したルールが勝つ。同じ長さなら Allow
export function robotsAllows(parsed, agent, path) {
  const a = agent.toLowerCase();
  let groups = parsed.groups.filter((g) => g.agents.includes(a));
  let matchedBy = agent;
  if (!groups.length) {
    groups = parsed.groups.filter((g) => g.agents.includes("*"));
    matchedBy = "*";
  }
  if (!groups.length) return { allowed: true, matchedBy: null };
  let best = null;
  for (const g of groups) {
    for (const r of g.rules) {
      if (!ruleMatches(r.path, path)) continue;
      const len = r.path.length;
      if (!best || len > best.len || (len === best.len && r.allow && !best.allow)) best = { len, allow: r.allow, rule: r };
    }
  }
  return { allowed: best ? best.allow : true, matchedBy, rule: best ? `${best.allow ? "Allow" : "Disallow"}: ${best.rule.path}` : null };
}

// ------------------------------------------------------------------ HTML(DOMを使わず必要な分だけ読む)
function attrs(tag) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  const inner = tag.replace(/^<\s*[a-zA-Z0-9-]+/, "").replace(/\/?>$/, "");
  while ((m = re.exec(inner))) out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? "");
  return out;
}

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (all, e) => {
    const k = e.toLowerCase();
    if (k[0] === "#") {
      const n = k[1] === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      try { return String.fromCodePoint(n); } catch { return all; }
    }
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[k];
  });
}

const stripTags = (s) => decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

export function parseHtml(src) {
  const html = src.replace(/<!--[\s\S]*?-->/g, "");
  const headEnd = html.search(/<\/head>/i);
  const head = headEnd > 0 ? html.slice(0, headEnd) : html;
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const meta = (name) => {
    const m = metas.find((x) => (x.name || x.property || "").toLowerCase() === name);
    return m ? (m.content || "").trim() : null;
  };
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const canonical = links.find((l) => (l.rel || "").toLowerCase().split(/\s+/).includes("canonical"));
  const titleM = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(head);
  const htmlTag = /<html\b[^>]*>/i.exec(html);
  const ld = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim());
  const clean = html.replace(/<(script|style|noscript|template|svg|iframe)\b[\s\S]*?<\/\1>/gi, " ");
  const heading = (n) => [...clean.matchAll(new RegExp(`<h${n}\\b[^>]*>([\\s\\S]*?)<\\/h${n}>`, "gi"))].map((m) => stripTags(m[1]));
  const bodyM = /<body\b[^>]*>([\s\S]*)/i.exec(clean);
  const text = stripTags(bodyM ? bodyM[1] : clean);
  // 本文の範囲(<article> か <main>。なければ body 全体)
  const mainM = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(clean) || /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(clean);
  const main = mainM ? mainM[1] : (bodyM ? bodyM[1] : clean);
  const imgs = [...clean.matchAll(/<img\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const anchors = [...main.matchAll(/<a\b[^>]*>/gi)].map((m) => attrs(m[0]).href).filter(Boolean);
  const allAnchors = [...clean.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: attrs(m[0].slice(0, m[0].indexOf(">") + 1)).href || "", text: stripTags(m[1]) }));
  // h1 の後ろの最初の段落(冒頭で答えているか)
  const afterH1 = main.split(/<\/h1>/i)[1] ?? main;
  const firstP = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(afterH1);
  const levels = [...clean.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  let skipped = false;
  for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) skipped = true;
  return {
    title: titleM ? stripTags(titleM[1]) : null,
    description: meta("description"),
    robots: meta("robots"),
    robotsBots: ["googlebot", "bingbot"].map((b) => meta(b)).filter(Boolean),
    canonical: canonical ? canonical.href : null,
    lang: htmlTag ? attrs(htmlTag[0]).lang || null : null,
    og: { title: meta("og:title"), description: meta("og:description"), image: meta("og:image") },
    ld,
    h1: heading(1),
    h2: heading(2),
    h3count: heading(3).length,
    textLength: [...text].length,
    scriptCount: (html.match(/<script\b/gi) || []).length,
    hasTime: /<time\b[^>]*datetime=/i.test(html),
    appShell: /<div[^>]+id=["'](root|app|__next|__nuxt)["'][^>]*>\s*<\/div>/i.test(html),
    viewport: meta("viewport"),
    twitterCard: meta("twitter:card"),
    imgCount: imgs.length,
    imgNoAlt: imgs.filter((a) => !("alt" in a)).length,
    imgEmptyAlt: imgs.filter((a) => a.alt === "").length,
    mainAnchors: anchors,
    allAnchors,
    hasMainRegion: !!mainM,
    hasArticleTag: /<article\b/i.test(clean),
    firstParagraph: firstP ? stripTags(firstP[1]) : null,
    lists: (main.match(/<(ul|ol)\b/gi) || []).length,
    tables: (main.match(/<table\b/gi) || []).length,
    headingSkip: skipped,
    mainTextLength: [...stripTags(main)].length,
    mainText: stripTags(main).slice(0, 60000),
    mainImgs: (main.match(/<(img|video|svg)\b/gi) || []).length,
    h3InMain: (main.match(/<h3\b/gi) || []).length,
    byline: /(執筆者?|著者|監修|書いた人|この記事を書いた|written by|author)\s*[::]?/i.test(stripTags(main).slice(0, 4000) + " " + stripTags(main).slice(-4000)) || /\brel=["']?author\b|class=["'][^"']*\b(author|byline)\b/i.test(main),
  };
}

// JSON-LD の @type を全部集める(@graph や入れ子もたどる)
export function ldTypes(blocks) {
  const types = new Set();
  const props = new Set();
  let broken = 0;
  const walk = (o, depth = 0) => {
    if (!o || typeof o !== "object" || depth > 8) return;
    if (Array.isArray(o)) return o.forEach((x) => walk(x, depth + 1));
    const t = o["@type"];
    (Array.isArray(t) ? t : t ? [t] : []).forEach((x) => types.add(String(x)));
    for (const k of Object.keys(o)) {
      props.add(k);
      if (typeof o[k] === "object") walk(o[k], depth + 1);
    }
  };
  for (const b of blocks) {
    try {
      walk(JSON.parse(b));
    } catch {
      broken++;
    }
  }
  return { types: [...types], props, broken, nodes: ldNodes(blocks) };
}

// @type ごとのオブジェクトを集める(必須プロパティの確認用)
function ldNodes(blocks) {
  const out = [];
  const walk = (o, depth = 0) => {
    if (!o || typeof o !== "object" || depth > 8) return;
    if (Array.isArray(o)) return o.forEach((x) => walk(x, depth + 1));
    if (o["@type"]) out.push(o);
    for (const k of Object.keys(o)) if (typeof o[k] === "object") walk(o[k], depth + 1);
  };
  for (const b of blocks) {
    try { walk(JSON.parse(b)); } catch {}
  }
  return out;
}
const isType = (n, re) => [].concat(n["@type"]).some((t) => re.test(String(t)));


// ------------------------------------------------------------------ 強化プラン
// 点数(土台)とは別に、表示回数・クリック率・順位・AIでの引用を伸ばすための次の一手を出す。
// goal: imp=表示回数を増やす / ctr=クリック率を上げる / rank=順位を上げる / ai=AIに引用される
const FIX_PLAN = {
  "ai-search-bots": { goals: ["ai", "imp"], effort: "5分" },
  indexable: { goals: ["imp", "ai"], effort: "5分" },
  status: { goals: ["imp", "rank"], effort: "要調査" },
  https: { goals: ["rank", "ctr"], effort: "半日" },
  "http-redirect": { goals: ["rank"], effort: "30分" },
  "soft-404": { goals: ["rank"], effort: "半日" },
  robots: { goals: ["imp"], effort: "15分" },
  sitemap: { goals: ["imp"], effort: "30分" },
  "in-sitemap": { goals: ["imp"], effort: "15分" },
  llms: { goals: ["ai"], effort: "30分" },
  title: { goals: ["ctr", "rank"], effort: "15分" },
  description: { goals: ["ctr"], effort: "15分" },
  canonical: { goals: ["rank"], effort: "15分" },
  viewport: { goals: ["rank"], effort: "15分" },
  lang: { goals: ["imp"], effort: "5分" },
  ogp: { goals: ["ctr"], effort: "30分" },
  "img-alt": { goals: ["imp", "ai"], effort: "1時間" },
  "structured-data": { goals: ["ctr", "ai"], effort: "1時間" },
  breadcrumb: { goals: ["ctr"], effort: "30分" },
  entity: { goals: ["rank", "ai"], effort: "半日" },
  date: { goals: ["rank", "ai", "ctr"], effort: "1時間" },
  headings: { goals: ["rank", "ai"], effort: "30分" },
  "question-headings": { goals: ["imp", "ai"], effort: "30分" },
  "answer-first": { goals: ["ai", "ctr"], effort: "15分" },
  faq: { goals: ["imp", "ai"], effort: "1時間" },
  "lists-tables": { goals: ["ai", "rank"], effort: "1時間" },
  text: { goals: ["rank", "imp", "ai"], effort: "半日〜" },
  "internal-links": { goals: ["rank", "imp"], effort: "30分" },
  citations: { goals: ["ai", "rank"], effort: "30分" },
  speed: { goals: ["rank"], effort: "要調査" },
  "html-size": { goals: ["rank"], effort: "要調査" },
  hsts: { goals: ["rank"], effort: "15分" },
  depth: { goals: ["imp", "rank", "ai"], effort: "半日〜" },
  "first-party": { goals: ["rank", "ai"], effort: "1日〜" },
  visuals: { goals: ["imp", "ai"], effort: "1時間" },
  coverage: { goals: ["imp", "ai"], effort: "半日" },
  byline: { goals: ["rank", "ai"], effort: "30分" },
};

export const GOALS = {
  imp: "表示回数を増やす",
  ctr: "クリック率を上げる",
  rank: "順位を上げる",
  ai: "AIに引用される",
};

function growthActions(pageType, h, final) {
  const title = h?.title || "";
  const a = [];
  // どのページでも出す
  a.push({ goal: "imp", title: "実際の検索キーワードを Search Console で確かめる", effort: "30分・月1回",
    why: "このツールはページの作りを見ています。実際にどんな言葉で何回表示され、何位にいるかは Search Console でしかわかりません。",
    steps: ["Search Console の「検索パフォーマンス」でこのページを絞り込む", "表示回数が多いのに順位が 8〜20 位のキーワードを3つ選ぶ(あと一歩で1ページ目・上位に届く言葉)", "その言葉への答えを、見出しと本文に足す"] });
  a.push({ goal: "ctr", title: "タイトルと説明文をクリックしたくなる形に書き直す", effort: "30分",
    why: "同じ順位でも、タイトルと説明文しだいでクリック率は大きく変わります。",
    steps: [`いまのタイトル:「${title.slice(0, 50)}」`, "検索された言葉を前半に入れ、読むと何がわかるか(手順・費用・比較・最新年など)を足す", "Search Console で表示回数が多くクリック率が低いページから順に直し、4週間後に比べる"] });
  a.push({ goal: "ai", title: "AIで実際に引用されているか確かめる", effort: "30分・月1回",
    why: "AI検索で引用されているかは、点数ではわかりません。ねらう質問をAIに聞いて、誰が引用されているかを見るのが一番確実です。",
    steps: ["お客さんが聞きそうな質問を5つ書き出す(例:「〇〇 費用」「〇〇 おすすめ」)", "ChatGPT(検索)・Perplexity・Google の AI による概要で聞き、引用元のURLを記録する", "引用されている他社ページと比べ、足りない情報(数字・手順・比較表)を足す"] });
  a.push({ goal: "rank", title: "外部からの紹介(被リンク・言及)を増やす", effort: "継続",
    why: "順位とAIでの信頼は、ページの中だけでは決まりません。ほかのサイトや人から紹介されることが大きく効きます。",
    steps: ["独自の調査データや無料ツールなど「紹介したくなる材料」を作る", "業界メディアへの寄稿・取材対応・プレスリリースで言及を得る", "Googleビジネスプロフィール・公式SNSを整え、構造化データの sameAs でつなぐ"] });
  if (pageType === "article") {
    a.push({ goal: "rank", title: "一次情報を足して「この記事にしかない理由」を作る", effort: "半日〜",
      why: "AIが要約できる一般論だけの記事は、検索でもAIでも埋もれます。自分で試した結果・数字・画面・失敗例は引用される理由になります。",
      steps: ["実際にやってみた結果や、自社の数字を1つ以上入れる", "スクリーンショットや図に、内容がわかる alt を付ける", "数字や仕様には出典と確認日を書く"] });
    a.push({ goal: "imp", title: "関連する質問の記事を増やし、内部リンクでつなぐ", effort: "継続",
      why: "1記事だけより、同じテーマの記事が束になっているサイトのほうが、テーマの専門性が伝わり表示回数が伸びます。",
      steps: ["この記事の読者が次に知りたいこと(費用・比較・手順・失敗例)を3つ書き出す", "それぞれ1記事にし、この記事と相互にリンクする", "まとめ役の記事(ピラー記事)から全部にリンクする"] });
    a.push({ goal: "ai", title: "見出しごとに「1文の答え」を置く", effort: "1時間",
      why: "AIはページ全体ではなく、質問に合う段落を抜き出して引用します。",
      steps: ["各 h2 の直後の1文で、その見出しの問いに答える", "そのあとに理由・手順・例を続ける", "定義は「〇〇とは、△△のことです」の形で書く"] });
    a.push({ goal: "rank", title: "定期的に内容を見直して更新する", effort: "1時間・3〜6か月ごと",
      why: "古い情報のままだと、新しい記事に順位を抜かれ、AIにも選ばれにくくなります。",
      steps: ["数字・仕様・料金・画面が今も正しいか確かめる", "直したら本文と dateModified の更新日を新しくする", "Search Console で更新前後の順位とクリックを比べる"] });
  } else {
    a.push({ goal: "imp", title: "お客さんがAIや検索に聞く質問ごとにページを作る", effort: "継続",
      why: "トップページだけでは、狙える検索キーワードが限られます。表示回数を増やす一番の方法は、答えられる質問の数を増やすことです。",
      steps: ["「〇〇とは」「〇〇 費用」「〇〇 比較」「〇〇 やり方」など、お客さんの質問を20個書き出す", "1つの質問に1ページで答える記事を作る", "このページから関連するページへリンクする"] });
    a.push({ goal: "ai", title: "会社・サービスの事実情報を1か所にまとめる", effort: "半日",
      why: "AIは「誰が・何を・いくらで・どこで」提供しているかがはっきりしたサイトを紹介しやすくなります。",
      steps: ["サービス内容・料金の目安・対応地域・実績・会社概要をページにまとめる", "Organization や Service の構造化データで同じ情報を書く", "他サイトに載っている会社情報(住所・電話・名前)をそろえる"] });
  }
  return a;
}

// ------------------------------------------------------------------ 診断
const len = (s) => (s ? [...s].length : 0);

async function diagnose(target, deps = {}) {
  const fetcher = (u, maxBytes) => safeFetch(u, { maxBytes, ...deps });
  const page = await fetcher(target.href, MAX_HTML_BYTES);
  if (page.error) {
    const msg = {
      timeout: "サイトの応答が8秒以内に返ってきませんでした。",
      network: "サイトにつながりませんでした。URLが正しいか、サイトが公開されているか確かめてください。",
      redirects: "リダイレクトが多すぎて、ページにたどり着けませんでした。",
    }[page.error];
    throw new UserError(msg);
  }
  const final = new URL(page.finalUrl);
  const origin = final.origin;
  const probe = "/aio-checker-404-" + Math.random().toString(36).slice(2, 10);
  const [robotsRes, llmsRes, sitemapRes, httpRes, notFoundRes] = await Promise.all([
    fetcher(origin + "/robots.txt", MAX_TEXT_BYTES),
    fetcher(origin + "/llms.txt", MAX_TEXT_BYTES),
    fetcher(origin + "/sitemap.xml", 1_000_000),
    final.protocol === "https:" ? safeFetch("http://" + final.host + final.pathname, { maxBytes: 1000, noFollow: true, ...deps }) : null,
    fetcher(origin + probe, 20_000),
  ]);
  return buildReport({ target, page, robotsRes, llmsRes, sitemapRes, httpRes, notFoundRes });
}
export { diagnose };

export function buildReport({ target, page, robotsRes, llmsRes, sitemapRes, httpRes = null, notFoundRes = null, now = new Date() }) {
  const final = new URL(page.finalUrl);
  const ct = (page.headers.get("Content-Type") || "").toLowerCase();
  const isHtml = ct.includes("html") || /^\s*<(!doctype|html)/i.test(page.text);
  const h = isHtml ? parseHtml(page.text) : null;
  const checks = [];
  const add = (group, id, label, status, detail, advice = "", link = "", weight = 0) =>
    checks.push({ group, id, label, status, detail, advice, link, weight });

  // ---------------- 1. AIクローラーに読んでもらえるか
  const G1 = "AIクローラーへの公開";
  let robots = null;
  const robotsOk = robotsRes && !robotsRes.error && robotsRes.status === 200 &&
    !/^\s*</.test(robotsRes.text) && !(robotsRes.headers.get("Content-Type") || "").includes("html");
  if (robotsOk) {
    robots = parseRobots(robotsRes.text);
    add(G1, "robots", "robots.txt がある", "ok", `${final.origin}/robots.txt を読み込めました。`, "", ARTICLE.robots, 4);
  } else if (robotsRes && !robotsRes.error && robotsRes.status >= 500) {
    add(G1, "robots", "robots.txt がある", "ng", `robots.txt がサーバーエラー(${robotsRes.status})を返しています。Google はこの状態が続くとサイト全体のクロールを止めることがあります。`,
      "robots.txt が 200 か 404 を返すようにサーバーを直しましょう。", ARTICLE.robots, 4);
  } else {
    add(G1, "robots", "robots.txt がある", "warn", "robots.txt が見つかりませんでした(すべてのクローラーに公開している扱いになります)。",
      "AIクローラーへの方針をはっきりさせるため、robots.txt を置いてサイトマップの場所も書いておきましょう。", ARTICLE.robots, 4);
  }

  const path = final.pathname + final.search;
  const botResults = BOTS.map((b) => ({ ...b, ...(robots ? robotsAllows(robots, b.ua, path) : { allowed: true, matchedBy: null }) }));
  const searchBlocked = botResults.filter((b) => b.search && !b.allowed);
  const trainBlocked = botResults.filter((b) => !b.search && !b.allowed);
  add(G1, "ai-search-bots", "AI検索のクローラーを許可している",
    searchBlocked.length === 0 ? "ok" : searchBlocked.some((b) => ["Googlebot", "Bingbot"].includes(b.ua)) || searchBlocked.length >= 3 ? "ng" : "warn",
    searchBlocked.length === 0
      ? "ChatGPT・Claude・Perplexity・Google・Bing の検索用クローラーが、このページを読める設定です。"
      : `ブロックされています: ${searchBlocked.map((b) => `${b.ua}(${b.role})`).join("、")}`,
    searchBlocked.length ? "AI検索で引用されたいなら、検索用のクローラーは robots.txt でブロックしないのが基本です。" : "",
    ARTICLE.robots, 16);
  add(G1, "ai-train-bots", "AI学習用クローラーの設定", "info",
    trainBlocked.length === 0
      ? "学習用のクローラー(GPTBot・ClaudeBot・Google-Extended など)も許可しています。"
      : `学習用でブロック中: ${trainBlocked.map((b) => b.ua).join("、")}。学習を断ってもAI検索には出られるので、方針しだいで問題ありません。`,
    "", ARTICLE.robots, 0);

  const robotsMeta = [h?.robots, ...(h?.robotsBots || []), page.headers.get("X-Robots-Tag")].filter(Boolean).join(", ").toLowerCase();
  const noindex = /noindex|\bnone\b/.test(robotsMeta);
  const nosnippet = /nosnippet|max-snippet\s*:\s*0\b/.test(robotsMeta);
  add(G1, "indexable", "検索とAIに表示を許可している", noindex ? "ng" : nosnippet ? "warn" : "ok",
    noindex ? "noindex が指定されています。このページは検索結果にもAI Overviewsにも出ません。"
      : nosnippet ? "nosnippet(または max-snippet:0)が指定されています。Google はこの指定があるとAI Overviewsで引用しません。"
        : "noindex・nosnippet の指定はありません。",
    noindex || nosnippet ? "公開したいページなら、meta robots や X-Robots-Tag の指定を外しましょう。" : "", ARTICLE.aio, 12);

  const llmsOk = llmsRes && !llmsRes.error && llmsRes.status === 200 && !/^\s*</.test(llmsRes.text) && /^\s*#\s+\S/.test(llmsRes.text);
  add(G1, "llms", "llms.txt がある", llmsOk ? "ok" : "warn",
    llmsOk ? `${final.origin}/llms.txt があります。` : "llms.txt が見つかりませんでした。",
    llmsOk ? "" : "必須ではありません(Google検索は使っていません)。AIエージェントにサイトの概要を伝えたいなら、置いておくと安心です。",
    ARTICLE.llms, 2);

  const smInRobots = robots ? robots.sitemaps : [];
  const smOk = smInRobots.length > 0 || (sitemapRes && !sitemapRes.error && sitemapRes.status === 200 && /<(urlset|sitemapindex)\b/i.test(sitemapRes.text));
  add(G1, "sitemap", "XMLサイトマップがある", smOk ? "ok" : "warn",
    smOk ? (smInRobots.length ? `robots.txt にサイトマップの場所が書いてあります(${smInRobots[0]})。` : "/sitemap.xml があります。") : "サイトマップが見つかりませんでした。",
    smOk ? (smInRobots.length ? "" : "robots.txt に「Sitemap: URL」の行を足すと、Bing などにも見つけてもらいやすくなります。") : "サイトマップを作り、robots.txt に「Sitemap: URL」を書きましょう。",
    ARTICLE.sitemap, 5);

  // ---------------- 2. ページの基本
  const G2 = "ページの基本(SEO)";
  const okStatus = page.status >= 200 && page.status < 300;
  const path0 = final.pathname;
  add(G2, "status", "ページが正常に表示される", okStatus ? "ok" : "ng",
    `HTTPステータス ${page.status}${page.chain.length ? `(リダイレクト ${page.chain.length} 回のあと)` : ""}。`,
    okStatus ? "" : [403, 429, 503].includes(page.status)
      ? "ファイアウォールやボット対策で、プログラムからのアクセスが止められている可能性があります。AIクローラーまで止めていないか、CDN・WAFの設定を確かめましょう。"
      : "クローラーが読めるよう、ページが 200 を返すようにしましょう。", "", 6);
  add(G2, "https", "HTTPSで配信している", final.protocol === "https:" ? "ok" : "ng",
    final.protocol === "https:" ? "HTTPSで配信されています。" : "HTTP(暗号化なし)で配信されています。",
    final.protocol === "https:" ? "" : "SSL証明書を入れて、http から https へリダイレクトしましょう。", "", 5);
  if (httpRes && !httpRes.error) {
    const redirOk = httpRes.status >= 300 && httpRes.status < 400 && /^https:/.test(httpRes.location || "");
    add(G2, "http-redirect", "http から https へ転送している", redirOk ? (httpRes.status === 301 || httpRes.status === 308 ? "ok" : "warn") : "ng",
      redirOk ? `http:// で開くと ${httpRes.status} で https に転送されます。` : `http:// で開いても https に転送されません(ステータス ${httpRes.status})。`,
      redirOk ? (httpRes.status === 301 || httpRes.status === 308 ? "" : "恒久的な転送(301)にすると、評価が https 側にまとまります。") : "http と https の両方で見られると評価が分かれます。301 で https に転送しましょう。", "", 3);
  }
  const hsts = page.headers.get("Strict-Transport-Security");
  if (final.protocol === "https:") {
    add(G2, "hsts", "HSTS(常にHTTPSで開く指定)がある", hsts ? "ok" : "warn",
      hsts ? `Strict-Transport-Security: ${hsts}` : "Strict-Transport-Security ヘッダーがありません。",
      hsts ? "" : "サーバーやCDNで HSTS を有効にすると、http で開かれることがなくなり安全性も上がります。", "", 1);
  }
  if (notFoundRes && !notFoundRes.error) {
    const soft = notFoundRes.status >= 200 && notFoundRes.status < 300;
    add(G2, "soft-404", "存在しないページが 404 を返す", soft ? "warn" : "ok",
      soft ? `存在しないURLを開いても ${notFoundRes.status} が返ります(ソフト404)。` : `存在しないURLは ${notFoundRes.status} を返します。`,
      soft ? "中身のないページが大量に索引されると、サイト全体の評価やクロールの効率が下がります。存在しないページは 404 を返しましょう。" : "", "", 3);
  }

  let pageType = "other";
  if (!h) {
    add(G2, "html", "HTMLページである", "ng", `HTMLではありません(Content-Type: ${ct || "不明"})。`, "記事やトップページなど、HTMLのページのURLを入れてください。", "", 0);
  } else {
    const ld0 = ldTypes(h.ld);
    pageType = ld0.types.some((t) => /^(Article|NewsArticle|BlogPosting|TechArticle|Report)$/.test(t)) || (h.hasArticleTag && path0 !== "/" && h.mainTextLength > 1500)
      ? "article" : path0 === "/" ? "top" : "other";
    const tl = len(h.title);
    const kwFront = h.title && h.h1[0] ? h.title.slice(0, 20).includes(h.h1[0].replace(/[??].*$/, "").slice(0, 6)) : true;
    add(G2, "title", "タイトルの長さと中身", !tl ? "ng" : tl < 20 || tl > 45 ? "warn" : "ok",
      tl ? `「${h.title}」(${tl}字)` : "title タグがありません。",
      !tl ? "ページの内容がわかるタイトルを付けましょう。" : tl < 20 ? "短すぎます。検索される言葉と、読む理由(手順・比較・費用など)を足しましょう。" : tl > 45 ? "長すぎて検索結果で切れます。日本語は28〜40字が目安。大事な言葉を前に寄せましょう。" : "",
      ARTICLE.title, 5);
    const dl = len(h.description);
    add(G2, "description", "説明文(meta description)", !dl ? "ng" : dl < 70 || dl > 130 ? "warn" : "ok",
      dl ? `「${h.description.slice(0, 120)}${dl > 120 ? "…" : ""}」(${dl}字)` : "meta description がありません。",
      !dl ? "ページの要点を80〜120字で書きましょう。検索結果に出る文はクリック率に直結します。" : dl < 70 ? "短めです。誰の・どんな悩みに・何がわかるかを80〜120字で書きましょう。" : dl > 130 ? "長すぎて切れます。120字前後にまとめましょう。" : "",
      ARTICLE.title, 4);
    let canonStatus = "warn";
    let canonDetail = "canonical がありません。";
    if (h.canonical) {
      try {
        const c = new URL(h.canonical, final);
        const same = c.href.replace(/\/$/, "") === final.href.replace(/\/$/, "");
        canonStatus = same ? "ok" : c.origin === final.origin ? "warn" : "ng";
        canonDetail = `canonical: ${c.href}` + (same ? "" : "(このURLとは別のURLを指しています。意図したものか確かめてください)");
      } catch {
        canonDetail = "canonical のURLが正しくありません。";
      }
    }
    add(G2, "canonical", "canonical(正規URL)", canonStatus, canonDetail,
      canonStatus === "ok" ? "" : "自分自身のURLを canonical に指定すると、パラメータ付きURLなどに評価が分かれません。", ARTICLE.canonical, 3);
    add(G2, "viewport", "スマホ表示に対応している", h.viewport && /width=device-width/.test(h.viewport) ? "ok" : "ng",
      h.viewport ? `viewport: ${h.viewport}` : "viewport の指定がありません。",
      h.viewport && /width=device-width/.test(h.viewport) ? "" : 'Google はスマホ版のページで評価します。<meta name="viewport" content="width=device-width, initial-scale=1"> を入れましょう。', "", 4);
    add(G2, "lang", "言語(lang)を指定している", h.lang ? "ok" : "warn",
      h.lang ? `lang="${h.lang}"` : "html タグに lang がありません。", h.lang ? "" : '<html lang="ja"> のように指定しましょう。', "", 1);
    const ogMissing = [!h.og.title && "og:title", !h.og.description && "og:description", !h.og.image && "og:image", !h.twitterCard && "twitter:card"].filter(Boolean);
    add(G2, "ogp", "OGP(SNS・共有用の情報)", ogMissing.length === 0 ? "ok" : ogMissing.length >= 3 ? "ng" : "warn",
      ogMissing.length === 0 ? "og:title・og:description・og:image・twitter:card があります。" : `足りないもの: ${ogMissing.join("、")}`,
      ogMissing.length ? "SNSやチャットで共有されたときに画像つきで表示され、クリックされやすくなります(被リンクや言及のきっかけにも)。" : "", "", 2);
    if (h.imgCount) {
      const bad = h.imgNoAlt;
      add(G2, "img-alt", "画像に代替テキスト(alt)がある", bad === 0 ? "ok" : bad / h.imgCount > 0.3 ? "ng" : "warn",
        `画像 ${h.imgCount} 枚のうち alt がないもの ${bad} 枚、alt が空のもの ${h.imgEmptyAlt} 枚。`,
        bad ? "画像の内容を alt で説明すると、画像検索からの流入が増え、AIも図の意味を理解できます(飾りの画像は alt=\"\" で可)。" : "", "", 3);
    }
    // サイトマップに入っているか
    if (sitemapRes && !sitemapRes.error && sitemapRes.status === 200 && /<urlset\b/i.test(sitemapRes.text)) {
      const inSm = sitemapRes.text.includes(final.href) || sitemapRes.text.includes(final.href.replace(/\/$/, "") + "<");
      add(G2, "in-sitemap", "このページがサイトマップに入っている", inSm ? "ok" : sitemapRes.truncated ? "info" : "warn",
        inSm ? "/sitemap.xml にこのURLがあります。" : sitemapRes.truncated ? "サイトマップが大きいため確認しきれませんでした。" : "/sitemap.xml にこのURLが見つかりません。",
        inSm || sitemapRes.truncated ? "" : "索引してほしいページはサイトマップに入れましょう(canonical と同じURLで)。", "", 2);
    }
  }

  // ---------------- 3. AIに理解・引用されやすいか(コンテンツ)
  const G3 = "AIに理解・引用されやすい作り";
  const G5 = "中身の強さ(順位・AI引用に効く)";
  if (h) {
    const ld = ldTypes(h.ld);
    const nodes = ld.nodes;
    const art = nodes.find((n) => isType(n, /^(Article|NewsArticle|BlogPosting|TechArticle|Report)$/));
    const org = nodes.find((n) => isType(n, /^(Organization|Corporation|LocalBusiness|NewsMediaOrganization|OnlineBusiness)$/));
    let sdStatus, sdDetail, sdAdvice;
    if (ld.broken) {
      sdStatus = "ng"; sdDetail = `JSON-LD が ${ld.broken} か所壊れていて読めません。`; sdAdvice = "リッチリザルトテストで壊れている箇所を確かめましょう。";
    } else if (!ld.types.length) {
      sdStatus = "ng"; sdDetail = "JSON-LD の構造化データがありません。"; sdAdvice = "ページの種類に合わせて Article・Organization・BreadcrumbList などを足しましょう。";
    } else if (pageType === "article") {
      const miss = art ? ["headline", "author", "datePublished", "dateModified", "image"].filter((k) => !art[k]) : ["Article"];
      sdStatus = miss.length === 0 ? "ok" : "warn";
      sdDetail = `見つかった種類: ${ld.types.slice(0, 12).join("、")}` + (miss.length ? `。記事として足りない項目: ${miss.join("、")}` : "");
      sdAdvice = miss.length ? "Article に headline・author・datePublished・dateModified・image をそろえると、著者と鮮度がAIにも伝わります。" : "";
    } else {
      sdStatus = org || ld.types.includes("WebSite") ? "ok" : "warn";
      sdDetail = `見つかった種類: ${ld.types.slice(0, 12).join("、")}`;
      sdAdvice = sdStatus === "ok" ? "" : "トップや会社ページには Organization(名前・ロゴ・URL・sameAs)と WebSite を入れましょう。";
    }
    add(G3, "structured-data", "構造化データ(JSON-LD)", sdStatus, sdDetail, sdAdvice, ARTICLE.sd, 8);
    if (path0 !== "/") {
      const bc = ld.types.includes("BreadcrumbList");
      add(G3, "breadcrumb", "パンくずの構造化データがある", bc ? "ok" : "warn", bc ? "BreadcrumbList があります。" : "BreadcrumbList がありません。",
        bc ? "" : "サイト内のどこにあるページかが伝わり、検索結果にもパンくずが表示されます。", ARTICLE.sd, 2);
    }
    const sameAs = nodes.some((n) => n.sameAs);
    const authorNode = art && art.author ? [].concat(art.author)[0] : null;
    const authorOk = authorNode && typeof authorNode === "object" && authorNode.name && authorNode.url;
    const aboutLink = h.allAnchors.some((a) => /\/(about|company|profile|author|team|corporate|kaisya|gaiyou)/i.test(a.href) || /運営者|会社概要|著者|プロフィール|私たちについて|About/i.test(a.text));
    const entityScore = [org || authorNode, aboutLink, sameAs, pageType !== "article" || authorOk].filter(Boolean).length;
    add(G3, "entity", "運営者・著者が信頼できる形で示されている", entityScore === 4 ? "ok" : entityScore >= 2 ? "warn" : "ng",
      [`構造化データの運営者/著者: ${org || authorNode ? "あり" : "なし"}`, `運営者・会社情報ページへのリンク: ${aboutLink ? "あり" : "なし"}`, `sameAs(SNS・外部プロフィールへのつながり): ${sameAs ? "あり" : "なし"}`, pageType === "article" ? `著者の名前とURL: ${authorOk ? "あり" : "なし"}` : null].filter(Boolean).join("/"),
      entityScore === 4 ? "" : "誰が・どんな経験から書いているかを示すと、Google の E-E-A-T の評価や、AIが信頼できる出典として選ぶ理由になります。sameAs で公式SNSや外部の紹介ページとつなげましょう。", ARTICLE.eeat, 6);
    const dates = nodes.map((n) => n.dateModified || n.datePublished).filter(Boolean).map((d) => new Date(d)).filter((d) => !isNaN(d));
    const latest = dates.length ? new Date(Math.max(...dates)) : null;
    const ageDays = latest ? Math.floor((now - latest) / 86400000) : null;
    if (pageType === "article" || latest || h.hasTime) {
      add(G5, "date", "更新日が新しい", !latest ? (h.hasTime ? "warn" : "ng") : ageDays > 730 ? "ng" : ageDays > 180 ? "warn" : "ok",
        latest ? `構造化データの最終更新日: ${latest.toISOString().slice(0, 10)}(${ageDays}日前)` : h.hasTime ? "ページ上に日付はありますが、構造化データに dateModified がありません。" : "公開日・更新日が見つかりません。",
        !latest ? "datePublished・dateModified を構造化データとページ上の両方に入れましょう。" : ageDays > 180 ? "半年以上更新されていません。情報を見直して更新日を新しくすると、検索でもAIでも選ばれやすくなります。" : "", "", 4);
    }
    const h1n = h.h1.length;
    const h2n = h.h2.length;
    const needH2 = pageType === "article" ? 3 : 2;
    add(G3, "headings", "見出しの構成", h1n === 1 && h2n >= needH2 && !h.headingSkip ? "ok" : h1n === 0 ? "ng" : "warn",
      `h1 ${h1n} 個、h2 ${h2n} 個、h3 ${h.h3count} 個` + (h.headingSkip ? "、見出しのレベルが飛んでいる箇所あり" : "") + (h1n ? `(h1:「${h.h1[0].slice(0, 40)}」)` : ""),
      h1n === 0 ? "ページの主題を h1 で1つ書きましょう。" : h1n > 1 ? "h1 は1ページに1つにしましょう。" : h2n < needH2 ? `h2 を${needH2}個以上にして話題を区切りましょう。` : h.headingSkip ? "h2 の次に h4 のようにレベルを飛ばさず、順番に使いましょう。" : "",
      ARTICLE.basics, 4);
    if (pageType === "article") {
      const q = h.h2.filter((t) => /[??]|とは|なぜ|どう|どの|いつ|いくら|方法|やり方|違い|ポイント|\b(how|what|why|when|which)\b/i.test(t)).length;
      const ratio = h2n ? q / h2n : 0;
      add(G3, "question-headings", "見出しが「読者の質問」の形になっている", ratio >= 0.5 ? "ok" : ratio > 0 ? "warn" : "ng",
        `h2 ${h2n} 個のうち、質問・疑問の形は ${q} 個。`,
        ratio >= 0.5 ? "" : "「〇〇とは?」「〇〇のやり方は?」のように、読者がAIや検索に打ち込む質問を見出しにすると、その部分が答えとして引用されやすくなります。", ARTICLE.answer, 4);
      const fp = h.firstParagraph ? len(h.firstParagraph) : 0;
      add(G3, "answer-first", "冒頭で結論を言い切っている", fp >= 40 && fp <= 220 ? "ok" : "warn",
        h.firstParagraph ? `最初の段落(${fp}字):「${h.firstParagraph.slice(0, 80)}${fp > 80 ? "…" : ""}」` : "h1 の後に段落が見つかりません。",
        fp >= 40 && fp <= 220 ? "" : "タイトルの問いへの答えを、最初の1〜2文(40〜200字)で言い切りましょう。AI Overviews や ChatGPT はこの部分をそのまま要約に使いがちです。", ARTICLE.answer, 5);
      const faq = ld.types.includes("FAQPage") || h.h2.some((t) => /よくある質問|FAQ|Q&A/i.test(t));
      add(G3, "faq", "よくある質問(FAQ)がある", faq ? "ok" : "warn", faq ? "FAQの見出しまたは FAQPage があります。" : "FAQ が見つかりません。",
        faq ? "" : "読者が次に聞きそうな質問と短い答えを最後にまとめると、関連する質問の検索やAIの回答で拾われる入口が増えます。", ARTICLE.answer, 3);
    }
    add(G3, "lists-tables", "箇条書き・表で整理されている", h.lists + h.tables >= 2 ? "ok" : h.lists + h.tables === 1 ? "warn" : pageType === "article" ? "ng" : "warn",
      `本文の箇条書き ${h.lists} 個、表 ${h.tables} 個。`,
      h.lists + h.tables >= 2 ? "" : "手順は番号付きリスト、比較は表にすると、AIが要点を抜き出しやすく、強調スニペットにも選ばれやすくなります。", "", 3);
    const base = h.hasMainRegion ? h.mainTextLength : h.textLength;
    const need = pageType === "article" ? [800, 2000] : [300, 600];
    const thin = base < need[0];
    const jsShell = h.textLength < 300 && (h.appShell || h.scriptCount >= 5);
    add(G3, "text", "本文の量と、HTMLに本文が入っているか", jsShell ? "ng" : thin ? "ng" : base < need[1] ? "warn" : "ok",
      `本文(${h.hasMainRegion ? "article/main の中" : "ページ全体"})は約 ${base.toLocaleString("ja-JP")} 字。` + (jsShell ? "JavaScriptで後から表示するつくりの可能性があります。" : ""),
      jsShell ? "多くのAIクローラーはJavaScriptを実行しません。本文を最初のHTMLに入れる(SSR・静的生成)と読まれやすくなります。"
        : base < need[1] ? `${pageType === "article" ? "記事" : "このページ"}としては少なめです。読者の疑問に答える具体的な説明・数字・手順・事例を足しましょう(文字数そのものより、答えの網羅が大事です)。` : "",
      ARTICLE.js, 8);
    // リンク
    const isInternal = (href) => { try { const u = new URL(href, final); return u.host === final.host; } catch { return false; } };
    const linkSet = h.hasMainRegion ? h.mainAnchors : h.allAnchors.map((a) => a.href);
    const internal = new Set(linkSet.filter((x) => isInternal(x) && !/^#/.test(x)).map((x) => new URL(x, final).pathname));
    internal.delete(final.pathname);
    const needInt = h.hasMainRegion ? (pageType === "article" ? 8 : 5) : 15;
    add(G5, "internal-links", "関連ページへの内部リンク網", internal.size >= needInt ? "ok" : internal.size >= Math.ceil(needInt / 3) ? "warn" : "ng",
      `${h.hasMainRegion ? "本文中" : "ページ全体"}の内部リンク先: ${internal.size} ページ。`,
      internal.size >= needInt ? "" : `目安は${h.hasMainRegion ? "本文から" : ""}${needInt}ページ以上。関連する記事やサービスページへ本文からリンクすると、検索エンジンがサイトの構造を理解し、評価がサイト内に回ります。同じテーマの記事どうしを相互にリンクし、テーマのまとまり(トピッククラスター)を作りましょう。`, "", 6);
    if (pageType === "article") {
      const ext = new Set(linkSet.filter((x) => /^https?:/i.test(x) && !isInternal(x)).map((x) => { try { return new URL(x).host; } catch { return x; } }));
      add(G5, "citations", "出典(外部の一次資料)へのリンク", ext.size >= 3 ? "ok" : ext.size >= 1 ? "warn" : "ng",
        `本文から外部サイトへのリンク: ${ext.size} サイト${ext.size ? `(${[...ext].slice(0, 5).join("、")})` : ""}。`,
        ext.size >= 3 ? "" : "目安は3サイト以上。数字や仕様には、公的機関・公式ドキュメントなど一次資料へのリンクを付けましょう。信頼性の評価と、AIが「根拠のある情報」として選ぶ理由になります。", ARTICLE.firstParty, 5);
    }

    // ---- 中身の強さ: 技術的な土台だけでは満点にならないよう、成果に効く中身を厳しめに見る
    const isArt = pageType === "article";
    const body = h.hasMainRegion ? h.mainTextLength : h.textLength;
    const depthNeed = isArt ? [5000, 2000] : pageType === "top" ? [1500, 600] : [2000, 800];
    add(G5, "depth", "内容の深さ(本文の厚み)", body >= depthNeed[0] ? "ok" : body >= depthNeed[1] ? "warn" : "ng",
      `本文は約 ${body.toLocaleString("ja-JP")} 字(よく読まれる${isArt ? "解説記事" : "ページ"}の目安は ${depthNeed[0].toLocaleString("ja-JP")} 字前後)。`,
      body >= depthNeed[0] ? "" : "上位のページやAIの回答が触れている論点を洗い出し、足りない論点(手順・費用・比較・注意点・事例)を足しましょう。水増しではなく、読者の次の疑問に先回りして答える量が目安です。",
      ARTICLE.firstParty, isArt ? 10 : 6);
    const mt = h.mainText || "";
    const expWords = new Set((mt.match(/実際に|試した|試して|検証|調査|計測|測定|アンケート|インタビュー|事例|当社|弊社|自社|私たち|筆者|お客様|導入前|導入後|ビフォー|アフター|結果は|社内データ/g) || []));
    const numbers = (mt.match(/\d[\d,.]*\s*(%|％|件|人|社|円|万円|倍|秒|ミリ秒|日|週間|か月|ヶ月|カ月|年|回|位|PV|pt|ポイント|クリック|字)/g) || []).length;
    const fpScore = (expWords.size >= (isArt ? 5 : 3) ? 1 : 0) + (numbers >= (isArt ? 15 : 5) ? 1 : 0);
    add(G5, "first-party", "一次情報(自分で試した・調べた結果)", fpScore === 2 ? "ok" : fpScore === 1 || expWords.size || numbers ? "warn" : "ng",
      `経験・検証を示す言葉 ${expWords.size} 種類${expWords.size ? `(${[...expWords].slice(0, 6).join("、")})` : ""}、単位つきの具体的な数字 ${numbers} 個。`,
      fpScore === 2 ? "" : "ほかのサイトにない「自分で試した結果・自社のデータ・事例・スクリーンショット」は、Google の評価(E-E-A-T の Experience)でも、AIが引用元を選ぶときにも一番の差になります。数字と条件をそろえて書きましょう。",
      ARTICLE.firstParty, isArt ? 10 : 5);
    const imgNeed = isArt ? 3 : 1;
    add(G5, "visuals", "図・画像・表で説明している", h.mainImgs + h.tables >= imgNeed ? "ok" : h.mainImgs + h.tables > 0 ? "warn" : "ng",
      `本文の画像・動画 ${h.mainImgs} 個、表 ${h.tables} 個。`,
      h.mainImgs + h.tables >= imgNeed ? "" : "実際の画面・図解・比較表は、文章だけより理解されやすく、画像検索やAIの回答に使われる入口も増えます。",
      "", isArt ? 4 : 2);
    if (isArt) {
      const sections = h.h2.length + h.h3InMain;
      add(G5, "coverage", "話題の網羅(見出しの数)", sections >= 10 ? "ok" : sections >= 5 ? "warn" : "ng",
        `本文の h2 ${h.h2.length} 個 + h3 ${h.h3InMain} 個 = ${sections} 個の論点。`,
        sections >= 10 ? "" : "検索する人が一緒に知りたい論点(関連する質問)を h2・h3 に分けて足すと、関連キーワードでの表示回数とAIに拾われる場面が増えます。",
        ARTICLE.answer, 5);
      add(G5, "byline", "記事内に書き手(著者・監修者)が見える", h.byline ? "ok" : "warn",
        h.byline ? "本文の近くに著者・執筆者・監修者の表示があります。" : "本文の近くに著者・執筆者の表示が見つかりません。",
        h.byline ? "" : "記事の上か下に「誰が書いたか(名前・経歴・プロフィールへのリンク)」を出しましょう。構造化データだけでなく、読者に見える形で示すのが大事です。",
        ARTICLE.eeat, 4);
    }
  }

  // ---------------- 4. 速さ・技術
  const G4 = "表示の速さ・技術";
  const ms = page.ms;
  const kb = Math.round(new TextEncoder().encode(page.text).length / 1024);
  add(G4, "speed", "サーバーの応答が速い", ms <= 500 ? "ok" : ms <= 1500 ? "warn" : "ng",
    `最初の応答まで約 ${ms.toLocaleString("ja-JP")} ミリ秒(診断サーバーから計測した目安)。`,
    ms <= 500 ? "" : "応答が遅いとクローラーが読む量が減り、訪問者も離脱します。キャッシュ・CDN・サーバーの性能を見直しましょう。表示全体の速さは PageSpeed Insights で測れます。",
    "", 5);
  add(G4, "html-size", "HTMLが重すぎない", kb <= 300 ? "ok" : kb <= 1000 && !page.truncated ? "warn" : "ng",
    `HTMLの大きさ約 ${kb.toLocaleString("ja-JP")} KB${page.truncated ? "以上" : ""}${h ? `、script タグ ${h.scriptCount} 個` : ""}。`,
    kb <= 300 ? "" : "HTMLが大きいと、クローラーが途中までしか読まないことがあります。埋め込みのデータやインラインのスクリプトを減らしましょう。", "", 2);

  // 上級者向け: 診断に使った生の値
  const hdr = (k) => page.headers.get(k);
  const ldInfo = h ? ldTypes(h.ld) : { types: [], broken: 0 };
  const firstLines = (r) => (r && !r.error && r.status === 200 && !/^\s*</.test(r.text) ? r.text.split(/\r?\n/).slice(0, 30).join("\n") : null);
  const raw = {
    redirects: [...page.chain.map((c) => `${c.status} ${c.url}`), `${page.status} ${final.href}`],
    headers: Object.fromEntries(["content-type", "x-robots-tag", "cache-control", "server", "content-encoding", "strict-transport-security", "link", "last-modified"]
      .map((k) => [k, hdr(k)]).filter(([, v]) => v)),
    timing: { firstByteMs: page.ms, totalMs: page.totalMs, htmlBytes: new TextEncoder().encode(page.text).length, truncated: !!page.truncated },
    html: h ? {
      title: h.title, description: h.description, metaRobots: h.robots, canonical: h.canonical, lang: h.lang, og: h.og,
      h1: h.h1, h2: h.h2.slice(0, 20), h3Count: h.h3count, textChars: h.textLength, scriptTags: h.scriptCount,
      jsonLdTypes: ldInfo.types, jsonLdBlocks: h.ld.length, jsonLdBroken: ldInfo.broken,
    } : null,
    robotsTxt: robotsOk ? { status: robotsRes.status, sitemaps: robots.sitemaps, groups: robots.groups.length, head: firstLines(robotsRes) } : { status: robotsRes?.status ?? null, error: robotsRes?.error ?? null },
    llmsTxt: { status: llmsRes?.status ?? null, head: llmsOk ? firstLines(llmsRes).split("\n").slice(0, 12).join("\n") : null },
    sitemapXml: { status: sitemapRes?.status ?? null },
  };

  // 点数は3つの柱の合計。技術的な土台が完ぺきでも、中身が平均的なら70点前後にとどまる配分
  const rate = (list) => {
    const sc = list.filter((c) => c.weight > 0);
    const t = sc.reduce((s, c) => s + c.weight, 0);
    const g = sc.reduce((s, c) => s + (c.status === "ok" ? c.weight : c.status === "warn" ? c.weight * 0.25 : 0), 0);
    return t ? g / t : 0;
  };
  const breakdown = [
    { key: "base", label: "土台(公開・SEOの基本・速さ)", max: 30, groups: [G1, G2, G4] },
    { key: "ai", label: "AIに読まれやすい作り", max: 30, groups: [G3] },
    { key: "content", label: "中身の強さ", max: 40, groups: [G5] },
  ].map((b) => ({ key: b.key, label: b.label, max: b.max, score: Math.round(rate(checks.filter((c) => b.groups.includes(c.group))) * b.max) }));
  let score = breakdown.reduce((s, b) => s + b.score, 0);
  // ページ自体が読めない(エラー・HTMLでない)ときは、中身の項目を診断できないので高い点にしない
  if (!okStatus || !h) score = Math.min(score, 30);
  // 検索に出られない設定(noindex・検索クローラーのブロック)があるときも高い点にしない
  if (checks.some((c) => (c.id === "indexable" || c.id === "ai-search-bots") && c.status === "ng")) score = Math.min(score, 40);
  return {
    url: target.href,
    finalUrl: final.href,
    checkedAt: new Date().toISOString(),
    score,
    grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 55 ? "C" : "D",
    pageType,
    breakdown,
    counts: {
      ok: checks.filter((c) => c.status === "ok").length,
      warn: checks.filter((c) => c.status === "warn").length,
      ng: checks.filter((c) => c.status === "ng").length,
    },
    bots: botResults.map(({ ua, owner, role, search, allowed, rule }) => ({ ua, owner, role, search, allowed, rule: rule || null })),
    checks: checks.map((c) => ({ ...c, weight: c.weight })),
    plan: {
      fixes: checks.filter((c) => c.status === "ng" || c.status === "warn")
        .map((c) => ({ id: c.id, label: c.label, advice: c.advice || c.detail, status: c.status,
          impact: c.status === "ng" && c.weight >= 4 || c.weight >= 8 ? "高" : c.weight >= 4 ? "中" : "低",
          goals: (FIX_PLAN[c.id] || { goals: [] }).goals, effort: (FIX_PLAN[c.id] || {}).effort || "" }))
        .sort((x, y) => "高中低".indexOf(x.impact) - "高中低".indexOf(y.impact) || (x.status === "ng" ? -1 : 0) - (y.status === "ng" ? -1 : 0)),
      growth: okStatus && h ? growthActions(pageType, h, final) : [],
      goals: GOALS,
    },
    raw,
  };
}
