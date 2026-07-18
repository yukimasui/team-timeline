#!/usr/bin/env python3
"""
Team Timeline にサンプルデータ(メンバー・プロジェクト・グループ・タスク・タイムライン)を
投入する開発用スクリプト。

使い方:
    python3 scripts/seed.py                          # http://localhost:8080 に投入
    API_BASE=http://localhost:5173 python3 scripts/seed.py

すでにデータが入っている状態で実行すると重複して追加される。まっさらな状態での実行を想定。
"""

import json
import os
import urllib.request
from datetime import date, timedelta

BASE = os.environ.get("API_BASE", "http://localhost:8080")
TODAY = date.today()


def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(
        f"{BASE}{path}", data=data, method=method, headers={"content-type": "application/json"}
    )
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read()) if resp.status != 204 else None


def d(offset):
    return (TODAY + timedelta(days=offset)).isoformat()


def main():
    print(f"seeding into {BASE} ...")

    members = {
        name: req("POST", "/api/members", {"name": name, "color": color})["id"]
        for name, color in [
            ("ゆき", "#6366f1"),
            ("たかし", "#ec4899"),
            ("まゆ", "#22c55e"),
            ("けん", "#f59e0b"),
        ]
    }
    print(f"members: {list(members.keys())}")

    proj_dev = req("POST", "/api/projects", {"name": "新機能開発", "color": "#6366f1", "member_id": members["ゆき"]})
    proj_ops = req("POST", "/api/projects", {"name": "保守運用", "color": "#ef4444", "member_id": members["たかし"]})
    proj_mkt = req("POST", "/api/projects", {"name": "マーケティング", "color": "#22c55e", "member_id": members["まゆ"]})
    print(f"projects: {proj_dev['name']}, {proj_ops['name']}, {proj_mkt['name']}")

    group_design = req("POST", "/api/groups", {"project_id": proj_dev["id"], "name": "設計フェーズ", "color": "#6366f1"})
    group_impl = req("POST", "/api/groups", {"project_id": proj_dev["id"], "name": "実装フェーズ", "color": "#8b5cf6"})
    group_incident = req(
        "POST", "/api/groups", {"project_id": proj_ops["id"], "name": "障害対応", "color": "#ef4444"}
    )

    def task(project_id, member, title, start, end, status="todo", priority="medium", group_id=None):
        return req(
            "POST",
            "/api/tasks",
            {
                "project_id": project_id,
                "group_id": group_id or "",
                "member_id": members[member],
                "title": title,
                "status": status,
                "priority": priority,
                "start_date": d(start),
                "end_date": d(end),
            },
        )

    t1 = task(proj_dev["id"], "ゆき", "要件定義", -10, -6, status="done", priority="high", group_id=group_design["id"])
    t2 = task(proj_dev["id"], "たかし", "設計レビュー", -5, -1, status="done", priority="high", group_id=group_design["id"])
    t3 = task(proj_dev["id"], "ゆき", "仕様確定", -3, 0, status="in_progress", priority="high", group_id=group_design["id"])
    t4 = task(proj_dev["id"], "まゆ", "API実装", 1, 8, status="todo", priority="medium", group_id=group_impl["id"])
    t5 = task(proj_dev["id"], "けん", "UI実装", 3, 10, status="todo", priority="medium", group_id=group_impl["id"])
    task(proj_dev["id"], "ゆき", "結合テスト", 11, 15, status="todo", priority="medium")

    task(proj_ops["id"], "たかし", "月次メンテナンス", -2, 1, status="in_progress", priority="low")
    task(proj_ops["id"], "けん", "緊急パッチ対応", 0, 2, status="todo", priority="high", group_id=group_incident["id"])
    task(proj_ops["id"], "たかし", "障害調査", -1, 0, status="done", priority="high", group_id=group_incident["id"])

    task(proj_mkt["id"], "まゆ", "キャンペーン企画", -7, -1, status="done", priority="medium")
    task(proj_mkt["id"], "まゆ", "広告出稿", 2, 9, status="todo", priority="low")

    req("POST", f"/api/tasks/{t2['id']}/dependencies", {"depends_on_task_id": t1["id"]})
    req("POST", f"/api/tasks/{t3['id']}/dependencies", {"depends_on_task_id": t2["id"]})
    req("POST", f"/api/tasks/{t4['id']}/dependencies", {"depends_on_task_id": t3["id"]})
    req("POST", f"/api/tasks/{t5['id']}/dependencies", {"depends_on_task_id": t3["id"]})

    req("POST", "/api/timelines", {"name": "開発チーム", "project_ids": [proj_dev["id"], proj_ops["id"]]})
    req("POST", "/api/timelines", {"name": "全社", "project_ids": [proj_dev["id"], proj_ops["id"], proj_mkt["id"]]})

    print("done.")


if __name__ == "__main__":
    main()
