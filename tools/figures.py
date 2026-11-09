# 図解SVGを作る(content/figures/*.svg)。幅360の縦長でスマホでも等倍近くで読める。
# 使い方: python3 tools/figures.py → 記事では {{figure:名前|キャプション}} で埋め込む。色や文字は assets/style.css の .fig .f-*。
import os, html
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "content", "figures")
W = 360
def esc(s): return html.escape(s, quote=True)

class Fig:
    def __init__(self, name, label):
        self.name, self.label, self.parts, self.h = name, label, [], 0
    def add(self, s): self.parts.append(s)
    def box(self, x, y, w, h, cls, title=None, lines=(), num=None, tsize=None):
        self.add(f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="12"/>')
        tx = x + (44 if num else 14)
        ty = y + 25
        if num is not None:
            self.add(f'<circle class="f-num" cx="{x+22}" cy="{y+22}" r="12"/><text class="f-numt" x="{x+22}" y="{y+26.5}" text-anchor="middle">{num}</text>')
        if title:
            self.add(f'<text class="f-t" x="{tx}" y="{ty}">{esc(title)}</text>'); ty += 21
        for ln in lines:
            self.add(f'<text class="f-s" x="{tx}" y="{ty}">{esc(ln)}</text>'); ty += 18
        self.h = max(self.h, y + h)
    def ctext(self, x, y, s, cls="f-s"):
        self.add(f'<text class="{cls}" x="{x}" y="{y}" text-anchor="middle">{esc(s)}</text>')
    def text(self, x, y, s, cls="f-s"):
        self.add(f'<text class="{cls}" x="{x}" y="{y}">{esc(s)}</text>')
    def arrow(self, x1, y1, x2, y2, cls="f-ar"):
        self.add(f'<line class="{cls}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" marker-end="url(#ah-{self.name})"/>')
    def path(self, d, cls="f-ar"):
        self.add(f'<path class="{cls}" d="{d}" fill="none" marker-end="url(#ah-{self.name})"/>')
    def save(self, pad=8):
        h = self.h + pad
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {h}" role="img" aria-label="{esc(self.label)}">'
               f'<defs><marker id="ah-{self.name}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="f-ah"/></marker></defs>'
               + "".join(self.parts) + "</svg>\n")
        open(os.path.join(OUT, self.name + ".svg"), "w", encoding="utf-8").write(svg)

# ---- 1〜9. 「SEOとAIOの仕組み」記事の図(小学生にもわかるたとえ:図書館と司書さん)
def steps_fig(name, label, steps, numbered=True):
    f = Fig(name, label)
    y = 6
    for i,(cls,t,lines) in enumerate(steps):
        h = 34 + 18*len(lines) + 6
        f.box(16, y, W-32, h, cls, t, lines, num=(i+1) if numbered else None)
        y2 = y + h
        if i < len(steps)-1:
            f.arrow(W/2, y2+2, W/2, y2+22)
        y = y2 + 26
    f.save()

# 1. 図書館のたとえ
f = Fig("library-analogy", "図書館とGoogleのたとえ:本はWebページ、司書さんはGoogle、本を集めるのがクロール、本の中身をカードにメモするのがインデックス、質問に合う本を選ぶのが検索結果の順位")
cw = (W-32-28)/2
x1, x2 = 16, 16+cw+28
f.box(x1, 6, cw, 40, "f-o"); f.ctext(x1+cw/2, 31, "図書館では", "f-t")
f.box(x2, 6, cw, 40, "f-b"); f.ctext(x2+cw/2, 31, "Googleでは", "f-t")
rows = [("本", "", "Webページ", ""),
        ("司書さん", "", "Google", "(検索エンジン)"),
        ("新しい本を", "集めに行く", "ページを見に行く", "=クロール"),
        ("中身を読んで", "カードにメモ", "中身をメモして整理", "=インデックス"),
        ("質問に合う本を", "えらんで渡す", "役立つ順に並べる", "=検索結果")]
y = 56
for a1, a2, b1, b2 in rows:
    h = 50
    f.box(x1, y, cw, h, "f-w"); f.box(x2, y, cw, h, "f-w")
    if a2:
        f.ctext(x1+cw/2, y+22, a1, "f-s2"); f.ctext(x1+cw/2, y+40, a2, "f-s2")
    else:
        f.ctext(x1+cw/2, y+31, a1, "f-t2")
    if b2:
        f.ctext(x2+cw/2, y+22, b1, "f-s2"); f.ctext(x2+cw/2, y+40, b2, "f-l")
    else:
        f.ctext(x2+cw/2, y+31, b1, "f-t2")
    f.ctext(W/2, y+31, "=", "f-t")
    y += h + 8
f.h = y - 8
f.save()

