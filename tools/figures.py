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

# ---- 1. Google検索の仕組み
f = Fig("google-search-flow", "Google検索の仕組み:URLの発見、クロール、レンダリング、インデックス登録、検索結果の表示の順に進む流れ図")
y = 6
steps = [
    ("f-b", "URLを見つける", ["リンクをたどる・サイトマップを読む"], "発見"),
    ("f-b", "クロール", ["Googlebot がページを取得", "robots.txt で許可されたページだけ"], "1"),
    ("f-b", "レンダリング", ["JavaScript を実行して", "ブラウザと同じ表示を作る"], None),
    ("f-p", "インデックス", ["中身を理解し、似たページから", "代表(正規URL)を選んで登録"], "2"),
    ("f-g", "検索結果の表示", ["検索語・場所・言語・端末など", "数百の要因で並べる"], "3"),
]
for i,(cls,t,lines,num) in enumerate(steps):
    h = 34 + 18*len(lines) + 6
    f.box(16, y, W-32, h, cls, t, lines, num=num if num and num.isdigit() else None)
    if num and not num.isdigit():
        pass
    y2 = y + h
    if i < len(steps)-1:
        f.arrow(W/2, y2+2, W/2, y2+22)
    y = y2 + 26
f.save()

# ---- 2. AI検索の仕組み(検索して答える)
f = Fig("ai-search-flow", "AI検索が答えを作る流れ:質問を受け取り、小さな検索に分け、索引からページを探して読み、答えを作り、出典リンクを付けて返す")
y = 6
steps = [
    ("f-b", "質問を受け取る", ["例:「AIO対策は何から始める?」"]),
    ("f-b", "小さな検索に分ける", ["「AIOとは」「robots.txt 設定」など", "(クエリ ファンアウト)"]),
    ("f-p", "ページを探して読む", ["事前に作った検索の索引から探す", "必要ならその場でページを取得"]),
    ("f-p", "答えを作る", ["集めたページの内容をもとに", "AIが文章をまとめる"]),
    ("f-g", "出典つきで返す", ["使ったページへのリンクを表示", "→ ここに載ると「引用された」"]),
]
for i,(cls,t,lines) in enumerate(steps):
    h = 34 + 18*len(lines) + 6
    f.box(16, y, W-32, h, cls, t, lines, num=i+1)
    y2 = y + h
    if i < len(steps)-1:
        f.arrow(W/2, y2+2, W/2, y2+22)
    y = y2 + 26
f.save()

# ---- 3. 学習と検索の違い
f = Fig("training-vs-retrieval", "AIがWebの情報を使う2つの経路の比較:学習データとして取り込む経路と、回答のたびに検索して引用する経路")
cw = (W-16*2-12)/2
x1, x2 = 16, 16+cw+12
f.box(x1, 6, cw, 46, "f-o", "① 学習に使う")
f.box(x2, 6, cw, 46, "f-g", "② 検索して引用")
rows = [("クローラー", "GPTBot", "ClaudeBot など", "OAI-SearchBot", "PerplexityBot など"),
        ("いつ使う", "モデルを作るとき", "(過去のデータ)", "質問されたとき", "(その時点の情報)"),
        ("出典リンク", "付かない", "", "付く", "→ サイトに来てもらえる"),
        ("止める方法", "学習用だけを", "robots.txt で拒否", "検索用を拒否すると", "AI検索に出なくなる")]
y = 62
for lab, a1, a2, b1, b2 in rows:
    f.text(x1, y+14, lab, "f-l")
    h = 52
    f.box(x1, y+20, cw, h, "f-w"); f.box(x2, y+20, cw, h, "f-w")
    f.text(x1+12, y+42, a1, "f-s2"); f.text(x1+12, y+61, a2, "f-s2")
    f.text(x2+12, y+42, b1, "f-s2"); f.text(x2+12, y+61, b2, "f-s2")
    y += 20 + h + 10
f.save()

# ---- 4. SEOとAIOの関係(土台)
f = Fig("seo-aio-layers", "SEOとAIOの関係:読まれる、理解される、選ばれるの3段で、下の段ほど共通の土台になる")
layers = [
    ("f-g", "選ばれる", ["SEO:上位に表示される", "AIO:回答の出典に引用される"], "一次情報・冒頭で答える・信頼"),
    ("f-p", "理解される", ["見出し・構造化データ・正規URL", "何のページか機械にわかる"], "SEOとAIOで共通"),
    ("f-b", "読まれる", ["クロールを許可・本文をHTMLに", "サイトマップ・速い表示"], "SEOとAIOで共通"),
]
y = 6
for i,(cls,t,lines,tag) in enumerate(layers):
    inset = 16 + (2-i)*18
    h = 34 + 18*len(lines) + 26
    f.box(inset, y, W-inset*2, h, cls, t, lines)
    f.text(inset+14, y+h-12, "▸ " + tag, "f-l")
    y += h + 8
f.save()

# ---- 5. MCPの構成
f = Fig("mcp-architecture", "MCPの構成図:AIアプリ(ホスト)がサーバーごとにクライアントを持ち、MCPサーバーを通してSearch ConsoleやGA4、ファイルなどにつながる")
f.box(16, 6, W-32, 108, "f-b", "AIアプリ(MCPホスト)", ["例:Claude・ChatGPT・VS Code"])
cw = (W-32-24-16)/3
for i,lab in enumerate(["クライアント", "クライアント", "クライアント"]):
    x = 28 + i*(cw+8)
    f.box(x, 70, cw, 34, "f-w")
    f.ctext(x+cw/2, 92, lab, "f-s2")
names = [("MCPサーバー", "Search Console"), ("MCPサーバー", "GA4"), ("MCPサーバー", "ファイル・DB")]
for i,(a,b) in enumerate(names):
    x = 28 + i*(cw+8)
    f.arrow(x+cw/2, 106, x+cw/2, 146)
    f.box(x, 150, cw, 56, "f-p")
    f.ctext(x+cw/2, 173, a, "f-s2"); f.ctext(x+cw/2, 193, b, "f-t2")
f.add(f'<rect class="f-w" x="{W/2-66}" y="117" width="132" height="22" rx="11"/>')
f.ctext(W/2, 132, "MCP(共通の決まり)", "f-l")
for i in range(3):
    x = 28 + i*(cw+8)
    f.arrow(x+cw/2, 208, x+cw/2, 236)
f.box(16, 240, W-32, 52, "f-o", "外の道具・データ", ["Google の API、社内のデータベースなど"])
f.save()

# ---- 6. MCPでSearch Consoleを使う流れ
f = Fig("mcp-gsc-flow", "MCPでAIがSearch Consoleを使う流れ:質問、ツールの選択、MCPサーバーがAPIを呼ぶ、結果を返す、AIが答える")
steps = [
    ("f-b", "あなたが質問する", ["「先月クリックが減ったページは?」"]),
    ("f-b", "AIが使う道具を選ぶ", ["サーバーの道具の一覧から", "「検索データを取る」を選ぶ"]),
    ("f-p", "MCPサーバーがAPIを呼ぶ", ["Search Console から数字を取得", "(あなたが許可した範囲だけ)"]),
    ("f-p", "結果をAIに返す", ["ページごとのクリック数の表"]),
    ("f-g", "AIが答えをまとめる", ["減ったページと原因の候補を説明"]),
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
print(sorted(os.listdir(OUT)))
