# Team Timeline
![image](https://github.com/user-attachments/assets/cef555ec-0eab-4293-a737-8bd04271d37e)

チームのメンバーそれぞれが「いま何をやっているか」をひと目で把握するための、シンプルな進捗管理ツールにゃ。Excel での進捗管理を置き換える目的で作った個人プロジェクトで、業務固有の要素は含まない汎用ツールです。

タスクを **4つのビュー**で見せます:

- **タイムライン** — ガント風のタイムライン。タスク/イベントバーはドラッグで日付をスライド・リサイズでき、グループ枠ごとまとめて移動もできる
- **カンバン** — ステータス(未着手 / 進行中 / 完了)別のボード
- **テーブル** — 一覧表示
- **依存関係グラフ** — タスク同士をドラッグで接続して依存関係を描く(React Flow ベース)

## アーキテクチャ

単一の Docker コンテナで完結する構成です。Axum がビルド済みの React 静的ファイルの配信と API の両方を担当し、フロント用の別コンテナは立てません。データは 1 ファイルの SQLite に永続化します。

- **フロントエンド** — React + TypeScript + Vite / UI は shadcn/ui(Tailwind CSS v4)/ 依存関係グラフは [@xyflow/react](https://reactflow.dev/)
- **バックエンド** — Rust + Axum + sqlx(SQLite)

## 使い方(Docker)

```bash
docker compose up --build -d
```

ブラウザで <http://localhost:8090> を開くにゃ(ホスト側の公開ポートはデフォルト 8090。`HOST_PORT=xxxx` で変更可)。SQLite ファイルは Docker ボリュームに永続化されます。

## ローカル開発

フロントとバックを別プロセスで動かし、Vite の proxy で `/api` をバックエンドへ転送します。

```bash
# バックエンド(SQLite ファイルは server/data/ に作成。ディレクトリは事前に mkdir が必要)
cd server && mkdir -p data
DATABASE_URL="sqlite://data/team-timeline.db" PORT=8080 cargo run

# フロントエンド(別ターミナル)
cd client && npm install && npm run dev
```

- 型チェック込みビルド: `cd client && npm run build` / `cd server && cargo build --release`
- サンプルデータ投入: `python3 scripts/seed.py`

マイグレーションは `server/migrations/*.sql` に置き、起動時に `sqlx::migrate!` で自動適用されます(バイナリに埋め込まれるため実行時にファイルは不要)。

## データモデル(概要)

- **members** — タスクの担当者
- **projects** — タイムラインの行の単位(デフォルト担当者を持てる)
- **groups** — プロジェクト内でタスクを後から束ねる任意の集合
- **tasks** — プロジェクトに所属(必須)、グループへの所属は任意。ステータス / 優先度 / 開始・終了日 / グラフ上の座標を持つ
- **task_dependencies** — タスク間の依存エッジ
- **timelines** — 表示するプロジェクトを絞り込むタブ

## ライセンス

[MIT](./LICENSE) にゃ。
