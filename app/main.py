# app/main.py - Main Sanic application with environment variable configuration
from sanic import Sanic, response
from sanic.response import json
from sanic_ext import Extend
import os
from pathlib import Path
import sys
from datetime import datetime, timedelta, timezone

# Add the app directory to Python path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import version information
from . import get_version, get_app_info

# Import models and routes
from models.database import init_database, cleanup_database
from routes.auth import auth_bp
from routes.decks import decks_bp
from routes.cards import cards_bp
from routes.pods import pods_bp
from routes.study import study_bp
from routes.card_reviews import card_reviews

# Import auth decorator and helpers
try:
    from middleware.auth import require_auth, get_user_from_request
    AUTH_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  Auth middleware not available: {e}")
    AUTH_AVAILABLE = False
    
    # Create dummy decorators so the app still works
    def require_auth(f):
        return f
    
    def get_user_from_request(request):
        return None

def create_app():
    """Application factory pattern"""
    app_info = get_app_info()
    app = Sanic(app_info["name"])
    
    # Configure sanic-ext with CORS
    app.config.CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
    app.config.CORS_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    app.config.CORS_ALLOW_HEADERS = ["Content-Type", "Authorization"]

    PROJECT_ROOT = Path(__file__).parent.parent
    app.config.TEMPLATE_PATH = PROJECT_ROOT / "templates"
    
    # Initialize Sanic Extensions (includes CORS)
    Extend(app)
    
    # Configuration from environment variables
    # For containers: always use /data/flashpod.db (simple for self-hosters)
    # For development: use ./data/flashpod.db (relative path)
    if os.path.exists('/data'):
        # Running in container - use absolute path to bind mount
        app.config.DATABASE_URL = "sqlite:////data/flashpod.db"
    else:
        # Running in development - use relative path
        app.config.DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/flashpod.db")
    
    app.config.SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secure-secret-key")
    app.config.JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secure-jwt-secret-key")
    app.config.JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    app.config.DEBUG = os.getenv("DEBUG", "false").lower() == "true"

    # Static files
    app.static("/static", str(PROJECT_ROOT / "static"))
    
    # Add version info to config for access in routes
    app.config.APP_VERSION = get_version()
    app.config.APP_INFO = app_info
    
    # Public routes (no auth required)
    @app.route("/")
    async def index(request):
        # Check if user is already authenticated
        user = get_user_from_request(request)
        if user:
            return response.redirect("/dashboard")
        return response.redirect("/login")
    
    @app.route("/login")
    async def login_page(request):
        print(f"🔍 Login page accessed")
        print(f"🍪 Cookies: {dict(request.cookies)}")
        
        # If already authenticated, redirect to dashboard
        user = get_user_from_request(request)
        if user:
            print(f"✅ User already authenticated: {user}")
            return response.redirect("/dashboard")
        else:
            print("❌ No valid authentication found")
        
        return await response.file_stream(f"{app.config.TEMPLATE_PATH}/login.html")
    
    @app.route("/register")
    async def register_page(request):
        # If already authenticated, redirect to dashboard
        user = get_user_from_request(request)
        if user:
            return response.redirect("/dashboard")
        return await response.file_stream(f"{app.config.TEMPLATE_PATH}/register.html")
    
    # Protected routes (using decorator)
    @app.route("/dashboard")
    @require_auth
    async def dashboard(request):
        print(f"🔍 Dashboard accessed by: {request.headers.get('User-Agent', 'Unknown')}")
        print(f"🍪 Cookies: {dict(request.cookies)}")
        
        # Check if auth cookie exists
        auth_token = request.cookies.get('auth_token')
        if auth_token:
            print(f"✅ Auth token found: {auth_token[:20]}...")
        else:
            print("❌ No auth token found in cookies")
        
        # Read and render template with version info
        template_path = f"{app.config.TEMPLATE_PATH}/dashboard.html"
        template_content = Path(template_path).read_text()
        
        # Replace version placeholder in template
        rendered_content = template_content.replace("{{version}}", get_version())
        
        return response.html(rendered_content)
    
    @app.route("/profile")
    @require_auth
    async def profile(request):
        # Example of accessing the authenticated user
        user = request.ctx.user
        return json({
            "message": f"Welcome to your profile, {user['username']}!",
            "user": user
        })
    
    # Public health check with version info
    @app.route("/api/health")
    async def health_check(request):
        return json({
            "status": "ok", 
            "app": app_info["name"],
            "version": get_version(),
            "description": app_info["description"]
        })
    
    # Version info endpoint
    @app.route("/api/version")
    async def version_info(request):
        return json(get_app_info())
    
    # Logout route (clears cookies and redirects)
    @app.route("/logout")
    async def logout(request):
        resp = response.redirect("/login")
        
        # Correct way to clear cookies in Sanic
        resp.add_cookie(
            'auth_token', 
            '',
            expires=datetime.now(timezone.utc) - timedelta(days=1),  # Set to past date to delete
            httponly=True,
            path='/'
        )
        
        return resp
    
    # Register blueprints
    app.blueprint(auth_bp)
    app.blueprint(decks_bp)
    app.blueprint(cards_bp)
    app.blueprint(pods_bp)
    app.blueprint(study_bp)
    app.blueprint(card_reviews)
    
    # Middleware for content types only
    @app.middleware('response')
    async def add_headers(request, response):
        if request.path.endswith('.css'):
            response.headers['Content-Type'] = 'text/css'

    # Debug endpoints (only in debug mode)
    if app.config.DEBUG:
        @app.route("/api/debug")
        async def debug_info(request):
            return json({
                "message": "Debug endpoint working",
                "timestamp": str(datetime.now()),
                "request_path": request.path,
                "auth_available": AUTH_AVAILABLE,
                "version": get_version(),
                "config": {
                    "DATABASE_URL": app.config.DATABASE_URL,
                    "DEBUG": app.config.DEBUG,
                    "JWT_EXPIRATION_HOURS": app.config.JWT_EXPIRATION_HOURS
                }
            })

        @app.route("/api/debug/users")
        async def debug_all_users(request):
            from models.database import get_db_session
            from models.user import User
            
            session = get_db_session()
            try:
                users = session.query(User).all()
                users_data = []
                for user in users:
                    users_data.append({
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "is_active": user.is_active
                    })
                
                return json({
                    "total_users": len(users),
                    "users": users_data
                })
            except Exception as e:
                return json({"error": str(e)})
            finally:
                session.close()

        @app.route("/api/debug/testuser")
        async def debug_testuser(request):
            from models.database import get_db_session, verify_password
            from models.user import User
            
            session = get_db_session()
            try:
                user = session.query(User).filter_by(username="testuser").first()
                if user:
                    # Test password verification
                    password_works = verify_password("password123", user.password_hash)
                    return json({
                        "user_exists": True,
                        "user_id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "is_active": user.is_active,
                        "password_verification": password_works,
                        "password_hash_preview": user.password_hash[:20] + "..."
                    })
                else:
                    return json({"user_exists": False})
            except Exception as e:
                return json({"error": str(e)})
            finally:
                session.close()
    
    # Database initialization
    @app.before_server_start
    async def setup_database(app, loop):
        # Parse database URL to get the database file path
        db_url = app.config.DATABASE_URL
        
        if db_url.startswith("sqlite:///"):
            # Extract database file path from URL
            # Handle both relative (sqlite:///./data/db.db) and absolute (sqlite:////data/db.db) paths
            db_path_part = db_url[10:]  # Remove 'sqlite:///'
            
            if db_path_part.startswith('./') or not db_path_part.startswith('/'):
                # Relative path - resolve relative to app directory
                db_path = Path(__file__).parent / db_path_part.lstrip('./')
            else:
                # Absolute path
                db_path = Path(db_path_part)
            
            # Ensure the directory exists
            data_dir = db_path.parent
            data_dir.mkdir(parents=True, exist_ok=True)
            print(f"📁 Database directory: {data_dir.absolute()}")
        
        init_database(app.config.DATABASE_URL)
        print(f"✅ Database initialized: {app.config.DATABASE_URL}")
        print(f"📦 FlashPod v{get_version()} starting...")
    
    # Cleanup on shutdown
    @app.after_server_stop
    async def cleanup_database_connections(app, loop):
        cleanup_database()
        print("🧹 Database connections cleaned up")
        print(f"📦 FlashPod v{get_version()} stopped")
    
    return app

# Create app instance
app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "false").lower() == "true"
    auto_reload = os.getenv("AUTO_RELOAD", "false").lower() == "true"
    
    print(f"🚀 Starting FlashPod v{get_version()}")
    print(f"🌐 Server: http://{host}:{port}")
    print(f"🐛 Debug: {debug}")
    print(f"🔄 Auto-reload: {auto_reload}")
    
    app.run(
        host=host,
        port=port,
        debug=debug,
        auto_reload=auto_reload
    )