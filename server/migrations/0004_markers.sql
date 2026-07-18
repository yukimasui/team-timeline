-- タイムライン上のタスク以外アイテム(イベント/メモ)
-- タスクと同様プロジェクトに紐づく行内アイテムとして扱う。依存関係(task_dependencies)には参加しない。
CREATE TABLE markers (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_type   TEXT NOT NULL CHECK (item_type IN ('event', 'note')),
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT '#6366f1',
    start_date  TEXT NOT NULL,
    -- NULL = ノート(単一日)。イベントは常に埋める(未指定ならstart_dateと同値)。
    end_date    TEXT,
    node_y      REAL NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_markers_project_id ON markers(project_id);
