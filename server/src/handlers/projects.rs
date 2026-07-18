use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::{
    error::AppError,
    models::{CreateProject, Project, UpdateProject},
    AppState,
};

async fn fetch_project(state: &AppState, id: &str) -> Result<Project, AppError> {
    let project = sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = ?")
        .bind(id)
        .fetch_one(&state.pool)
        .await?;
    Ok(project)
}

pub async fn list_projects(State(state): State<AppState>) -> Result<Json<Vec<Project>>, AppError> {
    let projects = sqlx::query_as::<_, Project>("SELECT * FROM projects ORDER BY created_at")
        .fetch_all(&state.pool)
        .await?;
    Ok(Json(projects))
}

pub async fn create_project(
    State(state): State<AppState>,
    Json(payload): Json<CreateProject>,
) -> Result<Json<Project>, AppError> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }
    let id = uuid::Uuid::new_v4().to_string();
    let color = payload.color.unwrap_or_else(|| "#6366f1".to_string());
    let member_id = payload.member_id.filter(|s| !s.is_empty());
    let row_height = payload.row_height.unwrap_or(0.0);

    sqlx::query("INSERT INTO projects (id, name, color, member_id, row_height) VALUES (?, ?, ?, ?, ?)")
        .bind(&id)
        .bind(&payload.name)
        .bind(&color)
        .bind(&member_id)
        .bind(row_height)
        .execute(&state.pool)
        .await?;

    Ok(Json(fetch_project(&state, &id).await?))
}

pub async fn update_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateProject>,
) -> Result<Json<Project>, AppError> {
    let existing = fetch_project(&state, &id).await?;

    let name = payload.name.unwrap_or(existing.name);
    let color = payload.color.unwrap_or(existing.color);
    let member_id = match payload.member_id {
        None => existing.member_id,
        Some(s) if s.is_empty() => None,
        Some(s) => Some(s),
    };
    let row_height = payload.row_height.unwrap_or(existing.row_height);

    sqlx::query("UPDATE projects SET name = ?, color = ?, member_id = ?, row_height = ? WHERE id = ?")
        .bind(&name)
        .bind(&color)
        .bind(&member_id)
        .bind(row_height)
        .bind(&id)
        .execute(&state.pool)
        .await?;

    Ok(Json(fetch_project(&state, &id).await?))
}

pub async fn delete_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, AppError> {
    let result = sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(&id)
        .execute(&state.pool)
        .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}
