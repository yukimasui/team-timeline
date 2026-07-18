mod db;
mod error;
mod handlers;
mod models;

use axum::{
    routing::{get, post, put},
    Router,
};
use std::net::SocketAddr;
use tower_http::{cors::CorsLayer, services::ServeDir, trace::TraceLayer};

#[derive(Clone)]
pub struct AppState {
    pub pool: sqlx::SqlitePool,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let database_url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://data/team-timeline.db".to_string());
    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "./static".to_string());
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);

    let pool = db::init_pool(&database_url).await?;
    let state = AppState { pool };

    let api_routes = Router::new()
        .route(
            "/members",
            get(handlers::members::list_members).post(handlers::members::create_member),
        )
        .route(
            "/members/{id}",
            put(handlers::members::update_member).delete(handlers::members::delete_member),
        )
        .route(
            "/projects",
            get(handlers::projects::list_projects).post(handlers::projects::create_project),
        )
        .route(
            "/projects/{id}",
            put(handlers::projects::update_project).delete(handlers::projects::delete_project),
        )
        .route(
            "/groups",
            get(handlers::groups::list_groups).post(handlers::groups::create_group),
        )
        .route(
            "/groups/{id}",
            put(handlers::groups::update_group).delete(handlers::groups::delete_group),
        )
        .route(
            "/timelines",
            get(handlers::timelines::list_timelines).post(handlers::timelines::create_timeline),
        )
        .route(
            "/timelines/{id}",
            put(handlers::timelines::update_timeline).delete(handlers::timelines::delete_timeline),
        )
        .route(
            "/tasks",
            get(handlers::tasks::list_tasks).post(handlers::tasks::create_task),
        )
        .route(
            "/tasks/{id}",
            put(handlers::tasks::update_task).delete(handlers::tasks::delete_task),
        )
        .route("/tasks/{id}/dependencies", post(handlers::tasks::add_dependency))
        .route(
            "/tasks/{task_id}/dependencies/{depends_on_task_id}",
            axum::routing::delete(handlers::tasks::remove_dependency),
        )
        .with_state(state);

    let app = Router::new()
        .nest("/api", api_routes)
        .fallback_service(ServeDir::new(static_dir).append_index_html_on_directories(true))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
