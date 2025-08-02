# app/middleware/auth.py
from sanic import redirect
from functools import wraps

# Routes that don't require authentication
EXEMPT_ROUTES = {
    "/",
    "/login", 
    "/register",
    "/api/health",
    "/api/auth/login",
    "/api/auth/register"
}

# Static file patterns that don't require auth
EXEMPT_PATTERNS = [
    "/static/",
    "/favicon.ico"
]

def auth_required(f):
    """Decorator to require authentication for specific routes"""
    @wraps(f)
    async def wrapper(request, *args, **kwargs):
        # Check if user is authenticated (you'll implement this based on your auth strategy)
        if not is_authenticated(request):
            if request.path.startswith('/api/'):
                # API routes return JSON error
                from sanic.response import json
                return json({"error": "Authentication required"}, status=401)
            else:
                # Web routes redirect to login
                return redirect("/login")
        
        return await f(request, *args, **kwargs)
    return wrapper

def is_authenticated(request):
    """
    Check if request is authenticated.
    This is a simple implementation - you might want to use JWT tokens,
    session cookies, or other authentication methods in production.
    """
    # For now, we'll check for a simple session cookie or header
    # In a real app, you'd validate JWT tokens or session data
    
    # Check for Authorization header (for API requests)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        # In a real app, validate the token here
        return True
    
    # Check for session cookie (for web requests)
    session_cookie = request.cookies.get("flashpod_session")
    if session_cookie:
        # In a real app, validate the session here
        return True
    
    # For demo purposes, we'll also check a simple user_id parameter
    # This is NOT secure and only for development
    user_id = request.args.get("user_id") or request.json.get("user_id") if request.json else None
    if user_id:
        return True
    
    return False

def should_redirect_to_login(request):
    """Determine if request should be redirected to login"""
    path = request.path
    
    # Don't redirect exempt routes
    if path in EXEMPT_ROUTES:
        return False
    
    # Don't redirect static files
    for pattern in EXEMPT_PATTERNS:
        if path.startswith(pattern):
            return False
    
    # Don't redirect API routes (they should return 401)
    if path.startswith('/api/'):
        return False
    
    return True

async def auth_middleware(request):
    """Middleware to handle authentication for all requests"""
    # Skip authentication for exempt routes
    if not should_redirect_to_login(request):
        return
    
    # Check if user is authenticated
    if not is_authenticated(request):
        # Redirect to login page
        return redirect("/login")

async def api_auth_middleware(request):
    """Middleware specifically for API routes"""
    path = request.path
    
    # Only apply to API routes
    if not path.startswith('/api/'):
        return
    
    # Skip auth routes
    if path in ["/api/auth/login", "/api/auth/register", "/api/health"]:
        return
    
    # Check authentication
    if not is_authenticated(request):
        from sanic.response import json
        return json({"error": "Authentication required"}, status=401)