---
title: AIクローラーのrobots.txt設定|GPTBotなどの許可とブロック方法
description: GPTBot・OAI-SearchBot・ClaudeBot・PerplexityBotなどAIのボットの役割と、robots.txtで許可・おことわりする書き方を、入口の張り紙のたとえと図でやさしく解説します。
date: 2026-11-09
updated: 2026-11-09
summary: AIのボット(クローラー)は「AIの勉強用」「AI検索の準備用」「人に頼まれてその場で読みに来るもの」の3種類に分かれます。AI検索で紹介されたいなら、少なくとも検索用のボット(OAI-SearchBot・Claude-SearchBot・PerplexityBot)はおことわりしないのが基本です。
---
robots.txt(ロボッツ・テキスト)は、**サイトの入口に貼る「張り紙」** のようなファイルです。ページを自動で読みに来るプログラム(ボット)に向けて、「このボットは入ってOK」「このボットは入らないで」とお願いを書けます。

AI のボットは、**「AI の勉強(学習)のために読むもの」と「AI 検索で紹介するために読むもの」で名前が分かれています**。だから、「AI の勉強には使われたくないけれど、AI 検索では紹介されたい」という設定もできます。

この記事では、主な AI のボットの役割と、robots.txt の書き方を、各社の公式の説明(2026年11月9日に確認)をもとに、図を使って説明します。

## robots.txtってなに? [初級]

{{figure:robots-door|図1 robots.txtは、ボットごとに「どうぞ」「おことわり」を書ける入口の張り紙}}

まず、言葉を2つ覚えておきましょう。

- **ボット(クローラー)**:ネット上のページを、自動で次々に読んで回るプログラムです。Google 検索のための「Googlebot(グーグルボット)」が有名です。
- **robots.txt**:サイトのいちばん上の場所に置く、ただの文字だけのファイルです。ボットに「ここは読んでいい」「読まないで」とお願いします。

大事なのは、robots.txt は **「お願い」であって「カギ」ではない** ことです。ちゃんとした会社のボットはお願いを守りますが、見られて困るページは、パスワードなどで守る必要があります。

## AIのボットにはどんな種類がある? [初級]

{{figure:crawler-3types|図2 AIのボットは、目的によって3種類に分かれる}}

AI のボットは、目的で3つに分けるとわかりやすくなります。

1. **覚えるために集める(学習用)**:AI を作るときの勉強の材料として、ページを集めます。
2. **検索の準備をする(検索用)**:AI の検索で紹介するページを、前もって集めておきます。
3. **頼まれてその場で読む**:人が AI に質問したときや、「このページを要約して」と頼んだときに、そのページを読みに来ます。

| 会社 | ① 学習用 | ② 検索用 | ③ 頼まれてその場で |
|---|---|---|---|
| OpenAI(ChatGPT) | GPTBot | OAI-SearchBot | ChatGPT-User |
| Anthropic(Claude) | ClaudeBot | Claude-SearchBot | Claude-User |
| Perplexity | (なし) | PerplexityBot | Perplexity-User |
| Google(Gemini など) | Google-Extended(※) | Googlebot(ふつうの検索と同じ) | — |

※ Google-Extended は、実際に見に来るボットではなく、robots.txt に書くための「名前」です。くわしくは後で説明します。

