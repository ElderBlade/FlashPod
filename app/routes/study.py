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
from config.timezone import tz_config

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
        
        # Check for existing active session
        existing_session = session.query(StudySession).filter_by(
            user_id=user_id,
            deck_id=deck_id,
            ended_at=None  # Session is still active
        ).order_by(StudySession.started_at.desc()).first()
        
        if existing_session:
            print(f"Found existing active session {existing_session.id} for deck {deck_id}")
            
            if existing_session.paused_at:
                try:
                    now_local = tz_config.now()
                        
                    # Convert paused_at from UTC to server timezone
                    paused_at_local = tz_config.utc_to_local(existing_session.paused_at)
                    
                    # Now both times are in the same timezone
                    paused_duration = (now_local - paused_at_local).total_seconds() / 60
                    existing_session.total_paused_minutes = (existing_session.total_paused_minutes or 0) + round(paused_duration)
                    existing_session.paused_at = None
                    
                    session.commit()
                    print(f"Resumed session after {round(paused_duration)} minutes of pause")
                except Exception as resume_error:
                    print(f"Error updating pause state: {resume_error}")
                    session.rollback()
                
            # Get all active cards in the deck
            cards = session.query(Card).filter_by(
                deck_id=deck_id, 
                is_active=True
            ).order_by(Card.created_at).all()
            
            if not cards:
                return json({"error": "No cards found in this deck"}, status=404)
            
            # Prepare cards data
            cards_data = [card.to_dict() for card in cards]
            
            return json({
                "session": existing_session.to_dict(),
                "deck": deck.to_dict(),
                "cards": cards_data,
                "total_cards": len(cards_data),
                "current_index": 0,
                "resumed": True
            })
        
        # No existing session found, create a new one
        print(f"Creating new session for deck {deck_id}")
        
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
            "current_index": 0,
            "resumed": False
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
        print(f"🔍 DEBUG: Progress update called for session {session_id}")
        print(f"🔍 DEBUG: Request data: {data}")
        cards_studied = data.get("cards_studied")
        cards_correct = data.get("cards_correct")  # Add this

        print(f"🔍 DEBUG: Extracted values - cards_studied: {cards_studied}, cards_correct: {cards_correct}")
        
        # Get the study session
        study_session = session.query(StudySession).filter_by(id=session_id).first()
        if not study_session:
            return json({"error": "Study session not found"}, status=404)
        
        print(f"🔍 DEBUG: Found session - current values: cards_studied={study_session.cards_studied}, cards_correct={study_session.cards_correct}")

        # Update progress
        if cards_studied is not None:
            study_session.cards_studied = cards_studied
            print(f"🔍 DEBUG: Updated cards_studied to {cards_studied}")
        if cards_correct is not None:  # Add this
            study_session.cards_correct = cards_correct
            print(f"🔍 DEBUG: Updated cards_correct to {cards_correct}")
        
        session.commit()
        print(f"🔍 DEBUG: Committed changes to database")

        return json({
            "message": "Progress updated",
            "session": study_session.to_dict()
        })
        
    except Exception as e:
        print(f"❌ DEBUG: Error in update_session_progress: {e}")
        import traceback
        traceback.print_exc()
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


@study_bp.route("/pod/<pod_id:int>/session", methods=["GET", "POST"])
@require_auth
async def get_or_create_pod_study_session(request, pod_id):
    """Get existing study session or create a new one for a pod"""
    session = get_db_session()
    try:
        user_id = request.ctx.user['id']
        
        # Import Pod model
        from models.pod import Pod
        
        # Verify pod exists and user has access
        pod = session.query(Pod).filter_by(id=pod_id, user_id=user_id).first()
        if not pod:
            return json({"error": "Pod not found"}, status=404)
        
        # Check for existing active session
        existing_session = session.query(StudySession).filter_by(
            user_id=user_id,
            pod_id=pod_id,
            ended_at=None  # Session is still active
        ).order_by(StudySession.started_at.desc()).first()
        
        if existing_session:
            print(f"Found existing active session {existing_session.id} for pod {pod_id}")
            
            # Handle paused session resumption
            if existing_session.paused_at:
                try:
                    now_local = tz_config.now()
                    
                    # Convert paused_at from UTC to server timezone
                    paused_at_local = tz_config.utc_to_local(existing_session.paused_at)
                    
                    # Now both times are in the same timezone
                    paused_duration = (now_local - paused_at_local).total_seconds() / 60
                    existing_session.total_paused_minutes = (existing_session.total_paused_minutes or 0) + round(paused_duration)
                    existing_session.paused_at = None
                    session.commit()  # Commit immediately after updating pause state
                    print(f"Resumed session after {round(paused_duration)} minutes of pause")
                except Exception as resume_error:
                    print(f"Error updating pause state: {resume_error}")
                    session.rollback()
            
            # Get all active cards from all decks in the pod
            cards = []
            for pod_deck in pod.pod_decks:
                deck_cards = session.query(Card).filter_by(
                    deck_id=pod_deck.deck_id, 
                    is_active=True
                ).order_by(Card.created_at).all()
                
                # Add source deck information to each card
                for card in deck_cards:
                    card_dict = card.to_dict()
                    card_dict['source_deck_id'] = pod_deck.deck_id
                    card_dict['source_deck_name'] = pod_deck.deck.name
                    cards.append(card_dict)
            
            if not cards:
                return json({"error": "No cards found in this pod"}, status=404)
            
            return json({
                "session": existing_session.to_dict(),
                "pod": pod.to_dict(),
                "cards": cards,
                "total_cards": len(cards),
                "current_index": 0,
                "resumed": True  # Flag to indicate this is a resumed session
            })
        
        # No existing session found, create a new one
        print(f"Creating new session for pod {pod_id}")
        
        # Get all active cards from all decks in the pod
        cards = []
        for pod_deck in pod.pod_decks:
            deck_cards = session.query(Card).filter_by(
                deck_id=pod_deck.deck_id, 
                is_active=True
            ).order_by(Card.created_at).all()
            
            # Add source deck information to each card
            for card in deck_cards:
                card_dict = card.to_dict()
                card_dict['source_deck_id'] = pod_deck.deck_id
                card_dict['source_deck_name'] = pod_deck.deck.name
                cards.append(card_dict)
        
        if not cards:
            return json({"error": "No cards found in this pod"}, status=404)
        
        # Create a new study session for the pod
        study_session = StudySession(
            user_id=user_id,
            pod_id=pod_id,
            session_type='review'
        )
        
        session.add(study_session)
        session.commit()
        
        return json({
            "session": study_session.to_dict(),
            "pod": pod.to_dict(),
            "cards": cards,
            "total_cards": len(cards),
            "current_index": 0,
            "resumed": False  # Flag to indicate this is a new session
        })
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@study_bp.route("/session/<session_id:int>/pause", methods=["POST"])
@require_auth
async def pause_study_session(request, session_id):
    """Pause a study session"""
    session = get_db_session()
    try:
        # Get the study session
        study_session = session.query(StudySession).filter_by(id=session_id).first()
        if not study_session:
            return json({"error": "Study session not found"}, status=404)
        
        # Only pause if not already paused
        if not study_session.paused_at and not study_session.ended_at:
            study_session.paused_at = datetime.now(timezone.utc)
            session.commit()
            print(f"Paused session {session_id}")
        
        return json({"message": "Session paused"})
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()