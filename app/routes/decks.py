# app/routes/decks.py
from datetime import datetime
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
@require_auth
async def import_file(request):
    """Import cards from uploaded file"""
    import csv
    import io
    
    session = get_db_session()
    try:
        # Get uploaded file
        upload_file = request.files.get('file')
        if not upload_file:
            return json({"error": "No file uploaded"}, status=400)
        
        # Read file content
        file_content = upload_file.body.decode('utf-8')
        lines = file_content.splitlines()
        
        # Extract metadata from FlashPod export format
        metadata = {
            'deck_name': None,
            'description': None,
            'is_flashpod_export': False
        }
        
        # Check for FlashPod export metadata
        for line in lines:
            if line.startswith('# FlashPod Export'):
                metadata['is_flashpod_export'] = True
            elif line.startswith('# Deck Name: '):
                metadata['deck_name'] = line[13:].strip()  # Remove "# Deck Name: "
            elif line.startswith('# Description: '):
                metadata['description'] = line[15:].strip()  # Remove "# Description: "
        
        # Parse CSV with proper handling
        cards_data = []
        csv_reader = csv.reader(io.StringIO(file_content))
        
        # Skip header if present
        first_row = next(csv_reader, None)
        if first_row and (first_row[0].lower() == 'term' or first_row[0].lower() == 'front'):
            pass  # Skip header
        else:
            # Process first row as data if it's not a comment or header
            if first_row and len(first_row) >= 2 and not first_row[0].startswith('#'):
                cards_data.append({
                    'term': first_row[0].strip(),
                    'definition': first_row[1].strip()
                })
        
        # Process remaining rows
        for row in csv_reader:
            if len(row) >= 2 and row[0].strip() and not row[0].startswith('#'):
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
    """Get user's decks with last session statistics"""
    session = get_db_session()
    try:
        user_id = request.ctx.user['id']
        
        # Get user's decks
        decks = session.query(Deck).filter_by(user_id=user_id).all()
        
        deck_data = []
        for deck in decks:
            
            # Get latest session that has card reviews for this deck
            latest_session = session.query(StudySession).filter(
                StudySession.user_id == user_id,
                StudySession.deck_id == deck.id
            ).filter(
                StudySession.id.in_(
                    session.query(CardReview.session_id).join(Card).filter(
                        Card.deck_id == deck.id,
                        CardReview.user_id == user_id,
                        CardReview.session_id.isnot(None)
                    ).distinct()
                )
            ).order_by(desc(StudySession.started_at)).first()
            
            # Get session stats
            session_stats = None
            if latest_session:
                # Calculate duration
                duration_minutes = 0
                if latest_session.ended_at and latest_session.started_at:
                    delta = latest_session.ended_at - latest_session.started_at
                    duration_minutes = round(delta.total_seconds() / 60)
                
                # Get card reviews from this session to determine mode
                session_reviews = session.query(CardReview).filter_by(
                    session_id=latest_session.id
                ).all()
                
                if session_reviews:                    
                    # Check if reviews have SM-2 data (ease_factor, next_review_date)
                    has_sm2_data = any(review.ease_factor != 2.5 or review.next_review_date 
                                     for review in session_reviews)
                                        
                    if has_sm2_data:
                        # SM-2 mode
                        next_review, cards_due = get_sm2_due_info(session, deck.id, user_id)
                        session_stats = {
                            'mode': 'full-spaced',
                            'next_review': next_review.isoformat() if next_review else None,
                            'cards_due': cards_due,
                            'duration_minutes': duration_minutes,
                            'retention_rate': calculate_sm2_retention(session, deck.id, user_id),
                            'is_overdue': next_review.date() <= datetime.now(timezone.utc).date() if next_review else False
                        }
                    else:
                        # Simple spaced mode
                        session_stats = {
                            'mode': 'simple-spaced',
                            'last_reviewed': latest_session.started_at.isoformat(),
                            'duration_minutes': duration_minutes,
                            'retention_rate': calculate_simple_retention(session, deck.id, user_id),
                            'total_cards': latest_session.cards_studied or 0
                        }
                        
            deck_data.append({
                'id': deck.id,
                'name': deck.name,
                'description': deck.description,
                'card_count': deck.card_count,
                'created_at': deck.created_at.isoformat(),
                'session_stats': session_stats  # Will be None if no valid sessions
            })
        
        return json({'decks': deck_data})
        
    except Exception as e:
        print(f"Error getting decks with stats: {e}")
        import traceback
        traceback.print_exc()
        return json({'error': str(e)}, status=500)
    finally:
        session.close()


def calculate_simple_retention(db_session, deck_id, user_id):
    """Calculate retention rate for simple-spaced mode"""
    try:
        # Get cards from this deck
        deck_cards = db_session.query(Card).filter_by(deck_id=deck_id).all()
        if not deck_cards:
            return 0
        
        card_ids = [card.id for card in deck_cards]
        
        # Get recent reviews (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_reviews = db_session.query(CardReview).filter(
            and_(
                CardReview.card_id.in_(card_ids),
                CardReview.user_id == user_id,
                CardReview.reviewed_at >= thirty_days_ago,
                CardReview.response_quality.isnot(None)  # ADD THIS LINE - filter out NULL values
            )
        ).all()
        
        if not recent_reviews:
            return 0
        
        # Calculate retention (reviews with quality >= 3 are "remembered")
        good_reviews = sum(1 for review in recent_reviews if review.response_quality >= 3)
        return round((good_reviews / len(recent_reviews)) * 100)
        
    except Exception as e:
        print(f"Error calculating simple retention: {e}")
        return 0


def get_sm2_due_info(db_session, deck_id, user_id):
    """Get next review date and cards due for SM-2 mode"""
    
    try:
        # Get cards from this deck
        deck_cards = db_session.query(Card).filter_by(deck_id=deck_id).all()
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


def calculate_sm2_retention(db_session, deck_id, user_id):
    """Calculate retention rate for SM-2 mode"""
    
    try:
        # Get cards from this deck
        deck_cards = db_session.query(Card).filter_by(deck_id=deck_id).all()
        if not deck_cards:
            return 0
        
        card_ids = [card.id for card in deck_cards]
        
        # Get recent reviews (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_reviews = db_session.query(CardReview).filter(
            and_(
                CardReview.card_id.in_(card_ids),
                CardReview.user_id == user_id,
                CardReview.reviewed_at >= thirty_days_ago
            )
        ).all()
        
        if not recent_reviews:
            return 0
        
        # For SM-2, retention = average response quality as percentage
        # Quality 1=25%, 2=50%, 3=75%, 4=100%
        quality_to_percent = {1: 25, 2: 50, 3: 75, 4: 100}
        total_retention = sum(quality_to_percent.get(review.response_quality, 0) 
                            for review in recent_reviews)
        
        return round(total_retention / len(recent_reviews))
        
    except Exception as e:
        print(f"Error calculating SM-2 retention: {e}")
        return 0