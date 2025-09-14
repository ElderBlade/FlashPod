# app/models/card_review.py
from sqlalchemy import Column, Integer, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta, timezone
from .database import Base

class CardReview(Base):
    __tablename__ = 'card_reviews'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    card_id = Column(Integer, ForeignKey('cards.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    session_id = Column(Integer, ForeignKey('study_sessions.id', ondelete='SET NULL'), nullable=True)
    reviewed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    response_quality = Column(Integer, nullable=True)  # 1-5 scale (1=again, 5=easy)
    response_time = Column(Integer, nullable=True)  # Time in milliseconds
    ease_factor = Column(Float, default=2.5)  # Spaced repetition ease factor
    interval_days = Column(Integer, default=1)  # Days until next review
    next_review_date = Column(DateTime, nullable=True)
    repetitions = Column(Integer, default=0)  # Number of successful repetitions
    
    # Relationships
    card = relationship("Card", back_populates="card_reviews")
    user = relationship("User", back_populates="card_reviews")
    session = relationship("StudySession", back_populates="card_reviews")
    
    def __repr__(self):
        return f"<CardReview(id={self.id}, card_id={self.card_id}, quality={self.response_quality})>"
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "card_id": self.card_id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "response_quality": self.response_quality,
            "response_time": self.response_time,
            "ease_factor": self.ease_factor,
            "interval_days": self.interval_days,
            "next_review_date": self.next_review_date.isoformat() if self.next_review_date else None,
            "repetitions": self.repetitions
        }
    
    def calculate_next_review(self):
        """Calculate next review date using spaced repetition algorithm (SuperMemo-2)"""
        if self.response_quality < 3:
            # Failed review - reset
            self.repetitions = 0
            self.interval_days = 1
        else:
            # Successful review
            if self.repetitions == 0:
                self.interval_days = 1
            elif self.repetitions == 1:
                self.interval_days = 6
            else:
                self.interval_days = round(self.interval_days * self.ease_factor)
            
            self.repetitions += 1
        
        # Adjust ease factor based on response quality
        self.ease_factor = max(1.3, 
            self.ease_factor + (0.1 - (5 - self.response_quality) * (0.08 + (5 - self.response_quality) * 0.02))
        )
        
        # Set next review date
        self.next_review_date = datetime.now(timezone.utc) + timedelta(days=self.interval_days)
        
        return self.next_review_date