# ---- 1. フロントエンドをビルド ----
FROM node:22-slim AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- 2. バックエンド(Axum)をビルド ----
FROM rust:slim AS server-builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential pkg-config \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/Cargo.toml server/Cargo.lock ./
COPY server/migrations ./migrations
COPY server/src ./src
RUN cargo build --release

# ---- 3. 実行用イメージ ----
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/data

WORKDIR /app
COPY --from=server-builder /app/server/target/release/team-timeline-server ./team-timeline-server
COPY --from=client-builder /app/client/dist ./static

ENV STATIC_DIR=/app/static
ENV DATABASE_URL=sqlite:///app/data/team-timeline.db
ENV PORT=8080

VOLUME ["/app/data"]
EXPOSE 8080

CMD ["./team-timeline-server"]
