# app/routes/card_reviews.py
from sanic import Blueprint, json as sanic_json
from sanic.response import json
from sqlalchemy import desc
from datetime import datetime
from models.card_review import CardReview
from models.card import Card
from models.deck import Deck
from middleware.auth import require_auth
import traceback

card_reviews = Blueprint('card_reviews', url_prefix='/api/cards/reviews')

@card_reviews.route('/<deck_id:int>', methods=['GET'])
@require_auth
async def get_deck_reviews(request, deck_id):
    """Get all review data for cards in a deck - temporary minimal implementation"""
    print(f"🔍 GET /api/cards/reviews/{deck_id} called")
    print(f"🔍 Request headers: {dict(request.headers)}")
    print(f"🔍 User from context: {getattr(request.ctx, 'user', 'No user in context')}")
    
    try:
        print(f"✅ Successfully processing request for deck {deck_id}")
        return json([])
        
    except Exception as e:
        print(f"❌ Error in get_deck_reviews: {e}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        return json({"error": str(e)}, status=500)

@card_reviews.route('', methods=['POST'])
@require_auth
async def create_review(request):
    """Create a new card review - temporary minimal implementation"""
    print(f"🔍 POST /api/cards/reviews called")
    
    try:
        user_id = request.ctx.user['id']
        data = request.json
        print(f"✅ Creating review: {data}")
        
        # Validate required fields
        required_fields = ['card_id', 'response_quality', 'ease_factor', 'interval_days', 'repetitions']
        for field in required_fields:
            if field not in data:
                return json({"error": f"Missing field: {field}"}, status=400)
        
        # Verify user owns the card
        card = request.app.db.query(Card)\
            .join(Deck)\
            .filter(Card.id == data['card_id'])\
            .filter(Deck.user_id == user_id)\
            .first()
        
        if not card:
            return json({"error": "Card not found"}, status=404)
        
        # Create review
        review = CardReview(
            card_id=data['card_id'],
            user_id=user_id,
            session_id=data.get('session_id'),
            response_quality=data['response_quality'],
            response_time=data.get('response_time'),
            ease_factor=data['ease_factor'],
            interval_days=data['interval_days'],
            repetitions=data['repetitions'],
            next_review_date=datetime.fromisoformat(data['next_review_date'].replace('Z', '+00:00')) if data.get('next_review_date') else None,
            reviewed_at=datetime.utcnow()
        )
        
        request.app.db.add(review)
        request.app.db.commit()
        
        return json(review.to_dict(), status=201)
        
    except Exception as e:
        print(f"Error creating review: {e}")
        request.app.db.rollback()
        return json({"error": "Internal server error"}, status=500)

@card_reviews.route('/<card_id:int>/history', methods=['GET'])
@require_auth
async def get_card_history(request, card_id):
    """Get review history for a specific card"""
    try:
        user_id = request.ctx.user['id']
        
        # Verify user owns the card
        card = request.app.db.query(Card)\
            .join(Deck)\
            .filter(Card.id == card_id)\
            .filter(Deck.user_id == user_id)\
            .first()
        
        if not card:
            return json({"error": "Card not found"}, status=404)
        
        # Get all reviews for this card
        reviews = request.app.db.query(CardReview)\
            .filter_by(card_id=card_id, user_id=user_id)\
            .order_by(desc(CardReview.reviewed_at))\
            .all()
        
        return json([review.to_dict() for review in reviews])
        
    except Exception as e:
        print(f"Error fetching card history: {e}")
        return json({"error": "Internal server error"}, status=500)