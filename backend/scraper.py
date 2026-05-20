import feedparser
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
import requests
import re
from sqlalchemy.orm import Session
from models import Article, ScrapeStatus
import instaloader

# Sources
FEEDS = [
    # Google News (Aggregator)
    "https://news.google.com/rss/search?q=Sikkim+when:1d&hl=en-IN&gl=IN&ceid=IN:en",
    # Local Portals
    "https://thesikkimchronicle.com/feed/",
    "https://voiceofsikkim.com/feed/",
    "https://thesummittimes.com/feed/",
    # Social Media Search (Facebook/Instagram via Google)
    "https://news.google.com/rss/search?q=site:facebook.com+OR+site:instagram.com+%22Sikkim%22+news+when:1d&hl=en-IN&gl=IN&ceid=IN:en"
]

INSTAGRAM_PROFILES = [
    "thesikkimchronicle",
    "voiceofsikkim",
    "sikkimexpress"
]

CATEGORIES = [
    "Politics", "Sports", "Weather", "Crime", 
    "Tourism", "Business", "Health", "Education", "Social Media"
]

CATEGORY_KEYWORDS = {
    "Politics": [
        "minister", "chief minister", "mla", "governor", "election", "vote", "cabinet", 
        "assembly", "political", "party", "constituency", "legislative", "legislator", 
        "government", "parliament", "mp", "lok sabha", "rajya sabha", "skm", "sdf", "bjp", 
        "congress", "cap", "citizen action party", "prem singh tamang", "ps golay", 
        "pawan chamling", "golay", "chamling", "opposition", "alliance", "campaign", "poll", 
        "democrat", "chief guest", "panchayat", "mayor", "municipality", "sworn-in"
    ],
    "Sports": [
        "sports", "football", "cricket", "tournament", "match", "score", "championship", 
        "cup", "medal", "gold", "silver", "bronze", "athletics", "game", "win", "league", 
        "bhaichung", "bhutia", "stadium", "athlete", "referee", "coach", "kick", "goal", 
        "trophy", "olympics", "sfa", "footballer", "cricketer", "player", "boxing", "boxer", 
        "archery", "wrestling", "marathon"
    ],
    "Weather": [
        "weather", "rain", "snow", "monsoon", "temperature", "forecast", "dry", "heat", 
        "climate", "meteorological", "imd", "humidity", "wind", "storm", "landslide", 
        "heavy rainfall", "cloudburst", "shower", "degrees", "celsius", "avalanche", 
        "weather forecast", "cold wave", "heat wave", "precipitate", "thunderstorm"
    ],
    "Crime": [
        "crime", "arrest", "police", "theft", "seize", "drugs", "drug", "murder", "court", 
        "jail", "fir", "cops", "investigate", "scam", "fraud", "assault", "heist", "smuggling", 
        "contraband", "kidnap", "bribe", "corruption", "accused", "custody", "sentenced", 
        "homicide", "police station", "suspect", "smuggled", "marijuana", "ganja", "narcotics"
    ],
    "Tourism": [
        "tourism", "tourist", "travel", "visit", "hotel", "resort", "homestay", "destination", 
        "booking", "traveler", "sightseeing", "attraction", "guide", "pelling", "gangtok", 
        "lachung", "lachen", "yumthang", "nathula", "gurudongmar", "lake", "trekking", 
        "permit", "scenic", "monastery", "cable car", "sightseer", "itinerary", "staycation"
    ],
    "Business": [
        "business", "economy", "market", "bank", "tax", "finance", "funding", "industry", 
        "trade", "invest", "startup", "crore", "lakh", "revenue", "budget", "enterprise", 
        "corporate", "shares", "commerce", "gdp", "gst", "entrepreneur", "investment", 
        "loan", "company", "firm", "stock"
    ],
    "Health": [
        "health", "doctor", "hospital", "covid", "disease", "medical", "patient", "medicine", 
        "virus", "vaccine", "clinic", "treatment", "phc", "stnm", "nurse", "wellness", 
        "healthcare", "epidemic", "illness", "sickness", "mental health", "surgeon", "surgical"
    ],
    "Education": [
        "education", "school", "college", "university", "student", "exam", "teacher", 
        "result", "admission", "course", "syllabus", "scholarship", "academic", "curriculum", 
        "principal", "board exam", "cbse", "sikkim university", "classroom", "graduating", 
        "graduation", "degree", "teach", "institute", "educational"
    ],
    "Social Media": [
        "social media", "viral", "facebook", "instagram", "tweet", "video", "post", 
        "trending", "youtube", "influencer", "meme", "tiktok", "follower", "netizen", 
        "reel", "vlog", "vlogger", "creator"
    ]
}

