# app/routes/study.py
from sanic import Blueprint
from sanic.response import json
from models.database import get_db_session
from models.deck import Deck
from models.card import Card
from models.study_session import StudySession
from models.card_review import CardReview
from middleware.auth import require_auth
from datetime import datetime, timezone

study_bp = Blueprint("study", url_prefix="/api/study")

@study_bp.route("/deck/<deck_id:int>/session", methods=["GET", "POST"])
@require_auth
async def get_or_create_study_session(request, deck_id):
    """Get existing study session or create a new one for a deck"""
    session = get_db_session()
    try:
        user_id = request.ctx.user['id']
        
        # Verify deck exists and user has access
        deck = session.query(Deck).filter_by(id=deck_id).first()
        if not deck:
            return json({"error": "Deck not found"}, status=404)
        
        # For basic review mode, we'll create a simple session without complex state
        # Get all active cards in the deck
        cards = session.query(Card).filter_by(
            deck_id=deck_id, 
            is_active=True
        ).order_by(Card.created_at).all()
        
        if not cards:
            return json({"error": "No cards found in this deck"}, status=404)
        
        # Create a new study session
        study_session = StudySession(
            user_id=user_id,
            deck_id=deck_id,
            session_type='review'
        )
        
        session.add(study_session)
        session.commit()
        
        # Prepare cards data
        cards_data = [card.to_dict() for card in cards]
        
        return json({
            "session": study_session.to_dict(),
            "deck": deck.to_dict(),
            "cards": cards_data,
            "total_cards": len(cards_data),
            "current_index": 0
        })
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@study_bp.route("/session/<session_id:int>/progress", methods=["POST"])
@require_auth
async def update_session_progress(request, session_id):
    """Update study session progress (for basic review mode)"""
    session = get_db_session()
    try:
        data = request.json
        current_index = data.get("current_index", 0)
        cards_studied = data.get("cards_studied", 0)
        
        # Get the study session
        study_session = session.query(StudySession).filter_by(id=session_id).first()
        if not study_session:
            return json({"error": "Study session not found"}, status=404)
        
        # Update progress
        study_session.cards_studied = cards_studied
        
        session.commit()
        
        return json({
            "message": "Progress updated",
            "session": study_session.to_dict()
        })
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@study_bp.route("/session/<session_id:int>/complete", methods=["POST"])
@require_auth
async def complete_study_session(request, session_id):
    """Complete a study session"""
    session = get_db_session()
    try:
        # Get the study session
        study_session = session.query(StudySession).filter_by(id=session_id).first()
        if not study_session:
            return json({"error": "Study session not found"}, status=404)
        
        # Mark session as completed
        study_session.ended_at = datetime.now(timezone.utc)
        
        session.commit()
        
        return json({
            "message": "Study session completed",
            "session": study_session.to_dict()
        })
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@study_bp.route("/card/<card_id:int>", methods=["PUT"])
@require_auth
async def update_card_during_study(request, card_id):
    """Update a card during study session"""
    session = get_db_session()
    try:
        data = request.json
        
        card = session.query(Card).filter_by(id=card_id).first()
        if not card:
            return json({"error": "Card not found"}, status=404)
        
        # Update card fields
        if "front_content" in data:
            card.front_content = data["front_content"]
        if "back_content" in data:
            card.back_content = data["back_content"]
        if "tags" in data:
            card.tags = data["tags"]
        
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