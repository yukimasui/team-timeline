use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::{
    error::AppError,
    models::{CreateMember, Member, UpdateMember},
    AppState,
};

pub async fn list_members(State(state): State<AppState>) -> Result<Json<Vec<Member>>, AppError> {
    let members =
        sqlx::query_as::<_, Member>("SELECT id, name, color, created_at FROM members ORDER BY created_at")
            .fetch_all(&state.pool)
            .await?;
    Ok(Json(members))
}

pub async fn create_member(
    State(state): State<AppState>,
    Json(payload): Json<CreateMember>,
) -> Result<Json<Member>, AppError> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }
    let id = uuid::Uuid::new_v4().to_string();
    let color = payload.color.unwrap_or_else(|| "#6366f1".to_string());

    sqlx::query("INSERT INTO members (id, name, color) VALUES (?, ?, ?)")
        .bind(&id)
        .bind(&payload.name)
        .bind(&color)
        .execute(&state.pool)
        .await?;

    let member = sqlx::query_as::<_, Member>("SELECT id, name, color, created_at FROM members WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.pool)
        .await?;
    Ok(Json(member))
}

pub async fn update_member(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateMember>,
) -> Result<Json<Member>, AppError> {
    let existing = sqlx::query_as::<_, Member>("SELECT id, name, color, created_at FROM members WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.pool)
        .await?;

    let name = payload.name.unwrap_or(existing.name);
    let color = payload.color.unwrap_or(existing.color);

    sqlx::query("UPDATE members SET name = ?, color = ? WHERE id = ?")
        .bind(&name)
        .bind(&color)
        .bind(&id)
        .execute(&state.pool)
        .await?;

    let member = sqlx::query_as::<_, Member>("SELECT id, name, color, created_at FROM members WHERE id = ?")
        .bind(&id)
        .fetch_one(&state.pool)
        .await?;
    Ok(Json(member))
}

pub async fn delete_member(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, AppError> {
    let result = sqlx::query("DELETE FROM members WHERE id = ?")
        .bind(&id)
        .execute(&state.pool)
        .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}
