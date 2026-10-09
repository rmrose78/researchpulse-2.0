use std::collections::HashMap;
use std::sync::LazyLock;

pub const DEFAULT_MODE: &str = "trending";
pub const DEFAULT_WINDOW_DAYS: i32 = 365;

pub const VALID_MODES: &[&str] = &["trending", "most_cited", "new_notable"];
pub const VALID_WINDOW_DAYS: &[i32] = &[60, 180, 365, 730];

pub static SPECIALTY_QUERIES: LazyLock<HashMap<&'static str, &'static str>> = LazyLock::new(|| {
    let mut m = HashMap::new();
    m.insert("cardiology", "\"Cardiovascular Diseases\"[Mesh]");
    m.insert("oncology", "\"Neoplasms\"[Mesh]");
    m.insert("infectious_disease", "\"Communicable Diseases\"[Mesh]");
    m.insert("neurology", "\"Nervous System Diseases\"[Mesh]");
    m.insert(
        "alzheimers_dementia",
        "\"Alzheimer Disease\"[Mesh] OR \"Dementia\"[Mesh]",
    );
    m.insert(
        "public_health_policy",
        "\"Public Health\"[Mesh] OR \"Health Policy\"[Mesh]",
    );
    m
});

pub static SPECIALTY_KEYWORDS: LazyLock<HashMap<&'static str, &'static [&'static str]>> =
    LazyLock::new(|| {
        let mut m = HashMap::new();
        m.insert(
            "cardiology",
            &[
                "heart attack",
                "heart failure",
                "arrhythmia",
                "coronary artery disease",
            ][..],
        );
        m.insert(
            "oncology",
            &["cancer", "tumor", "chemotherapy", "malignancy"][..],
        );
        m.insert(
            "infectious_disease",
            &["infection", "outbreak", "antibiotic resistance", "pandemic"][..],
        );
        m.insert(
            "neurology",
            &["stroke", "seizure", "epilepsy", "neurodegenerative"][..],
        );
        m.insert(
            "alzheimers_dementia",
            &[
                "alzheimer's disease",
                "dementia",
                "cognitive decline",
                "memory loss",
            ][..],
        );
        m.insert(
            "public_health_policy",
            &[
                "public health",
                "health policy",
                "healthcare access",
                "epidemiology",
            ][..],
        );
        m
    });

pub static ALL_SPECIALTIES: &[&str] = &[
    "cardiology",
    "oncology",
    "infectious_disease",
    "neurology",
    "alzheimers_dementia",
    "public_health_policy",
];

pub fn is_valid_specialty(specialty: &str) -> bool {
    SPECIALTY_QUERIES.contains_key(specialty)
}

pub fn is_valid_window_days(window_days: i32) -> bool {
    VALID_WINDOW_DAYS.contains(&window_days)
}

pub fn is_valid_mode(mode: &str) -> bool {
    VALID_MODES.contains(&mode)
}

pub fn build_query(specialty: &str, mode: &str) -> Option<String> {
    let mesh_query = SPECIALTY_QUERIES.get(specialty)?;
    if mode != "new_notable" {
        return Some((*mesh_query).to_string());
    }

    let keywords = SPECIALTY_KEYWORDS.get(specialty)?;
    let keyword_parts: Vec<String> = keywords
        .iter()
        .map(|kw| format!("\"{}\"[Title/Abstract]", kw))
        .collect();
    let keyword_query = keyword_parts.join(" OR ");

    Some(format!("({}) OR ({})", mesh_query, keyword_query))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_specialty_queries_and_modes() {
        assert!(is_valid_specialty("cardiology"));
        assert!(!is_valid_specialty("astrology"));

        assert!(is_valid_window_days(365));
        assert!(!is_valid_window_days(999));

        assert!(is_valid_mode("trending"));
        assert!(is_valid_mode("most_cited"));
        assert!(is_valid_mode("new_notable"));
        assert!(!is_valid_mode("random"));

        let cardiology_trending = build_query("cardiology", "trending").unwrap();
        assert_eq!(cardiology_trending, "\"Cardiovascular Diseases\"[Mesh]");

        let cardiology_notable = build_query("cardiology", "new_notable").unwrap();
        assert!(cardiology_notable.contains("\"heart attack\"[Title/Abstract]"));
        assert!(cardiology_notable.contains("\"Cardiovascular Diseases\"[Mesh]"));
    }
}
