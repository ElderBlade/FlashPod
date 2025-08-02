# app/models/pod.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Pod(Base):
    __tablename__ = 'pods'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    deck_count = Column(Integer, default=0)
    total_card_count = Column(Integer, default=0)
    study_settings = Column(JSON, default=lambda: {})
    
    # Relationships
    owner = relationship("User", back_populates="pods")
    pod_decks = relationship("PodDeck", back_populates="pod", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="pod", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Pod(id={self.id}, name='{self.name}', decks={self.deck_count})>"
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "deck_count": self.deck_count,
            "total_card_count": self.total_card_count,
            "is_public": self.is_public,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "study_settings": self.study_settings
        }
    
    def get_decks(self):
        """Get all decks in this pod"""
        return [pd.deck for pd in self.pod_decks]