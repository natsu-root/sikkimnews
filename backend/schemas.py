from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ArticleBase(BaseModel):
    title: str
    url: str
    source: str
    summary: Optional[str] = None
    image_url: Optional[str] = None
    category: str
    published_at: datetime

class Article(ArticleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ScrapeStatusBase(BaseModel):
    last_run_at: datetime
    total_seen: int
    inserted: int

class ScrapeStatus(ScrapeStatusBase):
    id: int

    class Config:
        from_attributes = True
