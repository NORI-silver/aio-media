"""main に入った変更ページを IndexNow に送る（.github/workflows/indexnow.yml から呼ぶ）。
使い方: python3 tools/indexnow.py <前のコミット> [true=sitemap の全URL]"""
import glob, json, re, subprocess, sys, time, urllib.error, urllib.request

SITE = "https://aio.shiokonbu.com"
if not json.load(open("site.json", encoding="utf-8")).get("launched"):
    print("公開前(site.json の launched が false)なので送りません"); sys.exit(0)
KEY = open(glob.glob("[0-9a-f]" * 32 + ".txt")[0]).read().strip()

def changed(before):
    if not before or set(before) == {"0"}:
        return []
    r = subprocess.run(["git", "diff", "--name-only", before, "HEAD"], capture_output=True, text=True)
    if r.returncode:  # force push などで前のコミットが無いときは直前のコミットとの差分
        print("git diff に失敗:", r.stderr.strip(), "→ HEAD~1 と比べます")
        r = subprocess.run(["git", "diff", "--name-only", "HEAD~1", "HEAD"], capture_output=True, text=True, check=True)
    out = r.stdout.split()
    urls = []
    for f in out:
        if not f.endswith("index.html") or f.startswith(("tools/", "docs/", "content/")):
            continue
        urls.append(SITE + "/" + f[: -len("index.html")])
    return urls

if len(sys.argv) > 2 and sys.argv[2] == "true":
    urls = re.findall(r"<loc>([^<]+)</loc>", open("sitemap.xml", encoding="utf-8").read())
else:
    urls = changed(sys.argv[1] if len(sys.argv) > 1 else "")
if not urls:
    print("送るURLなし"); sys.exit(0)
body = json.dumps({"host": "aio.shiokonbu.com", "key": KEY, "keyLocation": f"{SITE}/{KEY}.txt", "urlList": urls[:10000]}).encode()
# Pages の反映を待つ（鍵ファイルが公開されてから送る。新しい HTML を読んでもらうため）
for i in range(20):
    try:
        if urllib.request.urlopen(f"{SITE}/{KEY}.txt", timeout=15).read().decode().strip() == KEY:
            break
    except urllib.error.URLError:
        pass
    time.sleep(15)
time.sleep(60)
for i in range(2):
    req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body, headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(r.status, len(urls), "件を送信"); break
    except urllib.error.HTTPError as e:
        print("IndexNow", e.code, e.read()[:200])
        if i or e.code not in (403, 429): raise
        time.sleep(120)
