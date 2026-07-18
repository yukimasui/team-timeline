-- タイムライン上のプロジェクト行の高さをユーザーが指定できるようにする。
-- 0 = 未設定(タスク数に応じて自動計算)。node_x/node_yと同じ「0は未設定」規約に揃える。
ALTER TABLE projects ADD COLUMN row_height REAL NOT NULL DEFAULT 0;
