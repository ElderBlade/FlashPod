# app/main.py - Main Sanic application with authentication
from sanic import Sanic, response
from sanic.response import json
from sanic_ext import Extend
import os
from pathlib import Path
import sys

# Add the app directory to Python path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import models and routes
from models.database import init_database, cleanup_database
from routes.auth import auth_bp
from routes.decks import decks_bp
from routes.cards import cards_bp
from routes.pods import pods_bp

# Import middleware (create the middleware directory)
# from middleware.auth import auth_middleware, api_auth_middleware

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
        return response.redirect("/login")
    
    @app.route("/login")
    async def login_page(request):
        return await response.file_stream(f"{app.config.TEMPLATE_PATH}/login.html")
    
    @app.route("/register")
    async def register_page(request):
        return await response.file_stream(f"{app.config.TEMPLATE_PATH}/register.html")
    
    # Protected routes (auth required)
    @app.route("/dashboard")
    async def dashboard(request):
        # For now, let the frontend handle auth checking
        # The JavaScript will redirect to login if needed
        return await response.file_stream(f"{app.config.TEMPLATE_PATH}/dashboard.html")
    
    # Health check
    @app.route("/api/health")
    async def health_check(request):
        return json({"status": "ok", "app": "FlashPod"})
    
    # Logout route
    @app.route("/logout")
    async def logout(request):
        # In a real app, you'd clear the session/JWT here
        return response.redirect("/login")
    
    # Register blueprints
    app.blueprint(auth_bp)
    app.blueprint(decks_bp)
    app.blueprint(cards_bp)
    app.blueprint(pods_bp)
    
    # Middleware for content types
    @app.middleware('response')
    async def add_headers(request, response):
        if request.path.endswith('.css'):
            response.headers['Content-Type'] = 'text/css'
    
    # Simple auth middleware (commented out for now - enable when ready)
    # @app.middleware('request')
    # async def check_auth(request):
    #     return await auth_middleware(request)
    
    # @app.middleware('request') 
    # async def check_api_auth(request):
    #     return await api_auth_middleware(request)
    
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