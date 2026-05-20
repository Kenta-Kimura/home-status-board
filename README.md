# HomeStatus Board

家庭内Wi-Fiに接続している端末から、家族など複数ユーザーの現在状態を確認・更新できる簡易ステータス共有Webアプリです。

## 構成

- フロントエンド: React + TypeScript + Vite
- バックエンド: Node.js + Express
- 保存先: サーバーメモリ
- 通信: HTTP API + 1秒ごとの自動更新

## 起動

事前に Node.js と npm をMacBook Airへインストールしておきます。Node.js 18以上を想定しています。

初回のみ依存パッケージをインストールします。

```bash
npm install
```

開発用サーバーを起動します。

```bash
npm run dev
```

起動すると、フロントエンドは `0.0.0.0:5173`、APIサーバーは `0.0.0.0:3001` で待ち受けます。

MacBook Air自身では次のURLで開けます。

```text
http://localhost:5173
```

## iPhoneや他PCからアクセスする

1. MacBook AirとiPhone・他PCを同じWi-Fiに接続します。
2. MacBook Airで「システム設定」→「Wi-Fi」→ 接続中ネットワークの詳細を開き、IPアドレスを確認します。
3. iPhoneや他PCのブラウザで次の形式のURLを開きます。

```text
http://MacBookのLAN内IPアドレス:5173
```

例:

```text
http://192.168.1.23:5173
```

アクセスできない場合は、macOSのファイアウォール設定で Node.js の受信接続が許可されているか確認してください。

## API

### `GET /api/users`

ユーザー一覧と状態定義を取得します。期限切れの `Don’t disturb` は、この取得時に自動的に `OK` へ戻します。

### `POST /api/users`

ユーザーを追加します。

```json
{
  "name": "Kenta"
}
```

### `PATCH /api/users/:id/status`

ユーザーの状態を更新します。

```json
{
  "status": "dnd",
  "autoClearMinutes": 30
}
```

`status` は `ok`, `dnd`, `penguin` を指定できます。`OK` や `Penguin` に戻した場合、自動解除予定はクリアされます。

## 本番に近い確認

Viteで静的ファイルをbuildし、Expressから配信できます。

```bash
npm run build
npm run start
```

この場合は次のURLでアクセスします。

```text
http://MacBookのLAN内IPアドレス:3001
```

## 将来拡張

- 状態の種類は `shared/statuses.json` を中心に追加できます。
- 保存処理は現在 `server/index.js` のメモリ配列です。JSONファイルやSQLiteへ移す場合は、このユーザー保存部分を差し替えます。
- フロントエンドは `client/src/api.ts`、`client/src/statusConfig.ts`、UIコンポーネントを分けています。
