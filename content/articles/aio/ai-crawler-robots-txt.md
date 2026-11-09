---
title: AIクローラーのrobots.txt設定|GPTBotなどの許可とブロック方法
description: GPTBot・OAI-SearchBot・ClaudeBot・PerplexityBot・Google-Extendedなど主なAIクローラーの役割と、robots.txtで許可・ブロックする書き方を公式情報をもとに整理します。
date: 2026-11-09
updated: 2026-11-09
summary: AIクローラーは「AIの学習用」「AI検索の索引用」「ユーザーの質問に応じて読みに来るもの」の3種類に分かれます。AI検索で引用されたいなら、少なくとも検索用のクローラー(OAI-SearchBot・Claude-SearchBot・PerplexityBot)はブロックしないのが基本です。
---
AIクローラーへの対応は、**「AIの学習に使わせるか」と「AI検索に出るか」を分けて考える**のがポイントです。OpenAI・Anthropic・Perplexity・Google はどれも用途ごとにクローラー(ボット)の名前を分けていて、robots.txt でそれぞれ別々に許可・ブロックできます。学習用だけを止めて、AI検索には出る、という設定もできます。

この記事では、主なAIクローラーの役割と robots.txt の書き方を、各社の公式ドキュメント(2026年11月時点で確認)をもとに整理します。AIO(AI検索最適化)という言葉の意味は「[AIO・LLMO・GEO・AEOの違い](/aio/aio-llmo-geo-aeo-difference/)」で解説しています。

## AIクローラーにはどんな種類がある?

主なAIクローラーは、目的で3つに分けると整理しやすくなります。

| 会社 | 学習用 | AI検索の索引用 | ユーザーの質問に応じて読みに来る |
|---|---|---|---|
| OpenAI(ChatGPT) | GPTBot | OAI-SearchBot | ChatGPT-User |
| Anthropic(Claude) | ClaudeBot | Claude-SearchBot | Claude-User |
| Perplexity | (なし) | PerplexityBot | Perplexity-User |
| Google(Gemini など) | Google-Extended(※) | Googlebot(通常の検索と同じ) | — |

※ Google-Extended は実際に巡回するクローラーではなく、robots.txt に書くための「名前(トークン)」です。詳しくは後半で説明します。

