#!/usr/bin/env python3
"""SEO・AIOの自動チェック(Python 3 の標準ライブラリだけで動く)。

使い方: python3 tools/seo_check.py [リポジトリのフォルダ]
NG があれば終了コード 1。PR ごとに GitHub Actions(.github/workflows/seo-check.yml)でも走る。
ルールの元は AGENTS.md の「SEO・AIO」。
"""
import json
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
SITE = json.load(open(os.path.join(ROOT, "site.json"), encoding="utf-8"))
BASE = SITE["url"].rstrip("/")
TITLE_RANGE = (28, 40)
DESC_RANGE = (80, 120)
AI_BOTS = ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]
SKIP_DIRS = {"docs", "tools", "content", "assets", "node_modules"}


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title, self.meta, self.links, self.ld, self.h1, self.h2, self.hrefs = "", {}, {}, [], [], 0, []
        self.imgs_no_alt, self._in, self._buf = 0, None, []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta" and (a.get("name") or a.get("property")):
            self.meta[a.get("name") or a.get("property")] = a.get("content", "")
        elif tag == "link" and a.get("rel"):
            self.links[a["rel"]] = a.get("href", "")
        elif tag == "a" and a.get("href"):
            self.hrefs.append(a["href"])
        elif tag == "img" and not a.get("alt"):
            self.imgs_no_alt += 1
        if tag == "h2":
            self.h2 += 1
        if tag in ("title", "h1") or (tag == "script" and a.get("type") == "application/ld+json"):
            self._in, self._buf = ("ld" if tag == "script" else tag), []

    def handle_endtag(self, tag):
        if self._in and tag == {"ld": "script"}.get(self._in, self._in):
            s = "".join(self._buf).strip()
            {"title": lambda: setattr(self, "title", s), "h1": lambda: self.h1.append(s), "ld": lambda: self.ld.append(s)}[self._in]()
            self._in = None

    def handle_data(self, data):
        if self._in:
            self._buf.append(data)


def pages():
    for d, dirs, files in os.walk(ROOT):
        dirs[:] = [x for x in dirs if not x.startswith(".") and x not in SKIP_DIRS]
        for fn in files:
            if fn.endswith(".html"):
                yield os.path.relpath(os.path.join(d, fn), ROOT)


def main():
    ng, warn, ok = [], [], []
    sm = open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
    locs = set(re.findall(r"<loc>(.*?)</loc>", sm))
    n_pages = n_articles = 0
    for rel in sorted(pages()):
        src = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        p = Page()
        p.feed(src)
        n_pages += 1
        url_path = "/" + (rel[: -len("index.html")] if rel.endswith("index.html") else rel)
        url = BASE + url_path
        noindex = "noindex" in p.meta.get("robots", "")
        is_article = '"@type":"Article"' in src
        n_articles += is_article
        tag = f"{url_path}:"

        if not p.title:
            ng.append(f"{tag} title がない")
        elif is_article and not TITLE_RANGE[0] <= len(p.title) <= TITLE_RANGE[1]:
            warn.append(f"{tag} title {len(p.title)}字(目安{TITLE_RANGE[0]}〜{TITLE_RANGE[1]}): {p.title}")
        d = p.meta.get("description", "")
        if not d:
            ng.append(f"{tag} meta description がない")
        elif is_article and not DESC_RANGE[0] <= len(d) <= DESC_RANGE[1]:
            warn.append(f"{tag} description {len(d)}字(目安{DESC_RANGE[0]}〜{DESC_RANGE[1]})")
        if rel != "404.html" and p.links.get("canonical") != url:
            ng.append(f"{tag} canonical が {url} でない: {p.links.get('canonical')}")
        if len(p.h1) != 1:
            ng.append(f"{tag} h1 が {len(p.h1)} 個")
        if p.imgs_no_alt:
            ng.append(f"{tag} alt のない画像が {p.imgs_no_alt} 個")
        for raw in p.ld:
            try:
                json.loads(raw)
            except json.JSONDecodeError as e:
                ng.append(f"{tag} 構造化データが壊れている: {e}")
        if is_article:
            if p.h2 < 3:
                warn.append(f"{tag} h2 が {p.h2} 個(3〜6個が目安)")
            if '"BreadcrumbList"' not in src:
                ng.append(f"{tag} BreadcrumbList がない")
            if 'class="summary"' not in src:
                warn.append(f"{tag} 冒頭の「結論」(summary:)がない。AIに引用されやすい形にする")
            body = src.split('<div class="body">', 1)[-1].split("</article>", 1)[0]
            n_int = len(set(re.findall(r'href="(/[^"#]+)"', body)))
            if n_int < 3:
                warn.append(f"{tag} 本文の内部リンクが {n_int} 本(3本以上が目安)")
        for h in p.hrefs:
            if h.startswith("/") and not h.startswith("//"):
                f = h.split("#")[0].split("?")[0].lstrip("/")
                if not f or f.endswith("/"):
                    f += "index.html"
                if not os.path.exists(os.path.join(ROOT, f)):
                    ng.append(f"{tag} リンク切れ: {h}")
        if rel != "404.html" and not noindex and url not in locs:
            ng.append(f"{tag} sitemap.xml に入っていない")
        if noindex and url in locs and SITE.get("launched") and rel != "404.html":
            warn.append(f"{tag} noindex なのに sitemap.xml に入っている")

    robots = open(os.path.join(ROOT, "robots.txt"), encoding="utf-8").read()
    if f"Sitemap: {BASE}/sitemap.xml" not in robots:
        ng.append("robots.txt に Sitemap の行がない")
    if re.search(r"Disallow:\s*/\s*$", robots, re.M):
        ng.append("robots.txt にサイト全体を Disallow する行がある(AIクローラーも検索エンジンも許可する方針)")
    missing = [b for b in AI_BOTS if f"User-agent: {b}" not in robots]
    (ng if missing else ok).append("robots.txt のAIクローラー許可" + (f" がない: {missing}" if missing else ""))
    for f in ("llms.txt", "llms-full.txt", "feed.xml", "CNAME"):
        (ok if os.path.exists(os.path.join(ROOT, f)) else ng).append(f + ("" if os.path.exists(os.path.join(ROOT, f)) else " がない"))
    if not SITE.get("launched"):
        warn.append("公開前モード(site.json の launched が false): 全ページ noindex。公開するときに true にする")
    ok.append(f"{n_pages} ページ(うち記事 {n_articles} 本)を確認")

    for x in ok:
        print("OK  ", x)
    for x in warn:
        print("WARN", x)
    for x in ng:
        print("NG  ", x)
    print(f"\nNG {len(ng)} / WARN {len(warn)} / OK {len(ok)}")
    return 1 if ng else 0


if __name__ == "__main__":
    sys.exit(main())