# 2. Google検索の3ステップ
steps_fig("google-search-flow", "Google検索の3ステップ:ページを見に行く(クロール)、中身を読んでメモする(インデックス)、役立つ順に並べる(検索結果)", [
    ("f-b", "ページを見に行く(クロール)", ["リンクをたどって、新しいページを", "見つけては読みに行く"]),
    ("f-p", "中身を読んでメモする(インデックス)", ["「このページは何の話か」を", "大きなメモ帳に書いて整理する"]),
    ("f-g", "役立つ順に並べる(検索結果)", ["質問されたら、メモ帳から合うページを", "さがして、役立ちそうな順に見せる"]),
])

# 3. AI検索の5ステップ
steps_fig("ai-search-flow", "AI検索が答えを作る5ステップ:質問を聞く、小さな質問に分ける、ページをさがして読む、自分の言葉でまとめる、どこに書いてあったかをそえる", [
    ("f-b", "質問を聞く", ["「AIO対策って何から始めればいい?」"]),
    ("f-b", "小さな質問に分ける", ["1つの質問を、いくつかの", "小さな質問にばらす"]),
    ("f-p", "ページをさがして読む", ["Googleと同じように作ったメモ帳から", "合うページをさがして読む"]),
    ("f-p", "自分の言葉でまとめる", ["読んだページの内容をもとに", "文章で答えを書く"]),
    ("f-g", "どこに書いてあったかをそえる", ["使ったページのリンク(出典)をのせる", "→ ここにのることを「引用」という"]),
])

# 4. 質問を小さく分ける(クエリ ファンアウト)
f = Fig("fanout-tree", "AIが1つの質問を3つの小さな質問に分けて、それぞれでページをさがし、最後に1つの答えにまとめる図")
f.box(16, 6, W-32, 52, "f-b", "大きな質問", ["「AIO対策って何から始めればいい?」"])
cw = (W-32-16)/3
xs = [16 + i*(cw+8) for i in range(3)]
subs = [("AIOって", "なに?"), ("AIに読まれる", "設定は?"), ("えらばれる", "文章は?")]
for x,(a,b) in zip(xs, subs):
    f.path(f"M{W/2} 60 L{x+cw/2} 92")
    f.box(x, 96, cw, 58, "f-p")
    f.ctext(x+cw/2, 121, a, "f-s2"); f.ctext(x+cw/2, 140, b, "f-s2")
    f.arrow(x+cw/2, 156, x+cw/2, 178)
    f.box(x, 182, cw, 34, "f-w"); f.ctext(x+cw/2, 204, "ページを読む", "f-s2")
    f.path(f"M{x+cw/2} 218 L{W/2} 250")
f.box(16, 254, W-32, 52, "f-g", "1つの答えにまとめる", ["読んだページをリンクで紹介する"])
f.save()

# 5. 覚えておく(学習)とその場で調べる(検索)
f = Fig("training-vs-retrieval", "AIがWebページを使う2つの方法の比較:前もって読んで覚えておく学習と、質問されてから調べる検索")
cw = (W-16*2-12)/2
x1, x2 = 16, 16+cw+12
f.box(x1, 6, cw, 58, "f-o"); f.ctext(x1+cw/2, 31, "覚えておく", "f-t"); f.ctext(x1+cw/2, 51, "(学習)", "f-s2")
f.box(x2, 6, cw, 58, "f-g"); f.ctext(x2+cw/2, 31, "その場で調べる", "f-t"); f.ctext(x2+cw/2, 51, "(検索)", "f-s2")
rows = [("たとえると", "テスト前に", "教科書で勉強", "質問されてから", "図書館で調べる"),
        ("いつ読む?", "前もって", "まとめて読む", "質問された", "そのときに読む"),
        ("どこで読んだか", "言えない", "(リンクなし)", "言える", "(リンクあり)"),
        ("サイトに人は", "来ない", "", "来ることがある", "(リンクから)")]
y = 74
for lab, a1, a2, b1, b2 in rows:
    f.text(x1, y+14, lab, "f-l")
    h = 50
    f.box(x1, y+20, cw, h, "f-w"); f.box(x2, y+20, cw, h, "f-w")
    if a2:
        f.ctext(x1+cw/2, y+41, a1, "f-s2"); f.ctext(x1+cw/2, y+60, a2, "f-s2")
    else:
        f.ctext(x1+cw/2, y+50, a1, "f-s2")
    f.ctext(x2+cw/2, y+41, b1, "f-s2"); f.ctext(x2+cw/2, y+60, b2, "f-s2")
    y += 20 + h + 10
f.save()

