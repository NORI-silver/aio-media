---
title: llms.txtとは?書き方の例とGoogleの見解、置くべきかを解説
description: llms.txtは、サイトの概要と主なページをMarkdownでまとめてAIに伝えるためのファイルです。仕様の中身、実際の書き方の例、Googleの見解、置くべきサイトの判断基準を解説します。
date: 2026-11-09
updated: 2026-11-09
summary: llms.txtは、サイトの概要と主なページへのリンクをMarkdownでまとめ、AIエージェントがサイトを理解しやすくするためのファイルです。2024年に提案された仕様で、Google検索は使っていないため、置いても検索順位やAI Overviewsには影響しません。
---
llms.txt(エルエルエムズ・テキスト)は、**サイトの名前・概要・主なページへのリンクを Markdown 形式でまとめ、AI(大規模言語モデル、LLM)がサイトの中身を素早く理解できるようにするためのテキストファイル** です。2024年9月に Jeremy Howard 氏が [llmstxt.org](https://llmstxt.org/) で提案しました。

ただし、Google は「Google 検索は llms.txt を無視する」と明言しています。置けば AI 検索に出やすくなる、というものではない点に注意してください。

## llms.txtをひとことで言うと? [初級]

llms.txt は、AIのための **「サイトの案内板」** です。お店の入口にある「1階は食品、2階は衣料品」という案内のように、「このサイトには何があって、大事なページはどこか」をAIにまとめて伝えます。

よく似た名前の robots.txt とは役割が違います。

| ファイル | 役割 | 書く相手 |
|---|---|---|
| robots.txt | どこを読んでよいか・読まないでほしいかを伝える | 検索エンジンやAIのクローラー |
| llms.txt | サイトに何が書いてあるかを案内する | AI(大規模言語モデル) |
| sitemap.xml | サイトのページの一覧を伝える | 検索エンジン |

## llms.txtの仕様はどうなっている? [中級]

[llmstxt.org](https://llmstxt.org/) の仕様(2026年11月9日に確認)では、ファイルの中身は次の順番で書きます。

1. **H1(`# サイト名`)**:サイト名やプロジェクト名。**必須はこれだけ** です。
2. **引用(`> 概要`)**:サイトの短い説明。
3. **説明文**:見出しを使わない段落や箇条書きで、補足を書く(任意)。
4. **H2(`## 見出し`)ごとのリンク一覧**:`- [ページ名](URL): メモ` の形で並べる(任意)。
5. **`## Optional`**:AIが文章量を減らしたいときに読み飛ばしてよい、補助的なリンクを入れる慣例の見出し。

置き場所はサイトの一番上(`/llms.txt`)が基本ですが、`/docs/llms.txt` のように特定のフォルダに置くこともできます。仕様では、各ページの Markdown 版(`page.md` など)を用意することも提案されています。

## 実際にはどう書く? [中級]

このサイト(AIO対策ナビ)では、記事を公開するたびに [llms.txt](/llms.txt) を自動で作り直しています。2026年11月9日時点の中身(一部)はこうです。

```
# AIO対策ナビ

> AIO・LLMO・GEO対策とSEO・広告の実務メディア。中小企業のマーケティング担当者・SEO担当者向けに、一次情報と検証データをもとに解説するメディアです。

## 運営者と方針
- [運営者情報](https://aio.shiokonbu.com/about/): 運営者と連絡先
- [編集方針](https://aio.shiokonbu.com/editorial-policy/): 情報源・検証・更新のルール

## AIO・LLMO・GEO対策
- [AIO・LLMO・GEO・AEOの違いとは?…](https://aio.shiokonbu.com/aio/aio-llmo-geo-aeo-difference/): AIO・LLMO・GEO・AEOは、…

## Optional
- [全記事の本文](https://aio.shiokonbu.com/llms-full.txt)
- [サイトマップ](https://aio.shiokonbu.com/sitemap.xml)
```

作るときに気をつけているのは次の3点です。

- **カテゴリごとに H2 で分ける**:AIがサイトの全体像をつかみやすくなります。
- **リンクの後ろに要約を書く**:各記事の description(説明文)をそのまま入れています。
- **運営者情報を最初に置く**:誰が書いているサイトかを先に示します。

「llms-full.txt」は、全記事の本文を1つのファイルにまとめたものです。llmstxt.org の仕様には含まれていませんが、一部のサイトやツールで使われている慣習で、このサイトでも検証のために置いています。

## Googleはllms.txtをどう扱っている? [初級]

Google は、生成AI検索への最適化ガイド「[Optimizing your website for generative AI features on Google Search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)」(2026年7月10日更新)で、次のように書いています。

- Google 検索に表示されるために、新しい機械向けのファイルやAI向けのテキストファイル、Markdown を作る必要はない
- そうしたファイルを作っても害はないが、**Google 検索はそれを無視する**

つまり llms.txt は、Google の検索順位にも [AI Overviews(AIによる概要)](/aio/ai-overviews/) への表示にも影響しません。ChatGPT や Claude、Perplexity などの他社サービスが llms.txt を使っているかについては、2026年11月時点で各社の公式ドキュメントに明確な記載は見当たりませんでした。

## llms.txtは置くべき? [中級]

優先度は低めですが、置いて困ることはほとんどありません。判断の目安は次のとおりです。

| サイトの種類 | おすすめ |
|---|---|
| 開発者向けのドキュメント、API の説明があるサイト | 置く価値が比較的高い(仕様の提案でも、ソフトウェアのドキュメントでの利用が主な例) |
| 記事が多いメディア、ブログ | 自動で作れるなら置いてよい |
| 会社案内だけの小さなサイト | 後回しでよい |

llms.txt より先にやるべきなのは、AIクローラーをブロックしていないかの確認([robots.txtの設定](/aio/ai-crawler-robots-txt/))と、冒頭で結論を言い切る・一次情報を入れるといった記事の中身です。全体の優先順位は「[AIO・LLMO・GEO・AEOの違い](/aio/aio-llmo-geo-aeo-difference/)」の「今日からやるべき対策」にまとめています。

## 仕様どおりに作り込むなら何をする? [上級]

llmstxt.org の仕様には、llms.txt 本体のほかに、次のような提案も含まれています(2026年11月9日に確認)。

- **各ページの Markdown 版を用意する**:`/page.html` なら `/page.html.md`、末尾が `/` の URL なら `index.html.md` のように、同じ場所に Markdown 版を置きます。HTML からメニューや広告を取り除いた本文だけを、AIが読みやすい形で渡すためです。
- **link タグで場所を知らせる**:HTML の `<link rel="alternate" type="text/markdown" href="...">` で Markdown 版の場所を、`rel="describedby"` でそのページをカバーする llms.txt の場所を示します。HTTP の `Link:` ヘッダーでも指定できます。
- **フォルダごとに置ける**:`/docs/llms.txt` のように置くと、その下のページだけを案内する llms.txt になります。複数あるときは、より近い(具体的な)ものを使うとされています。

このサイトはまだ Markdown 版のページや link タグは用意していません。代わりに、全記事の本文をまとめた [llms-full.txt](/llms-full.txt) を置いています。

### 本当に読まれているかを確かめる

効果を語る前に、まずAIが llms.txt を読みに来ているかを確かめます。サーバーのアクセスログで `/llms.txt` へのアクセスを探し、User-Agent(GPTBot・ClaudeBot・PerplexityBot など)を確認します。名前は偽装できるので、本物かどうかの確かめ方は「[robots.txtの設定](/aio/ai-crawler-robots-txt/)」の上級者向けの章を参考にしてください。

## よくある質問

### llms.txtとrobots.txtの違いは?

robots.txt は「どこを読んでよいか・読んではいけないか」をクローラーに伝えるファイルです。llms.txt は「このサイトには何が書いてあるか」をAIに案内するファイルです。llms.txt には、AIのアクセスを止める働きはありません。

### llms.txtを置くとAI検索で引用されやすくなる?

Google 検索(AI Overviews・AIモードを含む)では使われていないので、効果はありません。他のAIサービスでの効果も、2026年11月時点ではっきり確認された公式情報はありません。

### WordPressでもllms.txtは作れる?

作れます。テキストファイルを手で作ってサイトの一番上にアップロードするか、自動で作るプラグインを使う方法があります。記事を追加するたびに更新が必要なので、自動で作れる方法がおすすめです。

### llms.txtは日本語で書いてもいい?

仕様に言語の決まりはありません。サイトの言語に合わせて日本語で書いて問題ありません。
