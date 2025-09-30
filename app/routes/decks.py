# app/routes/decks.py
from datetime import datetime
import csv
import io
from sanic import Blueprint
from sanic.response import json, HTTPResponse
from sqlalchemy import desc, func, and_
from datetime import datetime, timedelta, timezone
from models.database import get_db_session
from models.study_session import StudySession
from models.card_review import CardReview
from models.user import User
from models.deck import Deck
from models.card import Card
from models.pod_deck import PodDeck
from utils.statistics import calculate_sm2_retention, calculate_simple_retention
from middleware.auth import require_auth
from config.timezone import tz_config
import re

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


@decks_bp.route("/import-file", methods=["POST"])
async def import_file(request):
    """Parse uploaded CSV/TSV file and return card data"""
    session = get_db_session()
    try:
        upload_file = request.files.get('file')
        if not upload_file:
            return json({"error": "No file uploaded"}, status=400)
        
        # Read file content
        file_content = upload_file.body.decode('utf-8')
        
        # Extract metadata from FlashPod export format
        metadata = {
            'deck_name': None,
            'description': None,
            'is_flashpod_export': False
        }
        
        # Remove comment lines while preserving empty lines in CSV data
        # This is important for multi-line CSV fields
        lines = []
        for line in file_content.split('\n'):
            stripped = line.strip()
            if stripped.startswith('#'):
                # Process metadata from comments
                if line.startswith('# FlashPod Export'):
                    metadata['is_flashpod_export'] = True
                elif line.startswith('# Deck Name: '):
                    metadata['deck_name'] = line[13:].strip()
                elif line.startswith('# Description: '):
                    metadata['description'] = line[15:].strip()
                # Skip adding comment lines to filtered content
            else:
                # Keep all non-comment lines, including empty lines
                lines.append(line)
        
        # Join back and parse as CSV
        filtered_content = '\n'.join(lines)
        csv_reader = csv.reader(io.StringIO(filtered_content))
        
        # Parse CSV with proper handling
        cards_data = []

        # Skip header if present
        first_row = next(csv_reader, None)
        if first_row and first_row[0].lower().strip() == 'term':
            pass  # Skip header
        else:
            # Process first row as data if it's not a header
            if first_row and len(first_row) >= 2 and first_row[0].strip():
                cards_data.append({
                    'term': first_row[0].strip(),
                    'definition': first_row[1].strip()
                })

        # Process remaining rows
        for row in csv_reader:
            if len(row) >= 2 and row[0].strip():
                cards_data.append({
                    'term': row[0].strip(),
                    'definition': row[1].strip()
                })
        
        return json({
            "cards": cards_data,
            "metadata": metadata
        })
        
    except Exception as e:
        return json({"error": f"Failed to parse file: {str(e)}"}, status=400)
    finally:
        session.close()