# 6. 検索結果とAIの答えの見え方
f = Fig("results-vs-answer", "SEOとAIOのゴールの違い:SEOは検索結果のリンクの中で上に並ぶこと、AIOはAIの答えの中で出典として紹介されること")
f.text(16, 18, "SEOのゴール:リンクの列で上に並ぶ", "f-l")
f.box(16, 26, W-32, 150, "f-w")
for i in range(3):
    y = 40 + i*44
    cls = "f-g" if i == 0 else "f-b"
    f.add(f'<rect class="{cls}" x="30" y="{y}" width="{W-60}" height="34" rx="8"/>')
    f.text(42, y+22, "1位  あなたのページ" if i == 0 else f"{i+1}位  ほかのページ", "f-t2" if i == 0 else "f-s2")
f.text(16, 204, "AIOのゴール:AIの答えの中で紹介される", "f-l")
f.box(16, 212, W-32, 150, "f-w")
f.text(30, 238, "AIの答え", "f-t2")
for i,wid in enumerate([290, 270, 280, 200]):
    f.add(f'<rect class="f-p" x="30" y="{250+i*16}" width="{wid}" height="8" rx="4"/>')
f.add(f'<rect class="f-g" x="30" y="322" width="{W-60}" height="30" rx="15"/>')
f.text(44, 342, "出典:あなたのページ", "f-t2")
f.h = 362
f.save()

# 7. 3つの段(SEOとAIOの共通の土台)
f = Fig("seo-aio-layers", "SEOとAIOの関係:読んでもらえる、わかってもらえる、えらばれるの3段。下の2段はSEOとAIOで同じ")
layers = [
    ("f-g", "③ えらばれる", ["SEO:検索結果で上に並ぶ", "AIO:AIの答えで紹介される"], "自分で試したこと・最初に答えを書く"),
    ("f-p", "② わかってもらえる", ["見出しで「何の話か」をはっきり", "ページの説明を正しく書く"], "SEOとAIOで同じ"),
    ("f-b", "① 読んでもらえる", ["見に来るのを止めない", "文字を文字として書く"], "SEOとAIOで同じ"),
]
y = 6
for i,(cls,t,lines,tag) in enumerate(layers):
    inset = 16 + (2-i)*16
    h = 34 + 18*len(lines) + 26
    f.box(inset, y, W-inset*2, h, cls, t, lines)
    f.text(inset+14, y+h-12, "▸ " + tag, "f-l")
    y += h + 8
f.save()

# 8. つまずきやすい4か所
steps_fig("stuck-points", "ページが検索やAIの答えに出てこないときに止まりやすい4か所:見つけてもらえない、入れない、読めない、えらばれない", [
    ("f-w", "見つけてもらえない", ["どこからもリンクされていない", "→ 内部リンク・サイトマップ"]),
    ("f-w", "入れない", ["robots.txt で「入らないで」にしている", "→ 設定を確かめる"]),
    ("f-w", "読めない", ["文字が画像の中やJavaScriptの後にしかない", "→ 本文を文字でHTMLに書く"]),
    ("f-w", "えらばれない", ["質問にまっすぐ答えていない", "→ 最初に答えを書く・試したことを書く"]),
])

# 9. このサイトのいまの状態
f = Fig("site-status", "このサイトのページがGoogleのどこまで進んだか:トップページは見つけた、見に来た、メモしたの3つとも完了。記事は見つけただけ")
stages = ["見つけた", "見に来た", "メモした"]
cw = (W-32-16)/3
y = 6
for name, done, note in [("トップページ", 3, "検索結果に出せる状態"), ("記事(2026年11月9日公開)", 1, "まだ見に来ていない")]:
    f.text(16, y+16, name, "f-t2")
    for i,s in enumerate(stages):
        x = 16 + i*(cw+8)
        f.box(x, y+26, cw, 40, "f-g" if i < done else "f-w")
        f.ctext(x+cw/2, y+51, ("✓ " if i < done else "") + s, "f-s2")
    f.text(16, y+86, "▸ " + note, "f-l")
    y += 104
f.h = y - 10
f.save()
# ---- MCPの記事の図(小学生にもわかるたとえ:USB-Cの差し込み口)
# M1. MCPがないとき・あるとき
f = Fig("mcp-before-after", "MCPがないときは、AIアプリと道具の組み合わせごとに別々のつなぎ方が必要。MCPがあると、どれも同じ差し込み口でつながる")
cw = (W-32-16)/3
xs = [16 + i*(cw+8) for i in range(3)]
def row(y, labels, cls):
    for x,l in zip(xs, labels):
        f.box(x, y, cw, 36, cls); f.ctext(x+cw/2, y+23, l, "f-s2")
ais = ["AIアプリA", "AIアプリB", "AIアプリC"]
tools = ["道具1", "道具2", "道具3"]
f.text(16, 18, "MCPがないとき:組み合わせの数だけ作る", "f-l")
row(28, ais, "f-b")
for a in xs:
    for t in xs:
        f.add(f'<line class="f-ar" x1="{a+cw/2}" y1="66" x2="{t+cw/2}" y2="128"/>')
