import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.reading_list import SavedArticle
from app.schemas.reading_list import SaveArticleRequest
from app.services.semantic_scholar import semantic_scholar_service


async def save_article(db: Session, request: SaveArticleRequest) -> SavedArticle:
    existing = db.query(SavedArticle).filter(SavedArticle.pmid == request.pmid).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Article {request.pmid} already saved")

    article = SavedArticle(
        pmid=request.pmid,
        title=request.title,
        authors=", ".join(request.authors) if request.authors else None,
        journal=request.journal,
        pub_date=request.pub_date,
        doi=request.doi,
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


async def list_saved_articles(db: Session) -> list[SavedArticle]:
    return db.query(SavedArticle).order_by(SavedArticle.saved_at.desc()).all()


async def remove_saved_article(db: Session, pmid: str) -> None:
    article = db.query(SavedArticle).filter(SavedArticle.pmid == pmid).first()
    if article is None:
        raise HTTPException(status_code=404, detail=f"Article {pmid} not found in reading list")
    db.delete(article)
    db.commit()


async def get_live_citation_counts(db: Session, client: httpx.AsyncClient) -> dict[str, int]:
    """Best-effort — a saved article Semantic Scholar has no record for is
    simply absent from the result, not an error."""
    saved = await list_saved_articles(db)
    pmids = [article.pmid for article in saved]
    return await semantic_scholar_service.get_citation_counts(client, pmids)
