#!/usr/bin/env python3
"""公式の発表元(content/news-sources.json)の RSS/Atom を読んで、新着を content/news-watch.json にためる。

使い方: python3 tools/news_watch.py [リポジトリのフォルダ]
GitHub Actions(.github/workflows/news-watch.yml)が3時間ごとに動かす。
たまった新着は /news/ の「公式発表の新着」に自動で出る(build.py)。
大事なものは、毎日の自動作業(docs/news.md)で日本語の解説記事にする。
Python 3 の標準ライブラリだけで動く。読めない発表元があっても止まらない。
"""
import datetime as dt
import email.utils
import html
import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
SRC = os.path.join(ROOT, "content", "news-sources.json")
OUT = os.path.join(ROOT, "content", "news-watch.json")
KEEP_DAYS, KEEP_MAX = 120, 300
UA = "Mozilla/5.0 (compatible; AIOTaisakuNaviNewsWatch/1.0; +https://aio.shiokonbu.com/editorial-policy/)"
NOW = dt.datetime.now(dt.timezone.utc)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read(3_000_000)


def text_of(el):
    return "".join(el.itertext()).strip() if el is not None else ""


def clean(s, n=280):
    s = html.unescape(re.sub(r"<[^>]+>", " ", html.unescape(s or "")))
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= n else s[:n].rstrip() + "…"


def parse_date(s):
    s = (s or "").strip()
    if not s:
        return None
    try:
        d = email.utils.parsedate_to_datetime(s)
    except (TypeError, ValueError):
        try:
            d = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d.astimezone(dt.timezone.utc)


def parse_feed(data):
    root = ET.fromstring(data)
    strip = lambda t: t.split("}", 1)[-1]
    items = []
    for el in root.iter():
        tag = strip(el.tag)
        if tag not in ("item", "entry"):
            continue
        f = {strip(c.tag): c for c in el}
        link = ""
        if "link" in f:
            link = (f["link"].text or "").strip()
            if not link:
                links = [c for c in el if strip(c.tag) == "link"]
                alt = [c for c in links if c.get("rel", "alternate") == "alternate"] or links
                link = alt[0].get("href", "") if alt else ""
        date = None
        for k in ("pubDate", "published", "updated", "date"):
            if k in f:
                date = parse_date(f[k].text)
                if date:
                    break
        body = next((f[k] for k in ("description", "summary", "content") if k in f), None)
        summary = text_of(body)
        title = clean(text_of(f.get("title")), 200)
        if title and link:
            items.append({"title": title, "url": link.strip(), "published": date, "summary": clean(summary)})
    return items


def discover(page):
    body = get(page).decode("utf-8", "replace")
    for m in re.finditer(r"<link[^>]+>", body, re.I):
        tag = m.group(0)
        if re.search(r'type=["\']application/(rss|atom)\+xml', tag, re.I):
            href = re.search(r'href=["\']([^"\']+)', tag)
            if href:
                return urllib.request.urljoin(page, html.unescape(href.group(1)))
    return None


def fetch_source(s):
    errors = []
    for url in [s.get("feed")] + ["discover"]:
        if not url:
            continue
        try:
            if url == "discover":
                url = discover(s["page"])
                if not url or url == s.get("feed"):
                    raise ValueError("RSS/Atom が見つからない")
            return parse_feed(get(url)), url, None
        except Exception as e:  # noqa: BLE001 読めない発表元があっても全体は止めない
            errors.append(f"{url}: {type(e).__name__}: {e}"[:200])
    return [], None, " / ".join(errors)


def main():
    sources = json.load(open(SRC, encoding="utf-8"))["sources"]
    old = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {"items": []}
    known = {i["url"]: i for i in old.get("items", [])}
    status, added = {}, 0
    for s in sources:
        items, used, err = fetch_source(s)
        kws = [k.lower() for k in s.get("keywords", [])]
        n = 0
        for it in items:
            if kws and not any(k in (it["title"] + " " + it["summary"]).lower() for k in kws):
                continue
            pub = it["published"] or NOW
            if (NOW - pub).days > KEEP_DAYS:
                continue
            n += 1
            if it["url"] in known:
                continue
            known[it["url"]] = {"source": s["id"], "source_name": s["name"], "title": it["title"], "url": it["url"],
                                "published": pub.strftime("%Y-%m-%dT%H:%M:%SZ"), "summary": it["summary"],
                                "first_seen": NOW.strftime("%Y-%m-%dT%H:%M:%SZ")}
            added += 1
        status[s["id"]] = {"ok": err is None, "feed": used, "items": n} if err is None else {"ok": False, "error": err}
        print(f"{'OK ' if err is None else 'NG '} {s['id']}: {n} 件" + ("" if err is None else f"  {err}"))
    cutoff = (NOW - dt.timedelta(days=KEEP_DAYS)).strftime("%Y-%m-%dT%H:%M:%SZ")
    items = sorted((i for i in known.values() if i["published"] >= cutoff), key=lambda i: i["published"], reverse=True)[:KEEP_MAX]
    changed = added > 0 or len(items) != len(old.get("items", [])) or status != old.get("sources")
    if changed:
        out = {"_説明": "tools/news_watch.py が自動で作る。手で直さない。", "checked": NOW.strftime("%Y-%m-%dT%H:%M:%SZ"),
               "sources": status, "items": items}
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
            f.write("\n")
    print(f"新着 {added} 件(保存 {len(items)} 件){'' if changed else '。変化なし'}")


if __name__ == "__main__":
    main()