row(130, tools, "f-o")
f.text(16, 192, "→ 3×3=9通りのつなぎ方が必要", "f-s")
f.text(16, 232, "MCPがあるとき:同じ差し込み口でつながる", "f-l")
row(242, ais, "f-b")
for x in xs:
    f.arrow(x+cw/2, 280, x+cw/2, 302)
f.box(16, 306, W-32, 36, "f-g"); f.ctext(W/2, 330, "MCP(みんなで決めた共通のつなぎ方)", "f-t2")
for x in xs:
    f.arrow(x+cw/2, 344, x+cw/2, 366)
row(370, tools, "f-o")
f.text(16, 432, "→ それぞれ1回作れば、どれとでもつながる", "f-s")
f.h = 436
f.save()

# M2. USB-Cのたとえ
f = Fig("mcp-analogy", "MCPとUSB-Cのたとえ:パソコンはAIアプリ、USB-Cの形はMCP、さしこむ機器はMCPサーバー、機器の中のデータはSearch ConsoleやGA4のデータ")
cw = (W-32-28)/2
x1, x2 = 16, 16+cw+28
f.box(x1, 6, cw, 40, "f-o"); f.ctext(x1+cw/2, 31, "USB-Cでは", "f-t")
f.box(x2, 6, cw, 40, "f-b"); f.ctext(x2+cw/2, 31, "MCPでは", "f-t")
rows = [("パソコン", "", "AIアプリ", "(Claude・ChatGPTなど)"),
        ("USB-Cの形", "(どの機器もさせる)", "MCP", "(共通のつなぎ方)"),
        ("さしこむ機器", "(カメラ・メモリなど)", "MCPサーバー", "(道具の窓口)"),
        ("機器の中の", "写真やデータ", "Search Consoleや", "GA4のデータ")]
y = 56
for a1, a2, b1, b2 in rows:
    h = 50
    f.box(x1, y, cw, h, "f-w"); f.box(x2, y, cw, h, "f-w")
    if a2:
        f.ctext(x1+cw/2, y+22, a1, "f-t2" if a2.startswith("(") else "f-s2"); f.ctext(x1+cw/2, y+40, a2, "f-s2")
    else:
        f.ctext(x1+cw/2, y+31, a1, "f-t2")
    f.ctext(x2+cw/2, y+22, b1, "f-t2" if b2.startswith("(") else "f-s2"); f.ctext(x2+cw/2, y+40, b2, "f-s2")
    f.ctext(W/2, y+31, "=", "f-t")
    y += h + 8
f.h = y - 8
f.save()

# M3. MCPの構成
f = Fig("mcp-architecture", "MCPの構成図:AIアプリ(ホスト)の中に、つなぐ相手ごとにつなぎ係(クライアント)があり、MCPサーバーを通してSearch ConsoleやGA4などにつながる")
f.box(16, 6, W-32, 108, "f-b", "AIアプリ(MCPホスト)", ["例:Claude・ChatGPT・VS Code"])
cw = (W-32-24-16)/3
for i in range(3):
    x = 28 + i*(cw+8)
    f.box(x, 70, cw, 34, "f-w")
    f.ctext(x+cw/2, 92, "つなぎ係", "f-s2")
names = [("窓口", "Search Console"), ("窓口", "GA4"), ("窓口", "ファイル")]
for i,(a,b) in enumerate(names):
    x = 28 + i*(cw+8)
    f.arrow(x+cw/2, 106, x+cw/2, 146)
    f.box(x, 150, cw, 56, "f-p")
    f.ctext(x+cw/2, 173, "MCPサーバー", "f-s2"); f.ctext(x+cw/2, 193, b, "f-t2")
f.add(f'<rect class="f-w" x="{W/2-66}" y="117" width="132" height="22" rx="11"/>')
f.ctext(W/2, 132, "MCPのルールで話す", "f-l")
for i in range(3):
    x = 28 + i*(cw+8)
    f.arrow(x+cw/2, 208, x+cw/2, 236)
f.box(16, 240, W-32, 52, "f-o", "道具やデータの本体", ["Googleのサービス、会社のデータなど"])
f.save()

# M4. MCPサーバーがわたせる3つのもの
f = Fig("mcp-three-things", "MCPサーバーがAIにわたせる3つのもの:やってくれること(ツール)、読める資料(リソース)、お願いのひな形(プロンプト)")
cards = [
    ("f-b", "やってくれること(ツール)", ["AIが「これやって」と呼び出せる操作", "例:ページの登録状況を調べる"]),
    ("f-p", "読める資料(リソース)", ["AIが読んで参考にできるデータ", "例:サイトの記事の一覧"]),
    ("f-g", "お願いのひな形(プロンプト)", ["よく使うお願いの決まった形", "例:「月のまとめを作って」"]),
]
y = 6
for i,(cls,t,lines) in enumerate(cards):
    h = 34 + 18*len(lines) + 6
    f.box(16, y, W-32, h, cls, t, lines, num=i+1)
    y += h + 10
