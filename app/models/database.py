# app/models/database.py - Database configuration and session management
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
import hashlib
import secrets

# Create base class for models
Base = declarative_base()

# Global variables for database
engine = None
SessionLocal = None

def hash_password(password: str) -> str:
    """Hash password with salt"""
    salt = secrets.token_hex(16)
    pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return salt + pwdhash.hex()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    salt = hashed[:32]
    pwdhash = hashed[32:]
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex() == pwdhash

def init_database(database_url: str):
    """Initialize database with all models"""
    global engine, SessionLocal
    
    print(f"🗄️  Initializing database: {database_url}")
    
    # Create engine
    engine = create_engine(database_url, echo=False)  # Set echo=True for SQL debugging
    
    # Import all models to ensure they're registered
    from .user import User
    from .deck import Deck
    from .card import Card
    from .pod import Pod
    from .pod_deck import PodDeck
    from .study_session import StudySession
    from .card_review import CardReview
    
    # Create all tables
    Base.metadata.create_all(engine)
    
    # Create session factory
    SessionLocal = scoped_session(sessionmaker(bind=engine))
    
    # Create test user for development
    create_test_user_if_needed()
    
    print("✅ Database tables created successfully")

def get_db_session():
    """Get database session"""
    if SessionLocal is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    return SessionLocal()

def cleanup_database():
    """Clean up database connections"""
    global SessionLocal, engine
    if SessionLocal:
        SessionLocal.remove()
    if engine:
        engine.dispose()

def create_test_user_if_needed():
    """Create a test user for development"""
    from .user import User
    
    session = get_db_session()
    try:
        # Check if test user exists
        existing_user = session.query(User).filter_by(username="testuser").first()
        if existing_user:
            print(f"👤 Test user exists (ID: {existing_user.id})")
            return
        
        # Create test user
        test_user = User(
            username="testuser",
            email="test@example.com",
            password_hash=hash_password("password123")
        )
        session.add(test_user)
        session.commit()
        
        print(f"👤 Created test user (ID: {test_user.id})")
        print("   Username: testuser")
        print("   Password: password123")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error creating test user: {e}")
    finally:
        session.close()