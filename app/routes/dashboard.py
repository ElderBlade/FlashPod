# app/routes/dashboard.py
"""
Dashboard API routes for statistics and metrics.
"""

from sanic import Blueprint
from sanic.response import json
from models.database import get_db_session
from middleware.auth import require_auth
from utils.statistics import get_dashboard_stats

dashboard_bp = Blueprint("dashboard", url_prefix="/api/dashboard")


@dashboard_bp.route("/stats", methods=["GET"])
@require_auth
async def get_dashboard_statistics(request):
    """
    Get all dashboard statistics for the authenticated user.
    Returns metrics for cards learned, retention rate, total reviews, and study time.
    """
    session = get_db_session()
    try:
        user_id = request.ctx.user['id']
        
        # Get all dashboard statistics
        stats = get_dashboard_stats(session, user_id)
        
        return json({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        print(f"Error getting dashboard stats: {e}")
        import traceback
        traceback.print_exc()
        return json({
            'success': False,
            'error': 'Failed to load dashboard statistics'
        }, status=500)
    finally:
        session.close()


@dashboard_bp.route("/stats/detailed", methods=["GET"])
@require_auth
async def get_detailed_statistics(request):
    """
    Get detailed statistics with additional breakdown.
    Optional query parameters:
    - days: Number of days to look back (default: 30)
    """
    session = get_db_session()
    try:
        user_id = request.ctx.user['id']
        days_back = int(request.args.get('days', 30))
        
        from utils.statistics import (
            get_cards_learned_count, 
            get_retention_rate, 
            get_total_reviews_count, 
            get_total_study_time
        )
        
        # Get individual metrics with custom timeframe
        stats = {
            'cards_learned': get_cards_learned_count(session, user_id),
            'retention_rate': get_retention_rate(session, user_id, days_back),
            'total_reviews': get_total_reviews_count(session, user_id),
            'study_time_hours': get_total_study_time(session, user_id),
            'timeframe_days': days_back
        }
        
        return json({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        print(f"Error getting detailed dashboard stats: {e}")
        import traceback
        traceback.print_exc()
        return json({
            'success': False,
            'error': 'Failed to load detailed statistics'
        }, status=500)
    finally:
        session.close()