f.save()

# M5. MCPでSearch Consoleを使う流れ
f = Fig("mcp-gsc-flow", "MCPでAIがSearch Consoleを使う流れ:質問する、AIが道具をえらぶ、MCPサーバーがデータを取りに行く、結果をAIにわたす、AIが答える")
steps = [
    ("f-b", "人がAIに聞く", ["「このページ、Googleに登録された?」"]),
    ("f-b", "AIが道具をえらぶ", ["道具の一覧から", "「登録状況を調べる」をえらぶ"]),
    ("f-p", "MCPサーバーが取りに行く", ["Search Consoleにたずねる", "(人が許可した範囲だけ)"]),
    ("f-p", "結果をAIにわたす", ["「登録ずみ」「まだ」などの答え"]),
    ("f-g", "AIがわかりやすく答える", ["「トップは登録ずみ、記事はまだです」"]),
]
y = 6
for i,(cls,t,lines) in enumerate(steps):
    h = 34 + 18*len(lines) + 6
    f.box(16, y, W-32, h, cls, t, lines, num=i+1)
    y2 = y + h
    if i < len(steps)-1:
        f.arrow(W/2, y2+2, W/2, y2+22)
    y = y2 + 26
f.save()

# M6. 安全に使う4つの約束
f = Fig("mcp-safety", "MCPを安全に使う4つの約束:知っている相手だけつなぐ、カギは必要な分だけ、大事な操作は確認してから、カギを人に見せない")
cards = [
    ("知っている相手だけつなぐ", ["信頼できる会社・人が作ったサーバーだけ"]),
    ("カギは必要な分だけわたす", ["見るだけでいいなら「見る」だけの許可"]),
    ("大事な操作は確認してから", ["消す・送る・書きかえる前に人が確認"]),
    ("カギを人に見せない", ["パスワードやキーを記事や共有に書かない"]),
]
y = 6
for i,(t,lines) in enumerate(cards):
    h = 34 + 18*len(lines) + 6
    f.box(16, y, W-32, h, "f-o" if i % 2 == 0 else "f-w", t, lines, num=i+1)
    y += h + 10
f.save()

# M7. サイトのMCP対応
f = Fig("mcp-site-support", "サイトのMCP対応とは、人が見るためのWebページとは別に、AIが使うための窓口(MCPサーバー)を用意すること。検索順位やAIの答えに出ることとは別の話")
cw = (W-32-12)/2
x1, x2 = 16, 16+cw+12
f.box(x1, 6, cw, 112, "f-b"); f.ctext(x1+cw/2, 32, "Webページ", "f-t")
for i,l in enumerate(["人が見る入口", "検索やAIの答えに", "出るのはこちら"]):
    f.ctext(x1+cw/2, 56+i*19, l, "f-s2")
f.box(x2, 6, cw, 112, "f-p"); f.ctext(x2+cw/2, 32, "MCPサーバー", "f-t")
for i,l in enumerate(["AIが使う窓口", "予約・在庫など", "AIが直接さわれる"]):
    f.ctext(x2+cw/2, 56+i*19, l, "f-s2")
f.box(16, 130, W-32, 70, "f-w", "MCPに対応しても", ["検索の順位やAIの答えに出やすくはならない", "→ 出るための工夫はSEOとAIOの基本"])
f.save()

# ---- 7. AIのアクセスと人のアクセス
f = Fig("ai-human-access", "サイトへのアクセス4種類:人の閲覧、AIクローラー、AIがユーザーの代わりに取りに来るアクセス、AIの回答のリンクから来る人。それぞれサーバーログとGA4での見え方が違う")
cards = [
    ("f-g", "人がブラウザで見る", ["検索・SNS・直接アクセスなど", "JavaScriptも画像も読み込む"], "ログ:残る / GA4:記録される"),
    ("f-o", "AIクローラー", ["GPTBot・ClaudeBot・OAI-SearchBotなど", "学習や検索の索引のために巡回"], "ログ:残る / GA4:ふつう記録されない"),
    ("f-p", "AIがユーザーの代わりに取得", ["ChatGPT-User・Claude-Userなど", "質問されたその場でページを読む"], "ログ:残る / GA4:ふつう記録されない"),
    ("f-b", "AIの回答から来た人", ["ChatGPTなどの出典リンクをクリック", "ふつうのブラウザで見る"], "ログ:残る / GA4:参照元つきで記録"),
]
y = 6
for i,(cls,t,lines,tag) in enumerate(cards):
    h = 34 + 18*len(lines) + 26
    f.box(16, y, W-32, h, cls, t, lines, num=i+1)
    f.text(60, y+h-12, "▸ " + tag, "f-l")
    y = y + h + 12
f.save()

