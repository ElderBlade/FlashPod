# app/main.py
from datetime import datetime
from sanic import Sanic, response
from sanic.response import html, json
from sanic_ext import Extend
from sanic.log import logger
import os
import aiosqlite
from pathlib import Path

# Get the project root (parent of app/ folder)
PROJECT_ROOT = Path(__file__).parent.parent
TEMPLATE_PATH = PROJECT_ROOT / "templates"

app = Sanic("FlashPod")

# Initialize Sanic Extensions (replaces sanic-cors)
Extend(app)

# Configuration
app.config.DATABASE_PATH = str(PROJECT_ROOT / "data" / "flashpod.db")
app.config.SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
app.config.DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# CORS configuration (handled by sanic-ext)
app.config.CORS_ORIGINS = ["http://localhost:8000", "http://127.0.0.1:8000"]
app.config.CORS_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
app.config.CORS_HEADERS = ["Content-Type", "Authorization"]

# Ensure data directory exists
os.makedirs(PROJECT_ROOT / "data", exist_ok=True)

# Static files
app.static("/static", str(PROJECT_ROOT / "static"))

@app.route("/")
async def index(request):
    """Serve login page"""
    template_path = PROJECT_ROOT / "templates" / "index.html"
    # with open(template_path, "r") as f:
    #     content = f.read()
    # return html(content)
    return await response.file_stream(template_path)

@app.route("/dashboard")
async def dashboard(request):
    """Main dashboard page"""
    return await response.file_stream(TEMPLATE_PATH / "dashboard.html")


@app.route("/api/health")
async def health_check(request):
    """Health check endpoint"""
    return json({"status": "ok", "timestamp": datetime.now().isoformat()})
 
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "False").lower() == "true"
    
    print(f"Starting FlashPod on {host}:{port}")
    print(f"Database: {app.config.DATABASE_PATH}")
    print(f"Debug mode: {debug}")
    
    app.run(
        host=host,
        port=port,
        debug=debug,
        auto_reload=debug
    )