@decks_bp.route("/<deck_id:int>/export", methods=["GET"])
async def export_deck(request, deck_id):
    """Export deck as CSV"""
    session = get_db_session()
    try:
        # Get deck with verification
        deck = session.query(Deck).filter_by(id=deck_id).first()
        if not deck:
            return json({"error": "Deck not found"}, status=404)
        
        # Get all active cards for this deck
        cards = session.query(Card).filter_by(
            deck_id=deck_id, 
            is_active=True
        ).order_by(Card.display_order, Card.created_at).all()
        
        # Create CSV content with metadata
        csv_lines = []
        
        # Add metadata as comments (will be ignored by most CSV readers)
        csv_lines.append(f"# FlashPod Export")
        csv_lines.append(f"# Deck Name: {deck.name}")
        if deck.description:
            csv_lines.append(f"# Description: {deck.description}")
        csv_lines.append(f"# Cards: {len(cards)}")
        csv_lines.append(f"# Export Date: {datetime.now().isoformat()}")
        csv_lines.append("")  # Empty line
        
        # Add header
        csv_lines.append("Term,Definition,Tags")
        
        for card in cards:
            # Escape CSV fields properly
            term = card.front_content.replace('"', '""')
            definition = card.back_content.replace('"', '""')
            tags = (card.tags or "").replace('"', '""')
            
            # Wrap in quotes to handle commas and newlines
            csv_lines.append(f'"{term}","{definition}","{tags}"')
        
        csv_content = "\n".join(csv_lines)
        
        # Create filename with sanitized deck name
        safe_name = re.sub(r'[^\w\-_.]', '_', deck.name)
        filename = f"{safe_name}_{deck.id}.csv"
        
        # Return CSV response
        return HTTPResponse(
            csv_content,
            status=200,
            headers={
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


# User specific routes
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


@decks_bp.route('/my-decks-with-stats', methods=['GET'])
@require_auth
async def get_my_decks_with_stats(request):
    """Get user's decks with last session statistics including pod sessions"""
    session = get_db_session()
    try:
        user_id = request.ctx.user['id']
        
        # Get user's decks
        decks = session.query(Deck).filter_by(user_id=user_id).order_by(Deck.created_at.desc()).all()
        deck_data = []
        
        for deck in decks:
            # Get latest session for this deck (direct deck sessions)
            # ONLY consider sessions with trackable modes (not 'basic')
            latest_deck_session = session.query(StudySession).filter_by(
                deck_id=deck.id, 
                user_id=user_id
            ).filter(
                StudySession.ended_at.isnot(None),
                StudySession.mode.in_(['simple-spaced', 'full-spaced'])  # Only trackable modes
            ).order_by(StudySession.ended_at.desc()).first()
            
            # Get latest pod session that included this deck
            # ONLY consider sessions with trackable modes (not 'basic')
            latest_pod_session = session.query(StudySession).join(
                PodDeck, StudySession.pod_id == PodDeck.pod_id
            ).filter(
                PodDeck.deck_id == deck.id,
                StudySession.user_id == user_id,
                StudySession.ended_at.isnot(None),
                StudySession.mode.in_(['simple-spaced', 'full-spaced'])  # Only trackable modes
            ).order_by(StudySession.ended_at.desc()).first()
            
            # Determine which session is more recent
            latest_session = None
            if latest_deck_session and latest_pod_session:
                latest_session = latest_deck_session if latest_deck_session.ended_at > latest_pod_session.ended_at else latest_pod_session
            elif latest_deck_session:
                latest_session = latest_deck_session
            elif latest_pod_session:
                latest_session = latest_pod_session
            
            session_stats = None
            if latest_session:
                duration_minutes = latest_session.duration_minutes or 0
                
                if latest_session.mode == 'full-spaced':
                    # SM-2 mode stats
                    next_review, cards_due = get_sm2_due_info(session, deck.id, user_id)
                    session_stats = {
                        'mode': 'full-spaced',
                        'next_review': next_review.isoformat() if next_review else None,
                        'cards_due': cards_due,
                        'duration_minutes': duration_minutes,
                        'retention_rate': calculate_sm2_retention(session, user_id, deck.id),
                        'is_overdue': tz_config.utc_to_local(next_review).date() <= tz_config.now().date() if next_review else False,
                        'last_studied': latest_session.ended_at.isoformat(),
                        'session_type': 'pod' if latest_session.pod_id else 'deck'
                    }
                elif latest_session.mode == 'simple-spaced':
                    session_stats = {
                        'mode': 'simple-spaced',
                        'last_reviewed': latest_session.ended_at.isoformat(),
                        'duration_minutes': duration_minutes,
                        'retention_rate': calculate_simple_retention_including_pods(session, deck.id, user_id),
                        'total_cards': latest_session.cards_studied or 0,
                        'session_type': 'pod' if latest_session.pod_id else 'deck'
                    }
            
            deck_dict = deck.to_dict(include_pods=True)
            deck_dict['session_stats'] = session_stats
            deck_data.append(deck_dict)
        
        return json({'decks': deck_data})
        
    except Exception as e:
        print(f"Error getting decks with stats: {e}")
        import traceback
        traceback.print_exc()
        return json({'error': str(e)}, status=500)
    finally:
        session.close()


def get_sm2_due_info(db_session, deck_id, user_id):
    """Get next review date and cards due for SM-2 mode"""
    
    try:
        # Get cards from this deck
        deck_cards = db_session.query(Card).filter_by(deck_id=deck_id, is_active=True).all()
        if not deck_cards:
            return None, 0
        
        card_ids = [card.id for card in deck_cards]
        total_cards = len(card_ids)
        
        # Get the latest review for each card
        latest_reviews_subquery = db_session.query(
            CardReview.card_id,
            func.max(CardReview.reviewed_at).label('latest_reviewed_at')
        ).filter(
            CardReview.card_id.in_(card_ids),
            CardReview.user_id == user_id
        ).group_by(CardReview.card_id).subquery()
        
        latest_reviews = db_session.query(CardReview).join(
            latest_reviews_subquery,
            and_(
                CardReview.card_id == latest_reviews_subquery.c.card_id,
                CardReview.reviewed_at == latest_reviews_subquery.c.latest_reviewed_at
            )
        ).filter(CardReview.user_id == user_id).all()
        
        # Build review schedule using configured timezone
        now = tz_config.now()  # Now using configured timezone
        reviewed_card_ids = set()
        review_dates = []
        cards_due_now = 0
        
        for review in latest_reviews:
            reviewed_card_ids.add(review.card_id)
            if review.next_review_date:
                review_date = review.next_review_date
                if review_date.tzinfo is None:
                    review_date = review_date.replace(tzinfo=timezone.utc)
                
                # Convert to local timezone for date comparison
                local_review_date = tz_config.utc_to_local(review_date)
                
                if local_review_date.date() <= now.date():
                    cards_due_now += 1
                else:
                    review_dates.append(review_date)
        
        # Cards never reviewed are also available now
        never_reviewed_count = total_cards - len(reviewed_card_ids)
        cards_due_now += never_reviewed_count
        
        # Find the next review session
        if cards_due_now > 0:
            # Cards are due now - find the earliest overdue date to show as "overdue since"
            overdue_dates = []
            for review in latest_reviews:
                if review.next_review_date:
                    review_date = review.next_review_date
                    if review_date.tzinfo is None:
                        review_date = review_date.replace(tzinfo=timezone.utc)
                    
                    # Convert to local timezone for comparison
                    local_review_date = tz_config.utc_to_local(review_date)
                    if local_review_date <= now:  # Use converted date
                        overdue_dates.append(local_review_date)  # Store converted date
            
            if overdue_dates:
                # Return the earliest overdue date
                earliest_overdue = min(overdue_dates)
                return earliest_overdue, cards_due_now
            else:
                # No specific overdue date available, return current time
                return now, cards_due_now
        elif review_dates:
            # Find the earliest future review date (next session)
            next_session_date = min(review_dates)
            
            # Count cards due at that next session date
            # Convert to local timezone for date comparison
            next_local_date = tz_config.utc_to_local(next_session_date)
            cards_due_next_session = sum(
                1 for date in review_dates 
                if tz_config.utc_to_local(date).date() == next_local_date.date()
            )
            
            return next_session_date, cards_due_next_session
        else:
            # No future reviews scheduled
            return None, 0
        
    except Exception as e:
        print(f"Error getting SM-2 due info: {e}")
        import traceback
        traceback.print_exc()
        return None, 0
    

def calculate_simple_retention_including_pods(db_session, deck_id, user_id):
    """Calculate retention rate including both deck and pod sessions by looking at card reviews"""
    try:
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        # Get card IDs from this deck
        deck_card_ids = [card.id for card in db_session.query(Card).filter_by(
            deck_id=deck_id, 
            is_active=True
        ).all()]
        
        if not deck_card_ids:
            return 0
        
        # Get all reviews for these cards in the last 30 days
        # This automatically includes both direct deck sessions and pod sessions
        reviews = db_session.query(CardReview).filter(
            and_(
                CardReview.card_id.in_(deck_card_ids),
                CardReview.user_id == user_id,
                CardReview.reviewed_at >= thirty_days_ago,
                CardReview.response_quality.isnot(None)
            )
        ).all()
        
        if not reviews:
            return 0
        
        # Count reviews where response_quality >= 3 (remembered)
        remembered_reviews = sum(1 for review in reviews if review.response_quality >= 3)
        
        return round((remembered_reviews / len(reviews)) * 100, 1)
        
    except Exception as e:
        print(f"Error calculating retention with pods: {e}")
        import traceback
        traceback.print_exc()
        return 0