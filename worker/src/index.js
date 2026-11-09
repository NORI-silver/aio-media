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
export async function safeFetch(startUrl, { maxBytes = MAX_TEXT_BYTES, fetchImpl = fetch, checkHost = assertPublicHost } = {}) {
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
  return { types: [...types], props, broken };
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
  const [robotsRes, llmsRes, sitemapRes] = await Promise.all([
    fetcher(origin + "/robots.txt", MAX_TEXT_BYTES),
    fetcher(origin + "/llms.txt", MAX_TEXT_BYTES),
    fetcher(origin + "/sitemap.xml", 200_000),
  ]);
  return buildReport({ target, page, robotsRes, llmsRes, sitemapRes });
}
export { diagnose };

export function buildReport({ target, page, robotsRes, llmsRes, sitemapRes }) {
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
    ARTICLE.llms, 3);

  const smInRobots = robots ? robots.sitemaps : [];
  const smOk = smInRobots.length > 0 || (sitemapRes && !sitemapRes.error && sitemapRes.status === 200 && /<(urlset|sitemapindex)\b/i.test(sitemapRes.text));
  add(G1, "sitemap", "XMLサイトマップがある", smOk ? "ok" : "warn",
    smOk ? (smInRobots.length ? `robots.txt にサイトマップの場所が書いてあります(${smInRobots[0]})。` : "/sitemap.xml があります。") : "サイトマップが見つかりませんでした。",
    smOk ? (smInRobots.length ? "" : "robots.txt に「Sitemap: URL」の行を足すと、Bing などにも見つけてもらいやすくなります。") : "サイトマップを作り、robots.txt に「Sitemap: URL」を書きましょう。",
    "", 5);

  // ---------------- 2. ページの基本
  const G2 = "ページの基本(SEO)";
  const okStatus = page.status >= 200 && page.status < 300;
  add(G2, "status", "ページが正常に表示される", okStatus ? "ok" : "ng",
    `HTTPステータス ${page.status}${page.chain.length ? `(リダイレクト ${page.chain.length} 回のあと)` : ""}。`,
    okStatus ? "" : [403, 429, 503].includes(page.status)
      ? "ファイアウォールやボット対策で、プログラムからのアクセスが止められている可能性があります。AIクローラーまで止めていないか、CDN・WAFの設定を確かめましょう。"
      : "クローラーが読めるよう、ページが 200 を返すようにしましょう。", "", 6);
  add(G2, "https", "HTTPSで配信している", final.protocol === "https:" ? "ok" : "ng",
    final.protocol === "https:" ? "HTTPSで配信されています。" : "HTTP(暗号化なし)で配信されています。",
    final.protocol === "https:" ? "" : "SSL証明書を入れて、http から https へリダイレクトしましょう。", "", 5);

  if (!h) {
    add(G2, "html", "HTMLページである", "ng", `HTMLではありません(Content-Type: ${ct || "不明"})。`, "記事やトップページなど、HTMLのページのURLを入れてください。", "", 0);
  } else {
    const tl = len(h.title);
    add(G2, "title", "タイトルがある", !tl ? "ng" : tl < 15 || tl > 60 ? "warn" : "ok",
      tl ? `「${h.title}」(${tl}字)` : "title タグがありません。",
      !tl ? "ページの内容がわかるタイトルを付けましょう。" : tl < 15 ? "短すぎます。何のページかわかる言葉を足しましょう。" : tl > 60 ? "長すぎて検索結果で切れます。大事な言葉を前に寄せましょう。" : "",
      "", 5);
    const dl = len(h.description);
    add(G2, "description", "説明文(meta description)がある", !dl ? "warn" : dl < 50 || dl > 160 ? "warn" : "ok",
      dl ? `「${h.description.slice(0, 120)}${dl > 120 ? "…" : ""}」(${dl}字)` : "meta description がありません。",
      !dl ? "ページの要点を80〜120字ほどで書きましょう。検索結果やAIの要約の材料になります。" : dl < 50 ? "少し短めです。要点を1〜2文で書きましょう。" : dl > 160 ? "長すぎて切れます。120字前後にまとめましょう。" : "",
      "", 4);
    let canonOk = false;
    let canonDetail = "canonical がありません。";
    if (h.canonical) {
      try {
        const c = new URL(h.canonical, final);
        canonOk = c.origin === final.origin;
        canonDetail = `canonical: ${c.href}` + (c.href.replace(/\/$/, "") !== final.href.replace(/\/$/, "") ? "(このURLとは別のURLを指しています)" : "");
      } catch {
        canonDetail = "canonical のURLが正しくありません。";
      }
    }
    add(G2, "canonical", "canonical(正規URL)がある", canonOk ? "ok" : "warn", canonDetail,
      canonOk ? "" : "同じ内容のURLが複数あっても評価が分かれないよう、canonical を設定しましょう。", "", 3);
    add(G2, "lang", "言語(lang)を指定している", h.lang ? "ok" : "warn",
      h.lang ? `lang="${h.lang}"` : "html タグに lang がありません。", h.lang ? "" : '<html lang="ja"> のように指定しましょう。', "", 2);
    const ogN = [h.og.title, h.og.description, h.og.image].filter(Boolean).length;
    add(G2, "ogp", "OGP(SNS・共有用の情報)がある", ogN === 3 ? "ok" : "warn",
      ogN === 3 ? "og:title・og:description・og:image があります。" : `足りないもの: ${[!h.og.title && "og:title", !h.og.description && "og:description", !h.og.image && "og:image"].filter(Boolean).join("、")}`,
      ogN === 3 ? "" : "SNSやチャットで共有されたときの見え方が整います。", "", 2);
  }

  // ---------------- 3. AIに理解・引用されやすいか
  const G3 = "AIに理解・引用されやすい作り";
  if (h) {
    const ld = ldTypes(h.ld);
    const useful = ld.types.filter((t) => /^(Article|NewsArticle|BlogPosting|FAQPage|HowTo|Product|Organization|LocalBusiness|Person|WebSite|BreadcrumbList|Service|Corporation|Event|Recipe|Review|ProfilePage|WebPage|AboutPage|SoftwareApplication|Course|JobPosting|Dataset|QAPage|VideoObject)$/.test(t));
    add(G3, "structured-data", "構造化データ(JSON-LD)がある",
      ld.broken ? "ng" : useful.length >= 2 ? "ok" : useful.length || ld.types.length ? "warn" : "ng",
      ld.broken ? `JSON-LD が ${ld.broken} か所壊れていて読めません。` : ld.types.length ? `見つかった種類: ${ld.types.slice(0, 12).join("、")}` : "JSON-LD の構造化データがありません。",
      ld.broken ? "リッチリザルトテストで壊れている箇所を確かめましょう。" : useful.length >= 2 ? "" : "ページの種類に合わせて Article・Organization・BreadcrumbList などを足すと、ページの意味がAIにも伝わりやすくなります。",
      ARTICLE.sd, 10);
    const hasOrg = ld.types.some((t) => /^(Organization|Corporation|LocalBusiness|Person)$/.test(t)) || ld.props.has("author") || ld.props.has("publisher");
    add(G3, "entity", "運営者・著者がわかる", hasOrg ? "ok" : "warn",
      hasOrg ? "構造化データに運営者・著者の情報があります。" : "構造化データに運営者・著者(Organization・Person・author)の情報が見つかりません。",
      hasOrg ? "" : "誰が書いたか・どの会社かをはっきりさせると、信頼できる情報源として扱われやすくなります(E-E-A-T)。", ARTICLE.sd, 6);
    const hasDate = ld.props.has("dateModified") || ld.props.has("datePublished") || h.hasTime;
    add(G3, "date", "公開日・更新日がわかる", hasDate ? "ok" : "warn",
      hasDate ? "公開日・更新日の情報があります。" : "公開日・更新日が見つかりません(記事でなければ問題ありません)。",
      hasDate ? "" : "記事なら datePublished・dateModified と、ページ上の日付を入れましょう。AIは新しい情報を好みます。", "", 4);
    const h1n = h.h1.length;
    const h2n = h.h2.length;
    add(G3, "headings", "見出しで内容が区切られている", h1n === 1 && h2n >= 2 ? "ok" : h1n === 0 ? "ng" : "warn",
      `h1 ${h1n} 個、h2 ${h2n} 個、h3 ${h.h3count} 個` + (h1n ? `(h1:「${h.h1[0].slice(0, 40)}」)` : ""),
      h1n === 1 && h2n >= 2 ? "" : h1n === 0 ? "ページの主題を h1 で1つ書きましょう。" : h1n > 1 ? "h1 は1ページに1つが目安です。" : "h2 で話題を区切ると、AIが答えの部分を抜き出しやすくなります。問いの形の見出しが効果的です。",
      ARTICLE.basics, 6);
    const thin = h.textLength < 300;
    const jsShell = thin && (h.appShell || h.scriptCount >= 5);
    add(G3, "text", "本文がHTMLに入っている", jsShell ? "ng" : thin ? "warn" : "ok",
      `HTMLに含まれる本文は約 ${h.textLength.toLocaleString("ja-JP")} 字です。` + (jsShell ? "JavaScriptで後から表示するつくりの可能性があります。" : ""),
      jsShell ? "多くのAIクローラーはJavaScriptを実行しません。本文を最初のHTMLに入れる(SSR・静的生成)と読まれやすくなります。"
        : thin ? "本文が少なめです。AIが引用できる具体的な説明・数字・手順を書きましょう。" : "",
      "", 10);
  }

  // ---------------- 4. 速さ
  const G4 = "表示の速さ";
  const ms = page.ms;
  add(G4, "speed", "サーバーの応答が速い", ms <= 800 ? "ok" : ms <= 2000 ? "warn" : "ng",
    `最初の応答まで約 ${ms.toLocaleString("ja-JP")} ミリ秒(診断サーバーから計測した目安)。HTMLの大きさ約 ${Math.round(new TextEncoder().encode(page.text).length / 1024).toLocaleString("ja-JP")} KB${page.truncated ? "以上" : ""}。`,
    ms <= 800 ? "" : "応答が遅いとクローラーが読む量が減ることがあります。キャッシュやCDNを見直しましょう。正確な速さは PageSpeed Insights で測れます。",
    "", 7);

  const scored = checks.filter((c) => c.weight > 0);
  const total = scored.reduce((s, c) => s + c.weight, 0);
  const got = scored.reduce((s, c) => s + (c.status === "ok" ? c.weight : c.status === "warn" ? c.weight / 2 : 0), 0);
  const score = total ? Math.round((got / total) * 100) : 0;
  return {
    url: target.href,
    finalUrl: final.href,
    checkedAt: new Date().toISOString(),
    score,
    grade: score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D",
    counts: {
      ok: checks.filter((c) => c.status === "ok").length,
      warn: checks.filter((c) => c.status === "warn").length,
      ng: checks.filter((c) => c.status === "ng").length,
    },
    bots: botResults.map(({ ua, owner, role, search, allowed, rule }) => ({ ua, owner, role, search, allowed, rule: rule || null })),
    checks: checks.map(({ weight, ...c }) => c),
  };
}
