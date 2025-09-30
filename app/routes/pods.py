# app/routes/pods.py
from datetime import datetime, timedelta, timezone
from sanic import Blueprint
from sanic.response import json
from models.database import get_db_session
from models.user import User
from models.pod import Pod
from models.deck import Deck
from models.card import Card
from models.pod_deck import PodDeck
from middleware.auth import require_auth
from models.study_session import StudySession
from models.card_review import CardReview
from config.timezone import tz_config
from sqlalchemy import func, and_

pods_bp = Blueprint("pods", url_prefix="/api/pods")

@pods_bp.route("", methods=["POST"])
@require_auth  # Add this decorator
async def create_pod(request):
    """Create a new pod"""
    session = get_db_session()
    try:
        data = request.json
        # Get user_id from authenticated user instead of request body
        user_id = request.ctx.user['id']  # Change this line
        name = data.get("name")
        description = data.get("description", "")
        
        if not name:  # Change this line - only check for name
            return json({"error": "Missing required field: name"}, status=400)
        
        # Create new pod
        new_pod = Pod(
            user_id=user_id,
            name=name,
            description=description
        )
        
        session.add(new_pod)
        session.commit()
        
        return json({
            "message": "Pod created successfully",
            "pod": new_pod.to_dict()
        }, status=201)
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@pods_bp.route("/my-pods", methods=["GET"])
@require_auth
async def get_user_pods(request):
    """Get current user's pods"""
    session = get_db_session()
    try:
        user_id = request.ctx.user['id']
        include_stats = request.args.get('include_stats', 'false').lower() == 'true'

        pods = session.query(Pod).filter_by(user_id=user_id).order_by(Pod.created_at.desc()).all()
        pods_data = []
        
        for pod in pods:
            pod_dict = pod.to_dict()
            
            if include_stats:
                # Add study statistics
                stats = calculate_pod_study_stats(session, pod.id)
                pod_dict['study_stats'] = stats
                
            pods_data.append(pod_dict)

        return json({"pods": pods_data})
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@pods_bp.route("/<pod_id:int>", methods=["GET"])
@require_auth 
async def get_pod(request, pod_id):
    """Get a single pod"""
    session = get_db_session()
    try:
        include_stats = request.args.get('include_stats', 'false').lower() == 'true'
        
        pod = session.query(Pod).filter_by(id=pod_id).first()
        if not pod:
            return json({"error": "Pod not found"}, status=404)
        
        pod_dict = pod.to_dict()
        
        if include_stats:
            # Add study statistics
            stats = calculate_pod_study_stats(session, pod_id)
            pod_dict['study_stats'] = stats
            
        return json({"pod": pod_dict})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()

def calculate_pod_study_stats(session, pod_id):
    """Calculate study statistics for a pod"""
    
    # Get recent sessions (last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    sessions = session.query(StudySession).filter(
        StudySession.pod_id == pod_id,
        StudySession.started_at >= thirty_days_ago
    ).all()
    
    total_sessions = len(sessions)
    total_cards_studied = sum(s.cards_studied for s in sessions)
    
    # Get total study time
    completed_sessions = [s for s in sessions if s.ended_at]
    total_minutes = sum(s.duration_minutes or 0 for s in completed_sessions)

    # Calculate cards due for this pod
    cards_due = calculate_pod_cards_due(session, pod_id)
    
    # Calculate retention based on mode
    retention_rate = calculate_pod_retention(session, pod_id, sessions)
    
    return {
        'total_sessions': total_sessions,
        'cards_due': cards_due,
        'total_cards_studied': total_cards_studied,
        'average_accuracy': retention_rate,
        'total_study_time_minutes': total_minutes,
        'last_studied': sessions[0].started_at.isoformat() if sessions else None
    }

