-- ノートを横方向にも自由にドラッグできるようにするため、node_yと対になるnode_xを追加する
ALTER TABLE markers ADD COLUMN node_x REAL NOT NULL DEFAULT 0;
