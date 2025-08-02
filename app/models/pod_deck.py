# app/models/pod_deck.py
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class PodDeck(Base):
    __tablename__ = 'pod_decks'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    pod_id = Column(Integer, ForeignKey('pods.id', ondelete='CASCADE'), nullable=False)
    deck_id = Column(Integer, ForeignKey('decks.id', ondelete='CASCADE'), nullable=False)
    added_at = Column(DateTime, default=func.current_timestamp())
    display_order = Column(Integer, default=0)
    
    # Unique constraint to prevent duplicate deck additions
    __table_args__ = (UniqueConstraint('pod_id', 'deck_id', name='unique_pod_deck'),)
    
    # Relationships
    pod = relationship("Pod", back_populates="pod_decks")
    deck = relationship("Deck", back_populates="pod_decks")
    
    def __repr__(self):
        return f"<PodDeck(pod_id={self.pod_id}, deck_id={self.deck_id})>"
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "pod_id": self.pod_id,
            "deck_id": self.deck_id,
            "display_order": self.display_order,
            "added_at": self.added_at.isoformat() if self.added_at else None,
            "deck": self.deck.to_dict() if self.deck else None
        }