def calculate_pod_retention(db_session, pod_id, sessions=None):
    """
    Calculate retention rate for a pod based on session mode.
    For full-spaced: use session.cards_correct
    For simple-spaced: use CardReview.response_quality
    """
    try:
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        # Get sessions if not provided
        if sessions is None:
            sessions = db_session.query(StudySession).filter(
                StudySession.pod_id == pod_id,
                StudySession.started_at >= thirty_days_ago
            ).all()
        
        if not sessions:
            return 0
        
        # Separate sessions by mode
        full_spaced_sessions = [s for s in sessions if s.mode == 'full-spaced']
        simple_spaced_sessions = [s for s in sessions if s.mode == 'simple-spaced']
        
        total_studied = 0
        total_correct = 0
        
        # Handle full-spaced sessions (use cards_correct from session)
        for session in full_spaced_sessions:
            if session.cards_studied and session.cards_studied > 0:
                total_studied += session.cards_studied
                total_correct += session.cards_correct or 0
        
        # Handle simple-spaced sessions (use CardReview data)
        if simple_spaced_sessions:
            # Get all session IDs
            simple_session_ids = [s.id for s in simple_spaced_sessions]
            
            # Get reviews from these sessions
            reviews = db_session.query(CardReview).filter(
                and_(
                    CardReview.session_id.in_(simple_session_ids),
                    CardReview.response_quality.isnot(None)
                )
            ).all()
            
            if reviews:
                total_studied += len(reviews)
                total_correct += sum(1 for r in reviews if r.response_quality >= 3)
        
        return round((total_correct / total_studied) * 100, 1) if total_studied > 0 else 0
        
    except Exception as e:
        print(f"Error calculating pod retention: {e}")
        import traceback
        traceback.print_exc()
        return 0

@pods_bp.route("/<pod_id:int>/decks", methods=["POST"])
@require_auth 
async def add_deck_to_pod(request, pod_id):
    """Add a deck to a pod"""
    session = get_db_session()
    try:
        data = request.json
        deck_id = data.get("deck_id")
        display_order = data.get("display_order", 0)
        
        if not deck_id:
            return json({"error": "Missing required field: deck_id"}, status=400)
        
        # Verify pod exists
        pod = session.query(Pod).filter_by(id=pod_id).first()
        if not pod:
            return json({"error": "Pod not found"}, status=404)
        
        # Verify deck exists
        deck = session.query(Deck).filter_by(id=deck_id).first()
        if not deck:
            return json({"error": "Deck not found"}, status=404)
        
        # Check if deck already in pod
        existing = session.query(PodDeck).filter_by(pod_id=pod_id, deck_id=deck_id).first()
        if existing:
            return json({"error": "Deck already in pod"}, status=409)
        
        # Add deck to pod
        pod_deck = PodDeck(
            pod_id=pod_id,
            deck_id=deck_id,
            display_order=display_order
        )
        
        session.add(pod_deck)
        
        # Update pod counts
        pod.deck_count += 1
        pod.total_card_count += deck.card_count
        
        session.commit()
        
        return json({
            "message": "Deck added to pod successfully",
            "pod_deck": pod_deck.to_dict()
        }, status=201)
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@pods_bp.route("/<pod_id:int>/decks/<deck_id:int>", methods=["DELETE"])
@require_auth 
async def remove_deck_from_pod(request, pod_id, deck_id):
    """Remove a deck from a pod"""
    session = get_db_session()
    try:
        # Find the pod-deck relationship
        pod_deck = session.query(PodDeck).filter_by(pod_id=pod_id, deck_id=deck_id).first()
        
        if not pod_deck:
            return json({"error": "Deck not found in pod"}, status=404)
        
        # Get deck info for updating counts
        deck = session.query(Deck).filter_by(id=deck_id).first()
        pod = session.query(Pod).filter_by(id=pod_id).first()
        
        # Remove the relationship
        session.delete(pod_deck)
        
        # Update pod counts
        if pod and deck:
            pod.deck_count = max(0, pod.deck_count - 1)
            pod.total_card_count = max(0, pod.total_card_count - deck.card_count)
        
        session.commit()
        
        return json({
            "message": "Deck removed from pod successfully"
        })
    
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@pods_bp.route("/<pod_id:int>", methods=["PUT"])
@require_auth 
async def update_pod(request, pod_id):
    """Update a pod"""
    session = get_db_session()
    try:
        data = request.json
        
        pod = session.query(Pod).filter_by(id=pod_id).first()
        if not pod:
            return json({"error": "Pod not found"}, status=404)
        
        # Update fields if provided
        if "name" in data:
            pod.name = data["name"]
        if "description" in data:
            pod.description = data["description"]
        if "is_public" in data:
            pod.is_public = data["is_public"]
        if "study_settings" in data:
            pod.study_settings = data["study_settings"]
        
        session.commit()
        
        return json({
            "message": "Pod updated successfully",
            "pod": pod.to_dict()
        })
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@pods_bp.route("/<pod_id:int>", methods=["DELETE"])
@require_auth 
async def delete_pod(request, pod_id):
    """Delete a pod"""
    session = get_db_session()
    try:
        pod = session.query(Pod).filter_by(id=pod_id).first()
        
        if not pod:
            return json({"error": "Pod not found"}, status=404)
        
        pod_name = pod.name
        session.delete(pod)
        session.commit()
        
        return json({
            "message": f"Pod '{pod_name}' deleted successfully"
        })
    
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@pods_bp.route("/<pod_id:int>/decks/reorder", methods=["PUT"])
@require_auth 
async def reorder_pod_decks(request, pod_id):
    """Reorder decks within a pod"""
    session = get_db_session()
    try:
        data = request.json
        deck_orders = data.get("deck_orders", [])  # List of {deck_id: int, order: int}
        
        if not deck_orders:
            return json({"error": "Missing deck_orders"}, status=400)
        
        # Verify pod exists
        pod = session.query(Pod).filter_by(id=pod_id).first()
        if not pod:
            return json({"error": "Pod not found"}, status=404)
        
        # Update display orders
        for item in deck_orders:
            deck_id = item.get("deck_id")
            new_order = item.get("order")
            
            if deck_id is not None and new_order is not None:
                pod_deck = session.query(PodDeck).filter_by(
                    pod_id=pod_id, 
                    deck_id=deck_id
                ).first()
                
                if pod_deck:
                    pod_deck.display_order = new_order
        
        session.commit()
        
        return json({
            "message": "Deck order updated successfully"
        })
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@pods_bp.route("/<pod_id:int>/cards", methods=["GET"])
@require_auth 
async def get_pod_cards(request, pod_id):
    """Get all cards from all decks in a pod"""
    session = get_db_session()
    try:
        user_id = request.ctx.user['id']
        
        # Verify pod exists and belongs to user
        pod = session.query(Pod).filter_by(id=pod_id, user_id=user_id).first()
        if not pod:
            return json({"error": "Pod not found"}, status=404)
        
        # Get all cards from all decks in this pod
        cards = []
        for pod_deck in pod.pod_decks:
            from models.card import Card
            deck_cards = session.query(Card).filter_by(deck_id=pod_deck.deck_id).all()
            for card in deck_cards:
                card_dict = card.to_dict()
                card_dict['source_deck_id'] = pod_deck.deck_id
                card_dict['source_deck_name'] = pod_deck.deck.name
                cards.append(card_dict)
        
        return json({
            "pod": pod.to_dict(),
            "cards": cards
        })
        
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