# ---- 8. 1つの質問から起きるアクセス
f = Fig("ai-access-timeline", "AI検索で1つの質問をしたときにサイトに起きるアクセスの流れ:事前のクロール、質問時の取得、回答のリンクから人が来る")
steps = [
    ("f-o", "前もって:AIクローラーが巡回", ["ページを集めて検索用の索引を作る", "(この時点では人はまだ来ない)"]),
    ("f-p", "質問された時:AIがページを取得", ["索引から選ぶ・その場で読みに来る", "読んだ内容で答えを作る"]),
    ("f-b", "回答を読んだ人が出典をクリック", ["ここで初めて人がサイトに来る", "クリックされるのは読まれた回数のごく一部"]),
]
y = 6
for i,(cls,t,lines) in enumerate(steps):
    h = 34 + 18*len(lines) + 6
    f.box(16, y, W-32, h, cls, t, lines, num=i+1)
    y2 = y + h
    if i < len(steps)-1:
        f.arrow(W/2, y2+2, W/2, y2+22)
    y = y2 + 26
f.save()
# ---- 9. 広告アカウントの構成(Google広告とMeta広告)
f = Fig("ads-account-structure", "Google広告とMeta広告のアカウント構成の比較:Google広告はアカウント、キャンペーン、広告グループ、広告とキーワード。Meta広告はアカウント、キャンペーン、広告セット、広告")
cw = (W-16*2-12)/2
x1, x2 = 16, 16+cw+12
f.box(x1, 6, cw, 38, "f-b"); f.ctext(x1+cw/2, 31, "Google広告", "f-t")
f.box(x2, 6, cw, 38, "f-p"); f.ctext(x2+cw/2, 31, "Meta広告", "f-t")
rows = [("アカウント", "支払い・計測", "アカウント", "支払い・ピクセル"),
        ("キャンペーン", "種類・予算・入札", "キャンペーン", "目的・予算"),
        ("広告グループ", "キーワードのまとまり", "広告セット", "オーディエンス・配置"),
        ("広告", "見出し・説明文", "広告", "画像・動画・文章")]
y = 58
for i,(a,a2,b,b2) in enumerate(rows):
    h = 52
    for x,t,sub in ((x1,a,a2),(x2,b,b2)):
        f.box(x, y, cw, h, "f-w")
        f.ctext(x+cw/2, y+22, t, "f-t2"); f.ctext(x+cw/2, y+41, sub, "f-s2")
        if i < len(rows)-1:
            f.arrow(x+cw/2, y+h+2, x+cw/2, y+h+16)
    y += h + 20
f.text(x1, y+8, "▸ 予算は主にキャンペーン、", "f-l")
f.text(x1, y+26, "   誰に出すかは広告グループ / 広告セットで決める", "f-l")
f.h = y + 30
f.save()

# ---- 10. コンバージョン計測のしくみ
f = Fig("ads-conversion-flow", "コンバージョン計測のしくみ:広告のクリック、サイトでの成果、ブラウザのタグとサーバーからの送信の2つの経路、広告媒体での重複排除、自動入札の学習の流れ")
y = 6
for i,(cls,t,lines) in enumerate([("f-b", "広告をクリック", ["クリックの情報が付いてサイトへ"]),
                                  ("f-b", "サイトで成果", ["購入・問い合わせの完了"])]):
    h = 34 + 18*len(lines) + 6
    f.box(16, y, W-32, h, cls, t, lines, num=i+1)
    f.arrow(W/2, y+h+2, W/2, y+h+22)
    y += h + 26
cw = (W-16*2-12)/2
x1, x2 = 16, 16+cw+12
for x,t,l1,l2 in ((x1,"ブラウザのタグ","Googleタグ","Metaピクセル"),(x2,"サーバー・入力情報","拡張コンバージョン","コンバージョンAPI")):
    f.box(x, y, cw, 74, "f-w")
    f.ctext(x+cw/2, y+24, t, "f-t2"); f.ctext(x+cw/2, y+44, l1, "f-s2"); f.ctext(x+cw/2, y+62, l2, "f-s2")
    f.arrow(x+cw/2, y+76, x+cw/2, y+96)
y += 100
f.box(16, y, W-32, 58, "f-p", "広告媒体(Google・Meta)", ["同じ成果は1件にまとめる(重複排除)"], num=3)
f.arrow(W/2, y+60, W/2, y+80)
y += 84
f.box(16, y, W-32, 76, "f-g", "自動入札の学習・レポート", ["計測がずれると、AIは", "「ずれた成果」を増やそうとする"], num=4)
f.save()

