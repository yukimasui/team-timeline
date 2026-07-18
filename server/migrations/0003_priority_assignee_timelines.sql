-- タスクの優先度(高/中/低)
ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'));

-- プロジェクトのデフォルト担当者(タイムライン上でタスクを追加する際の初期値に使う。任意)
ALTER TABLE projects ADD COLUMN member_id TEXT REFERENCES members(id) ON DELETE SET NULL;

-- タイムライン(タブ)。ユーザーが自由に作成し、任意のプロジェクトをまとめて1つのタブとして表示する
CREATE TABLE timelines (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE timeline_projects (
    timeline_id TEXT NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (timeline_id, project_id)
);
