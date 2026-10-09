# Each specialty maps to an explicit MeSH-scoped PubMed query string.
SPECIALTY_QUERIES: dict[str, str] = {
    "cardiology": '"Cardiovascular Diseases"[Mesh]',
    "oncology": '"Neoplasms"[Mesh]',
    "infectious_disease": '"Communicable Diseases"[Mesh]',
    "neurology": '"Nervous System Diseases"[Mesh]',
    "alzheimers_dementia": '"Alzheimer Disease"[Mesh] OR "Dementia"[Mesh]',
    "public_health_policy": '"Public Health"[Mesh] OR "Health Policy"[Mesh]',
}

# Title/Abstract keyword terms per specialty, ORed alongside the MeSH query
# for New & Notable mode — PubMed doesn't assign MeSH terms for weeks after
# publication, so a MeSH-only query systematically misses brand-new articles.
SPECIALTY_KEYWORDS: dict[str, list[str]] = {
    "cardiology": ["heart attack", "heart failure", "arrhythmia", "coronary artery disease"],
    "oncology": ["cancer", "tumor", "chemotherapy", "malignancy"],
    "infectious_disease": ["infection", "outbreak", "antibiotic resistance", "pandemic"],
    "neurology": ["stroke", "seizure", "epilepsy", "neurodegenerative"],
    "alzheimers_dementia": ["alzheimer's disease", "dementia", "cognitive decline", "memory loss"],
    "public_health_policy": ["public health", "health policy", "healthcare access", "epidemiology"],
}

SPECIALTY_LABELS: dict[str, str] = {
    "cardiology": "Cardiology",
    "oncology": "Oncology",
    "infectious_disease": "Infectious Disease",
    "neurology": "Neurology",
    "alzheimers_dementia": "Alzheimer's & Dementia",
    "public_health_policy": "Public Health & Policy",
}
