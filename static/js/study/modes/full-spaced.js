// static/js/study/modes/full-spaced.js

/**
 * Full SM-2 Spaced Repetition Mode Implementation
 * Advanced spaced repetition with 4-point difficulty rating system
 */
export class FullSpaced {
    constructor(studyManager) {
        this.manager = studyManager;
        this.modeName = 'full-spaced';
    }

    async initialize(state) {
        const modeData = state.modeData['full-spaced'];
        
        // Initialize if first time
        if (modeData.dueCards.length === 0 && modeData.newCards.length === 0) {
            await this._initializeCardCategories();
        }

        this._updateActiveCards();
        await this._updateInterface();
        console.log(`SM-2 initialized - Due: ${modeData.dueCards.length}, New: ${modeData.newCards.length}`);
    }

    async _initializeCardCategories() {
        const state = this.manager.state;
        const modeData = state.modeData['full-spaced'];
        
        // Fetch existing review data from backend
        const reviewData = await this._fetchReviewData();
        
        // Categorize cards based on review history
        const now = new Date();
        modeData.dueCards = [];
        modeData.newCards = [];
        modeData.learningCards = [];
        modeData.matureCards = [];
        
        for (const card of state.originalCards) {
            const review = reviewData.get(card.id);
            
            if (!review) {
                // Never reviewed - new card
                modeData.newCards.push(card.id);
            } else {
                // Store review data
                modeData.reviews.set(card.id, review);
                modeData.nextReviewDates.set(card.id, new Date(review.next_review_date));
                modeData.difficulty.set(card.id, review.ease_factor);
                
                // Check if due for review
                const nextReview = new Date(review.next_review_date);
                if (nextReview <= now) {
                    modeData.dueCards.push(card.id);
                } else if (review.repetitions < 3) {
                    modeData.learningCards.push(card.id);
                } else {
                    modeData.matureCards.push(card.id);
                }
            }
        }
        
        // Sort due cards by how overdue they are (most overdue first)
        modeData.dueCards.sort((a, b) => {
            const dateA = modeData.nextReviewDates.get(a);
            const dateB = modeData.nextReviewDates.get(b);
            return dateA - dateB;
        });
        
        // Initialize session stats
        modeData.sessionStats = {
            cardsReviewed: 0,
            newCardsLearned: 0,
            timeSpent: 0,
            ratingsSum: 0,
            sessionStartTime: new Date()
        };
    }

    async _fetchReviewData() {
        // Fetch existing review data from backend
        try {
            const deckId = this.manager.state.deck.id;
            const response = await fetch(`/api/cards/reviews/${deckId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const reviews = await response.json();
                const reviewMap = new Map();
                reviews.forEach(review => {
                    reviewMap.set(review.card_id, review);
                });
                return reviewMap;
            }
        } catch (error) {
            console.error('Failed to fetch review data:', error);
        }
        
        return new Map();
    }

    _updateActiveCards() {
        const state = this.manager.state;
        const modeData = state.modeData['full-spaced'];
        
        // Combine due cards and new cards for current session
        // Priority: due cards first, then new cards
        const activeCardIds = [...modeData.dueCards, ...modeData.newCards];
        
        // Filter original cards to only include active ones
        const activeCards = state.originalCards.filter(card => 
            activeCardIds.includes(card.id)
        );
        
        state.cards = activeCards;
        state.totalCards = activeCards.length;
        state.currentIndex = 0;
        state.currentCardId = activeCards[0]?.id;
        
        // Check if session should end
        if (activeCards.length === 0) {
            this._endSession();
        }
    }

    async onCardFlip(direction) {
        console.log('SM-2: Card flipped, showing response buttons');
        
        const modeData = this.manager.state.modeData['full-spaced'];
        modeData.isCollectingResponse = true;

        // Update interface immediately
        this.manager.interface.updateModeSpecificUI('full-spaced', modeData);
    }

    async handleResponse(rating) {
        const state = this.manager.state;
        const modeData = state.modeData['full-spaced'];
        const currentCardId = state.currentCardId;
        
        if (!currentCardId || rating < 1 || rating > 4) return;

        this._hideResponseButtons();
        
        // Update session stats
        modeData.sessionStats.cardsReviewed++;
        modeData.sessionStats.ratingsSum += rating;
        
        // Calculate SM-2 parameters
        const reviewResult = this._calculateSM2(currentCardId, rating);
        
        // Save review to backend immediately
        await this._saveReview(currentCardId, rating, reviewResult);
        
        // Update local state
        modeData.reviews.set(currentCardId, reviewResult);
        modeData.nextReviewDates.set(currentCardId, reviewResult.nextReviewDate);
        modeData.difficulty.set(currentCardId, reviewResult.easeFactor);
        
        // Update card categories
        this._updateCardCategories(currentCardId, reviewResult);
        
        // Show brief feedback
        await this._showRatingFeedback(rating, reviewResult);
        
        // Move to next card
        await this._moveToNextCard();
    }

    _calculateSM2(cardId, rating) {
        const modeData = this.manager.state.modeData['full-spaced'];
        const existingReview = modeData.reviews.get(cardId);
        
        // Initialize defaults for new cards
        let easeFactor = existingReview?.ease_factor || 2.5;
        let repetitions = existingReview?.repetitions || 0;
        let intervalDays = existingReview?.interval_days || 1;
        
        const now = new Date();
        
        if (rating < 3) {
            // Failed review - reset to learning
            repetitions = 0;
            intervalDays = 1;
        } else {
            // Successful review
            if (repetitions === 0) {
                intervalDays = 1;
            } else if (repetitions === 1) {
                intervalDays = 6;
            } else {
                intervalDays = Math.round(intervalDays * easeFactor);
            }
            repetitions++;
        }
        
        // Adjust ease factor based on rating (SM-2 formula)
        easeFactor = Math.max(1.3, 
            easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
        );
        
        // Calculate next review date
        const nextReviewDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
        
        return {
            card_id: cardId,
            ease_factor: easeFactor,
            interval_days: intervalDays,
            repetitions: repetitions,
            next_review_date: nextReviewDate,
            response_quality: rating,
            reviewed_at: now
        };
    }

    async _saveReview(cardId, rating, reviewResult) {
        try {
            const token = localStorage.getItem('token');
            console.log('Saving review:', { cardId, rating, reviewResult });
            console.log('Token exists:', !!token);
            
            const requestBody = {
                card_id: cardId,
                session_id: this.manager.session.sessionId,
                response_quality: rating,
                ease_factor: reviewResult.ease_factor,
                interval_days: reviewResult.interval_days,
                repetitions: reviewResult.repetitions,
                next_review_date: reviewResult.next_review_date.toISOString()
            };
            
            console.log('Request body:', requestBody);
            
            const response = await fetch('/api/cards/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log('Error response body:', errorText);
                throw new Error(`Failed to save review: ${response.status} ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error saving review:', error);
            // Continue anyway - we have local state
        }
    }

    _updateCardCategories(cardId, reviewResult) {
        const modeData = this.manager.state.modeData['full-spaced'];
        
        // Remove from all categories first
        modeData.dueCards = modeData.dueCards.filter(id => id !== cardId);
        modeData.newCards = modeData.newCards.filter(id => id !== cardId);
        modeData.learningCards = modeData.learningCards.filter(id => id !== cardId);
        modeData.matureCards = modeData.matureCards.filter(id => id !== cardId);
        
        // Add to appropriate category based on review result
        if (reviewResult.repetitions < 3) {
            modeData.learningCards.push(cardId);
            if (reviewResult.repetitions === 1) {
                modeData.sessionStats.newCardsLearned++;
            }
        } else {
            modeData.matureCards.push(cardId);
        }
    }

    async _showRatingFeedback(rating, reviewResult) {
        const ratingNames = ['', 'Again', 'Hard', 'Good', 'Easy'];
        const nextReview = this._formatNextReview(reviewResult.next_review_date);
        
        // Show brief notification
        this._showNotification(
            `${ratingNames[rating]} - Next review: ${nextReview}`,
            this._getRatingColor(rating)
        );
        
        // Brief pause to show feedback
        await new Promise(resolve => setTimeout(resolve, 800));
    }

    _formatNextReview(date) {
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) return 'Now';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return `${diffDays} days`;
        if (diffDays < 30) return `${Math.round(diffDays / 7)} weeks`;
        return `${Math.round(diffDays / 30)} months`;
    }