# ---- 11. 広告予算の逆算
f = Fig("ads-budget-calc", "広告予算の逆算:目標の件数20件と許容CPA1万円を掛けると月の広告予算20万円。許容CPAは1件の利益と成約率から決める")
cw = (W-16*2-36)/2
x1, x2 = 16, 16+cw+36
f.box(x1, 6, cw, 84, "f-b"); f.ctext(x1+cw/2, 30, "目標の件数(月)", "f-s2"); f.ctext(x1+cw/2, 60, "20件", "f-t"); f.ctext(x1+cw/2, 80, "問い合わせなど", "f-s2")
f.ctext(W/2, 56, "×", "f-t")
f.box(x2, 6, cw, 84, "f-b"); f.ctext(x2+cw/2, 30, "許容CPA", "f-s2"); f.ctext(x2+cw/2, 60, "1万円", "f-t"); f.ctext(x2+cw/2, 80, "1件の上限", "f-s2")
f.arrow(W/2, 94, W/2, 118)
f.box(16, 122, W-32, 70, "f-g"); f.ctext(W/2, 146, "月の広告予算", "f-s2"); f.ctext(W/2, 172, "20万円(1日 約6,600円)", "f-t")
f.box(16, 204, W-32, 78, "f-w", "許容CPAの決め方", ["1件の成約で残る利益 × 成約する割合", "例:5万円 × 20% = 1万円(数字は例)"])
f.save()

# ---- 情報漏えいとAIの記事(ド素人でもわかるたとえ:お店と金庫と泥棒)
# L1. お店のたとえ
f = Fig("leak-shop-analogy", "情報漏えいをお店にたとえた図:お客さんの名簿は金庫の中身、IDとパスワードは鍵、メール配信などの外部サービスは荷物を預けた倉庫、漏えいは泥棒に中身を持ち出されること")
cw = (W-32-28)/2
x1, x2 = 16, 16+cw+28
f.box(x1, 6, cw, 40, "f-o"); f.ctext(x1+cw/2, 31, "お店にたとえると", "f-t2")
f.box(x2, 6, cw, 40, "f-b"); f.ctext(x2+cw/2, 31, "会社では", "f-t2")
rows = [("金庫の中身", "", "お客さんの名簿", "(名前・メール・住所)"),
        ("お店の鍵", "", "IDとパスワード", "(ログイン情報)"),
        ("荷物を預けた", "よその倉庫", "外のサービス", "(メール配信・顧客管理)"),
        ("泥棒に", "持ち出される", "情報漏えい", ""),
        ("泥棒の新しい道具", "", "AI", "(下調べ・ニセ物づくり)")]
y = 56
for a1, a2, b1, b2 in rows:
    h = 50
    f.box(x1, y, cw, h, "f-w"); f.box(x2, y, cw, h, "f-w")
    if a2:
        f.ctext(x1+cw/2, y+22, a1, "f-s2"); f.ctext(x1+cw/2, y+40, a2, "f-s2")
    else:
        f.ctext(x1+cw/2, y+31, a1, "f-t2")
    if b2:
        f.ctext(x2+cw/2, y+22, b1, "f-t2"); f.ctext(x2+cw/2, y+40, b2, "f-s2")
    else:
        f.ctext(x2+cw/2, y+31, b1, "f-t2")
    f.ctext(W/2, y+31, "=", "f-t")
    y += h + 8
f.h = y - 8
f.save()

# L2. 月別の報告件数(個人情報保護委員会 2026年10月28日)
f = Fig("leak-monthly-reports", "不正アクセスで個人情報が漏れたという国への報告件数(2026年):4月166件、5月163件、6月185件、7月212件、8月235件、9月303件、10月は16日までで830件。出典は個人情報保護委員会")
f.text(16, 22, "不正アクセスによる漏えいの報告件数", "f-t2")
f.text(16, 40, "(2026年・国への報告。10月は16日まで)", "f-s2")
data = [("4月",166),("5月",163),("6月",185),("7月",212),("8月",235),("9月",303),("10月",830)]
top, base = 60, 270
mx = 830
bw = 32; gap = (W-32-bw*len(data))/(len(data)-1)
for i,(m,v) in enumerate(data):
    x = 16 + i*(bw+gap)
    hh = (base-top-20)*v/mx
    cls = "f-o" if m=="10月" else "f-b"
    f.add(f'<rect class="{cls}" x="{x:.1f}" y="{base-hh:.1f}" width="{bw}" height="{hh:.1f}" rx="4"/>')
    f.ctext(x+bw/2, base-hh-6, f"{v}", "f-t2" if m=="10月" else "f-s2")
    f.ctext(x+bw/2, base+18, m, "f-s2")
f.add(f'<line class="f-ar" x1="12" y1="{base}" x2="{W-12}" y2="{base}"/>')
f.text(16, base+44, "10月は1日あたり約52件(9月は約10件)", "f-l")
f.text(16, base+62, "出典:個人情報保護委員会(2026年10月28日)", "f-s2")
f.h = base+66
f.save()

