use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::{
    error::AppError,
    models::{CreateGroup, Group, UpdateGroup},
    AppState,
};

pub async fn list_groups(State(state): State<AppState>) -> Result<Json<Vec<Group>>, AppError> {
    let groups = sqlx::query_as::<_, Group>(
        "SELECT id, project_id, name, color, created_at FROM groups ORDER BY created_at",
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(groups))
}

pub async fn create_group(
    State(state): State<AppState>,
    Json(payload): Json<CreateGroup>,
) -> Result<Json<Group>, AppError> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }
    let id = uuid::Uuid::new_v4().to_string();
    let color = payload.color.unwrap_or_else(|| "#6366f1".to_string());

    sqlx::query("INSERT INTO groups (id, project_id, name, color) VALUES (?, ?, ?, ?)")
        .bind(&id)
        .bind(&payload.project_id)
        .bind(&payload.name)
        .bind(&color)
        .execute(&state.pool)
        .await?;

    let group = sqlx::query_as::<_, Group>(
        "SELECT id, project_id, name, color, created_at FROM groups WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&state.pool)
    .await?;
    Ok(Json(group))
}

pub async fn update_group(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateGroup>,
) -> Result<Json<Group>, AppError> {
    let existing = sqlx::query_as::<_, Group>(
        "SELECT id, project_id, name, color, created_at FROM groups WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&state.pool)
    .await?;

    let project_id = payload.project_id.unwrap_or(existing.project_id);
    let name = payload.name.unwrap_or(existing.name);
    let color = payload.color.unwrap_or(existing.color);

    sqlx::query("UPDATE groups SET project_id = ?, name = ?, color = ? WHERE id = ?")
        .bind(&project_id)
        .bind(&name)
        .bind(&color)
        .bind(&id)
        .execute(&state.pool)
        .await?;

    let group = sqlx::query_as::<_, Group>(
        "SELECT id, project_id, name, color, created_at FROM groups WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&state.pool)
    .await?;
    Ok(Json(group))
}

pub async fn delete_group(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, AppError> {
    let result = sqlx::query("DELETE FROM groups WHERE id = ?")
        .bind(&id)
        .execute(&state.pool)
        .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}