def determine_category(title: str, summary: str) -> str:
    text = f"{title} {summary}".lower()
    scores = {cat: 0 for cat in CATEGORIES}
    
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            pattern = r'\b' + re.escape(kw) + r'\b'
            matches = len(re.findall(pattern, text))
            if matches > 0:
                scores[cat] += matches
                
    max_score = 0
    best_cat = "General"
    
    for cat, score in scores.items():
        if score > max_score:
            max_score = score
            best_cat = cat
            
    return best_cat

def extract_image_url(html_summary: str):
    if not html_summary: return None
    soup = BeautifulSoup(html_summary, 'html.parser')
    img_tag = soup.find('img')
    if img_tag and img_tag.get('src'):
        return img_tag['src']
    return None

def clean_summary(html_summary: str):
    if not html_summary: return ""
    soup = BeautifulSoup(html_summary, 'html.parser')
    text = soup.get_text(separator=' ', strip=True)
    return text[:300] + '...' if len(text) > 300 else text

def scrape_rss(db: Session):
    inserted = 0
    total_seen = 0
    for url in FEEDS:
        print(f"Fetching feed: {url}")
        feed = feedparser.parse(url)
        total_seen += len(feed.entries)
        for entry in feed.entries:
            title = entry.title
            link = entry.link
            
            source = "Sikkim News"
            if "google.com" in url:
                if " - " in title:
                    parts = title.rsplit(" - ", 1)
                    title = parts[0]
                    source = parts[1]
            elif "sikkimchronicle" in url: source = "Sikkim Chronicle"
            elif "voiceofsikkim" in url: source = "Voice of Sikkim"
            elif "summittimes" in url: source = "Summit Times"
            elif "sikkimexpress" in url: source = "Sikkim Express"
            
            # Detect Social Media sources from the new feed
            if "facebook.com" in link: source = "Facebook"
            elif "instagram.com" in link: source = "Instagram"

            published_at = datetime.utcnow()
            if hasattr(entry, 'published'):
                try:
                    published_at = parsedate_to_datetime(entry.published)
                    if published_at.tzinfo is not None:
                        published_at = published_at.astimezone(datetime.timezone.utc).replace(tzinfo=None)
                except Exception: pass
            
            summary_html = getattr(entry, 'summary', '')
            summary = clean_summary(summary_html)
            image_url = extract_image_url(summary_html)
            category = determine_category(title, summary)
            
            existing = db.query(Article).filter(Article.url == link).first()
            if not existing:
                article = Article(
                    title=title, url=link, source=source, summary=summary,
                    image_url=image_url, category=category, published_at=published_at
                )
                db.add(article)
                inserted += 1
    return total_seen, inserted

def scrape_instagram(db: Session):
    L = instaloader.Instaloader()
    inserted = 0
    total_seen = 0
    
    # We only fetch very recent posts to avoid rate limits
    since = datetime.utcnow() - timedelta(days=1)
    
    for profile_name in INSTAGRAM_PROFILES:
        try:
            print(f"Fetching Instagram: {profile_name}")
            profile = instaloader.Profile.from_username(L.context, profile_name)
            posts = profile.get_posts()
            
            for post in posts:
                total_seen += 1
                if post.date_utc < since:
                    break # Stop if posts are older than 1 day
                
                url = f"https://www.instagram.com/p/{post.shortcode}/"
                title = (post.caption or "Instagram Post").split('\n')[0][:100]
                summary = post.caption or ""
                
                existing = db.query(Article).filter(Article.url == url).first()
                if not existing:
                    article = Article(
                        title=title,
                        url=url,
                        source=f"Instagram: {profile_name}",
                        summary=summary,
                        image_url=post.url,
                        category="Social Media",
                        published_at=post.date_utc
                    )
                    db.add(article)
                    inserted += 1
                
                if total_seen > 5: break # Only take top 5 per profile to be safe
        except Exception as e:
            print(f"Error scraping Instagram {profile_name}: {e}")
            
    return total_seen, inserted

def run_scraper(db: Session):
    print(f"[{datetime.utcnow()}] Starting full RSS scrape...")
    
    try:
        rss_seen, rss_ins = scrape_rss(db)
    except Exception as e:
        print(f"RSS Scrape failed: {e}")
        rss_seen, rss_ins = 0, 0
    
    total_seen = rss_seen
    inserted = rss_ins
    
    status = ScrapeStatus(
        last_run_at=datetime.utcnow(),
        total_seen=total_seen,
        inserted=inserted
    )
    db.add(status)
    db.commit()
    print(f"[{datetime.utcnow()}] Scrape complete. Total: {total_seen}, New: {inserted}")
    return {"total_seen": total_seen, "inserted": inserted}
