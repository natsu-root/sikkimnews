from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from database import engine, Base, get_db, SessionLocal
from models import Article, ScrapeStatus
import schemas
from scraper import run_scraper

from apscheduler.schedulers.background import BackgroundScheduler
from contextlib import asynccontextmanager

Base.metadata.create_all(bind=engine)

scheduler = BackgroundScheduler()

def scheduled_scrape():
    db = SessionLocal()
    try:
        run_scraper(db)
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup scheduler
    scheduler.add_job(scheduled_scrape, 'interval', minutes=30)
    scheduler.start()
    
    # Run a scrape on startup if no articles exist or it's been a while
    db = SessionLocal()
    try:
        last_status = db.query(ScrapeStatus).order_by(ScrapeStatus.id.desc()).first()
        if not last_status or (datetime.utcnow() - last_status.last_run_at) > timedelta(minutes=30):
            run_scraper(db)
    finally:
        db.close()
        
    yield
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/news", response_model=List[schemas.Article])
def get_news(
    date: Optional[str] = None, 
    category: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(Article)
    
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
            # Filter by date of publication
            next_date = target_date + timedelta(days=1)
            query = query.filter(Article.published_at >= target_date, Article.published_at < next_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
            
    if category and category != "All":
        query = query.filter(Article.category == category)
        
    return query.order_by(Article.published_at.desc()).all()

@app.get("/api/news/status", response_model=schemas.ScrapeStatus)
def get_status(db: Session = Depends(get_db)):
    status = db.query(ScrapeStatus).order_by(ScrapeStatus.id.desc()).first()
    if not status:
        return schemas.ScrapeStatus(id=0, last_run_at=datetime.utcnow(), total_seen=0, inserted=0)
    return status

@app.post("/api/news/refresh")
def refresh_news(db: Session = Depends(get_db)):
    result = run_scraper(db)
    return result