def calculate_pod_cards_due(session, pod_id):
    """Calculate how many cards are due for review in a pod"""    
    try:
        
        # Get all cards from all decks in this pod
        pod_cards = session.query(Card).join(
            PodDeck, Card.deck_id == PodDeck.deck_id
        ).filter(
            PodDeck.pod_id == pod_id,
            Card.is_active == True
        ).all()
        
        if not pod_cards:
            return 0
        
        card_ids = [card.id for card in pod_cards]
        now = tz_config.now()  # Use timezone config's now() method
        
        # Get latest review for each card
        latest_reviews_subquery = session.query(
            CardReview.card_id,
            func.max(CardReview.reviewed_at).label('latest_reviewed_at')
        ).filter(
            CardReview.card_id.in_(card_ids)
        ).group_by(CardReview.card_id).subquery()
        
        latest_reviews = session.query(CardReview).join(
            latest_reviews_subquery,
            and_(
                CardReview.card_id == latest_reviews_subquery.c.card_id,
                CardReview.reviewed_at == latest_reviews_subquery.c.latest_reviewed_at
            )
        ).all()
        
        # Count cards due for review
        reviewed_card_ids = set()
        cards_due_now = 0
        
        for review in latest_reviews:
            reviewed_card_ids.add(review.card_id)
            if review.next_review_date:
                review_date = review.next_review_date
                if review_date.tzinfo is None:
                    review_date = review_date.replace(tzinfo=timezone.utc)
                
                # Convert to local timezone for date comparison (same as decks.py)
                local_review_date = tz_config.utc_to_local(review_date)
                
                # Card is due if next review date is today or before
                if local_review_date.date() <= now.date():
                    cards_due_now += 1
        
        # Cards never reviewed are also due now
        never_reviewed_count = len(card_ids) - len(reviewed_card_ids)
        cards_due_now += never_reviewed_count
        
        return cards_due_now
        
    except Exception as e:
        print(f"Error calculating pod cards due: {e}")
        return 0