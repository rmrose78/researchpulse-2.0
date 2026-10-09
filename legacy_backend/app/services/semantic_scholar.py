import httpx
from app.config import settings


class SemanticScholarService:
    def __init__(self):
        self.base_url = settings.semantic_scholar_base_url
        self.api_key = settings.semantic_scholar_api_key

    async def get_citation_counts(
        self, client: httpx.AsyncClient, pmids: list[str]
    ) -> dict[str, int]:
        # A single malformed/empty id (e.g. from a PubMed record efetch
        # couldn't fully parse) makes Semantic Scholar reject the *entire*
        # batch with 400 "No valid paper ids given" — filter before sending.
        valid_pmids = [pmid for pmid in pmids if pmid]
        if not valid_pmids:
            return {}

        headers = {"x-api-key": self.api_key} if self.api_key else {}
        resp = await client.post(
            f"{self.base_url}/graph/v1/paper/batch",
            params={"fields": "externalIds,citationCount"},
            json={"ids": [f"PMID:{pmid}" for pmid in valid_pmids]},
            headers=headers,
        )
        if resp.status_code == 400:
            # Semantic Scholar returns 400 "No valid paper ids given" when
            # *none* of the batch's ids are in its graph yet, rather than 200
            # with an all-null array — expected for a pool skewed toward
            # articles too fresh for its citation index to have ingested.
            return {}
        resp.raise_for_status()
        data = resp.json()

        counts: dict[str, int] = {}
        for entry in data:
            if not entry:
                continue
            # Semantic Scholar's externalIds key for a PubMed ID is "PubMed",
            # not "PMID" — confirmed against the live API; easy to get wrong
            # since the request-side id prefix we send IS "PMID:".
            pmid = (entry.get("externalIds") or {}).get("PubMed")
            if pmid:
                counts[pmid] = entry.get("citationCount") or 0
        return counts


# Singleton instance - import this everywhere
semantic_scholar_service = SemanticScholarService()
