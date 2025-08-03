# app/middleware/auth.py - Secure server-side authentication
from sanic import redirect
from sanic.response import json
import jwt
from datetime import datetime, timedelta
from models.database import get_db_session
from models.user import User

# JWT Configuration
JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Routes that don't require authentication
PUBLIC_ROUTES = {
    "/",
    "/login", 
    "/register",
    "/api/health",
    "/api/auth/login",
    "/api/auth/register"
}

# Static file patterns that don't require auth
STATIC_PATTERNS = [
    "/static/",
    "/favicon.ico"
]

def create_jwt_token(user_id: int, username: str) -> str:
    """Create a JWT token for user"""
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

def get_user_from_request(request) -> dict:
    """Extract user from request authentication"""
    # Check for JWT token in cookie
    token = request.cookies.get('auth_token')
    
    # Also check Authorization header for API requests
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
    
    if not token:
        return None
    
    # Verify token
    payload = verify_jwt_token(token)
    if not payload:
        return None
    
    # Verify user still exists and is active
    session = get_db_session()
    try:
        user = session.query(User).filter_by(
            id=payload['user_id'], 
            is_active=True
        ).first()
        
        if not user:
            return None
        
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    finally:
        session.close()

def is_public_route(path: str) -> bool:
    """Check if route is public (doesn't require auth)"""
    # Check exact matches
    if path in PUBLIC_ROUTES:
        return True
    
    # Check static file patterns
    for pattern in STATIC_PATTERNS:
        if path.startswith(pattern):
            return True
    
    return False

async def auth_middleware(request):
    """Middleware to handle authentication for all requests"""
    path = request.path
    
    # Skip authentication for public routes
    if is_public_route(path):
        return
    
    # Get user from request
    user = get_user_from_request(request)
    
    # Check if authentication is required
    if not user:
        # API routes return 401 JSON
        if path.startswith('/api/'):
            return json({'error': 'Authentication required'}, status=401)
        
        # Web routes redirect to login
        return redirect('/login')
    
    # Add user to request context for use in route handlers
    request.ctx.user = user

def require_auth(f):
    """Decorator to require authentication for specific routes"""
    async def wrapper(request, *args, **kwargs):
        user = get_user_from_request(request)
        if not user:
            if request.path.startswith('/api/'):
                return json({'error': 'Authentication required'}, status=401)
            else:
                return redirect('/login')
        
        request.ctx.user = user
        return await f(request, *args, **kwargs)
    
    wrapper.__name__ = f.__name__
    return wrapper