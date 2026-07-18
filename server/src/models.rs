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
pub struct Task {
    pub id: String,
    pub member_id: String,
    pub title: String,
    pub description: String,
    pub status: String,
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
    pub member_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub start_date: String,
    pub end_date: String,
    pub node_x: Option<f64>,
    pub node_y: Option<f64>,
    pub depends_on: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTask {
    pub member_id: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
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

pub const VALID_STATUSES: [&str; 3] = ["todo", "in_progress", "done"];
