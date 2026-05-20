from database import SessionLocal
from models import Article
from scraper import determine_category
from collections import Counter

def migrate():
    db = SessionLocal()
    try:
        articles = db.query(Article).all()
        print(f"Loaded {len(articles)} articles from the database for re-categorization.")
        
        before_counts = Counter(a.category for a in articles)
        
        updated_count = 0
        for article in articles:
            new_cat = determine_category(article.title, article.summary or "")
            if article.category != new_cat:
                article.category = new_cat
                updated_count += 1
                
        db.commit()
        
        # Reload to get final counts
        updated_articles = db.query(Article).all()
        after_counts = Counter(a.category for a in updated_articles)
        
        print("\n--- Migration Report ---")
        print(f"Total articles updated: {updated_count} / {len(articles)}")
        print("\nCategory Distribution:")
        print(f"{'Category':<20} | {'Before':<10} | {'After':<10}")
        print("-" * 50)
        
        all_categories = sorted(list(set(list(before_counts.keys()) + list(after_counts.keys()))))
        for cat in all_categories:
            before_val = before_counts.get(cat, 0)
            after_val = after_counts.get(cat, 0)
            print(f"{cat:<20} | {before_val:<10} | {after_val:<10}")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
