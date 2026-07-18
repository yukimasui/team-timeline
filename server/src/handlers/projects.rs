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

pub async fn list_projects(State(state): State<AppState>) -> Result<Json<Vec<Project>>, AppError> {
    let projects =
        sqlx::query_as::<_, Project>("SELECT id, name, color, created_at FROM projects ORDER BY created_at")
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

    sqlx::query("INSERT INTO projects (id, name, color) VALUES (?, ?, ?)")
        .bind(&id)
        .bind(&payload.name)
        .bind(&color)
        .execute(&state.pool)
        .await?;

    let project = sqlx::query_as::<_, Project>("SELECT id, name, color, created_at FROM projects WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.pool)
        .await?;
    Ok(Json(project))
}

pub async fn update_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateProject>,
) -> Result<Json<Project>, AppError> {
    let existing = sqlx::query_as::<_, Project>("SELECT id, name, color, created_at FROM projects WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.pool)
        .await?;

    let name = payload.name.unwrap_or(existing.name);
    let color = payload.color.unwrap_or(existing.color);

    sqlx::query("UPDATE projects SET name = ?, color = ? WHERE id = ?")
        .bind(&name)
        .bind(&color)
        .bind(&id)
        .execute(&state.pool)
        .await?;

    let project = sqlx::query_as::<_, Project>("SELECT id, name, color, created_at FROM projects WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.pool)
        .await?;
    Ok(Json(project))
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
