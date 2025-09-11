# app/utils/statistics.py
"""
Statistics utility module for dashboard metrics and retention calculations.
Centralizes all statistical calculations for better maintainability.
"""

from datetime import datetime, timedelta
from sqlalchemy import and_, func, distinct
from models.card_review import CardReview
from models.card import Card
from models.study_session import StudySession


def get_cards_learned_count(db_session, user_id):
    """
    Get total number of unique cards that have been successfully learned.
    A card is considered "learned" if it has at least one review with response_quality >= 3.
    """
    try:
        learned_cards = db_session.query(distinct(CardReview.card_id)).filter(
            and_(
                CardReview.user_id == user_id,
                CardReview.response_quality >= 3,
                CardReview.response_quality.isnot(None)
            )
        ).count()
        
        return learned_cards
        
    except Exception as e:
        print(f"Error calculating cards learned: {e}")
        return 0


def get_retention_rate(db_session, user_id, days_back=30):
    """
    Calculate overall retention rate: unique cards with response_quality >= 3 / total unique cards reviewed.
    Uses reviews from the last 30 days by default.
    """
    try:
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        # Get unique cards reviewed in the time period
        total_cards_reviewed = db_session.query(distinct(CardReview.card_id)).filter(
            and_(
                CardReview.user_id == user_id,
                CardReview.reviewed_at >= cutoff_date,
                CardReview.response_quality.isnot(None)
            )
        ).count()
        
        if total_cards_reviewed == 0:
            return 0
        
        # Get unique cards with good retention (response_quality >= 3)
        well_remembered_cards = db_session.query(distinct(CardReview.card_id)).filter(
            and_(
                CardReview.user_id == user_id,
                CardReview.reviewed_at >= cutoff_date,
                CardReview.response_quality >= 3,
                CardReview.response_quality.isnot(None)
            )
        ).count()
        
        retention_rate = round((well_remembered_cards / total_cards_reviewed) * 100)
        return retention_rate
        
    except Exception as e:
        print(f"Error calculating retention rate: {e}")
        return 0


def get_total_reviews_count(db_session, user_id):
    """
    Get total number of card reviews completed by the user.
    """
    try:
        total_reviews = db_session.query(CardReview).filter(
            and_(
                CardReview.user_id == user_id,
                CardReview.response_quality.isnot(None)
            )
        ).count()
        
        return total_reviews
        
    except Exception as e:
        print(f"Error calculating total reviews: {e}")
        return 0


def get_total_study_time(db_session, user_id):
    """
    Get total study time in hours from completed study sessions.
    """
    try:
        # Get all completed study sessions
        completed_sessions = db_session.query(StudySession).filter(
            and_(
                StudySession.user_id == user_id,
                StudySession.ended_at.isnot(None),
                StudySession.started_at.isnot(None)
            )
        ).all()
        
        total_minutes = 0
        for session in completed_sessions:
            duration = session.ended_at - session.started_at
            total_minutes += duration.total_seconds() / 60
        
        # Convert to hours and round to 1 decimal place
        total_hours = round(total_minutes / 60, 1)
        return total_hours
        
    except Exception as e:
        print(f"Error calculating total study time: {e}")
        return 0.0


def format_large_number(number):
    """
    Format large numbers with suffixes (1.2k, 2.5M, etc.)
    """
    if number >= 1_000_000:
        return f"{number / 1_000_000:.1f}M"
    elif number >= 1_000:
        return f"{number / 1_000:.1f}k"
    else:
        return str(number)


def format_study_time(hours):
    """
    Format study time for display (e.g., "2.3h", "45m")
    """
    if hours >= 1:
        return f"{hours}h"
    else:
        minutes = int(hours * 60)
        return f"{minutes}m"


