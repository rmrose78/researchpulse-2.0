use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub port: u16,
    pub host: String,
    pub database_url: String,
    pub pubmed_base_url: String,
    pub pubmed_api_key: Option<String>,
    pub semantic_scholar_base_url: String,
    pub semantic_scholar_api_key: Option<String>,
    pub analytics_secret_key: Option<String>,
}

impl Config {
    pub fn from_env() -> Self {
        let port = env::var("PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(8080);
        let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/researchpulse".to_string());
        let pubmed_base_url = env::var("PUBMED_BASE_URL")
            .unwrap_or_else(|_| "https://eutils.ncbi.nlm.nih.gov/entrez/eutils".to_string());
        let pubmed_api_key = env::var("NCBI_API_KEY")
            .or_else(|_| env::var("PUBMED_API_KEY"))
            .ok()
            .filter(|k| !k.trim().is_empty());
        let semantic_scholar_base_url = env::var("SEMANTIC_SCHOLAR_BASE_URL")
            .unwrap_or_else(|_| "https://api.semanticscholar.org".to_string());
        let semantic_scholar_api_key = env::var("SEMANTIC_SCHOLAR_API_KEY")
            .ok()
            .filter(|k| !k.trim().is_empty());
        let analytics_secret_key = env::var("ANALYTICS_SECRET_KEY")
            .or_else(|_| env::var("ANALYTICS_SECRET"))
            .ok()
            .filter(|k| !k.trim().is_empty());

        Self {
            port,
            host,
            database_url,
            pubmed_base_url,
            pubmed_api_key,
            semantic_scholar_base_url,
            semantic_scholar_api_key,
            analytics_secret_key,
        }
    }
}
