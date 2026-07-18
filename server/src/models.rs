use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Member {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateMember {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMember {
    pub name: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub color: String,
    pub member_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateProject {
    pub name: String,
    pub color: Option<String>,
    pub member_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProject {
    pub name: Option<String>,
    pub color: Option<String>,
    /// 空文字は担当者なし(NULL)として扱う
    pub member_id: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Group {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateGroup {
    pub project_id: String,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGroup {
    pub project_id: Option<String>,
    pub name: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Task {
    pub id: String,
    pub project_id: String,
    pub group_id: Option<String>,
    pub member_id: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub start_date: String,
    pub end_date: String,
    pub node_x: f64,
    pub node_y: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct TaskResponse {
    #[serde(flatten)]
    pub task: Task,
    pub depends_on: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTask {
    pub project_id: String,
    pub group_id: Option<String>,
    pub member_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub start_date: String,
    pub end_date: String,
    pub node_x: Option<f64>,
    pub node_y: Option<f64>,
    pub depends_on: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTask {
    pub project_id: Option<String>,
    /// 空文字はグループなし(NULL)として扱う
    pub group_id: Option<String>,
    pub member_id: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub node_x: Option<f64>,
    pub node_y: Option<f64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TaskDependency {
    pub task_id: String,
    pub depends_on_task_id: String,
}

#[derive(Debug, Deserialize)]
pub struct AddDependency {
    pub depends_on_task_id: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Timeline {
    pub id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct TimelineResponse {
    #[serde(flatten)]
    pub timeline: Timeline,
    pub project_ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTimeline {
    pub name: String,
    pub project_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTimeline {
    pub name: Option<String>,
    pub project_ids: Option<Vec<String>>,
}

pub const VALID_STATUSES: [&str; 3] = ["todo", "in_progress", "done"];
pub const VALID_PRIORITIES: [&str; 3] = ["high", "medium", "low"];
