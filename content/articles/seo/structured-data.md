---
title: 構造化データとは?JSON-LDの書き方とAI検索時代の役割
description: 構造化データは、ページの内容を検索エンジンに機械が読める形で伝える仕組みです。JSON-LDの書き方の実例、確認ツール、FAQリッチリザルト終了など最新の変更、AI検索での役割を解説します。
date: 2026-11-09
updated: 2026-11-09
summary: 構造化データは、ページに何が書いてあるか(記事・商品・会社情報など)を、決まった形式で検索エンジンに伝えるためのコードです。Google は JSON-LD 形式を推奨しています。リッチリザルトの表示につながることがありますが、AI検索に出るための特別な構造化データはありません。
---
構造化データとは、**「このページは記事で、著者は誰で、いつ公開されたか」といった情報を、検索エンジンが機械的に読める決まった形式で書いたコード** のことです。Google は、構造化データをページの理解に使い、条件を満たすと検索結果に評価の星やパンくずなどを表示する「リッチリザルト」に使います。

一方で、Google は [AI Overviews(AIによる概要)](/aio/ai-overviews/) などの生成AI機能に出るための特別な構造化データはないとしています。この記事では、構造化データの基本と書き方を、このサイトで実際に使っているコードを例に解説します。

## 構造化データは何のために使う?

Google 検索セントラルの「[構造化データの仕組みについて](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)」(2025年12月10日更新)では、目的を次のように説明しています。

- ページの内容を Google が理解する手がかりにする
- 条件を満たすと、検索結果を目立たせる **リッチリザルト** の対象になる

ただし、構造化データを入れても **リッチリザルトが表示される保証はありません**。また、構造化データそのものが検索順位を直接上げるわけでもありません。

## どの形式で書けばいい?

Google が対応している形式は次の3つで、**JSON-LD が推奨** されています。

| 形式 | 書き方 | 特徴 |
|---|---|---|
| **JSON-LD**(推奨) | `<script type="application/ld+json">` の中に書く | 本文のHTMLと分けて書けるので、管理しやすい |
| microdata | HTMLタグの属性に書き込む | 本文と一体になるので、修正が面倒になりやすい |
| RDFa | HTMLタグの属性に書き込む | 同上 |

Google は、どの形式でも正しく書かれていれば問題ないとしたうえで、大規模でも実装・管理しやすい JSON-LD をすすめています。

## JSON-LDはどう書く?(このサイトの実例)

このサイト(AIO対策ナビ)では、記事を書くと構造化データが自動で付くようにしています。実際に「[AIO・LLMO・GEO・AEOの違い](/aio/aio-llmo-geo-aeo-difference/)」の記事に入っている Article(記事)の構造化データは次のとおりです(読みやすく改行しています)。

```
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "AIO・LLMO・GEO・AEOの違いとは?呼び方別の意味とやるべき対策",
  "datePublished": "2026-11-09",
  "dateModified": "2026-11-09",
  "mainEntityOfPage": "https://aio.shiokonbu.com/aio/aio-llmo-geo-aeo-difference/",
  "inLanguage": "ja",
  "author": {
    "@type": "Organization",
    "name": "AIO対策ナビ編集部",
    "url": "https://aio.shiokonbu.com/about/"
  },
  "image": "https://aio.shiokonbu.com/assets/og.png"
}
</script>
```

ポイントは次のとおりです。

- `@context` は schema.org(構造化データの語彙を決めている共同プロジェクト)を指定します。
- `@type` で「何のページか」を宣言します。記事なら `Article`、パンくずなら `BreadcrumbList` です。
- `headline`(見出し)、`datePublished`(公開日)、`dateModified`(更新日)、`author`(著者)は、**ページに表示されている内容と同じ** にします。

このサイトでは、全ページに `BreadcrumbList`、記事に `Article`、トップページに `WebSite` と `Organization` を自動で付けています。

## よく使う構造化データの種類は?

中小企業のサイトでよく使うのは次のような種類です。

