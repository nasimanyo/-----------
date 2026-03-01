# Idea Event Bot (TypeScript / Koyeb-ready)

Node.js (TypeScript) で実装した `発想力コマンドイベントBOT` のテンプレートです。Koyeb にデプロイしやすいようにヘルスチェックと定期アクセス（cron）を含めています。

## 準備

1. Node.js 18+ をインストール
2. 依存をインストール（**必須**：`tsx` は devDependencies なので、`npm install` を最初に実行してください）

```bash
npm install
```

`npm install` を実行すると `node_modules/.bin/tsx` が生成され、`npm start` で `tsx` を使えるようになります。

3. 環境変数を設定（Koyeb ではサービスの設定で `BOT_TOKEN` と `HEALTH_CHECK_URL` を追加）
- `BOT_TOKEN`: Discord Bot トークン
- `HEALTH_CHECK_URL` (オプション): Koyeb サービス公開 URL（例: https://xxx.koyeb.app）

4. 起動

```bash
npm start
```

## ファイル構成
- `src/index.ts` - Bot 本体 + ヘルスサーバー起動 + cron 起動
- `src/server.ts` - Hono ヘルスチェックサーバー
- `src/cron.ts` - 定期的にヘルスチェックを叩くcron
- `src/config.ts` - ポートやヘルスチェックURLの設定

## デプロイ (Koyeb)
- `start` スクリプトは `tsx src/index.ts` を使います（Koyeb はこのコマンドで起動します）。
- 必要な環境変数を設定してデプロイしてください。

## Replitで動かす
1. Replit にログインし、GitHub リポジトリをインポートまたは手動でファイルを配置。
2. `.replit` をルートに追加して起動コマンドを指定（下記参照）。
3. Secrets に `BOT_TOKEN` と任意で `HEALTH_CHECK_URL` を設定。
4. 初回はターミナルで `npm install --legacy-peer-deps` を実行。
5. Run ボタンを押すと `npm start` が実行され、`Health server listening` 等のログが出ます。

`.replit` の例:

```
run = "npm start"
```

Replit は `npm start` を使うため、package.json のスクリプトをそのまま利用できます。
Freeプランでも5分毎にHTTPリクエストが来るので、cronは不要ですが残しておいても問題ありません。

## 注意
- トークンや機密情報は環境変数で管理してください。
- スラッシュコマンドのグローバル登録は反映に時間がかかるため、テスト時はギルド登録に切り替えることを推奨します。
