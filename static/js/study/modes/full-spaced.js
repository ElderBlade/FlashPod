// static/js/study/modes/full-spaced.js

/**
 * Full SM-2 Spaced Repetition Mode Implementation
 * Advanced spaced repetition with 4-point difficulty rating system
 */
import { timezoneHandler } from '../../utils/timezone.js';

export class FullSpaced {
    constructor(studyManager) {
        this.manager = studyManager;
        this.modeName = 'full-spaced';
    }

    async initialize(state) {
        const modeData = state.modeData['full-spaced'];
        
        // Initialize sessionStats if not present (first time initialization)
        if (!modeData.sessionStats) {
            modeData.sessionStats = {
                sessionStartTime: timezoneHandler.getCurrentDateInServerTimezone(),
                cardsReviewed: 0,
                newCardsLearned: 0,
                ratingsSum: 0,
                timeSpent: 0,
                averageRating: 0
            };
        }
        
        // Initialize if first time
        if (modeData.dueCards.length === 0 && modeData.newCards.length === 0) {
            await this._initializeCardCategories();
        }

        this._updateActiveCards();

        // Store original session size for progress tracking (before cards are filtered)
        if (!modeData.originalSessionSize) {
            modeData.originalSessionSize = state.cards.length;
        }

        // Check if there are no cards to study
        if (state.cards.length === 0) {
            // Show a different message for no cards available
            this._showNoCardsMessage();
            return;
        }

        await this._updateInterface();
        console.log(`SM-2 initialized - Due: ${modeData.dueCards.length}, New: ${modeData.newCards.length}, Original session size: ${modeData.originalSessionSize}`);
    }

    async _initializeCardCategories() {
        const state = this.manager.state;
        const modeData = state.modeData['full-spaced'];
        
        // Determine if this is a pod or deck study
        const isPodStudy = !!state.pod;
        
        // Fetch existing review data from backend
        const reviewData = isPodStudy ? 
            await this._fetchPodReviewData(state.pod.id, state.selectedDeckIds) :
            await this._fetchReviewData();
        
        // Categorize cards based on review history
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
                if (timezoneHandler.isDateOnOrBeforeToday(nextReview)) {
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
            sessionStartTime: timezoneHandler.getCurrentDateInServerTimezone()
        };
    }

    /**
     * Fetch review data for pod study across selected decks
     */
    async _fetchPodReviewData(podId, selectedDeckIds) {
        try {
            // Get all card IDs from the pod cards
            const allCardIds = this.manager.state.originalCards.map(card => card.id);
            
            if (allCardIds.length === 0) {
                return new Map();
            }
            
            // Use the same approach as the deck review data fetch
            const response = await fetch(`/api/cards/reviews/pod/${podId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ card_ids: allCardIds })
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
            console.warn('Failed to fetch pod review data:', error);
        }
        
        return new Map();
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
        
        const now = timezoneHandler.getCurrentDateInServerTimezone();
        
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

            console.log('Session ID being sent:', this.manager.session.sessionId); // Add this
            console.log('Manager session object:', this.manager.session); // Add this too
            
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
        const now = timezoneHandler.getCurrentDateInServerTimezone();
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

        // Update progress bar
        this.manager.interface.updateProgress();
        this.manager.interface.updateNavigationButtons();
    
        
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
        
        // Calculate final session summary
        stats.timeSpent = Math.round((timezoneHandler.getCurrentDateInServerTimezone() - stats.sessionStartTime) / 1000 / 60);
        stats.averageRating = stats.cardsReviewed > 0 ? 
            (stats.ratingsSum / stats.cardsReviewed).toFixed(1) : 0;
        
        console.log('SM-2 session completed:', stats);
        
        // Show completion modal instead of restarting
        this._showSessionComplete(stats);
    }

    _showSessionComplete(stats) {
        const totalTime = Math.round((timezoneHandler.getCurrentDateInServerTimezone() - stats.sessionStartTime) / 1000 / 60);
        
        const modalHTML = `
            <div id="sm2CompletionModal" class="modal-backdrop fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div class="text-center mb-6">
                        <h3 class="text-xl font-bold text-gray-900 mb-2">Session Complete!</h3>
                        <div class="text-gray-600">
                            Excellent work! You've reviewed ${stats.cardsReviewed} cards with the SM-2 algorithm.
                            <br><br>
                            📊 Session Summary:<br>
                            • Cards reviewed: ${stats.cardsReviewed}<br>
                            • New cards learned: ${stats.newCardsLearned}<br>
                            • Average rating: ${stats.averageRating}<br>
                            • Total time: ${totalTime} minutes<br>
                        </div>
                    </div>
                    <div class="flex space-x-3">
                        <button data-action="study-again" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Study More
                        </button>
                        <button data-action="finish" class="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                            Finish
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners - FIX: Call methods without underscores
        const modal = document.getElementById('sm2CompletionModal');
        modal.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            if (action === 'study-again') {
                await this.restartSession();  // No underscore!
            } else if (action === 'finish') {
                this.finishSession();   // No underscore!
            }
        });
    }

