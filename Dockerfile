# ==============================================================================
# Stage 1: Build React 19 Frontend
# ==============================================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --prefer-offline

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Cargo Chef Planner & Builder with Static musl Linking
# ==============================================================================
FROM lukemathwalker/cargo-chef:latest-rust-alpine AS chef
WORKDIR /app

FROM chef AS planner
COPY backend/Cargo.toml backend/Cargo.lock ./backend/
COPY backend/src ./backend/src
WORKDIR /app/backend
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
RUN apk add --no-cache musl-dev

WORKDIR /app/backend
COPY --from=planner /app/backend/recipe.json recipe.json
RUN cargo chef cook --release --target x86_64-unknown-linux-musl --recipe-path recipe.json

# Copy backend source & migrations
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/src ./src
COPY backend/migrations ./migrations

# Copy compiled frontend dist into relative path ../frontend/dist expected by rust-embed
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Build production stripped static binary
RUN cargo build --release --target x86_64-unknown-linux-musl --bin researchpulse && \
    strip target/x86_64-unknown-linux-musl/release/researchpulse

# ==============================================================================
# Stage 3: Ultra-Minimal Alpine Runner (<30MB)
# ==============================================================================
FROM alpine:3.21 AS runner

RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

COPY --from=builder /app/backend/target/x86_64-unknown-linux-musl/release/researchpulse /usr/local/bin/researchpulse

USER appuser

ENV PORT=8080 \
    HOST=0.0.0.0 \
    RUST_LOG=researchpulse=info,tower_http=info

EXPOSE 8080

ENTRYPOINT ["researchpulse"]
