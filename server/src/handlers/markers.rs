use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::{
    error::AppError,
    models::{CreateMarker, Marker, UpdateMarker, VALID_ITEM_TYPES},
    AppState,
};

async fn fetch_marker(state: &AppState, id: &str) -> Result<Marker, AppError> {
    let marker = sqlx::query_as::<_, Marker>("SELECT * FROM markers WHERE id = ?")
        .bind(id)
        .fetch_one(&state.pool)
        .await?;
    Ok(marker)
}

fn validate_item_type(item_type: &str) -> Result<(), AppError> {
    if VALID_ITEM_TYPES.contains(&item_type) {
        Ok(())
    } else {
        Err(AppError::BadRequest(format!(
            "item_type must be one of {:?}",
            VALID_ITEM_TYPES
        )))
    }
}

/// note は常に end_date なし(単一日)。event は未指定なら start_date と同値にする。
fn normalize_end_date(item_type: &str, end_date: Option<String>, start_date: &str) -> Option<String> {
    if item_type == "note" {
        return None;
    }
    let end_date = end_date.filter(|s| !s.is_empty());
    Some(end_date.unwrap_or_else(|| start_date.to_string()))
}

pub async fn list_markers(State(state): State<AppState>) -> Result<Json<Vec<Marker>>, AppError> {
    let markers = sqlx::query_as::<_, Marker>("SELECT * FROM markers ORDER BY start_date")
        .fetch_all(&state.pool)
        .await?;
    Ok(Json(markers))
}

pub async fn create_marker(
    State(state): State<AppState>,
    Json(payload): Json<CreateMarker>,
) -> Result<Json<Marker>, AppError> {
    if payload.title.trim().is_empty() {
        return Err(AppError::BadRequest("title is required".into()));
    }
    validate_item_type(&payload.item_type)?;

    let id = uuid::Uuid::new_v4().to_string();
    let description = payload.description.unwrap_or_default();
    let color = payload.color.unwrap_or_else(|| "#6366f1".to_string());
    let node_y = payload.node_y.unwrap_or(0.0);
    let end_date = normalize_end_date(&payload.item_type, payload.end_date, &payload.start_date);

    sqlx::query(
        "INSERT INTO markers (id, project_id, item_type, title, description, color, start_date, end_date, node_y)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&payload.project_id)
    .bind(&payload.item_type)
    .bind(&payload.title)
    .bind(&description)
    .bind(&color)
    .bind(&payload.start_date)
    .bind(&end_date)
    .bind(node_y)
    .execute(&state.pool)
    .await?;

    let marker = fetch_marker(&state, &id).await?;
    Ok(Json(marker))
}

pub async fn update_marker(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateMarker>,
) -> Result<Json<Marker>, AppError> {
    let existing = fetch_marker(&state, &id).await?;

    let project_id = payload.project_id.unwrap_or(existing.project_id);
    let item_type = payload.item_type.unwrap_or(existing.item_type);
    validate_item_type(&item_type)?;
    let title = payload.title.unwrap_or(existing.title);
    let description = payload.description.unwrap_or(existing.description);
    let color = payload.color.unwrap_or(existing.color);
    let start_date = payload.start_date.unwrap_or(existing.start_date);
    let end_date = normalize_end_date(
        &item_type,
        payload.end_date.or(existing.end_date),
        &start_date,
    );
    let node_y = payload.node_y.unwrap_or(existing.node_y);

    sqlx::query(
        "UPDATE markers SET project_id = ?, item_type = ?, title = ?, description = ?, color = ?, start_date = ?, end_date = ?,
         node_y = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(&project_id)
    .bind(&item_type)
    .bind(&title)
    .bind(&description)
    .bind(&color)
    .bind(&start_date)
    .bind(&end_date)
    .bind(node_y)
    .bind(&id)
    .execute(&state.pool)
    .await?;

    let marker = fetch_marker(&state, &id).await?;
    Ok(Json(marker))
}

pub async fn delete_marker(State(state): State<AppState>, Path(id): Path<String>) -> Result<StatusCode, AppError> {
    let result = sqlx::query("DELETE FROM markers WHERE id = ?")
        .bind(&id)
        .execute(&state.pool)
        .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}