    async restartSession() {
        // Reset session and restart
        const state = this.manager.state;
        const modeData = state.modeData['full-spaced'];
        
        // Reset session stats
        modeData.sessionStats = {
            sessionStartTime: timezoneHandler.getCurrentDateInServerTimezone(),
            cardsReviewed: 0,
            newCardsLearned: 0,
            ratingsSum: 0,
            timeSpent: 0,
            averageRating: 0
        };
        
        // Reinitialize cards
        await this._initializeCardCategories();

        modeData.newCards = state.originalCards.map(card => card.id);
        modeData.dueCards = [];
        modeData.learningCards = [];
        modeData.matureCards = [];

        this._updateActiveCards();
        
        // Reset current position
        state.currentIndex = 0;
        state.currentCardId = state.cards[0]?.id;
        state.isFlipped = false;
        
        // Remove modal and update interface
        document.getElementById('sm2CompletionModal')?.remove();
        if (state.cards.length === 0) {
            this.manager._showMessage('No cards available to study', 'error');
            this.manager.exitStudy();
            return;
        }
        
        this.manager.interface.updateProgress();
        this.manager.interface.updateNavigationButtons();
        this.manager.interface.updateModeSpecificUI('full-spaced', modeData);
        this.manager.interface.renderCurrentCard();
        
        this.manager._showMessage('Session restarted!', 'info');
    }

