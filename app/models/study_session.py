# app/models/study_session.py
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class StudySession(Base):
    __tablename__ = 'study_sessions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    deck_id = Column(Integer, ForeignKey('decks.id', ondelete='CASCADE'), nullable=True)
    pod_id = Column(Integer, ForeignKey('pods.id', ondelete='CASCADE'), nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)
    cards_studied = Column(Integer, default=0)
    cards_correct = Column(Integer, default=0)
    session_type = Column(String(20), default='review')  # 'review', 'learn', 'cram'
    mode = Column(String(20), default='basic') 
    paused_at = Column(DateTime, nullable=True)
    total_paused_minutes = Column(Integer, default=0)
    
    # Ensure exactly one of deck_id or pod_id is set
    __table_args__ = (
        CheckConstraint(
            '(deck_id IS NULL) != (pod_id IS NULL)',
            name='check_deck_or_pod'
        ),
    )
    
    # Relationships
    user = relationship("User", back_populates="study_sessions")
    deck = relationship("Deck", back_populates="study_sessions")
    pod = relationship("Pod", back_populates="study_sessions")
    card_reviews = relationship("CardReview", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        target = f"deck_id={self.deck_id}" if self.deck_id else f"pod_id={self.pod_id}"
        return f"<StudySession(id={self.id}, {target}, type='{self.session_type}')>"
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "deck_id": self.deck_id,
            "pod_id": self.pod_id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "cards_studied": self.cards_studied,
            "cards_correct": self.cards_correct,
            "session_type": self.session_type,
            "accuracy": round((self.cards_correct / self.cards_studied * 100), 2) if self.cards_studied > 0 else 0
        }
    
    @property
    def is_active(self):
        """Check if session is still active"""
        return self.ended_at is None
    
    @property
    def duration_minutes(self):
        """Get active study duration excluding paused time"""
        if not self.ended_at:
            return 0
        
        total_elapsed = (self.ended_at - self.started_at).total_seconds() / 60
        active_time = total_elapsed - (self.total_paused_minutes or 0)
        return max(0, round(active_time, 2))
    
    @property
    def is_paused(self):
        """Check if session is currently paused"""
        return self.paused_at is not None and self.ended_at is None