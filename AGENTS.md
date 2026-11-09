# AGENTS.md — AIO対策ナビ(aio.shiokonbu.com)

このリポジトリで作業するすべてのAI(Claude・Codex・ほかのモデル)と人のための共通ルールです。`CLAUDE.md` はこのファイルを読み込むだけです。

オーナーは Nori さん(個人)。やりとりは日本語で、やさしく短く。記事づくり・反映はAIが行います。

## メディアの説明

- デジタル広告・SEO・**AIO(AI検索最適化)** の実務メディア。看板はAIO。目標は月間100万PV(戦略ドキュメント: https://claude.ai/artifact/9CXonpNsHwrsTysKfE3pYG)。
- 主な読者:中小企業のマーケ担当(兼任)、SEO・Web担当、経営者。量は用語集・入門、将来の売上は「費用・外注先の選び方」とAIOの記事が生む。
- 今は収益化しない(広告・アフィリエイトなし)。将来はAIO支援・広告運用代行・LP制作の受注につなげる。
- サイト名「AIO対策ナビ」(2026-11-09 決定。「AIO対策」の検索語を含み、既存の「AIOラボ」系の名前と区別できるもの)。名前は `site.json` の name。

## ファイル構成

| 場所 | 中身 |
|---|---|
| `site.json` | サイト名・URL・カテゴリ(柱)・GA4・公開前フラグ(`launched`)・Search Console の確認用メタタグ(`google_site_verification` に content の値を配列で) |
| `content/articles/<カテゴリ>/<スラッグ>.md` | 記事の元。書き方は `docs/writing.md` |
| `content/pages/*.md` | 運営者情報・編集方針・プライバシーポリシー |
| `content/roadmap.json` | AIO・SEO強化ロードマップ(`/roadmap/`)の14ステップ。記事の末尾の「このあと何をする?」、トップの案内、診断結果からの「次にやるステップ」もここから作る。`checks` は診断ツールのチェックID。進み具合と診断履歴は `assets/progress.js` がブラウザ内だけに保存 |
| `tools/build.py` | 元データから全ページ・sitemap.xml・feed.xml・robots.txt・llms.txt・llms-full.txt を作る |
| `tools/seo_check.py` `.github/workflows/seo-check.yml` | SEO・AIOの自動チェック(PRごと。ビルドし忘れも赤くなる) |
| `tools/indexnow.py` `.github/workflows/indexnow.yml` `<32桁>.txt` | main の変更ページを IndexNow(Bing など)に送る。.txt は鍵(公開してよい値)なので消さない |
| `worker/` `.github/workflows/deploy-worker.yml` | AIO診断ツール(`/aio-checker/`)のAPI。Cloudflare Workers。main に入ると自動デプロイ。説明は `worker/README.md`。URL は `site.json` の `checker_api`(空のあいだ診断ページは noindex・準備中) |
| `content/news-sources.json` `tools/news_watch.py` `.github/workflows/news-watch.yml` | 公式発表の自動ウォッチ。3時間ごとに新着を `content/news-watch.json`(自動生成・手で直さない)にためて `/news/` に原文リンクで出す |
| `content/news-triage.json` `docs/news.md` | 新着をどう扱ったか(記事にした・見送った)の記録と、毎日ニュース記事を書く手順 |
| `assets/` | CSS・OGP画像・ロゴ・診断ツールの画面(`checker.js`) |
| ルートの `*.html` `*/index.html` `sitemap.xml` `feed.xml` `robots.txt` `llms*.txt` | **生成物。直接直さない**(build.py が上書きする) |

`CNAME`・`.nojekyll` は GitHub Pages 用なので消さない。

## 記事のルール(必ず守る)

- **冒頭で答える**:`summary:` に結論を1〜2文。本文の最初の段落でも定義・結論を言い切る(AIに引用されやすい形)。
- **ド素人が読んでもわかる言葉で書く**(2026-11-09 Nori さん「全体的にそうだけど、ド素人が読んでも理解できるようにしてね」):身近なたとえで始め、短い文で書き、専門用語は初めて出たところで説明する。図(`{{figure:…}}`)を1枚以上入れる。正式な用語・仕様・コードは記事後半の `[上級]` 章にまとめる。詳しくは `docs/writing.md`。
- **初心者・中級者・上級者の全員に役立つ形にする**:H2 に `[初級]` `[中級]` `[上級]` のラベルを付け、上級者向けの深掘り(仕様の細部・検証方法・一次資料)を1章以上入れる(2026-11-09 Nori さんの要望。詳しくは `docs/writing.md`)。
- **見出しは問いの形**を基本に、H2 は3〜6個。最後に `## よくある質問` を置き、`### 質問` と答えを書く(FAQPage の構造化データが自動で付く)。
- **一次情報を1つ以上**入れる(実際に試した結果・画面・数値・失敗例)。試していないことを体験談として書かない。
- **数字・仕様には出典リンクと確認日**(例:「2026年11月時点、Google 検索セントラル」)。公式で確かめられないものは書かない。
- 根拠のない実績・「No.1」「業界最安」などは書かない。他社をけなさない。
- 呼び方(AIO・LLMO・GEO・AEO)が揺れている語は、記事の中で定義してから使う。
- 記事を足したら `content/roadmap.json` の関係するステップの `articles` にパスを足す(読者が「次にやること」へ進めるように)。
- 本文の内部リンクを3本以上(同じ柱のピラー記事、用語集、関連記事)。
- AIで下書きしてよいが、事実確認をしてから公開する(Google の「大量生成コンテンツの乱用」に当たる薄い記事を出さない)。

## SEO・AIO

- タイトル28〜40字、メインキーワードを前半に。description 80〜120字。スラッグは英語・小文字・ハイフン区切りで、公開後は変えない。
- 構造化データは build.py が自動で付ける:全ページ BreadcrumbList、記事は Article(著者・公開日・更新日)、FAQ があれば FAQPage、トップは WebSite + Organization。
- AIクローラー(GPTBot・OAI-SearchBot・ClaudeBot・PerplexityBot・Google-Extended など)は **ブロックしない**。robots.txt は build.py が作る。
- llms.txt / llms-full.txt も build.py が記事一覧から作る。
- 記事のない柱のカテゴリページは noindex(薄いページを索引させない)。
- **公開前モード**:`site.json` の `launched` が false の間は全ページ noindex、IndexNow も送らない。Nori さんの「公開して」で true にする。
- GA4:全ページに `G-ZYX17VBTWB`(shiokonbu.com 総合、全サブドメイン共通。消さない)。aio 単体は `G-RXE6WT6C07`(プロパティ「AIO対策ナビ」、2026-11-09 作成)。

## 変更のしかた

1. 記事や設定を直したら `python3 tools/build.py .` → `python3 tools/seo_check.py .` で NG 0 にする。
2. ブランチを作って PR で出す。`main` にマージすると GitHub Pages ですぐ本番に出る。**SEO check が緑なら、AI が Nori さんの確認を待たずにマージ・公開してよい**(2026-11-09 Nori「今後も公開も、マージも私の許可はなくて進めてください」)。マージしたら何を出したかを短く報告する。
3. リポジトリは **公開**。トークン・APIキー・個人のメールアドレスを入れない。
4. 外部への送信や、元に戻せないことは Nori さんの「やって」を待つ。
