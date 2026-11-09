# AGENTS.md — AIOラボ(aio.shiokonbu.com)

このリポジトリで作業するすべてのAI(Claude・Codex・ほかのモデル)と人のための共通ルールです。`CLAUDE.md` はこのファイルを読み込むだけです。

オーナーは Nori さん(個人)。やりとりは日本語で、やさしく短く。記事づくり・反映はAIが行います。

## メディアの説明

- デジタル広告・SEO・**AIO(AI検索最適化)** の実務メディア。看板はAIO。目標は月間100万PV(戦略ドキュメント: https://claude.ai/artifact/9CXonpNsHwrsTysKfE3pYG)。
- 主な読者:中小企業のマーケ担当(兼任)、SEO・Web担当、経営者。量は用語集・入門、将来の売上は「費用・外注先の選び方」とAIOの記事が生む。
- 今は収益化しない(広告・アフィリエイトなし)。将来はAIO支援・広告運用代行・LP制作の受注につなげる。
- サイト名「AIOラボ」は仮(`site.json` の name を変えれば全ページが変わる)。

## ファイル構成

| 場所 | 中身 |
|---|---|
| `site.json` | サイト名・URL・カテゴリ(柱)・GA4・公開前フラグ(`launched`) |
| `content/articles/<カテゴリ>/<スラッグ>.md` | 記事の元。書き方は `docs/writing.md` |
| `content/pages/*.md` | 運営者情報・編集方針・プライバシーポリシー |
| `tools/build.py` | 元データから全ページ・sitemap.xml・feed.xml・robots.txt・llms.txt・llms-full.txt を作る |
| `tools/seo_check.py` `.github/workflows/seo-check.yml` | SEO・AIOの自動チェック(PRごと。ビルドし忘れも赤くなる) |
| `tools/indexnow.py` `.github/workflows/indexnow.yml` `<32桁>.txt` | main の変更ページを IndexNow(Bing など)に送る。.txt は鍵(公開してよい値)なので消さない |
| `assets/` | CSS・OGP画像・ロゴ |
| ルートの `*.html` `*/index.html` `sitemap.xml` `feed.xml` `robots.txt` `llms*.txt` | **生成物。直接直さない**(build.py が上書きする) |

`CNAME`・`.nojekyll` は GitHub Pages 用なので消さない。

## 記事のルール(必ず守る)

- **冒頭で答える**:`summary:` に結論を1〜2文。本文の最初の段落でも定義・結論を言い切る(AIに引用されやすい形)。
- **見出しは問いの形**を基本に、H2 は3〜6個。最後に `## よくある質問` を置き、`### 質問` と答えを書く(FAQPage の構造化データが自動で付く)。
- **一次情報を1つ以上**入れる(実際に試した結果・画面・数値・失敗例)。試していないことを体験談として書かない。
- **数字・仕様には出典リンクと確認日**(例:「2026年11月時点、Google 検索セントラル」)。公式で確かめられないものは書かない。
- 根拠のない実績・「No.1」「業界最安」などは書かない。他社をけなさない。
- 呼び方(AIO・LLMO・GEO・AEO)が揺れている語は、記事の中で定義してから使う。
- 本文の内部リンクを3本以上(同じ柱のピラー記事、用語集、関連記事)。
- AIで下書きしてよいが、事実確認をしてから公開する(Google の「大量生成コンテンツの乱用」に当たる薄い記事を出さない)。

## SEO・AIO

- タイトル28〜40字、メインキーワードを前半に。description 80〜120字。スラッグは英語・小文字・ハイフン区切りで、公開後は変えない。
- 構造化データは build.py が自動で付ける:全ページ BreadcrumbList、記事は Article(著者・公開日・更新日)、FAQ があれば FAQPage、トップは WebSite + Organization。
- AIクローラー(GPTBot・OAI-SearchBot・ClaudeBot・PerplexityBot・Google-Extended など)は **ブロックしない**。robots.txt は build.py が作る。
- llms.txt / llms-full.txt も build.py が記事一覧から作る。
- 記事のない柱のカテゴリページは noindex(薄いページを索引させない)。
- **公開前モード**:`site.json` の `launched` が false の間は全ページ noindex、IndexNow も送らない。Nori さんの「公開して」で true にする。
- GA4:全ページに `G-ZYX17VBTWB`(shiokonbu.com 総合、全サブドメイン共通。消さない)。aio 単体のプロパティを作ったら `site.json` の `ga` に足す。

## 変更のしかた

1. 記事や設定を直したら `python3 tools/build.py .` → `python3 tools/seo_check.py .` で NG 0 にする。
2. ブランチを作って PR で出す。`main` にマージすると GitHub Pages ですぐ本番に出る。
3. リポジトリは **公開**。トークン・APIキー・個人のメールアドレスを入れない。
4. 外部への送信や、元に戻せないことは Nori さんの「やって」を待つ。
