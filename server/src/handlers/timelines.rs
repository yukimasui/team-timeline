use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::{
    error::AppError,
    models::{CreateTimeline, Timeline, TimelineResponse, UpdateTimeline},
    AppState,
};

async fn fetch_timeline(state: &AppState, id: &str) -> Result<Timeline, AppError> {
    let timeline = sqlx::query_as::<_, Timeline>("SELECT * FROM timelines WHERE id = ?")
        .bind(id)
        .fetch_one(&state.pool)
        .await?;
    Ok(timeline)
}

async fn fetch_project_ids(state: &AppState, timeline_id: &str) -> Result<Vec<String>, AppError> {
    let rows: Vec<(String,)> =
        sqlx::query_as("SELECT project_id FROM timeline_projects WHERE timeline_id = ?")
            .bind(timeline_id)
            .fetch_all(&state.pool)
            .await?;
    Ok(rows.into_iter().map(|(id,)| id).collect())
}

async fn set_project_ids(state: &AppState, timeline_id: &str, project_ids: &[String]) -> Result<(), AppError> {
    sqlx::query("DELETE FROM timeline_projects WHERE timeline_id = ?")
        .bind(timeline_id)
        .execute(&state.pool)
        .await?;
    for project_id in project_ids {
        sqlx::query("INSERT OR IGNORE INTO timeline_projects (timeline_id, project_id) VALUES (?, ?)")
            .bind(timeline_id)
            .bind(project_id)
            .execute(&state.pool)
            .await?;
    }
    Ok(())
}

pub async fn list_timelines(State(state): State<AppState>) -> Result<Json<Vec<TimelineResponse>>, AppError> {
    let timelines = sqlx::query_as::<_, Timeline>("SELECT * FROM timelines ORDER BY created_at")
        .fetch_all(&state.pool)
        .await?;
    let mut result = Vec::with_capacity(timelines.len());
    for timeline in timelines {
        let project_ids = fetch_project_ids(&state, &timeline.id).await?;
        result.push(TimelineResponse { timeline, project_ids });
    }
    Ok(Json(result))
}

pub async fn create_timeline(
    State(state): State<AppState>,
    Json(payload): Json<CreateTimeline>,
) -> Result<Json<TimelineResponse>, AppError> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }
    let id = uuid::Uuid::new_v4().to_string();

    sqlx::query("INSERT INTO timelines (id, name) VALUES (?, ?)")
        .bind(&id)
        .bind(&payload.name)
        .execute(&state.pool)
        .await?;

    let project_ids = payload.project_ids.unwrap_or_default();
    set_project_ids(&state, &id, &project_ids).await?;

    let timeline = fetch_timeline(&state, &id).await?;
    Ok(Json(TimelineResponse { timeline, project_ids }))
}

pub async fn update_timeline(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateTimeline>,
) -> Result<Json<TimelineResponse>, AppError> {
    let existing = fetch_timeline(&state, &id).await?;
    let name = payload.name.unwrap_or(existing.name);

    sqlx::query("UPDATE timelines SET name = ? WHERE id = ?")
        .bind(&name)
        .bind(&id)
        .execute(&state.pool)
        .await?;

    let project_ids = match payload.project_ids {
        Some(ids) => {
            set_project_ids(&state, &id, &ids).await?;
            ids
        }
        None => fetch_project_ids(&state, &id).await?,
    };

    let timeline = fetch_timeline(&state, &id).await?;
    Ok(Json(TimelineResponse { timeline, project_ids }))
}

pub async fn delete_timeline(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, AppError> {
    let result = sqlx::query("DELETE FROM timelines WHERE id = ?")
        .bind(&id)
        .execute(&state.pool)
        .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}
