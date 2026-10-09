from pydantic import BaseModel
from typing import Optional

class ArticleSearchResult(BaseModel):
    pmid: str
    title: str
    abstract: Optional[str] = None
    authors: list[str] = []
    journal: Optional[str] = None
    pub_date: Optional[str] = None
    doi: Optional[str] = None
    publication_types: list[str] = []

class ArticleDetail(ArticleSearchResult):
    mesh_terms: list[str] = []
    keywords: list[str] = []

class SearchResponse(BaseModel):
    total: int
    results: list[ArticleSearchResult]
    query: str
