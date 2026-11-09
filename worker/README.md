# AIO診断ツールのAPI(Cloudflare Workers)

`https://aio.shiokonbu.com/aio-checker/` の診断を行うAPI。依存パッケージなし。

- `GET /api/check?url=https://example.com/` → 診断結果のJSON(点数・最大33項目・AIクローラーごとの robots.txt 判定・強化プラン(plan))
- 読みに行くもの:入力したページ、`/robots.txt`、`/llms.txt`、`/sitemap.xml`(User-Agent は `AIOCheckerBot/1.0`)
- 悪用対策:IPごと1分10回・同じサイトへ1分20回(Rate Limiting バインディング)、結果は10分キャッシュ、http/https・80/443番だけ、IP直書き・社内向けドメイン・プライベートIPに解決される名前は拒否、リダイレクトは1回ずつ確認、サイズ上限とタイムアウト、CORS は aio.shiokonbu.com だけ

## 確認とデプロイ

```sh
node worker/test.mjs            # ネットなしで動く確認(このリポジトリの生成ファイルを診断する)
cd worker && npx wrangler deploy  # 手元からデプロイする場合
```

main に `worker/` の変更が入ると `.github/workflows/deploy-worker.yml` が自動でデプロイする(Secrets `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` が必要)。

デプロイしたら、表示された `https://aio-checker.<名前>.workers.dev` を `site.json` の `checker_api` に入れて `python3 tools/build.py .`。空のあいだ、診断ページは noindex・「準備中」表示で、ナビやトップからリンクしない。
