# app/routes/decks.py
from sanic import Blueprint
from sanic.response import json
from models.database import get_db_session
from models.user import User
from models.deck import Deck
from middleware.auth import require_auth

decks_bp = Blueprint("decks", url_prefix="/api/decks")

@decks_bp.route("", methods=["POST"])
@require_auth
async def create_deck(request):
    """Create a new deck"""
    session = get_db_session()
    try:
        data = request.json
        # Get user_id from authenticated user instead of request body
        user_id = request.ctx.user['id']  # ← This should be here
        name = data.get("name")
        description = data.get("description", "")
        
        if not name:  # ← Only check for name, not user_id
            return json({"error": "Missing required field: name"}, status=400)
        
        # Create new deck
        new_deck = Deck(
            user_id=user_id,
            name=name,
            description=description
        )
        
        session.add(new_deck)
        session.commit()
        
        return json({
            "message": "Deck created successfully",
            "deck_id": new_deck.id,
            "name": new_deck.name
        }, status=201)
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()

@decks_bp.route("/<deck_id:int>", methods=["GET"])
async def get_deck(request, deck_id):
    """Get a specific deck"""
    session = get_db_session()
    try:
        deck = session.query(Deck).filter_by(id=deck_id).first()
        
        if not deck:
            return json({"error": "Deck not found"}, status=404)
        
        return json({"deck": deck.to_dict()})
    
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()

@decks_bp.route("/<deck_id:int>", methods=["PUT"])
async def update_deck(request, deck_id):
    """Update a deck"""
    session = get_db_session()
    try:
        data = request.json
        
        deck = session.query(Deck).filter_by(id=deck_id).first()
        if not deck:
            return json({"error": "Deck not found"}, status=404)
        
        # Update fields if provided
        if "name" in data:
            deck.name = data["name"]
        if "description" in data:
            deck.description = data["description"]
        if "is_public" in data:
            deck.is_public = data["is_public"]
        
        session.commit()
        
        return json({
            "message": "Deck updated successfully",
            "deck": deck.to_dict()
        })
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()

@decks_bp.route("/<deck_id:int>", methods=["DELETE"])
async def delete_deck(request, deck_id):
    """Delete a deck"""
    session = get_db_session()
    try:
        deck = session.query(Deck).filter_by(id=deck_id).first()
        
        if not deck:
            return json({"error": "Deck not found"}, status=404)
        
        deck_name = deck.name
        session.delete(deck)
        session.commit()
        
        return json({
            "message": f"Deck '{deck_name}' deleted successfully"
        })
    
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()

# User-specific deck routes

@decks_bp.route("/my-decks", methods=["GET"])
@require_auth
async def get_my_decks(request):
    """Get current user's decks"""
    session = get_db_session()
    try:
        # Get user ID from authenticated context
        user_id = request.ctx.user['id']
        
        decks = session.query(Deck).filter_by(user_id=user_id).order_by(Deck.created_at.desc()).all()
        decks_data = [deck.to_dict() for deck in decks]
        
        return json({"decks": decks_data})
    
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()
        
@decks_bp.route("/users/<user_id:int>", methods=["GET"])
async def get_user_decks(request, user_id):
    """Get all decks for a user"""
    session = get_db_session()
    try:
        decks = session.query(Deck).filter_by(user_id=user_id).order_by(Deck.created_at.desc()).all()
        
        decks_data = [deck.to_dict() for deck in decks]
        
        return json({"decks": decks_data})
    
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()