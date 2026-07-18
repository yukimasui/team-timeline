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
      TimelineTabs.tsx    タイムライン/グラフ共通のタブバー(timelinesでプロジェクトを絞り込む)
      KanbanView.tsx      ステータス別カンバン(HTML5 native drag & drop)
      TableView.tsx       一覧テーブル
      GraphView.tsx       依存関係グラフ(React Flow)。X座標はタスクのstart_dateから機械的に計算し横ドラッグ不可、縦のみ自由
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

- `members`: id(uuid), name, color, created_at — タスクの担当者
- `projects`: id(uuid), name, color, member_id(FK, 任意), created_at — タイムラインの行の単位。`member_id`はデフォルト担当者(タイムライン上でタスクを追加する際の初期値)
- `groups`: id(uuid), project_id(FK), name, color, created_at — プロジェクト内でタスクを後から束ねる任意の集合(PowerPointの要素グループ化に近い)。1グループは1プロジェクトに属する
- `tasks`: id(uuid), project_id(FK, 必須), group_id(FK, 任意/NULL可), member_id(FK), title, description, status(todo/in_progress/done), priority(high/medium/low), start_date, end_date, node_x, node_y(グラフ上の座標), created_at, updated_at
  - タスクはプロジェクトに直接所属(必須)。グループへの所属は任意で、グループなしのタスクも存在できる
  - グループを削除してもタスクは消えない(`group_id`がNULLに戻るだけ。`ON DELETE SET NULL`)
- `task_dependencies`: task_id, depends_on_task_id の複合主キー。「task_idはdepends_on_task_idの完了に依存する」というエッジ。ON DELETE CASCADEでタスク削除時に自動でエッジも消える。
- `timelines` / `timeline_projects`: タイムラインのタブ。ユーザーが自由に作成し、`timeline_projects`(多対多)で表示するプロジェクトを紐づける。「全体」タブは実体を持たないUI上の特別扱い(全プロジェクト表示)。

## API

- `GET/POST /api/members`, `PUT/DELETE /api/members/{id}`
- `GET/POST /api/projects`, `PUT/DELETE /api/projects/{id}` — `member_id` は空文字でデフォルト担当者解除
- `GET/POST /api/groups`, `PUT/DELETE /api/groups/{id}`
- `GET/POST /api/timelines`, `PUT/DELETE /api/timelines/{id}` — body/レスポンスに `project_ids: string[]` を含む。更新時に`project_ids`を送ると紐づけを丸ごと置き換える
- `GET/POST /api/tasks`, `PUT/DELETE /api/tasks/{id}` — GETのレスポンスは各タスクに `depends_on: string[]` を含む(`task_dependencies` を集約したもの)。`group_id` は空文字を送るとグループ解除(NULL)として扱われる
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

# サンプルデータ投入(まっさらな状態を想定。手動でのデータ作成が面倒なとき用)
python3 scripts/seed.py
API_BASE="http://localhost:8123" python3 scripts/seed.py  # ポートを変えている場合
```

一区切りの作業(Issue対応など)が完了したら、`docker compose up --build -d` でローカルのDocker環境も最新のコードに更新・再起動しておく。ローカルの実行中コンテナがコードと乖離したままにならないようにするため。

## 規約・注意点

- フロントのimportパスエイリアスは `@/*` → `client/src/*`(tsconfig + vite.config.ts両方に設定済み)。
- 新しいUI部品はまず `npx shadcn@latest add <component>` で追加してから使う。素のCSSを書くより既存のプリミティブ + Tailwindユーティリティを優先する。
- `TaskDialog` はトリガーボタンから開く通常パターンと、`open`/`onOpenChange` を渡す外部制御パターンの両方に対応している(依存関係グラフでノードをダブルクリックして編集する導線で後者を使用)。新しいダイアログもこの形に揃える。
- SQLiteのマイグレーションは `server/migrations/*.sql` に追加し、`sqlx::migrate!("./migrations")` で起動時に自動適用される(`db.rs`)。マイグレーションファイルはコンパイル時にバイナリへ埋め込まれるため、Dockerの実行用ステージにmigrationsディレクトリをコピーする必要はない。
  - **一度適用されたマイグレーションファイルの中身は変更しない。** sqlxはファイルごとにチェックサムを記録しており、適用済みのファイルを書き換えて再起動すると `migration N was previously applied but has been modified` で起動不能になる(実際に開発中のDockerボリュームで発生した)。スキーマを直したい場合は新しい番号のマイグレーションファイルを追加する。ローカル/Dockerのdata volumeしか汚れていない場合は `rm -rf server/data`(ローカル)や `docker compose down -v`(Docker)でボリュームごと作り直しても良い。
- タイムラインの日付範囲は現状「2026年通年+実タスクの範囲」を表示する固定仕様(`TimelineView.tsx`の`YEAR_START`/`YEAR_END`)。可変レンジ化は将来対応。
- タイムラインの日付ヘッダは年/月/日の3段組み(`groupConsecutive`で連続する日付を年・月単位にまとめてセル幅を決めている)。土曜は青、日曜は赤で色分け。
- タイムラインのタスクバーの色はステータスで切り替える(`barStyle()`関数): 未着手=担当者カラーを半透明、進行中=担当者カラー原色、完了=枠線が担当者カラーで内側は視認性重視の濃いめグレー(`#9ca3af`)固定。
- タイムラインの空いている場所をクリックするとその日を開始日・終了日にしたタスク追加ダイアログが開く(`handleRowClick`)。クリック判定は`(e.target as HTMLElement).closest('button')`でタスクバー等のボタン要素上のクリックを除外している。
- タイムラインのタブ(`timelines`)はプロジェクトの表示絞り込みに使う。「全体」タブはDBに存在しない特別なUI状態(`activeTimelineId === null`)。タブバーは`TimelineTabs.tsx`としてTimelineView/GraphViewで共有しているが、タブの選択状態(`activeTimelineId`)自体は各ビューがローカルstateで独立して持つ(意図的な設計。ビューを切り替えても互いのタブ選択に影響しない)。
- 依存関係グラフのノードは横方向(X)がタスクの`start_date`から機械的に計算され、`extent`でドラッグをロックしている(横には動かせない)。縦方向(Y)のみ自由にドラッグでき、`onNodeDragStop`でAPIへPUTして`node_y`を永続化する(`node_x`もPUTはされるが表示上は常にstart_dateから再計算されるため無視される)。初期値(0)のタスクはインデックスベースの自動配置にフォールバックする。背景の日付ルーラーは`useViewport()`でパン量を取得し画面座標に変換して描画している(`GraphView.tsx`の`DateAxis`)。
- git運用: `main`を汚さないよう`develop`ブランチで作業し、区切りの良いところでPRにまとめる。
- **commit / push / PR作成など、リポジトリの状態や履歴を変える操作は必ず事前にユーザーに確認を取り、了承を得てから実行する。** 了承なしに勝手に実行しない。
- Issueに取り組んだときは、
  - そのIssueに関するcommitのメッセージにIssue番号を付与する(例: `#12 依存関係グラフにノード削除を追加`)
  - 実装内容をIssueのコメントとして残す
  - 対応が完了したらIssueをcloseする
