# app/main.py - Main Sanic application with decorator-based auth
from sanic import Sanic, response
from sanic.response import json
from sanic_ext import Extend
import os
from pathlib import Path
import sys
from datetime import datetime, timedelta, timezone

# Add the app directory to Python path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import models and routes
from models.database import init_database, cleanup_database
from routes.auth import auth_bp
from routes.decks import decks_bp
from routes.cards import cards_bp
from routes.pods import pods_bp

# Import auth decorator and helpers (comment out for now if causing issues)
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
    app = Sanic("FlashPod")
    
    # Configure sanic-ext with CORS
    app.config.CORS_ORIGINS = "*"  # Allow all origins for development
    app.config.CORS_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    app.config.CORS_ALLOW_HEADERS = ["Content-Type", "Authorization"]

    PROJECT_ROOT = Path(__file__).parent.parent
    app.config.TEMPLATE_PATH = PROJECT_ROOT / "templates"
    
    # Initialize Sanic Extensions (includes CORS)
    Extend(app)
    
    # Configuration
    app.config.DATABASE_URL = "sqlite:///./data/flashpod.db"
    app.config.SECRET_KEY = "your-secret-key-change-this"  # Change in production
    app.config.DEBUG = True

    # Static files
    app.static("/static", str(PROJECT_ROOT / "static"))
    
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
    
    @app.route("/api/debug/login-test")
    async def debug_login_test(request):
        from models.database import get_db_session, verify_password
        from models.user import User
        
        session = get_db_session()
        try:
            # Simulate the login process
            user = session.query(User).filter_by(username="testuser").first()
            
            if user and verify_password("password123", user.password_hash):
                # Try to create a JWT token
                try:
                    if AUTH_AVAILABLE:
                        from middleware.auth import create_jwt_token
                        token = create_jwt_token(user.id, user.username)
                        
                        return json({
                            "login_simulation": "success",
                            "user_id": user.id,
                            "username": user.username,
                            "jwt_token_created": True,
                            "token_preview": token[:20] + "...",
                            "auth_middleware_available": True
                        })
                    else:
                        return json({
                            "login_simulation": "success", 
                            "user_id": user.id,
                            "username": user.username,
                            "jwt_token_created": False,
                            "auth_middleware_available": False,
                            "error": "Auth middleware not available"
                        })
                except Exception as e:
                    return json({
                        "login_simulation": "jwt_error",
                        "error": str(e)
                    })
            else:
                return json({"login_simulation": "failed", "reason": "invalid_credentials"})
        finally:
            session.close()
    
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
        # Temporarily remove @require_auth to stop the redirect loop
        print(f"🔍 Dashboard accessed by: {request.headers.get('User-Agent', 'Unknown')}")
        print(f"🍪 Cookies: {dict(request.cookies)}")
        
        # Check if auth cookie exists
        auth_token = request.cookies.get('auth_token')
        if auth_token:
            print(f"✅ Auth token found: {auth_token[:20]}...")
        else:
            print("❌ No auth token found in cookies")
        
        return await response.file_stream(f"{app.config.TEMPLATE_PATH}/dashboard.html")
    
    @app.route("/profile")
    @require_auth
    async def profile(request):
        # Example of accessing the authenticated user
        user = request.ctx.user
        return json({
            "message": f"Welcome to your profile, {user['username']}!",
            "user": user
        })
    
    # Public health check
    @app.route("/api/health")
    async def health_check(request):
        return json({"status": "ok", "app": "FlashPod"})
    
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
    
    # Middleware for content types only
    @app.middleware('response')
    async def add_headers(request, response):
        if request.path.endswith('.css'):
            response.headers['Content-Type'] = 'text/css'

    # Add these routes after your health check route in main.py:

    @app.route("/api/debug")
    async def debug_info(request):
        return json({
            "message": "Debug endpoint working",
            "timestamp": str(datetime.now()),
            "request_path": request.path,
            "auth_available": AUTH_AVAILABLE
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
        # Ensure data directory exists
        os.makedirs("./data", exist_ok=True)
        init_database(app.config.DATABASE_URL)
        print("✅ Database initialized")
    
    # Cleanup on shutdown
    @app.after_server_stop
    async def cleanup_database_connections(app, loop):
        cleanup_database()
        print("🧹 Database connections cleaned up")
    
    return app

# Create app instance
app = create_app()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0", 
        port=8000, 
        debug=True,
        auto_reload=True  # Automatically reload on file changes
    )