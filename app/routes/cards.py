# app/routes/cards.py
from sanic import Blueprint
from sanic.response import json
from sqlalchemy import func
from models.database import get_db_session
from models.deck import Deck
from models.card import Card

cards_bp = Blueprint("cards", url_prefix="/api/cards")

@cards_bp.route("/deck/<deck_id:int>", methods=["POST"])
async def create_card(request, deck_id):
    """Create a new card in a deck"""
    session = get_db_session()
    try:
        data = request.json
        front_content = data.get("front_content")
        back_content = data.get("back_content")
        front_type = data.get("front_type", "text")
        back_type = data.get("back_type", "text")
        tags = data.get("tags", "")
        display_order = data.get("display_order")
        
        if not all([front_content, back_content]):
            return json({"error": "Missing required fields: front_content, back_content"}, status=400)
        
        # Verify deck exists
        deck = session.query(Deck).filter_by(id=deck_id).first()
        if not deck:
            return json({"error": "Deck not found"}, status=404)
        
        # If no display_order provided, set it to the next available position
        if display_order is None:
            max_order = session.query(func.max(Card.display_order)).filter_by(
                deck_id=deck_id, is_active=True
            ).scalar() or 0
            display_order = max_order + 1
        
        # Create new card
        new_card = Card(
            deck_id=deck_id,
            front_content=front_content,
            back_content=back_content,
            front_type=front_type,
            back_type=back_type,
            tags=tags,
            display_order=display_order
        )
        
        session.add(new_card)
        
        # Update deck card count
        deck.card_count += 1
        
        session.commit()
        
        return json({
            "message": "Card created successfully",
            "card": new_card.to_dict()
        }, status=201)
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@cards_bp.route("/deck/<deck_id:int>", methods=["GET"])
async def get_deck_cards(request, deck_id):
    """Get all cards in a deck"""
    session = get_db_session()
    try:
        # Verify deck exists
        deck = session.query(Deck).filter_by(id=deck_id).first()
        if not deck:
            return json({"error": "Deck not found"}, status=404)
        
        # Get cards ordered by display_order, then by created_at
        cards = session.query(Card).filter_by(
            deck_id=deck_id, 
            is_active=True
        ).order_by(Card.display_order, Card.created_at).all()
        
        cards_data = [card.to_dict() for card in cards]
        
        return json({
            "cards": cards_data,
            "deck": deck.to_dict()
        })
    
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@cards_bp.route("/deck/<deck_id:int>/reorder", methods=["PUT"])
async def reorder_deck_cards(request, deck_id):
    """Reorder cards within a deck"""
    session = get_db_session()
    try:
        data = request.json
        card_orders = data.get("card_orders", [])  # List of {card_id: int, order: int}
        
        if not card_orders:
            return json({"error": "Missing card_orders"}, status=400)
        
        # Verify deck exists
        deck = session.query(Deck).filter_by(id=deck_id).first()
        if not deck:
            return json({"error": "Deck not found"}, status=404)
        
        # Update display orders
        for item in card_orders:
            card_id = item.get("card_id")
            new_order = item.get("order")
            
            if card_id is not None and new_order is not None:
                card = session.query(Card).filter_by(
                    id=card_id, 
                    deck_id=deck_id
                ).first()
                
                if card:
                    card.display_order = new_order
        
        session.commit()
        
        return json({
            "message": "Card order updated successfully"
        })
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@cards_bp.route("/<card_id:int>", methods=["GET"])
async def get_card(request, card_id):
    """Get a specific card"""
    session = get_db_session()
    try:
        card = session.query(Card).filter_by(id=card_id).first()
        
        if not card:
            return json({"error": "Card not found"}, status=404)
        
        return json({"card": card.to_dict()})
    
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@cards_bp.route("/<card_id:int>", methods=["PUT"])
async def update_card(request, card_id):
    """Update a card"""
    session = get_db_session()
    try:
        data = request.json
        
        card = session.query(Card).filter_by(id=card_id).first()
        if not card:
            return json({"error": "Card not found"}, status=404)
        
        # Update fields if provided
        if "front_content" in data:
            card.front_content = data["front_content"]
        if "back_content" in data:
            card.back_content = data["back_content"]
        if "front_type" in data:
            card.front_type = data["front_type"]
        if "back_type" in data:
            card.back_type = data["back_type"]
        if "tags" in data:
            card.tags = data["tags"]
        if "display_order" in data:
            card.display_order = data["display_order"]
        if "difficulty" in data:
            card.difficulty = data["difficulty"]
        
        session.commit()
        
        return json({
            "message": "Card updated successfully",
            "card": card.to_dict()
        })
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@cards_bp.route("/<card_id:int>", methods=["DELETE"])
async def delete_card(request, card_id):
    """Delete a card (soft delete)"""
    session = get_db_session()
    try:
        card = session.query(Card).filter_by(id=card_id).first()
        
        if not card:
            return json({"error": "Card not found"}, status=404)
        
        # Soft delete - mark as inactive
        card.is_active = False
        
        # Update deck card count
        deck = session.query(Deck).filter_by(id=card.deck_id).first()
        if deck:
            deck.card_count = max(0, deck.card_count - 1)
        
        session.commit()
        
        return json({
            "message": "Card deleted successfully"
        })
    
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@cards_bp.route("/search", methods=["GET"])
async def search_cards(request):
    """Search cards by content or tags"""
    session = get_db_session()
    try:
        query = request.args.get("q", "")
        user_id = request.args.get("user_id")
        
        if not query:
            return json({"error": "Search query required"}, status=400)
        
        # Build search query
        cards_query = session.query(Card).filter(Card.is_active == True)
        
        # Filter by user if provided
        if user_id:
            cards_query = cards_query.join(Deck).filter(Deck.user_id == user_id)
        
        # Search in front content, back content, and tags
        search_filter = (
            Card.front_content.contains(query) |
            Card.back_content.contains(query) |
            Card.tags.contains(query)
        )
        
        cards = cards_query.filter(search_filter).limit(50).all()
        cards_data = [card.to_dict() for card in cards]
        
        return json({
            "cards": cards_data,
            "query": query,
            "count": len(cards_data)
        })
    
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()