# L3. 泥棒の入り口
steps_fig("leak-entry-routes", "泥棒(攻撃者)が入ってくる4つの入り口:鍵を盗む、こわれた窓から入る、裏口から入る、預け先の倉庫から入る", [
    ("f-o", "鍵を盗む", ["ニセのログイン画面でIDとパスワードを", "入力させる(フィッシング)"]),
    ("f-o", "こわれた窓から入る", ["ソフトの古い穴(脆弱性)を", "直していないところをねらう"]),
    ("f-o", "裏口から入る", ["社内用の管理画面やアプリの裏側", "(API)が外から開いたまま"]),
    ("f-o", "預け先の倉庫から入る", ["メール配信や顧客管理などの", "外のサービスや委託先をねらう"]),
], numbered=True)

# L4. 悪い人のAIの使い方
steps_fig("leak-ai-attacker", "攻撃者がAIを使う4つの場面:下調べを自動にする、だましの文章を作る、ニセの顔や声を作る、ウイルスを作る・変える", [
    ("f-p", "下調べを自動にする", ["穴のあるサイトを、AIが休まず", "さがし続ける"]),
    ("f-p", "だましの文章を作る", ["自然な日本語のニセメールを", "大量に作れる"]),
    ("f-p", "ニセの顔や声を作る", ["社長や上司になりすました", "動画・電話(ディープフェイク)"]),
    ("f-p", "ウイルスを作る・変える", ["動きながらAIに命令を作らせる", "ウイルスも見つかっている"]),
], numbered=False)

# L5. 自社のAI利用から漏れる3つ
steps_fig("leak-ai-own-use", "自分の会社のAI利用から情報が漏れる3つのパターン:AIに入力してしまう、AIにわたした合鍵を盗まれる、AIがだまされて外に送ってしまう", [
    ("f-o", "AIに入れてしまう", ["お客さんの名簿や社外秘の資料を", "会社が認めていないAIに貼りつける"]),
    ("f-o", "AIにわたした合鍵を盗まれる", ["AIとほかのサービスをつなぐ「合鍵」", "(トークン)ごと盗まれる"]),
    ("f-o", "AIがだまされる", ["メールやページにかくれた命令に", "AIが従ってしまう"]),
])

# L6. プロンプトインジェクションの流れ
steps_fig("leak-prompt-injection", "AIがだまされる流れ(プロンプトインジェクション):悪い人がかくれた命令を書いたメールを送る、社員がAIにメールのまとめをたのむ、AIがかくれた命令も読む、社内の情報を外に送ってしまう", [
    ("f-w", "悪い人がメールを送る", ["見えにくい場所に「社内の情報を", "このURLに送って」と書いておく"]),
    ("f-w", "社員がAIにたのむ", ["「今日のメールをまとめて」"]),
    ("f-p", "AIがかくれた命令も読む", ["AIは「お願い」と「ただの文章」の", "区別が苦手"]),
    ("f-o", "社内の情報が外へ出る", ["社員は気づかないまま", "情報が送られてしまう"]),
])

# L7. 狙われるもの
f = Fig("leak-targets", "攻撃者に狙われるもの:IDとパスワードなどの鍵、お客さんの名簿、広告やSNSのアカウント、外のサービスとの連携、本人確認書類の画像")
items = [("f-o","ID・パスワード・合鍵","いちばん狙われる。鍵があれば何でも開く"),
         ("f-o","お客さんの名簿","メールアドレス・住所・電話番号"),
         ("f-p","広告・SNSのアカウント","乗っ取られると広告費を使われる"),
         ("f-p","外のサービスとの連携","メール配信・顧客管理・分析ツール"),
         ("f-b","本人確認書類の画像","運転免許証など(2026年に漏えいが続いた)")]
y = 6
for cls,t,l in items:
    f.box(16, y, W-32, 58, cls, t, [l])
    y += 66
f.h = y - 8
f.save()

# L8. 今日やること
steps_fig("leak-todo", "マーケ担当と小さな会社が今日からできる6つの対策:2段階のログインをオンにする、管理者を見直す、つないだサービスを見直す、AIに入れていい情報を決める、いらない名簿を消す、お金と権限の依頼は別の方法で確かめる", [
    ("f-g", "2段階のログインをオンにする", ["広告・SNS・メール配信・顧客管理", "すべてのアカウントで"]),
    ("f-g", "管理者を見直す", ["知らない人・やめた人が", "管理者に残っていないか"]),
    ("f-g", "つないだサービスを見直す", ["使っていない連携(合鍵)は外す"]),
    ("f-g", "AIに入れていい情報を決める", ["名簿・パスワード・社外秘は入れない"]),
    ("f-g", "いらない名簿を消す", ["持っていない情報は漏れない"]),
    ("f-g", "お金と権限の依頼は確かめる", ["ビデオ会議でも、別の連絡方法で", "本人にもう一度確認する"]),
])
print(sorted(os.listdir(OUT)))
