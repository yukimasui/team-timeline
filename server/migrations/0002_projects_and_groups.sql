-- プロジェクト
CREATE TABLE projects (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#6366f1',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- グループ(プロジェクト内のタスクを後からまとめる任意の集合。PowerPointの要素グループ化に近い)
-- 1グループは1プロジェクトに属する。タスクのグループ所属は任意(グループなしを許可)。
CREATE TABLE groups (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#6366f1',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_groups_project_id ON groups(project_id);

-- タスクは「メンバーが持つ」のではなく「プロジェクトに所属する」形に変更するため、
-- tasksテーブルを project_id (NOT NULL) を持つ形で再構築する。group_id は任意(NULL許容)。
-- プレリリース段階のため既存タスクデータの引き継ぎは行わない。
DROP TABLE IF EXISTS task_dependencies;
DROP TABLE IF EXISTS tasks;

CREATE TABLE tasks (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    group_id    TEXT REFERENCES groups(id) ON DELETE SET NULL,
    member_id   TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    start_date  TEXT NOT NULL,
    end_date    TEXT NOT NULL,
    node_x      REAL NOT NULL DEFAULT 0,
    node_y      REAL NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_group_id ON tasks(group_id);
CREATE INDEX idx_tasks_member_id ON tasks(member_id);

CREATE TABLE task_dependencies (
    task_id            TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id)
);