出典:[OpenAI「Overview of OpenAI Crawlers」](https://developers.openai.com/api/docs/bots)、[Anthropic ヘルプセンター](https://support.claude.com/en/articles/8896518)、[Perplexity「Perplexity Crawlers」](https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md)、[Google「Google's common crawlers」](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)(いずれも2026年11月9日に確認)。

## 各社のクローラーはそれぞれ何をする?

### OpenAI(ChatGPT)

- **GPTBot**:AIモデルの学習に使われる可能性のあるコンテンツを集めます。ブロックすると「このサイトの内容を学習に使わないでほしい」という意思表示になります。
- **OAI-SearchBot**:ChatGPT の検索機能にサイトを表示するためのクローラーです。OpenAI は「OAI-SearchBot をブロックしたサイトは ChatGPT の検索の回答に表示されない」と説明しています。robots.txt を変えてから反映までは **約24時間** かかるとされています。
- **ChatGPT-User**:ユーザーが ChatGPT に質問したときなどに、その場でページを読みに来ます。ユーザーの操作がきっかけなので、OpenAI は「robots.txt のルールが適用されない場合がある」としています。

### Anthropic(Claude)

- **ClaudeBot**:AIモデルの学習用のデータを集めます。ブロックすると、今後のサイトの内容を学習データから外すという意思表示になります。Anthropic は非標準の `Crawl-delay`(巡回の間隔指定)にも対応しています。
- **Claude-SearchBot**:検索結果の質を上げるためにサイトを読みます。ブロックすると、検索用の索引に入らず、Claude の検索結果での見え方が下がる可能性があると説明されています。
- **Claude-User**:ユーザーの質問に答えるためにページを読みに来ます。ブロックすると、ユーザーの質問に応じてサイトの内容を取得できなくなります。

### Perplexity

- **PerplexityBot**:Perplexity の検索結果にサイトを表示・リンクするためのクローラーです。AIモデルの学習用ではないとされ、Perplexity は許可することを推奨しています。
- **Perplexity-User**:ユーザーの質問に答えるためにページを読みに来ます。Perplexity は「通常は robots.txt を無視する」と明記しています。反映には最大24時間かかるとされています。

## Google-ExtendedをブロックするとAI Overviewsから消える?

消えません。ここはよく誤解されるところです。

Google-Extended は、Google がクロールした内容を **Gemini の今後のモデルの学習と、Gemini アプリ・Vertex AI での回答の根拠(グラウンディング)に使うか** を決めるための robots.txt 上の名前です。Google は「Google-Extended は Google 検索への掲載に影響せず、ランキングの要因にもならない」と書いています([Google's common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)、2026年10月30日更新)。

Google 検索の [AI Overviews(AIによる概要)](/aio/ai-overviews/) や AI モードに出るかどうかは、通常の検索と同じ **Googlebot** と、`nosnippet` などのスニペット制御で決まります([AI features and your website](https://developers.google.com/search/docs/appearance/ai-features))。AI Overviews に出たくない場合に Google-Extended を止めても効果はない、ということです。

## robots.txtはどう書く?

robots.txt はサイトの一番上(`https://example.com/robots.txt`)に置くテキストファイルです。サブドメインごとに別のファイルが必要です。

### すべて許可する(このサイトの設定)

このサイト(AIO対策ナビ)は、AI検索に引用されることを目指しているので、学習用も含めてすべて許可しています。実際の [robots.txt](/robots.txt) は次のとおりです(一部省略)。

```
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://aio.shiokonbu.com/sitemap.xml
```

本来、`User-agent: *` で全体を許可していれば個別に書く必要はありません。それでも名前を並べているのは、「AIクローラーを許可している」ことを人が見てもわかるようにするためと、うっかり `*` の設定を変えたときの保険です。

### 学習用だけ止めて、AI検索には出る

「学習には使われたくないが、AI検索では紹介されたい」場合の例です。

```
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: *
Allow: /
```

OAI-SearchBot・Claude-SearchBot・PerplexityBot は `*` のルールに従うので、許可されたままになります。ただし OpenAI は「GPTBot と OAI-SearchBot の両方を許可している場合、片方のクロール結果を両方の目的に使うことがある」としています。学習用を止めた場合はこの共有はされません。

### 一部のフォルダだけ止める

```
User-agent: GPTBot
Disallow: /members/
```

会員ページや社内向けの資料など、特定の場所だけ止めることもできます。ただし robots.txt は「お願い」であって鍵ではありません。見られて困るページは、ログインやパスワードで守ってください。

## 設定するときの注意点は?

### 個別に書いたクローラーは「*」のルールを読まない

robots.txt では、クローラーは **自分の名前が書かれたグループだけ** に従い、`User-agent: *` のグループは読まなくなります(Google の [robots.txt の仕様](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt) も同じ考え方です)。

たとえば `*` で `/admin/` を止めていても、`User-agent: GPTBot` のグループを別に作って `Allow: /` だけ書くと、GPTBot には `/admin/` の禁止が効きません。個別のグループを作るときは、止めたい場所をそのグループにも書き直してください。

### ブロックしても、すでに学習・索引されたものは消えない

学習用クローラーのブロックは「今後のデータ」についての意思表示です。過去に集められたデータが消えるわけではありません。

### 「ユーザーの質問で読みに来るボット」は止められないことがある

ChatGPT-User と Perplexity-User は、robots.txt が適用されない場合があると各社が明記しています。ユーザーが URL を貼って「このページを要約して」と頼んだときなどに読みに来ます。

### CDNやセキュリティ設定でブロックされていないか確認する

robots.txt で許可していても、CDN(コンテンツ配信サービス)や WAF(ファイアウォール)のボット対策機能で、AIクローラーがまとめて止められていることがあります。AI検索に出たいのに引用されない場合は、robots.txt だけでなくこちらの設定も確認してください。

## 結局、AIクローラーは許可すべき?

AI検索から問い合わせや認知を得たいサイトなら、**少なくとも検索用(OAI-SearchBot・Claude-SearchBot・PerplexityBot)は許可する** のがおすすめです。ここを止めると、ChatGPT や Claude、Perplexity の検索で引用される入口がなくなります。

学習用(GPTBot・ClaudeBot・Google-Extended)を許可するかは、会社の方針次第です。有料記事や独自のデータを売っている会社は止める判断もありえます。一方、多くの中小企業のサイトのように「知ってもらうこと」が目的なら、止める理由は大きくありません。

AIクローラーの許可は AIO の入り口にすぎません。読まれたあとに引用されるかどうかは、冒頭で結論を言い切っているか、一次情報があるかなど中身で決まります。AIエージェント向けのファイル「[llms.txt](/glossary/llms-txt/)」や、ページの意味をAIと検索エンジンに伝える「[構造化データ](/seo/structured-data/)」もあわせて確認してください。

## よくある質問

### GPTBotをブロックするとChatGPTの検索に出なくなる?

OpenAI の説明では、ChatGPT の検索に表示されるかどうかは OAI-SearchBot で決まります。GPTBot は学習用なので、GPTBot だけをブロックしても、OAI-SearchBot を許可していれば ChatGPT の検索に出る可能性は残ります。

### robots.txtを変えたらいつ反映される?

OpenAI(OAI-SearchBot)と Perplexity は、反映まで約24時間かかるとしています。Google は robots.txt を「通常、最大24時間キャッシュする」と説明しています。すぐに変わらなくても慌てずに待ちましょう。

### AIクローラーが本当に来ているか確かめる方法は?

サーバーのアクセスログで、User-Agent に GPTBot・ClaudeBot・PerplexityBot などの名前が含まれるアクセスを探します。OpenAI などは自社クローラーの IP アドレスの一覧も公開しているので、名前を偽ったアクセスと見分けたいときに使えます。

### Bingをブロックしても大丈夫?

おすすめしません。Microsoft の Copilot など、Bing の検索結果を土台にしているAIサービスがあるためです。このサイトでは Bingbot も許可し、IndexNow で更新を Bing に知らせています。
