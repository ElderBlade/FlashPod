# app/routes/auth.py
from sanic import Blueprint
from sanic.response import json
from models.database import get_db_session, hash_password, verify_password
from models.user import User

auth_bp = Blueprint("auth", url_prefix="/api/auth")

@auth_bp.route("/register", methods=["POST"])
async def register(request):
    """Register a new user"""
    session = get_db_session()
    try:
        data = request.json
        username = data.get("username")
        email = data.get("email") 
        password = data.get("password")
        
        if not all([username, email, password]):
            return json({"error": "Missing required fields: username, email, password"}, status=400)
        
        # Validate password length
        if len(password) < 6:
            return json({"error": "Password must be at least 6 characters long"}, status=400)
        
        # Check if user already exists
        existing_user = session.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing_user:
            if existing_user.username == username:
                return json({"error": "Username already exists"}, status=409)
            else:
                return json({"error": "Email already exists"}, status=409)
        
        # Create new user
        new_user = User(
            username=username,
            email=email,
            password_hash=hash_password(password)
        )
        
        session.add(new_user)
        session.commit()
        
        return json({
            "message": "User registered successfully",
            "user": new_user.to_dict()
        }, status=201)
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()

@auth_bp.route("/login", methods=["POST"])
async def login(request):
    """Login user"""
    session = get_db_session()
    try:
        data = request.json
        username = data.get("username")
        password = data.get("password")
        
        if not all([username, password]):
            return json({"error": "Missing username or password"}, status=400)
        
        # Find user by username or email
        user = session.query(User).filter(
            (User.username == username) | (User.email == username)
        ).first()
        
        if not user or not verify_password(password, user.password_hash):
            return json({"error": "Invalid username or password"}, status=401)
        
        if not user.is_active:
            return json({"error": "Account is deactivated"}, status=401)
        
        # In a real app, you'd create a JWT token or session here
        return json({
            "message": "Login successful",
            "user": user.to_dict()
        })
        
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()

@auth_bp.route("/user/<user_id:int>", methods=["GET"])
async def get_user(request, user_id):
    """Get user profile"""
    session = get_db_session()
    try:
        user = session.query(User).filter_by(id=user_id).first()
        
        if not user:
            return json({"error": "User not found"}, status=404)
        
        return json({"user": user.to_dict()})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()

@auth_bp.route("/users", methods=["GET"])
async def list_users(request):
    """List all users (for development/admin)"""
    session = get_db_session()
    try:
        users = session.query(User).filter_by(is_active=True).all()
        users_data = [user.to_dict() for user in users]
        
        return json({"users": users_data})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()