    _showNoCardsMessage() {
        const modeData = this.manager.state.modeData['full-spaced'];

        let nextReviewDate = null;
        let nextReviewCardCount = 0;
        
        if (modeData.nextReviewDates && modeData.nextReviewDates.size > 0) {
            // Use server timezone for current time comparison
            const now = timezoneHandler.getCurrentDateInServerTimezone();
            
            // Backend now returns timezone-converted dates, so we can work with them directly
            const allDates = Array.from(modeData.nextReviewDates.values())
                .filter(date => {
                    if (!date) return false;
                    const dateObj = date instanceof Date ? date : new Date(date);
                    return !isNaN(dateObj) && dateObj > now;
                })
                .map(date => date instanceof Date ? date : new Date(date))
                .sort((a, b) => a - b);
            
            if (allDates.length > 0) {
                nextReviewDate = allDates[0];
                
                // Count cards due on same date
                const nextReviewDateString = nextReviewDate.toDateString();
                nextReviewCardCount = Array.from(modeData.nextReviewDates.values())
                    .filter(date => {
                        if (!date) return false;
                        const dateObj = date instanceof Date ? date : new Date(date);
                        return dateObj.toDateString() === nextReviewDateString;
                    }).length;
            }
        }
        
        // Format the date using timezoneHandler for consistency
        let nextReviewText = '';
        if (nextReviewDate) {
            // Since backend already converted to server timezone, we can pass the ISO string directly
            const formattedDate = timezoneHandler.formatDateInServerTimezone(
                nextReviewDate.toISOString(),
                { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                }
            );
            
            const timeFromNow = this._getTimeFromNow(nextReviewDate);
            
            nextReviewText = `
                <br>
                🕐 Next review: <strong>${formattedDate}</strong> (${timeFromNow})
                <br>
                📝 ${nextReviewCardCount} card${nextReviewCardCount !== 1 ? 's' : ''} due
            `;
        }

        const modalHTML = `
            <div id="sm2NoCardsModal" class="modal-backdrop fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div class="mb-6 text-left">
                        <h3 class="text-xl font-bold text-gray-900 mb-2 text-center">No Cards to Review</h3>
                        <div class="text-gray-600 text-left">
                            Great job! You have no cards due for review right now.
                            ${nextReviewText}
                            <br><br>
                            • All cards have been studied recently<br>
                            • Come back later when cards are due for review<br>
                            • Or study all cards regardless of schedule<br>
                        </div>
                    </div>
                    <div class="flex space-x-3">
                        <button data-action="study-all" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Study All Cards
                        </button>
                        <button data-action="finish" class="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                            Back to Library
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.getElementById('sm2NoCardsModal');
        modal.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            if (action === 'study-all') {
                await this._forceStudyAllCards();
            } else if (action === 'finish') {
                document.getElementById('sm2NoCardsModal')?.remove();
                this.manager.exitStudy();
            }
        });
    }

    _getTimeFromNow(futureDate) {
        const now = timezoneHandler.getCurrentDateInServerTimezone();
        const diff = futureDate - now;
        
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days > 0) {
            return `in ${days} day${days !== 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
        } else if (minutes > 0) {
            return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else {
            return 'very soon';
        }
    }

    async _forceStudyAllCards() {
        // Force all cards to be "new" so they can be studied
        const state = this.manager.state;
        const modeData = state.modeData['full-spaced'];
        
        modeData.newCards = state.originalCards.map(card => card.id);
        modeData.dueCards = [];
        
        this._updateActiveCards();
        document.getElementById('sm2NoCardsModal')?.remove();
        
        if (state.cards.length > 0) {
            await this._updateInterface();
            this.manager.interface.renderCurrentCard();
            this.manager._showMessage('Studying all cards!', 'info');
        }
    }

    _getNextStudyCards() {
        const state = this.manager.state;
        const modeData = state.modeData['full-spaced'];
        const now = timezoneHandler.getCurrentDateInServerTimezone()
        
        let dueCount = 0;
        let nextDueDate = null;
        
        // Check all cards for next due dates
        for (const [cardId, nextReview] of modeData.nextReviewDates) {
            if (timezoneHandler.isDateOnOrBeforeToday(nextReview)) {
                dueCount++;
            } else if (!nextDueDate || nextReview < nextDueDate) {
                nextDueDate = nextReview;
            }
        }
        
        // Add any remaining new cards
        const newCardsCount = modeData.newCards.length;
        
        return {
            total: dueCount + newCardsCount,
            due: dueCount,
            new: newCardsCount,
            nextDate: nextDueDate ? 
            timezoneHandler.formatDateInServerTimezone(
                nextDueDate.toISOString(), 
                { month: 'short', day: 'numeric' }
            ) : 'Tomorrow'
        };
    }

    _continueLearningSession() {
        // Re-initialize with remaining cards
        this._updateActiveCards();
        
        if (this.manager.state.cards.length > 0) {
            // Reset session state but keep progress
            const modeData = this.manager.state.modeData['full-spaced'];
            modeData.sessionStats.sessionStartTime = timezoneHandler.getCurrentDateInServerTimezone();
            this.manager.state.currentIndex = 0;
            this.manager.state.isFlipped = false;
            
            // Update interface
            this.manager.interface.updateProgress();
            this.manager.interface.updateNavigationButtons();
            this.manager.interface.updateModeSpecificUI('full-spaced', modeData);
            this.manager.interface.renderCurrentCard();
            
            // Remove modal
            document.getElementById('sm2CompletionModal')?.remove();
            
            this.manager._showMessage('Continuing with remaining cards!', 'info');
        } else {
            this._finishSession();
        }
    }

    finishSession() {
        // Remove modal
        document.getElementById('sm2CompletionModal')?.remove();
        this.manager.exitStudy();
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

    /**
     * Cleanup method called when switching modes or ending study
     */
    async cleanup() {
        const modeData = this.manager.state.modeData['full-spaced'];
        
        // Reset response collection state
        modeData.isCollectingResponse = false;
        
        // Hide response buttons
        this.manager.interface.hideResponseButtons();
        
        // Save any pending review data
        if (this.manager.session && modeData.pendingReviews && modeData.pendingReviews.length > 0) {
            try {
                await this.manager.session.batchRecordReviews(modeData.pendingReviews);
                modeData.pendingReviews = [];
                console.log('Saved pending reviews during cleanup');
            } catch (error) {
                console.warn('Failed to save pending reviews during cleanup:', error);
            }
        }
        
        console.log('FullSpaced mode cleanup completed');
    }
}