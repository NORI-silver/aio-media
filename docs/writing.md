# 記事の書き方

`content/articles/<カテゴリ>/<スラッグ>.md` を作る。カテゴリは `site.json` の slug(aio / seo / glossary / ads / analytics / lp-creative / cost / news)。

```markdown
---
title: AIOとは?SEOとの違いと今日からできる対策
seo_title: (省略可。検索結果用に title と変えたいときだけ)
description: AIO(AI検索最適化)の意味、SEO・LLMO・GEOとの違い、ChatGPTやAI Overviewsで引用されるための対策を実例つきで解説します。
date: 2026-11-10
updated: 2026-11-10
summary: AIOは、ChatGPT や Google の AI Overviews などのAI検索で、自社の情報が引用・紹介されるように整える取り組みです。
author: (省略可。省略するとサイト名の編集部)
draft: (true にすると公開しない)
---
最初の段落で定義・結論を言い切る。

## AIOとは?
...

## よくある質問
### AIOとSEOはどちらを先にやるべき?
答え。
```

使える書き方:`## 見出し` `### 小見出し`、`- 箇条書き`、`1. 番号`、`| 表 |`、`> 引用`、```` ``` ```` コード、`**太字**`、`[リンク](URL)`、`![説明](/assets/img/xxx.png)`。

書いたら `python3 tools/build.py . && python3 tools/seo_check.py .`。