    _getRatingColor(rating) {
        const colors = ['', 'red', 'orange', 'green', 'blue'];
        return colors[rating] || 'gray';
    }

    _showNotification(message, color) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 bg-${color}-100 text-${color}-800 px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Fade out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 500);
    }

    async _moveToNextCard() {
        const state = this.manager.state;
        const modeData = state.modeData['full-spaced'];
        
        console.log('Moving to next card...');
        
        // Reset response collection state FIRST
        modeData.isCollectingResponse = false;
        state.isFlipped = false;
        
        // Update active cards (removes completed cards)
        this._updateActiveCards();
        
        // Check if session ended
        if (state.cards.length === 0) {
            this._endSession();
            return;
        }
        
        // Update interface to hide buttons
        console.log('Updating interface after rating');
        this.manager.interface.updateModeSpecificUI('full-spaced', modeData);
        
        // Render the new card
        this.manager.interface.renderCurrentCard();
    }

    _hideResponseButtons() {
        const responseButtons = document.getElementById('responseButtons');
        const sm2Buttons = document.getElementById('sm2Buttons');
        const simpleButtons = document.getElementById('simpleSpacedButtons');
        
        if (responseButtons) responseButtons.classList.add('hidden');
        if (sm2Buttons) sm2Buttons.classList.add('hidden');
        if (simpleButtons) simpleButtons.classList.add('hidden');
        
        console.log('Response buttons hidden');
    }

    _endSession() {
        const modeData = this.manager.state.modeData['full-spaced'];
        const stats = modeData.sessionStats;
        
        // Calculate session summary
        stats.timeSpent = Math.round((new Date() - stats.sessionStartTime) / 1000 / 60);
        stats.averageRating = stats.cardsReviewed > 0 ? 
            (stats.ratingsSum / stats.cardsReviewed).toFixed(1) : 0;
        
        console.log('SM-2 session completed:', stats);
        
        // Show completion message
        this._showSessionComplete(stats);
    }

    _showSessionComplete(stats) {
        const message = `
            Session Complete!
            ${stats.cardsReviewed} cards reviewed
            ${stats.newCardsLearned} new cards learned
            Average rating: ${stats.averageRating}
            Time: ${stats.timeSpent} minutes
        `;
        
        // You can implement a proper modal here
        alert(message);
    }

    async _updateInterface() {
        // Update mode indicators and UI
        this.manager.interface.updateModeSpecificUI();
        this.manager.interface.updateProgress();
    }

    // Navigation methods required by architecture
    async beforeNavigation(direction) {
        // Allow navigation in SM-2 mode
        return true;
    }

    async onNavigation() {
        await this._updateInterface();
    }

    async renderCard() {
        this.manager.interface.renderCurrentCard();
    }
}