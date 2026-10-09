import httpx
from fastapi import APIRouter, Query, HTTPException
from app.schemas.pubmed import ArticleDetail, SearchResponse
from app.services.pubmed import pubmed_service

router = APIRouter(prefix='/api/search', tags=["search"])

#http://localhost:8000/docs#/search/search_articles_api_search__get
@router.get("/", response_model=SearchResponse) 
async def search_articles(
    q: str = Query(..., min_length=2, description="Search query"),
    max_results: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    date_from: str | None = Query(None, description="YYYY/MM/DD"),
    date_to: str | None = Query(None, descripton="YYYY/MM/DD"),
    journal: str | None = Query(None),
):
    try:
        return await pubmed_service.search(
            query=q,
            max_results=max_results,
            offset=offset,
            date_from=date_from,
            date_to=date_to,
            journal=journal,
        )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"PubMed API error: {str(e)}")


@router.get("/{pmid}", response_model=ArticleDetail)
async def get_article(pmid: str):
    try:
        article = await pubmed_service.get_article(pmid)
        if article is None:
            raise HTTPException(status_code=404, detail=f"Article with PMID {pmid} not found")
        return article
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"PubMed API error: {str(e)}")