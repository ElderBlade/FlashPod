# app/models/deck.py
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
from models.pod_deck import PodDeck
from models.pod import Pod
from models.database import get_db_session

class Deck(Base):
    __tablename__ = 'decks'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    card_count = Column(Integer, default=0)
    study_settings = Column(JSON, default=lambda: {})
    
    # Relationships
    owner = relationship("User", back_populates="decks")
    cards = relationship("Card", back_populates="deck", cascade="all, delete-orphan")
    pod_decks = relationship("PodDeck", back_populates="deck", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="deck", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Deck(id={self.id}, name='{self.name}', cards={self.card_count})>"
    
    def to_dict(self, include_pods=False):
        """Convert to dictionary for JSON serialization"""
        result = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "card_count": self.card_count,
            "is_public": self.is_public,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_pods:
            
            session = get_db_session()
            try:
                pod_memberships = session.query(PodDeck, Pod).join(
                    Pod, PodDeck.pod_id == Pod.id
                ).filter(PodDeck.deck_id == self.id).all()
                
                result['pods'] = []
                for pod_deck, pod in pod_memberships:
                    result['pods'].append({
                        'id': pod.id,
                        'name': pod.name,
                        'display_order': pod_deck.display_order
                    })
            finally:
                session.close()
        
        return result