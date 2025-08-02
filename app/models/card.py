# app/models/card.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Card(Base):
    __tablename__ = 'cards'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    deck_id = Column(Integer, ForeignKey('decks.id', ondelete='CASCADE'), nullable=False)
    front_content = Column(Text, nullable=False)
    back_content = Column(Text, nullable=False)
    front_type = Column(String(20), default='text')
    back_type = Column(String(20), default='text')
    difficulty = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    is_active = Column(Boolean, default=True)
    tags = Column(Text)
    
    # Relationships
    deck = relationship("Deck", back_populates="cards")
    card_reviews = relationship("CardReview", back_populates="card", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Card(id={self.id}, deck_id={self.deck_id})>"
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "deck_id": self.deck_id,
            "front_content": self.front_content,
            "back_content": self.back_content,
            "front_type": self.front_type,
            "back_type": self.back_type,
            "difficulty": self.difficulty,
            "tags": self.tags,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }