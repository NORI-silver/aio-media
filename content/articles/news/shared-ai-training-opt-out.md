---
title: AI学習を一括で断るrobots.txt共通ルール|Google・Bing対応へ
description: Google・Microsoft(Bing)・OpenAIが、robots.txtの「__usage_ai-training」でAI学習の可否を一括で伝える共通ルールへの対応を発表。書き方、各社の時期、AI検索への影響を解説します。
date: 2026-11-09
updated: 2026-11-09
summary: 2026年10月30日、Google・Microsoft・OpenAIが、robots.txt に `User-Agent: __usage_ai-training` と書くだけで「AIの学習に使わないで」を各社にまとめて伝えられる共通ルールへの対応を発表しました。Google は2027年前半の対応予定で、検索や AI Overviews への掲載には影響しません。
---
> **ひとことで言うと**:「うちのサイトの文章を、AIの勉強(学習)に使わないで」というお願いを、1行書くだけで Google・Microsoft・OpenAI などにまとめて伝えられるようになります。始まるのは2027年からです。

**あなたがやること:ほとんどの会社は、何もしなくて大丈夫です。** AIに自社の情報を紹介してほしい会社(多くの中小企業がそうです)は、今のままにしておきましょう。「AIの学習には使われたくない」という会社だけ、この記事の「robots.txtにはどう書く?」を読んでください。

**AIの学習に自分のサイトを使わせたくないとき、これからは robots.txt に1つのグループを書くだけで、主要なAI企業にまとめて意思表示できるようになります。** 2026年10月30日、Google・Microsoft(Bing)・OpenAI が、`__usage_ai-training` という共通の名前(ポリシートークン)への対応を相次いで発表しました。これまでは GPTBot・ClaudeBot・Google-Extended など、会社ごとのクローラー名を1つずつ書く必要がありました。

ただし、**今日すぐに効くわけではありません**。Google は2027年前半、Microsoft は2027年2月1日から対応する予定です。また、これは「AIの学習」についての意思表示で、**Google 検索や AI Overviews への掲載、ChatGPT などのAI検索での引用には影響しない** という点が大事です。AI検索で引用されたいサイト(AIO=AI検索最適化に取り組むサイト)は、検索用のクローラーまで止めないように注意しましょう。

この記事は、各社の公式発表とドキュメント(2026年11月9日に確認)をもとにまとめています。AIクローラーの種類と今の書き方は「[AIクローラーのrobots.txt設定](/aio/ai-crawler-robots-txt/)」で詳しく解説しています。

## 何が発表された? [初級]

一言でいうと、**「AIの学習に使っていいか」を全社共通の書き方で伝えるルール** ができ、大手が対応を約束した、というニュースです。

- **robots.txt(ロボッツ・テキスト)**:サイトに置くテキストファイルで、クローラー(ページを自動で読んで回るプログラム)に「ここは読んでいい・読まないで」とお願いするためのものです。
- **AIの学習**:集めた文章を使って、生成AIのモデルそのもの(中身の数値)を作り変えることです。ユーザーの質問に答えるためにその場でページを読むこと(グラウンディング)とは別物として扱われます。

これまでは、学習を断りたいなら会社ごとに名前を調べて書く必要がありました。

| これまで | これから(各社の対応後) |
|---|---|
| `GPTBot`(OpenAI)、`ClaudeBot`(Anthropic)、`Google-Extended`(Google)…と会社ごとに書く | `__usage_ai-training` の1グループで、対応する全社に伝わる |
| 新しいAI企業が出るたびに追記が必要 | 対応した会社には自動で伝わる |

発表した会社と時期は次のとおりです。

| 会社 | 対応時期 | 出典 |
|---|---|---|
| Google | 2027年前半の予定 | [Google's common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)(2026年10月30日更新) |
| Microsoft(Bing) | 2027年2月1日から(クロールしたページから順に) | [Bing Blog](https://blogs.bing.com/search/2026/10/your-content-your-choice-clearer-preferences-for-training-and-grounding/)(2026年10月30日) |
| OpenAI | 「今後数か月のうちに」実装予定 | OpenAI の発表(海外メディアの報道で確認。OpenAI のページはこの環境から開けず未確認) |

ルールの元になっているのは、IETF(インターネットの技術標準を作る団体)に出された文書「Machine-Readable Training Preference Signal」です。書いたのは Anthropic の Kevin Kelley 氏で、日付は2026年10月30日です([IETF Datatracker](https://datatracker.ietf.org/doc/draft-kelley-aipref-training-preference-signal/))。

## robots.txtにはどう書く? [中級]

### サイト全体をAIの学習に使わせない

```
User-Agent: __usage_ai-training
Disallow: /
```

### 一部だけ学習に使ってよい(例:プレスキットだけ許可)

IETF の文書に載っている例そのものです。`/press-kit/` 以外は「学習に使わないで」、`/press-kit/` は「使ってよい」という意味になります。

```
User-Agent: __usage_ai-training
Disallow: /
Allow: /press-kit/
```

### 書くときの注意点

- **`User-Agent: *` のグループは、この意思表示にならない**:「全員に向けたルール」を書いていても、学習についての意思表示をしたことにはなりません。`__usage_ai-training` のグループを明示的に書く必要があります。
- **何も書かなければ「意思表示なし」**:Bing は「学習はデフォルトで許可」と説明しています。
- **これはクロールの禁止ではない**:`__usage_ai-training` に `Disallow` と書いても、検索エンジンのクローラーがページを読みに来ること自体は止まりません。あくまで「読んだ内容を学習に使うか」の意思表示です。
- **今ある個別の指定はそのまま使える**:GPTBot や Google-Extended などの書き方は引き続き有効です。共通ルールに各社が対応するまでは、個別の指定も残しておくのが安全です。

## AI検索やGoogle検索への影響は? [中級]

**検索結果やAI検索への掲載には影響しません。** ここを誤解して検索用のクローラーまで止めると、AIOの面では逆効果になります。

- **Google 検索・AI Overviews・AI モード**:Google は「Google-Extended は Google 検索への掲載に影響せず、ランキングの要因にもならない」としています([Google's common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers))。AI Overviews や AI モードに出るかどうかは、通常の検索と同じ Googlebot のルールで決まります。詳しくは「[AI Overviewsとは?](/aio/ai-overviews/)」を参照してください。
- **Bing 検索**:Microsoft も「通常の Bing 検索に出るかどうかは変わらない」と明記しています。
- **Gemini の回答の根拠(グラウンディング)**:ここは注意が必要です。次の章で説明します。

AI検索で引用されたい場合は、学習の可否とは別に、OAI-SearchBot・Claude-SearchBot・PerplexityBot などの **検索用クローラーを許可しておく** のが基本です。

## Google-Extendedとの関係は? [上級]

Google の発表(Search Central ブログ「Supporting a shared AI training control for websites」、John Mueller 氏)では、**`__usage_ai-training` で学習を断り、Google-Extended について何も書いていないサイトは、Google-Extended を Disallow したのと同じに扱う** 方針が示されています(この部分は記事本文がこの環境で開けなかったため、[Search Engine Roundtable](https://seroundtable.com/google-ai-training-control-42430.html) などが引用した発表の文言で確認しています)。

ここで見落としやすいのが、**Google-Extended は「学習」と「グラウンディング」の両方をまとめて決めるスイッチ** だという点です。Google のドキュメントでは、Google-Extended は次の2つに使われると書かれています([Google's common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)、2026年10月30日更新)。

1. Gemini アプリと Vertex AI の Gemini の、今後のモデルの学習
2. Gemini アプリと Vertex AI の「Grounding with Google Search」での、回答の根拠(グラウンディング)

つまり、`__usage_ai-training` で学習を断るだけだと、**Gemini アプリの回答で根拠として表示される機会まで失う** 可能性があります。学習は断りつつ Gemini での露出は残したい場合は、Google-Extended を明示的に許可するグループを書きます。明示した Google-Extended のルールのほうが優先されます。

```
# 学習は全社にまとめて断る
User-Agent: __usage_ai-training
Disallow: /

# Google の Gemini での回答の根拠には使ってよい(学習も含めて許可になる点に注意)
User-Agent: Google-Extended
Allow: /
```

ただし、Google には「学習だけ断ってグラウンディングは許可」を分ける別の名前がまだありません。Google-Extended を許可すると、Google に対しては学習も許可したことになります。**「学習を断る」と「Gemini での露出」のどちらを優先するか、サイトごとに決める必要がある** ということです。

## BingのAI Grounding設定とは? [上級]

Microsoft は同じ日に、学習(AI Training)とは別に **AI Grounding(Copilot などでの回答の根拠に使うか)** の設定も発表しました([Bing Blog](https://blogs.bing.com/search/2026/10/your-content-your-choice-clearer-preferences-for-training-and-grounding/)、2026年10月30日)。

| 設定 | 書く場所 | 書き方の例 |
|---|---|---|
| 学習(サイト・フォルダ単位) | robots.txt | `User-Agent: __usage_ai-training` + `Disallow: /` |
| 学習(ページ単位) | meta タグ / HTTP ヘッダー | `<meta name="Bingbot" content="ai-training:disallow">` / `X-Robots-Tag: Bingbot: ai-training:disallow` |
| グラウンディング(ページ単位のみ) | meta タグ / HTTP ヘッダー | `<meta name="Bingbot" content="ai-grounding:disallow">` |

グラウンディングの値は3つです。

- **Allow**(デフォルト):すべてのAI体験で根拠に使ってよい。
- **DisallowExtended**:Microsoft 自身のサービス(Copilot、Bing の AI 機能、Microsoft 365)では使ってよいが、外部向けのグラウンディングサービスには使わせない。
- **Disallow**:AI の回答の根拠に使わない。Microsoft は「AI体験での見え方が大きく下がる」としています。

### 日程(Bing)

| 日付 | 内容 |
|---|---|
| 2026年12月15日 | Bing Webmaster Tools で一時的なグラウンディング設定の受付開始(この日に NoArchive / NoCache を使っているサイトが対象) |
| 2027年2月1日 | 新しい学習・グラウンディングの設定が、クロールしたページから順に有効に |
| 2027年3月1日 | NoArchive / NoCache が学習・グラウンディングの意思表示として扱われなくなる。新しい設定はこの日までに |
| 2027年9月30日 | 一時的なグラウンディング設定の期限 |

**今 `noarchive` や `nocache` で Bing の AI 利用を止めているサイトは、2027年3月1日までに書き換えが必要** です。AIOに取り組むサイトは、ふつうはグラウンディングを止める必要はありません(止めると Copilot などで引用されにくくなります)。

### 一次資料の読みどころ

- IETF の文書は **個人提出の Internet-Draft** で、IETF として承認されたものではなく、2027年5月3日が期限です。今後、中身が変わる可能性があります([IETF Datatracker](https://datatracker.ietf.org/doc/draft-kelley-aipref-training-preference-signal/))。
- 「学習」の定義は、IETF の AIPREF ワーキンググループの用語定義から来ています。「生成AIモデルの学習済みパラメータを変更するためにコンテンツを使うこと」で、生成AIではないモデルだけに使う場合は含まれません。
- パスの照合は robots.txt の標準(RFC 9309)と同じで、より長く一致したルールが優先されます。

## 私たちのサイトはどうする? [初級]

当サイト(AIO対策ナビ)は、AI検索で引用されることを目指しているので、**学習・検索ともにAIクローラーをブロックしない** 方針のまま変えません。`__usage_ai-training` のグループは書かず、「意思表示なし(=許可)」にしています。

あなたのサイトで判断するときの目安は次のとおりです。

| サイトの方針 | おすすめの設定 |
|---|---|
| AI検索で紹介・引用されたい(多くの企業サイト) | 何も書かない。検索用クローラーも許可したまま |
| 学習には使われたくないが、AI検索には出たい | `__usage_ai-training` で Disallow。検索用クローラーは許可したまま。Gemini での露出を残すなら Google-Extended を明示的に Allow |
| 有料記事など、AIに一切使われたくない | 学習の Disallow に加えて、各社の検索用クローラーも個別に検討。ただしAI検索での露出はなくなる |

自分のサイトの robots.txt が今どうなっているかは、[AIO診断ツール](/aio-checker/) で URL を入れるだけで確認できます。

## よくある質問

### __usage_ai-trainingを書けば、今日からAIの学習を止められる?

まだです。Google は2027年前半、Microsoft は2027年2月1日から、OpenAI は「今後数か月のうちに」対応する予定です(2026年11月9日時点)。それまでは GPTBot や Google-Extended など、会社ごとの指定も残しておきましょう。

### __usage_ai-trainingでDisallowすると、Google検索やAI Overviewsから消える?

消えません。Google は Google-Extended が検索への掲載やランキングに影響しないとしており、AI Overviews や AI モードは通常の検索と同じ Googlebot のルールで決まります。Bing も通常の検索結果は変わらないと説明しています。

### User-Agent: * で Disallow していれば、学習も断ったことになる?

なりません。IETF の文書では、`User-Agent: *` のグループはこの意思表示として扱わないと決められています。学習を断りたい場合は `User-Agent: __usage_ai-training` のグループを明示的に書きます。

### AnthropicのClaudeも対応する?

ルールの文書を書いたのは Anthropic の社員で、海外メディアの報道では Anthropic は「すでに対応を始めている」とされています。ただし、Anthropic の公式ページでの対応時期は確認できていないため、確認でき次第この記事を更新します。
