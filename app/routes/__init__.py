# app/routes/__init__.py
from .auth import auth_bp
from .decks import decks_bp
from .cards import cards_bp
from .pods import pods_bp

__all__ = [
    'auth_bp',
    'decks_bp', 
    'cards_bp',
    'pods_bp'
]