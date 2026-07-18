# Team Timeline

チームメンバーそれぞれが「何をやっているか」を可視化するツール。タイムライン(ガント風)・カンバン・テーブル・依存関係グラフ(Blenderのマテリアルノードのようにタスク同士をドラッグで接続する)の4ビューでタスクを見せる。

## アーキテクチャ

- 単一のDockerコンテナで完結させる構成。Axumがビルド済みReact静的ファイルの配信とAPIの両方を担当し、別途フロント用コンテナは立てない。
- `client/` — React + TypeScript + Vite。UIは shadcn/ui(Tailwind CSS v4)、依存関係グラフは `@xyflow/react`(React Flow)。
- `server/` — Rust + Axum + sqlx(SQLite)。データは1ファイルのSQLiteで永続化し、Dockerではボリュームマウントする。
- ローカル開発時はフロント(Vite dev server, 5173)とバック(cargo run, デフォルト8080)を別プロセスで動かし、Viteのproxyで `/api` をバックエンドへ転送する。本番はAxumが `client/dist` を静的配信するのでプロキシは使わない。

## ディレクトリ構成

```
client/               React + TS + Vite フロントエンド
  src/
    api.ts             fetchベースのAPIクライアント
    types.ts            バックエンドのモデルに対応する型
    utils.ts             日付整形・ステータスラベルなどの小物
    App.tsx             ビュー切り替えとデータ取得・更新の起点
    components/
      ui/                shadcn/uiが生成したプリミティブ(button, dialog, select...)
      MemberDialog.tsx    メンバー追加ダイアログ
      TaskDialog.tsx      タスク追加/編集ダイアログ(open/onOpenChangeで外部制御も可)
      TimelineView.tsx    ガント風タイムライン(CSS Gridで自前実装、DAY_WIDTH=32px)
      KanbanView.tsx      ステータス別カンバン(HTML5 native drag & drop)
      TableView.tsx       一覧テーブル
      GraphView.tsx       依存関係グラフ(React Flow)
      TaskNode.tsx        グラフのカスタムノード
server/                Rust + Axum バックエンド
  src/
    main.rs             ルーティング定義・起動処理
    db.rs               SQLiteプール初期化 + sqlx::migrate!でマイグレーション自動実行
    models.rs            リクエスト/レスポンスの型
    error.rs             AppError(IntoResponse実装)
    handlers/
      members.rs          /api/members CRUD
      tasks.rs             /api/tasks CRUD + 依存関係エッジのadd/remove
  migrations/            sqlxマイグレーションSQL(バイナリに埋め込まれるので実行時ファイル不要)
Dockerfile              マルチステージ(client build → server build → 実行用debian-slim)
docker-compose.yml      SQLite用ボリューム付きの単一サービス構成
```

## データモデル

- `members`: id(uuid), name, color, created_at
- `tasks`: id(uuid), member_id(FK), title, description, status(todo/in_progress/done), start_date, end_date, node_x, node_y(グラフ上の座標), created_at, updated_at
- `task_dependencies`: task_id, depends_on_task_id の複合主キー。「task_idはdepends_on_task_idの完了に依存する」というエッジ。ON DELETE CASCADEでタスク削除時に自動でエッジも消える。

## API

- `GET/POST /api/members`, `PUT/DELETE /api/members/{id}`
- `GET/POST /api/tasks`, `PUT/DELETE /api/tasks/{id}` — GETのレスポンスは各タスクに `depends_on: string[]` を含む(`task_dependencies` を集約したもの)
- `POST /api/tasks/{id}/dependencies` body `{ depends_on_task_id }` — 依存エッジ追加
- `DELETE /api/tasks/{task_id}/dependencies/{depends_on_task_id}` — 依存エッジ削除

## 開発コマンド

```bash
# バックエンド(SQLiteファイルは server/data/ に作る。ディレクトリは事前にmkdirが必要 — sqliteはファイルは作るがディレクトリは作らない)
cd server && mkdir -p data
DATABASE_URL="sqlite://data/team-timeline.db" PORT=8080 cargo run

# フロントエンド(別ターミナル)
cd client && npm run dev
# バックエンドを8080以外で動かす場合は API_PROXY_TARGET でvite proxy先を上書きできる
API_PROXY_TARGET="http://localhost:8123" npm run dev

# 型チェック込みビルド
cd client && npm run build
cd server && cargo build --release

# Docker(単一コンテナでビルド〜起動まで確認済み)
docker compose up --build -d
# ホスト側の公開ポートはデフォルト8090(コンテナ内は8080固定)。8080がホストで別プロセスに
# 使われている環境でも衝突しないようにするため。変えたい場合は HOST_PORT=xxxx で上書きできる。
```

## 規約・注意点

- フロントのimportパスエイリアスは `@/*` → `client/src/*`(tsconfig + vite.config.ts両方に設定済み)。
- 新しいUI部品はまず `npx shadcn@latest add <component>` で追加してから使う。素のCSSを書くより既存のプリミティブ + Tailwindユーティリティを優先する。
- `TaskDialog` はトリガーボタンから開く通常パターンと、`open`/`onOpenChange` を渡す外部制御パターンの両方に対応している(依存関係グラフでノードをダブルクリックして編集する導線で後者を使用)。新しいダイアログもこの形に揃える。
- SQLiteのマイグレーションは `server/migrations/*.sql` に追加し、`sqlx::migrate!("./migrations")` で起動時に自動適用される(`db.rs`)。マイグレーションファイルはコンパイル時にバイナリへ埋め込まれるため、Dockerの実行用ステージにmigrationsディレクトリをコピーする必要はない。
- 依存関係グラフのノード位置(`node_x`, `node_y`)はドラッグ終了時にAPIへPUTして永続化する。初期値(0, 0)のタスクは自動グリッド配置にフォールバックする(`GraphView.tsx`)。
- git運用: `main`を汚さないよう`develop`ブランチで作業し、区切りの良いところでPRにまとめる。
- **commit / push / PR作成など、リポジトリの状態や履歴を変える操作は必ず事前にユーザーに確認を取り、了承を得てから実行する。** 了承なしに勝手に実行しない。
- Issueに取り組んだときは、
  - そのIssueに関するcommitのメッセージにIssue番号を付与する(例: `#12 依存関係グラフにノード削除を追加`)
  - 実装内容をIssueのコメントとして残す
  - 対応が完了したらIssueをcloseする
