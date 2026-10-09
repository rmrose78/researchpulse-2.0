import asyncio
import httpx
import xml.etree.ElementTree as ET
from app.config import settings
from app.schemas.pubmed import ArticleDetail, ArticleSearchResult, SearchResponse

class PubMedService:
    def __init__(self):
        self.base_url = settings.pubmed_base_url
        self.api_key = settings.pubmed_api_key
        self.base_params = {
            "retmode": "xml",
        }
        if self.api_key:
            self.base_params["api_key"] = self.api_key

    async def _get_with_retry(
        self, client: httpx.AsyncClient, url: str, params: dict, max_attempts: int = 4
    ) -> httpx.Response:
        # NCBI throttles unauthenticated requests to 3/sec — back off and retry on 429
        # instead of surfacing NCBI's own rate limit as a PubMed API error.
        for attempt in range(max_attempts):
            resp = await client.get(url, params=params)
            if resp.status_code == 429 and attempt < max_attempts - 1:
                await asyncio.sleep(0.5 * (2 ** attempt))
                continue
            return resp
        return resp

    async def _request(
        self, url: str, params: dict, client: httpx.AsyncClient | None
    ) -> httpx.Response:
        # Callers that already hold a shared client (e.g. the app-lifespan
        # client trending uses) pass it in; everyone else falls back to a
        # short-lived client, preserving the original per-call behavior.
        if client is not None:
            return await self._get_with_retry(client, url, params=params)
        async with httpx.AsyncClient() as owned_client:
            return await self._get_with_retry(owned_client, url, params=params)

    async def search(
        self,
        query: str,
        max_results: int = 20,
        offset: int = 0,
        date_from: str | None = None,
        date_to: str | None = None,
        journal: str | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> SearchResponse:
        # Build the query string
        full_query = query
        if journal:
            full_query += f' AND "{journal}"[journal]'
        if date_from and date_to:
            full_query += f' AND {date_from}:{date_to}[Date - Publication]'

        # Step 1: esearch - get matching PMIDs
        search_resp = await self._request(
            f"{self.base_url}/esearch.fcgi",
            {
                **self.base_params,
                "db": "pubmed",
                "term": full_query,
                "retmax": max_results,
                "retstart": offset,
                "usehistory": "y",
            },
            client,
        )
        search_resp.raise_for_status()

        root = ET.fromstring(search_resp.text)
        pmids = [id_elem.text for id_elem in root.findall(".//Id")]
        total = int(root.findtext("Count") or 0)

        if not pmids:
            return SearchResponse(total=total, results=[] , query=query)

        # Step 2: efetch - get full records for those PMIDs
        articles = await self._fetch_articles(pmids, client=client)
        return SearchResponse(total=total, results=articles, query=query)

    async def _fetch_articles(
        self, pmids: list[str], client: httpx.AsyncClient | None = None
    ) -> list[ArticleSearchResult]:
        fetch_resp = await self._request(
            f"{self.base_url}/efetch.fcgi",
            {
                **self.base_params,
                "db": "pubmed",
                "id": ",".join(pmids),
                "rettype": "abstract",
            },
            client,
        )
        fetch_resp.raise_for_status()
        return self._parse_articles(fetch_resp.text)
    
    def _parse_articles(self, xml_text: str) -> list[ArticleSearchResult]:
        root = ET.fromstring(xml_text)
        articles = []

        for article in root.findall(".//PubmedArticle"):
            pmid = article.findtext(".//PMID") or ""
            title = article.findtext(".//ArticleTitle") or "No title"
            abstract = article.findtext(".//AbstractText")

            authors = []
            for author in article.findall(".//Author"):
                last = author.findtext("LastName") or ""
                fore = author.findtext("ForeName") or ""
                if last:
                    authors.append(f"{last}, {fore}".strip(", "))
                
            journal = article.findtext(".//Journal/Title")
            pub_date_year = article.findtext(".//PubDate/Year")
            pub_date_month = article.findtext(".//PubDate/Month")
            pub_date = f"{pub_date_year}/{pub_date_month}".strip("/")

            doi = None
            for id_elem in article.findall(".//ArticleId"):
                if id_elem.get("IdType") == "doi":
                    doi = id_elem.text

            publication_types = [
                pt.text for pt in article.findall(".//PublicationTypeList/PublicationType")
                if pt.text
            ]

            articles.append(ArticleSearchResult(
                pmid=pmid,
                title=title,
                abstract=abstract,
                authors=authors,
                journal=journal,
                pub_date=pub_date,
                doi=doi,
                publication_types=publication_types,
            ))

        return articles
    
    async def get_article(self, pmid: str):
        async with httpx.AsyncClient() as client:
            resp = await self._get_with_retry(
                client,
                f"{self.base_url}/efetch.fcgi",
                params = {
                    **self.base_params,
                    "db": "pubmed",
                    "id": pmid,
                    "rettype": "abstract",
                }
            )
            if resp.status_code == 400:
                return None
            resp.raise_for_status()

        root = ET.fromstring(resp.text)
        article = root.find(".//PubmedArticle")

        if article is None:
            return None
        
        pmid_val = article.findtext(".//PMID") or ""
        title = article.findtext(".//ArticleTitle") or ""
        abstract = article.findtext(".//AbstractText")

        authors = []
        for author in article.findall(".//Author"):
            last = author.findtext("LastName") or ""
            fore = author.findtext("ForeName") or ""
            if last:
                authors.append(f"{last}, {fore}".strip(", "))

        journal = article.findtext(".//Journal/Title")
        pub_date_year = article.findtext(".//PubDate/Year") or ""
        pub_date_month = article.findtext(".//PubDate/Month") or ""
        pub_date = f"{pub_date_year}/{pub_date_month}".strip("/")

        doi = None
        for id_elem in article.findall(".//ArticleId"):
            if id_elem.get("IdType") == "doi":
                doi = id_elem.text

        mesh_terms = [
            desc.findtext("DescriptorName") or ""
            for desc in article.findall(".//MeshHeading")
        ]

        keywords = [
            kw.text or ""
            for kw in article.findall(".//Keyword")
        ]

        publication_types = [
            pt.text for pt in article.findall(".//PublicationTypeList/PublicationType")
            if pt.text
        ]

        return ArticleDetail(
            pmid=pmid_val,
            title=title,
            abstract=abstract,
            authors=authors,
            journal=journal,
            pub_date=pub_date,
            doi=doi,
            mesh_terms=[m for m in mesh_terms if m],
            keywords=[k for k in keywords if k],
            publication_types=publication_types,
        )

    # Singleton instance - import this everywhere
pubmed_service = PubMedService()
