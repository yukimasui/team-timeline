use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::{
    error::AppError,
    models::{
        AddDependency, CreateTask, Task, TaskDependency, TaskResponse, UpdateTask, VALID_PRIORITIES,
        VALID_STATUSES,
    },
    AppState,
};

async fn fetch_task(state: &AppState, id: &str) -> Result<Task, AppError> {
    let task = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?")
        .bind(id)
        .fetch_one(&state.pool)
        .await?;
    Ok(task)
}

async fn fetch_depends_on(state: &AppState, task_id: &str) -> Result<Vec<String>, AppError> {
    let deps = sqlx::query_as::<_, TaskDependency>(
        "SELECT task_id, depends_on_task_id FROM task_dependencies WHERE task_id = ?",
    )
    .bind(task_id)
    .fetch_all(&state.pool)
    .await?;
    Ok(deps.into_iter().map(|d| d.depends_on_task_id).collect())
}

fn validate_status(status: &str) -> Result<(), AppError> {
    if VALID_STATUSES.contains(&status) {
        Ok(())
    } else {
        Err(AppError::BadRequest(format!(
            "status must be one of {:?}",
            VALID_STATUSES
        )))
    }
}

fn validate_priority(priority: &str) -> Result<(), AppError> {
    if VALID_PRIORITIES.contains(&priority) {
        Ok(())
    } else {
        Err(AppError::BadRequest(format!(
            "priority must be one of {:?}",
            VALID_PRIORITIES
        )))
    }
}

pub async fn list_tasks(State(state): State<AppState>) -> Result<Json<Vec<TaskResponse>>, AppError> {
    let tasks = sqlx::query_as::<_, Task>("SELECT * FROM tasks ORDER BY start_date")
        .fetch_all(&state.pool)
        .await?;
    let deps = sqlx::query_as::<_, TaskDependency>("SELECT task_id, depends_on_task_id FROM task_dependencies")
        .fetch_all(&state.pool)
        .await?;

    let result = tasks
        .into_iter()
        .map(|t| {
            let depends_on = deps
                .iter()
                .filter(|d| d.task_id == t.id)
                .map(|d| d.depends_on_task_id.clone())
                .collect();
            TaskResponse { task: t, depends_on }
        })
        .collect();

    Ok(Json(result))
}

pub async fn create_task(
    State(state): State<AppState>,
    Json(payload): Json<CreateTask>,
) -> Result<Json<TaskResponse>, AppError> {
    if payload.title.trim().is_empty() {
        return Err(AppError::BadRequest("title is required".into()));
    }
    let status = payload.status.unwrap_or_else(|| "todo".to_string());
    validate_status(&status)?;
    let priority = payload.priority.unwrap_or_else(|| "medium".to_string());
    validate_priority(&priority)?;

    let id = uuid::Uuid::new_v4().to_string();
    let description = payload.description.unwrap_or_default();
    let node_x = payload.node_x.unwrap_or(0.0);
    let node_y = payload.node_y.unwrap_or(0.0);
    // 空文字は「グループなし」として扱う(グループは任意所属)
    let group_id = payload.group_id.filter(|s| !s.is_empty());

    sqlx::query(
        "INSERT INTO tasks (id, project_id, group_id, member_id, title, description, status, priority, start_date, end_date, node_x, node_y)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&payload.project_id)
    .bind(&group_id)
    .bind(&payload.member_id)
    .bind(&payload.title)
    .bind(&description)
    .bind(&status)
    .bind(&priority)
    .bind(&payload.start_date)
    .bind(&payload.end_date)
    .bind(node_x)
    .bind(node_y)
    .execute(&state.pool)
    .await?;

    let depends_on = payload.depends_on.unwrap_or_default();
    for dep_id in &depends_on {
        sqlx::query("INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)")
            .bind(&id)
            .bind(dep_id)
            .execute(&state.pool)
            .await?;
    }

    let task = fetch_task(&state, &id).await?;
    Ok(Json(TaskResponse { task, depends_on }))
}

pub async fn update_task(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateTask>,
) -> Result<Json<TaskResponse>, AppError> {
    let existing = fetch_task(&state, &id).await?;

    let project_id = payload.project_id.unwrap_or(existing.project_id);
    // キー省略時は既存値を維持、空文字は明示的な「グループ解除」として扱う
    let group_id = match payload.group_id {
        None => existing.group_id,
        Some(s) if s.is_empty() => None,
        Some(s) => Some(s),
    };
    let member_id = payload.member_id.unwrap_or(existing.member_id);
    let title = payload.title.unwrap_or(existing.title);
    let description = payload.description.unwrap_or(existing.description);
    let status = payload.status.unwrap_or(existing.status);
    validate_status(&status)?;
    let priority = payload.priority.unwrap_or(existing.priority);
    validate_priority(&priority)?;
    let start_date = payload.start_date.unwrap_or(existing.start_date);
    let end_date = payload.end_date.unwrap_or(existing.end_date);
    let node_x = payload.node_x.unwrap_or(existing.node_x);
    let node_y = payload.node_y.unwrap_or(existing.node_y);

    sqlx::query(
        "UPDATE tasks SET project_id = ?, group_id = ?, member_id = ?, title = ?, description = ?, status = ?, priority = ?, start_date = ?, end_date = ?,
         node_x = ?, node_y = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(&project_id)
    .bind(&group_id)
    .bind(&member_id)
    .bind(&title)
    .bind(&description)
    .bind(&status)
    .bind(&priority)
    .bind(&start_date)
    .bind(&end_date)
    .bind(node_x)
    .bind(node_y)
    .bind(&id)
    .execute(&state.pool)
    .await?;

    let task = fetch_task(&state, &id).await?;
    let depends_on = fetch_depends_on(&state, &id).await?;
    Ok(Json(TaskResponse { task, depends_on }))
}

pub async fn delete_task(State(state): State<AppState>, Path(id): Path<String>) -> Result<StatusCode, AppError> {
    let result = sqlx::query("DELETE FROM tasks WHERE id = ?")
        .bind(&id)
        .execute(&state.pool)
        .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}

pub async fn add_dependency(
    State(state): State<AppState>,
    Path(task_id): Path<String>,
    Json(payload): Json<AddDependency>,
) -> Result<Json<TaskDependency>, AppError> {
    if task_id == payload.depends_on_task_id {
        return Err(AppError::BadRequest("a task cannot depend on itself".into()));
    }
    // 依存先タスクの存在確認 (存在しなければ NotFound を返す)
    fetch_task(&state, &payload.depends_on_task_id).await?;

    sqlx::query("INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)")
        .bind(&task_id)
        .bind(&payload.depends_on_task_id)
        .execute(&state.pool)
        .await?;

    Ok(Json(TaskDependency {
        task_id,
        depends_on_task_id: payload.depends_on_task_id,
    }))
}

pub async fn remove_dependency(
    State(state): State<AppState>,
    Path((task_id, depends_on_task_id)): Path<(String, String)>,
) -> Result<StatusCode, AppError> {
    sqlx::query("DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?")
        .bind(&task_id)
        .bind(&depends_on_task_id)
        .execute(&state.pool)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}
