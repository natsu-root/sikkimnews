from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base
import datetime

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    url = Column(String, unique=True, index=True)
    source = Column(String)
    summary = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    category = Column(String, index=True)
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ScrapeStatus(Base):
    __tablename__ = "scrape_status"

    id = Column(Integer, primary_key=True, index=True)
    last_run_at = Column(DateTime, default=datetime.datetime.utcnow)
    total_seen = Column(Integer, default=0)
    inserted = Column(Integer, default=0)