出典:[OpenAI「Overview of OpenAI Crawlers」](https://developers.openai.com/api/docs/bots)、[Anthropic ヘルプセンター](https://support.claude.com/en/articles/8896518)、[Perplexity「Perplexity Crawlers」](https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md)、[Google「Google's common crawlers」](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)(いずれも2026年11月9日に確認)。

## 結局、AIのボットは入れていい? [初級]

AI 検索から問い合わせや知名度を得たいなら、**少なくとも②の検索用(OAI-SearchBot・Claude-SearchBot・PerplexityBot)は「どうぞ」にする** のがおすすめです。ここを止めると、ChatGPT・Claude・Perplexity の検索で紹介される入口がなくなります。

①の学習用(GPTBot・ClaudeBot・Google-Extended)を入れるかどうかは、会社の考え方しだいです。有料の記事や独自のデータを売っている会社なら、おことわりする判断もありえます。多くの中小企業のサイトのように「知ってもらうこと」が目的なら、止める理由は大きくありません。

ボットを入れるのは、AI に紹介されるための入口にすぎません。読まれたあとに紹介されるかは、最初に答えを書いているか、自分だけの情報があるか、といった中身で決まります(「[AIO・LLMO・GEO・AEOの違い](/aio/aio-llmo-geo-aeo-difference/)」の「今日から何をすればいい?」)。

## 各社のボットはそれぞれ何をする? [中級]

### OpenAI(ChatGPT)

- **GPTBot**:AI の学習に使うかもしれないページを集めます。おことわりすると「このサイトの内容を学習に使わないで」という意思表示になります。
- **OAI-SearchBot**:ChatGPT の検索にサイトを出すためのボットです。OpenAI は「OAI-SearchBot をおことわりしたサイトは、ChatGPT の検索の答えに出ない」と説明しています。robots.txt を変えてから反映まで **約24時間** かかるとされています。
- **ChatGPT-User**:人が ChatGPT に質問したときなどに、その場でページを読みに来ます。人の操作がきっかけなので、OpenAI は「robots.txt のルールが当てはまらないことがある」としています。

### Anthropic(Claude)

- **ClaudeBot**:AI の学習用のデータを集めます。おことわりすると、これからの内容を学習データから外すという意思表示になります。Anthropic は、読みに来る間かくを指定する `Crawl-delay` にも対応しています(標準のルールではありません)。
- **Claude-SearchBot**:検索の質を上げるためにサイトを読みます。おことわりすると、検索用の登録に入らず、Claude の検索で見えにくくなる可能性があると説明されています。
- **Claude-User**:人の質問に答えるためにページを読みに来ます。おことわりすると、人の質問に応じてページを読めなくなります。

### Perplexity

- **PerplexityBot**:Perplexity の検索結果にサイトを出してリンクするためのボットです。学習用ではないとされ、Perplexity は「どうぞ」にすることをすすめています。
- **Perplexity-User**:人の質問に答えるためにページを読みに来ます。Perplexity は「ふつうは robots.txt を無視する」と書いています。

### Google-Extendedを止めるとAI Overviewsから消える?

消えません。よくある誤解です。

Google-Extended は、Google が集めた内容を **Gemini の今後の学習や、Gemini アプリなどの答えに使うか** を決めるための名前です。Google は「Google-Extended は Google 検索への掲載に影響せず、順位にも関係しない」と書いています([Google's common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)、2026年10月30日更新)。

Google 検索の [AI Overviews(AIによる概要)](/aio/ai-overviews/) や AIモードに出るかどうかは、ふつうの検索と同じ **Googlebot** と、`nosnippet`(説明文を出さない設定)などで決まります([AI features and your website](https://developers.google.com/search/docs/appearance/ai-features))。

## robots.txtはどう書く? [中級]

robots.txt は、サイトのいちばん上(`https://example.com/robots.txt`)に置きます。`blog.example.com` のようなサブドメインには、それぞれべつのファイルが必要です。

書き方の決まりはかんたんです。

- `User-agent:` のあとに、ボットの名前を書く(`*` は「すべてのボット」)
- `Allow:` は「どうぞ」、`Disallow:` は「おことわり」。そのあとに場所(`/` はサイト全体)を書く

### すべて「どうぞ」にする(このサイトの設定)

このサイト(AIO対策ナビ)は AI 検索で紹介されることを目指しているので、学習用もふくめてすべて「どうぞ」にしています。実際の [robots.txt](/robots.txt) はこうです(一部省略)。

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

本当は、`User-agent: *` で全部を「どうぞ」にしていれば、名前を1つずつ書く必要はありません。それでも並べているのは、人が見ても「AI のボットを入れている」とわかるようにするためと、うっかり `*` の設定を変えたときの保険です。

### 学習用だけおことわりして、AI検索には出る

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

OAI-SearchBot・Claude-SearchBot・PerplexityBot は `*` のルールに従うので、「どうぞ」のままです。なお OpenAI は「GPTBot と OAI-SearchBot の両方を入れている場合、片方が集めた内容を両方の目的に使うことがある」としています。学習用を止めた場合は、この使い回しはされません。

### 一部の場所だけおことわりする

```
User-agent: GPTBot
Disallow: /members/
```

会員ページなど、決まった場所だけ止めることもできます。

## 設定するときに気をつけることは? [中級]

### 名前を書いたボットは「*」のルールを読まなくなる

robots.txt では、ボットは **自分の名前が書かれた部分だけ** に従い、`User-agent: *` の部分は読まなくなります(Google の [robots.txt の仕様](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt) も同じ考え方です)。

たとえば `*` で `/admin/` をおことわりしていても、`User-agent: GPTBot` の部分を別に作って `Allow: /` だけ書くと、GPTBot には `/admin/` のおことわりが効きません。名前ごとの部分を作るときは、止めたい場所をそこにも書き直してください。

### おことわりしても、すでに集められたものは消えない

学習用ボットのおことわりは「これから」のデータについての意思表示です。前に集められたデータが消えるわけではありません。

### 「頼まれてその場で読むボット」は止められないことがある

ChatGPT-User と Perplexity-User は、robots.txt が当てはまらないことがあると各社が書いています。

### サーバーの守りの設定でも止まっていないか確かめる

robots.txt で「どうぞ」にしていても、CDN(サイトを速く配るためのサービス)や WAF(サイトを守るファイアウォール)のボット対策で、AI のボットがまとめて止められていることがあります。AI 検索で紹介されないときは、こちらの設定も確かめてください。

## ルールの優先順位と本物の見分け方は? [上級]

### 同じグループの中では「長いパス」が勝つ

Google の [robots.txt の仕様](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt) では、1つの URL に複数のルールが当てはまるとき、**パスが長い(より具体的な)ルール** が使われます。長さが同じで Allow と Disallow がぶつかったときは、**制限の弱いほう(Allow)** が使われます。

```
User-agent: GPTBot
Disallow: /blog/
Allow: /blog/public/
```

この場合、`/blog/public/a.html` は `Allow: /blog/public/` のほうが長いので読まれ、`/blog/b.html` は読まれません。OpenAI など他社が細かい解釈まで同じとは限らないので、複雑な書き方は避け、できるだけ単純に保つのが安全です。

### 大文字・小文字の扱い

Google の仕様では、`User-agent` の値(ボット名)は大文字・小文字を区別しません。一方、`Disallow: /Admin/` のような **パスは区別します**。

### 名乗っているボットが本物か確かめる

User-Agent(アクセスしてきたプログラムの名乗り)はだれでも偽れます。アクセスログで「GPTBot」を名乗るアクセスを見つけても、本物とは限りません。

- **OpenAI**:ボットごとの IP アドレスの一覧を公開しています(`openai.com/gptbot.json`、`openai.com/searchbot.json`、`openai.com/chatgpt-user.json`)。ログの IP がこの範囲に入っているかで確かめられます。
- **Anthropic**:IP アドレスでのブロックは「正しく働かない、または確実なオプトアウトにならない可能性がある」として、robots.txt での指定をすすめています。
- **Google**:Googlebot が本物かどうかは、IP アドレスの逆引き(DNS)で確かめる方法を Google が案内しています。Google-Extended は独自のボットではないため、ログに「Google-Extended」という名前のアクセスは現れません。

### サーバーの負荷が気になるときは

AI のボットのアクセスが多くてサーバーが重い場合、すぐに全部おことわりするより、まず負荷の原因になっているボットを特定します。Anthropic(ClaudeBot)は `Crawl-delay` に対応していますが、これは標準の仕様ではなく、Google は `Crawl-delay` を使いません。AI と人のアクセスの見分け方は「[AIのアクセスと人のアクセスの違い](/aio/ai-vs-human-access/)」で説明しています。

## よくある質問

### GPTBotをおことわりするとChatGPTの検索に出なくなる?

OpenAI の説明では、ChatGPT の検索に出るかどうかは OAI-SearchBot で決まります。GPTBot は学習用なので、GPTBot だけおことわりしても、OAI-SearchBot を「どうぞ」にしていれば ChatGPT の検索に出る可能性は残ります。

### robots.txtを変えたらいつ反映される?

OpenAI(OAI-SearchBot)と Perplexity は、反映まで約24時間かかるとしています。Google は robots.txt を「ふつうは最大24時間おぼえておく(キャッシュする)」と説明しています。すぐに変わらなくても、あわてずに待ちましょう。

### AIのボットが本当に来ているか確かめる方法は?

サーバーのアクセスログ(だれがいつ来たかの記録)で、GPTBot・ClaudeBot・PerplexityBot などの名前をさがします。くわしくは「[AIのアクセスと人のアクセスの違い](/aio/ai-vs-human-access/)」をご覧ください。

### Bingのボットをおことわりしても大丈夫?

おすすめしません。Microsoft の Copilot など、Bing の検索結果を土台にしている AI サービスがあるためです。このサイトでは Bing のボットも「どうぞ」にし、IndexNow というしくみで更新を Bing に知らせています。

### llms.txtやサイトマップとは何がちがう?

robots.txt は「入っていい場所」のお願い、サイトマップは「全ページの一覧表」、llms.txt は「AI 向けのおすすめ案内板」です。くわしくは「[llms.txtとは?](/glossary/llms-txt/)」をご覧ください。
