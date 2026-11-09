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
# ==== 広告の記事の図(ads/*・analytics/conversion-tracking・lp-creative/ad-creative)
def tag(f, x, y, s, cls="f-o", tcls="f-l", w=None):
    w = w or (len(s)*12 + 14)
    f.add(f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="20" rx="10"/>')
    f.ctext(x + w/2, y + 14.5, s, tcls)
    return w

def legend(f, y, items):
    x = 16
    for cls, s in items:
        f.add(f'<rect class="{cls}" x="{x}" y="{y}" width="14" height="14" rx="4"/>')
        f.text(x+19, y+12, s, "f-s2")
        x += 19 + len(s)*12 + 14
    f.h = max(f.h, y + 16)

# ---- 広告1. Google検索の画面で広告が出る場所
f = Fig("ads-google-serp", "Google検索の結果画面で広告が出る場所:検索窓の下に検索広告、その下にAIによる概要、その下にも広告、自然検索の結果、ページの下にも広告")
f.box(16, 6, W-32, 470, "f-w")
f.add(f'<rect class="f-w" x="32" y="20" width="{W-64}" height="34" rx="17"/>')
f.text(48, 42, "🔍 渋谷 整体 おすすめ", "f-s")
blocks = [
    ("f-o", "スポンサー", "検索広告(上)", "検索語句に合わせたテキスト広告", 66),
    ("f-p", "AI", "AIによる概要", "AIがまとめた答えと出典リンク", 134),
    ("f-o", "スポンサー", "検索広告(AIの答えの下)", "日本でも表示される(2026年11月)", 202),
    ("f-w", "SEO", "自然検索の結果 1", "お金では買えない・SEOで上がる", 270),
    ("f-w", "SEO", "自然検索の結果 2", "", 330),
    ("f-o", "スポンサー", "検索広告(下)", "ページのいちばん下にも出る", 390),
]
for cls, tg, t, s, y in blocks:
    h = 58 if s else 48
    f.box(32, y, W-64, h, cls if cls != "f-w" else "f-w")
    f.text(46, y+22, t, "f-t2")
    if s: f.text(46, y+42, s, "f-s2")
    tw = len(tg)*12 + 14
    tag(f, W-32-10-tw, y+8, tg, "f-o" if tg=="スポンサー" else ("f-p" if tg=="AI" else "f-g"))
f.text(46, 462, "︙ 地図・画像・動画などの結果が入ることもある", "f-s2")
f.h = 476
legend(f, 488, [("f-o", "広告(お金を払う)"), ("f-p", "AIの答え"), ("f-w", "自然検索")])
f.save()

# ---- 広告2. Google広告が出るほかの場所
f = Fig("ads-google-surfaces", "Google広告が出る場所:Google検索、YouTube、Gmail、Discover、提携サイトとアプリ、Googleマップ、ショッピング")
cards = [("Google検索", ["検索結果の上と下", "→ 検索・P-MAX"]),
         ("YouTube", ["動画の前後・途中など", "→ 動画・P-MAX など"]),
         ("Gmail", ["受信トレイのタブ上部", "→ デマンドジェネ など"]),
         ("Discover", ["Googleアプリ内", "→ デマンドジェネ など"]),
         ("提携サイト・アプリ", ["ブログやニュースの枠", "→ ディスプレイ など"]),
         ("Googleマップ", ["お店を探している人に", "→ P-MAX など"])]
cw = (W-32-10)/2
y = 6
for i,(t,lines) in enumerate(cards):
    x = 16 + (i%2)*(cw+10)
    f.box(x, y, cw, 76, "f-o")
    f.text(x+12, y+24, t, "f-t2")
    f.text(x+12, y+46, lines[0], "f-s2" if len(lines[0])<=12 else "f-s2")
    f.text(x+12, y+65, lines[1], "f-l")
    if i%2 == 1: y += 86
f.box(16, y, W-32, 58, "f-b", "どれも1つの広告アカウントから", ["キャンペーンの種類で出る場所が決まる"])
f.save()

# ---- 広告3. Meta広告が出る場所(Instagramのフィードの例)
f = Fig("ads-meta-placements", "Meta広告が出る場所:InstagramやFacebookのフィードでは投稿の合間に「広告」と表示されて出る。ストーリーズやリールでは全画面で出る。ほかにMessengerや提携アプリにも出る")
f.box(16, 6, W-32, 300, "f-w")
f.ctext(W/2, 28, "Instagramのフィード(例)", "f-t2")
def post(y, cls, who, line, ad=False):
    f.box(32, y, W-64, 76, cls)
    f.add(f'<circle class="{"f-o" if ad else "f-b"}" cx="52" cy="{y+20}" r="10"/>')
    f.text(70, y+25, who, "f-t2")
    if ad: tag(f, W-32-10-38, y+8, "広告")
    f.text(46, y+52, line, "f-s2")
post(40, "f-w", "友だちの投稿", "旅行の写真・いいね")
post(124, "f-o", "整体院〇〇", "肩こりの動画+「予約する」ボタン", ad=True)
post(208, "f-w", "フォロー中のお店", "新メニューの写真")
f.text(32, 298, "▲ 投稿の合間に、ふつうの投稿と同じ形で出る", "f-l")
y = 320
cards = [("Instagram", "フィード・ストーリーズ・リール・発見"),
         ("Facebook", "フィード・ストーリーズ・リール・動画"),
         ("Messenger", "受信箱・ストーリーズ"),
         ("Audience Network", "Metaと提携したほかのアプリ")]
for t, s in cards:
    f.box(16, y, W-32, 50, "f-o")
    f.text(30, y+21, t, "f-t2"); f.text(30, y+40, s, "f-s2")
    y += 56
f.box(16, y, W-32, 58, "f-b", "配置はAIに任せられる", ["Advantage+ 配置:成果が出やすい場所に配分"])
f.save()

# ---- 広告4. ユーザーが広告に出会う流れ
f = Fig("ads-user-journey", "ユーザーが広告に出会う流れ:気づく、調べる、比べる、決めるの4段階で、それぞれ出会う広告と、SEO・AIOが効く場所が違う")
stages = [
    ("気づく", "SNSや動画をなんとなく見ている", "Meta広告・YouTube・ディスプレイ", "(まだ検索していない)"),
    ("調べる", "「肩こり 原因」と検索・AIに質問", "検索広告", "解説記事・AIの答えの出典"),
    ("比べる", "「渋谷 整体 おすすめ」・口コミ", "検索広告・もう一度見せる広告", "比較記事・AIの比べた答え"),
    ("決める", "お店の名前で検索して予約", "指名検索の広告", "公式サイト・会社の情報"),
]
y = 6
for i,(t, act, ad, seo) in enumerate(stages):
    h = 112
    f.box(16, y, W-32, h, "f-w", t, [act], num=i+1)
    f.add(f'<rect class="f-o" x="58" y="{y+54}" width="{W-90}" height="22" rx="6"/>')
    f.text(66, y+70, "広告:" + ad, "f-s2")
    f.add(f'<rect class="f-p" x="58" y="{y+82}" width="{W-90}" height="22" rx="6"/>')
    f.text(66, y+98, "SEO・AIO:" + seo, "f-s2")
    if i < len(stages)-1:
        f.arrow(W/2, y+h+2, W/2, y+h+18)
    y += h + 22
f.h = y - 22
legend(f, y-8, [("f-o", "ここで出会う広告"), ("f-p", "SEO・AIOが効く場所")])
f.save()

# ---- 広告5. 広告ランクの決まり方
f = Fig("ads-ad-rank", "広告ランクの決まり方:入札単価、広告とページの品質、広告ランクの下限値、検索した状況、広告アセットの効果などから検索のたびに計算され、掲載するか、何番目か、クリック単価が決まる")
items = [("入札単価", "1クリックの上限"), ("広告とページの品質", "役に立つか"),
         ("広告ランクの下限値", "最低ライン"), ("競合との差", "オークション"),
         ("検索した状況", "語句・場所・端末"), ("広告アセット", "電話番号など")]
cw = (W-32-10)/2
y = 6
for i,(t,s) in enumerate(items):
    x = 16 + (i%2)*(cw+10)
    f.box(x, y, cw, 52, "f-b")
    f.text(x+12, y+22, t, "f-t2"); f.text(x+12, y+41, s, "f-s2")
    if i%2 == 1: y += 60
f.arrow(W/2, y+2, W/2, y+24)
y += 28
f.box(16, y, W-32, 58, "f-p", "広告ランク", ["検索のたびに計算し直される"])
f.arrow(W/2, y+60, W/2, y+82)
y += 86
f.box(16, y, W-32, 94, "f-g", "決まること", ["① 広告を出すか", "② 何番目に出すか", "③ 実際のクリック単価"])
f.save()

# ---- 広告6. 自動入札がオークションごとにすること
f = Fig("ads-smart-bidding", "自動入札のしくみ:検索のたびに、デバイスや場所、時間帯、検索語句、過去の訪問などの手がかりから成果につながる見込みを予測し、見込みが高ければ高く、低ければ低く入札する")
f.box(16, 6, W-32, 58, "f-w", "だれかが検索した!", ["「渋谷 整体 予約」 21:30 スマホ"], num=1)
f.arrow(W/2, 66, W/2, 86)
sig = ["デバイス", "場所", "時間帯", "検索語句", "過去の訪問", "言語・OS"]
f.box(16, 90, W-32, 106, "f-b", "手がかり(シグナル)を見る", [], num=2)
cw = (W-32-24-12)/3
for i,s in enumerate(sig):
    x = 28 + (i%3)*(cw+6); yy = 128 + (i//3)*32
    f.add(f'<rect class="f-w" x="{x}" y="{yy}" width="{cw}" height="26" rx="8"/>')
    f.ctext(x+cw/2, yy+18, s, "f-s2")
f.arrow(W/2, 198, W/2, 218)
f.box(16, 222, W-32, 58, "f-p", "成果につながる見込みを予測", ["過去の成果のデータから学習したAI"], num=3)
f.arrow(W/2-70, 282, W/2-70, 302); f.arrow(W/2+70, 282, W/2+70, 302)
cw = (W-32-10)/2
f.box(16, 306, cw, 58, "f-g"); f.ctext(16+cw/2, 330, "見込みが高い", "f-t2"); f.ctext(16+cw/2, 350, "→ 高く入札", "f-s2")
f.box(16+cw+10, 306, cw, 58, "f-o"); f.ctext(16+cw*1.5+10, 330, "見込みが低い", "f-t2"); f.ctext(16+cw*1.5+10, 350, "→ 低く・出さない", "f-s2")
f.save()

# ---- 広告7. P-MAXのしくみ
f = Fig("ads-pmax", "P-MAXのしくみ:人が目標・予算・素材・ヒントを渡すと、GoogleのAIが検索・YouTube・ディスプレイ・Discover・Gmail・マップに広告を組み立てて配信する")
f.box(16, 6, W-32, 94, "f-b", "あなたが渡すもの", ["目標(成果)と予算", "素材:見出し・画像・動画・ロゴ", "ヒント:お客さんのリスト・検索テーマ"])
f.arrow(W/2, 102, W/2, 122)
f.box(16, 126, W-32, 76, "f-p", "P-MAX(GoogleのAI)", ["誰に・どこに・いくらで出すかを決め", "素材を組み合わせて広告を作る"])
ch = ["検索", "YouTube", "ディスプレイ", "Discover", "Gmail", "マップ"]
cw = (W-32-16)/3
for i,s in enumerate(ch):
    x = 16 + (i%3)*(cw+8); yy = 226 + (i//3)*40
    if i < 3: f.arrow(x+cw/2, 204, x+cw/2, 222)
    f.add(f'<rect class="f-o" x="{x}" y="{yy}" width="{cw}" height="32" rx="8"/>')
    f.ctext(x+cw/2, yy+21, s, "f-t2")
f.h = 306
f.box(16, 316, W-32, 58, "f-w", "人が見る・直すところ", ["検索語句・除外キーワード・チャネル別の成果"])
f.save()

# ---- 広告8. Advantage+の3つの自動化
f = Fig("ads-advantage-plus", "Advantage+のしくみ:人は目的・計測・素材・守る条件を決め、AIがオーディエンス・配置・予算の3つを担当する。3つすべてを任せるとAdvantage+キャンペーンになる")
f.box(16, 6, W-32, 94, "f-b", "人が決める", ["目的(売上・リードなど)と成果の計測", "素材(画像・動画・文章)", "守る条件(地域・最低年齢など)"])
f.arrow(W/2, 102, W/2, 122)
f.box(16, 126, W-32, 150, "f-p", "AIに任せる3つ", [])
items = [("オーディエンス", "誰に見せるか"), ("配置", "どこに出すか"), ("予算", "どの広告セットに")]
cw = (W-32-24-12)/3
for i,(t,s) in enumerate(items):
    x = 28 + i*(cw+6)
    f.add(f'<rect class="f-w" x="{x}" y="164" width="{cw}" height="66" rx="10"/>')
    f.ctext(x+cw/2, 190, t if len(t)<7 else "対象の人", "f-t2"); f.ctext(x+cw/2, 212, s if len(s)<8 else "どの広告セット", "f-s2")
f.text(28, 258, "3つすべてONで「Advantage+ キャンペーン」", "f-l")
f.arrow(W/2, 278, W/2, 298)
f.box(16, 302, W-32, 58, "f-g", "人が確かめる", ["配置別・年齢別の成果、既存客と新規客の割合"])
f.save()

# ---- 広告9. AIの答えのまわりの広告(日本と英語圏)
f = Fig("ads-ai-overviews", "AIによる概要と広告の位置の比較(2026年11月時点):日本では広告はAIによる概要の上と下だけに出る。米国など一部の英語圏では、AIによる概要の中にも広告が出る")
cw = (W-32-12)/2
for k,(x,title,inside) in enumerate(((16,"日本(日本語)",False),(16+cw+12,"米国など英語圏",True))):
    f.ctext(x+cw/2, 22, title, "f-t2")
    f.box(x, 32, cw, 300, "f-w")
    f.box(x+10, 44, cw-20, 40, "f-o"); f.ctext(x+cw/2, 69, "広告(上)", "f-s2")
    f.box(x+10, 94, cw-20, 168 if inside else 168, "f-p")
    f.ctext(x+cw/2, 118, "AIによる概要", "f-t2")
    f.ctext(x+cw/2, 140, "AIの答え・出典", "f-s2")
    if inside:
        f.box(x+22, 156, cw-44, 40, "f-o"); f.ctext(x+cw/2, 181, "広告(中)", "f-s2")
        f.ctext(x+cw/2, 232, "AIモードにも広告", "f-s2")
    else:
        f.ctext(x+cw/2, 186, "中には広告は", "f-s2"); f.ctext(x+cw/2, 204, "出ない", "f-s2")
    f.box(x+10, 272, cw-20, 40, "f-o"); f.ctext(x+cw/2, 297, "広告(下)", "f-s2")
f.h = 332
f.box(16, 344, W-32, 58, "f-b", "どちらも出し分けの設定はない", ["検索・P-MAXなどの広告が自動で対象"])
f.save()

# ---- 広告10. レスポンシブ検索広告の組み合わせ
f = Fig("ads-rsa", "レスポンシブ検索広告のしくみ:見出しを最大15個、説明文を最大4個入れておくと、Googleが検索ごとに組み合わせて表示する")
f.box(16, 6, W-32, 150, "f-w", "あなたが入れるもの", [])
heads = ["渋谷の整体院", "駅から徒歩3分", "肩こり専門", "当日予約OK", "初回限定の料金", "…最大15個"]
cw = (W-32-24-8)/2
for i,s in enumerate(heads):
    x = 28 + (i%2)*(cw+8); yy = 44 + (i//2)*30
    f.add(f'<rect class="f-b" x="{x}" y="{yy}" width="{cw}" height="24" rx="6"/>')
    f.text(x+8, yy+17, s, "f-s2")
f.add(f'<rect class="f-p" x="28" y="{44+3*30}" width="{W-56}" height="0" rx="6"/>')
f.text(28, 146, "+ 説明文を最大4個", "f-l")
f.arrow(W/2, 158, W/2, 178)
f.box(16, 182, W-32, 104, "f-o")
tag(f, 28, 192, "スポンサー")
f.text(28, 234, "渋谷の整体院 | 肩こり専門 | 当日予約OK", "f-t2")
f.text(28, 256, "駅から徒歩3分。肩こりの原因から", "f-s2")
f.text(28, 274, "ていねいに説明します。", "f-s2")
f.h = 286
f.text(16, 306, "▲ 検索ごとにGoogleが組み合わせを選んで表示", "f-l")
f.h = 310
f.save()

# ---- 広告11. 成果が出ないときに確かめる順番
steps_fig("ads-check-order", "広告の成果が出ないときに確かめる順番:計測、成果の選び方、構成と予算、判断のしかた、広告とページの順", [
    ("f-o", "成果は正しく計測されている?", ["タグが外れていないか・二重に数えていないか"]),
    ("f-o", "AIに正しい成果を学ばせている?", ["ページの閲覧などをメインにしていないか"]),
    ("f-b", "構成と予算は学習できる形?", ["分けすぎ・目標が厳しすぎないか"]),
    ("f-b", "判断のしかたは正しい?", ["触りすぎ・直近だけで判断していないか"]),
    ("f-g", "広告とページは合っている?", ["検索語句・広告文・ページの最初の画面"]),
])

print(sorted(os.listdir(OUT)))