| 種類 | 使う場面 |
|---|---|
| Article | ブログ・コラム・ニュース記事 |
| BreadcrumbList | パンくずリスト(ほぼ全ページ) |
| Organization | 会社情報(ロゴ・連絡先など) |
| LocalBusiness | 店舗・事務所の住所や営業時間 |
| Product | 商品ページ(価格・在庫・レビュー) |

### FAQのリッチリザルトは2026年5月に終了

以前は、「よくある質問」を FAQPage の構造化データで書くと、検索結果に質問と答えが開く形で表示されることがありました。しかし Google は **2026年5月7日から FAQ のリッチリザルトを Google 検索に表示しない** と発表し、6月には説明ページも削除しました([Google 検索セントラルの変更履歴](https://developers.google.com/search/updates))。

このサイトでは記事の「よくある質問」に FAQPage の構造化データを自動で付けていますが、リッチリザルトのためではなく、質問と答えの組をページの内容どおりに機械が読める形で示すためです。FAQPage は schema.org の語彙としては今も有効です。新しく構造化データを入れる場合は、FAQ のためだけに手間をかける必要はありません。

## 書いたあとはどう確認する?

Google は次の2つの方法をすすめています。

1. **リッチリザルト テスト**(Google 提供):公開前・公開直後に、URL やコードを入れて、Google が読めるか・リッチリザルトの対象になるかを確かめます。
2. **Search Console のリッチリザルトのレポート**:公開後に、サイト全体でエラーが出ていないかを継続的に見ます。

schema.org の書き方として正しいかを広く確かめたいときは、schema.org が提供する「Schema Markup Validator」も使えます。

## 構造化データで気をつけることは?

Google のガイドラインで特に大事なのは次の3点です。

- **見えていない内容を書かない**:ページに表示されていない情報を構造化データだけに書くのは、内容が正しくても違反になります。
- **構造化データのためだけのページを作らない**:中身のないページに構造化データだけ入れても意味がありません。
- **数より正確さ**:Google は、不完全・不正確なプロパティをたくさん入れるより、正確なものを少なく入れるほうを推奨しています。

ガイドラインに反すると、リッチリザルトの対象外になることがあります。

## AI検索に構造化データは必要?

Google の生成AI検索のガイド「[Optimizing your website for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)」(2026年7月10日更新)は、**生成AI検索に構造化データは必須ではなく、追加すべき特別な schema.org のマークアップもない** と明記しています。同時に、リッチリザルトのために構造化データを使い続けるのはよい考えだ、とも書いています。

つまり、AI検索のために特別なことをする必要はなく、**通常の SEO として正しい構造化データを入れておけば十分** です。AI検索への対策の全体像は「[AIO・LLMO・GEO・AEOの違い](/aio/aio-llmo-geo-aeo-difference/)」、AIクローラーの設定は「[robots.txtの設定](/aio/ai-crawler-robots-txt/)」をご覧ください。

## よくある質問

### 構造化データを入れると検索順位は上がる?

構造化データ自体が順位を直接上げるとは、Google は説明していません。ページの理解を助け、リッチリザルトの対象になることで、検索結果での見え方やクリック率が変わる可能性がある、というのが正確な理解です。

### WordPressで構造化データを入れるには?

多くの WordPress テーマや SEO プラグインは、Article や BreadcrumbList の構造化データを自動で出力します。まず自社サイトの URL をリッチリザルト テストに入れて、すでに何が出力されているかを確かめてから追加するのがおすすめです。重複して出力されていることもよくあります。

### JSON-LDはheadとbodyのどちらに書く?

どちらでも構いません。Google は、JSON-LD の `<script>` タグを `<head>` にも `<body>` にも置けるとしています。

### llms.txtと構造化データはどちらが大事?

Google 検索に関しては構造化データです。llms.txt は Google 検索では使われていません。詳しくは「[llms.txtとは?](/glossary/llms-txt/)」で解説しています。
