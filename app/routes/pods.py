# app/routes/pods.py
from datetime import datetime, timedelta
from sanic import Blueprint
from sanic.response import json
from models.database import get_db_session
from models.user import User
from models.pod import Pod
from models.deck import Deck
from models.pod_deck import PodDeck
from middleware.auth import require_auth
from models.study_session import StudySession
from models.card_review import CardReview
from sqlalchemy import func

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

        pods = session.query(Pod).filter_by(user_id=user_id).order_by(Pod.created_at.desc()).all()
        pods_data = [pod.to_dict() for pod in pods]

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
    total_cards_correct = sum(s.cards_correct for s in sessions)
    
    # Calculate average accuracy
    accuracy = (total_cards_correct / total_cards_studied * 100) if total_cards_studied > 0 else 0
    
    # Get total study time
    completed_sessions = [s for s in sessions if s.ended_at]
    total_minutes = sum(s.duration_minutes or 0 for s in completed_sessions)
    
    return {
        'total_sessions': total_sessions,
        'total_cards_studied': total_cards_studied,
        'average_accuracy': round(accuracy, 1),
        'total_study_time_minutes': total_minutes,
        'last_studied': sessions[0].started_at.isoformat() if sessions else None
    }

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