def get_dashboard_stats(db_session, user_id):
    """
    Get all dashboard statistics in a single function call.
    Returns a dictionary with all four main metrics.
    """
    try:
        stats = {
            'cards_learned': get_cards_learned_count(db_session, user_id),
            'retention_rate': get_retention_rate(db_session, user_id),
            'total_reviews': get_total_reviews_count(db_session, user_id),
            'study_time_hours': get_total_study_time(db_session, user_id)
        }
        
        # Format for display
        stats['formatted'] = {
            'cards_learned': str(stats['cards_learned']),
            'retention_rate': f"{stats['retention_rate']}%",
            'total_reviews': format_large_number(stats['total_reviews']),
            'study_time': format_study_time(stats['study_time_hours'])
        }
        
        return stats
        
    except Exception as e:
        print(f"Error getting dashboard stats: {e}")
        return {
            'cards_learned': 0,
            'retention_rate': 0,
            'total_reviews': 0,
            'study_time_hours': 0.0,
            'formatted': {
                'cards_learned': '0',
                'retention_rate': '0%',
                'total_reviews': '0',
                'study_time': '0m'
            }
        }


def calculate_deck_retention_rate(db_session, deck_id, user_id, days_back=30):
    """
    Calculate retention rate for a specific deck.
    Uses unique cards with response_quality >= 3 / total unique cards reviewed.
    """
    try:
        # Get cards from this deck
        deck_cards = db_session.query(Card).filter_by(deck_id=deck_id).all()
        if not deck_cards:
            return 0
        
        card_ids = [card.id for card in deck_cards]
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        # Get unique cards reviewed in this deck
        total_cards_reviewed = db_session.query(distinct(CardReview.card_id)).filter(
            and_(
                CardReview.card_id.in_(card_ids),
                CardReview.user_id == user_id,
                CardReview.reviewed_at >= cutoff_date,
                CardReview.response_quality.isnot(None)
            )
        ).count()
        
        if total_cards_reviewed == 0:
            return 0
        
        # Get unique cards with good retention
        well_remembered_cards = db_session.query(distinct(CardReview.card_id)).filter(
            and_(
                CardReview.card_id.in_(card_ids),
                CardReview.user_id == user_id,
                CardReview.reviewed_at >= cutoff_date,
                CardReview.response_quality >= 3,
                CardReview.response_quality.isnot(None)
            )
        ).count()
        
        retention_rate = round((well_remembered_cards / total_cards_reviewed) * 100)
        return retention_rate
        
    except Exception as e:
        print(f"Error calculating deck retention rate: {e}")
        return 0


def calculate_sm2_retention(db_session, deck_id, user_id):
    """
    Calculate retention rate for SM-2 mode (moved from decks.py).
    For SM-2, retention = average response quality as percentage.
    """
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
                CardReview.response_quality.isnot(None)
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


def calculate_simple_retention(db_session, deck_id, user_id):
    """
    Calculate retention rate for simple-spaced mode (moved from decks.py).
    Uses the corrected formula: unique cards with quality >= 3 / total unique cards reviewed.
    """
    try:
        # Get cards from this deck
        deck_cards = db_session.query(Card).filter_by(deck_id=deck_id).all()
        if not deck_cards:
            return 0
        
        card_ids = [card.id for card in deck_cards]
        
        # Get recent reviews (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        # Get unique cards reviewed
        total_cards_reviewed = db_session.query(distinct(CardReview.card_id)).filter(
            and_(
                CardReview.card_id.in_(card_ids),
                CardReview.user_id == user_id,
                CardReview.reviewed_at >= thirty_days_ago,
                CardReview.response_quality.isnot(None)
            )
        ).count()
        
        if total_cards_reviewed == 0:
            return 0
        
        # Get unique cards with good retention (quality >= 3)
        well_remembered_cards = db_session.query(distinct(CardReview.card_id)).filter(
            and_(
                CardReview.card_id.in_(card_ids),
                CardReview.user_id == user_id,
                CardReview.reviewed_at >= thirty_days_ago,
                CardReview.response_quality >= 3,
                CardReview.response_quality.isnot(None)
            )
        ).count()
        
        return round((well_remembered_cards / total_cards_reviewed) * 100)
        
    except Exception as e:
        print(f"Error calculating simple retention: {e}")
        return 0