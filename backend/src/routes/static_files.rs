use axum::{
    http::{header, HeaderMap, HeaderValue, StatusCode, Uri},
    response::IntoResponse,
};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "../frontend/dist"]
pub struct StaticAssets;

pub async fn static_handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };

    match StaticAssets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            let mut headers = HeaderMap::new();

            if let Ok(val) = HeaderValue::from_str(mime.as_ref()) {
                headers.insert(header::CONTENT_TYPE, val);
            }

            if path.starts_with("assets/") {
                headers.insert(
                    header::CACHE_CONTROL,
                    HeaderValue::from_static("public, max-age=31536000, immutable"),
                );
            } else {
                headers.insert(
                    header::CACHE_CONTROL,
                    HeaderValue::from_static("public, max-age=3600"),
                );
            }

            (headers, content.data).into_response()
        }
        None => {
            // If path contains a file extension (like missing .js or .png), return 404
            if path.contains('.') && !path.ends_with(".html") {
                return (StatusCode::NOT_FOUND, "File not found").into_response();
            }

            // SPA fallback: return index.html for client-side routing
            match StaticAssets::get("index.html") {
                Some(content) => {
                    let mut headers = HeaderMap::new();
                    headers.insert(
                        header::CONTENT_TYPE,
                        HeaderValue::from_static("text/html; charset=utf-8"),
                    );
                    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
                    (headers, content.data).into_response()
                }
                None => (StatusCode::NOT_FOUND, "index.html not found").into_response(),
            }
        }
    }
}
