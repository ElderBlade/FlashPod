// static/js/study/modes/simple-spaced.js
import { StudyState } from '../core/study-state.js';

/**
 * Mode 2: Simple Spaced Repetition
 * Cards move between "Still Learning" and "Known" buckets
 * Multiple rounds until all cards are in "Known" bucket
 */
export class SimpleSpaced {
    constructor(studyManager) {
        this.manager = studyManager;
        this.mode = 'simple-spaced';
    }

    /**
     * Initialize simple spaced repetition mode
     */
    async initialize(state) {
        console.log('Initializing Simple Spaced Repetition mode');
        
        // Initialize all cards in "still learning" bucket
        const cardIds = state.cards.map(card => card.id);
        
        StudyState.updateModeData(state, {
            stillLearning: [...cardIds],
            known: [],
            currentRound: 1,
            responses: new Map(),
            isCollectingResponse: false,
            sessionStartTime: new Date(),
            roundStartTime: new Date(),
            completedRounds: []
        }, 'simple-spaced');
        
        // Update interface for simple spaced mode
        await this._updateInterface();
    }

    /**
     * Render current card
     */
    async renderCard() {
        const state = this.manager.state;
        const displayContent = StudyState.getCardDisplayContent(state);
        
        if (!displayContent) return;
        
        // Get DOM elements
        const frontContent = document.getElementById('frontContent');
        const backContent = document.getElementById('backContent');
        const frontLabel = document.querySelector('.flashcard-front .card-label');
        const backLabel = document.querySelector('.flashcard-back .card-label');
        
        if (!frontContent || !backContent) return;
        
        // Reset card flip state
        this._resetCardFlip();
        
        // Update content
        frontContent.textContent = displayContent.frontText;
        backContent.textContent = displayContent.backText;
        
        // Update labels
        if (frontLabel) frontLabel.textContent = displayContent.frontLabel;
        if (backLabel) backLabel.textContent = displayContent.backLabel;
        
        // Update progress and navigation
        this.manager.interface.updateProgress();
        this.manager.interface.updateNavigationButtons();
        
        // Update mode-specific UI
        this.manager.interface.updateModeSpecificUI('simple-spaced', 
            StudyState.getModeData(state, 'simple-spaced'));
    }

    /**
     * Handle card flip event
     */
    async onCardFlip(direction) {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        const currentCard = StudyState.getCurrentCard(state);
        
        if (!currentCard) return;
        
        // Show response buttons immediately when flipping to back (card is now flipped)
        if (state.isFlipped && modeData.stillLearning.includes(currentCard.id)) {
            setTimeout(() => {
                modeData.isCollectingResponse = true;
                this.manager.interface.showResponseButtons();
                this.manager.interface.updateModeSpecificUI('simple-spaced', modeData);
            }, 300); // Wait for flip animation to complete
        } else if (!state.isFlipped) {
            // Hide response buttons when flipping back to front
            modeData.isCollectingResponse = false;
            this.manager.interface.hideResponseButtons();
        }
        
        console.log(`Simple spaced mode: Card flipped ${direction}, isFlipped: ${state.isFlipped}, collecting response: ${modeData.isCollectingResponse}`);
    }

    /**
     * Handle user response (remember/don't remember)
     */
    async handleResponse(responseType) {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        const currentCard = StudyState.getCurrentCard(state);
        
        if (!modeData.isCollectingResponse || !currentCard) return;
        
        const cardId = currentCard.id;
        
        // Record the response
        if (!modeData.responses.has(cardId)) {
            modeData.responses.set(cardId, []);
        }
        modeData.responses.get(cardId).push({
            response: responseType,
            timestamp: new Date(),
            round: modeData.currentRound
        });
        
        // Move card between buckets
        if (responseType === 'remember') {
            await this._moveCardToKnown(cardId);
            this._showCardFeedback('correct');
            this._showMessage(`Card moved to "Known" pile! 🎉`, 'success');
        } else {
            await this._keepCardInLearning(cardId);
            this._showCardFeedback('incorrect');
            this._showMessage(`Card stays in "Still Learning" pile`, 'info');
        }
        
        // Record to backend immediately
        await this._recordCardReview(cardId, responseType === 'remember' ? 3 : 1);
        
        // Hide response buttons
        modeData.isCollectingResponse = false;
        this.manager.interface.hideResponseButtons();
        
        // Update UI
        this.manager.interface.updateModeSpecificUI('simple-spaced', modeData);
        
        // Check if round is complete
        setTimeout(() => this._checkRoundCompletion(), 1000);
    }

    /**
     * Handle navigation between cards
     */
    async beforeNavigation(direction) {
        // Always allow navigation in simple spaced mode
        // Could add logic here to prevent navigation during response collection
        return true;
    }

    /**
     * Handle post-navigation logic
     */
    async onNavigation() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        // Reset response collection state
        modeData.isCollectingResponse = false;
        this.manager.interface.hideResponseButtons();
        
        // Re-render the new card
        await this.renderCard();
    }

    /**
     * Handle shuffle change event
     */
    async onShuffleChange() {
        // Re-render card after shuffle
        await this.renderCard();
    }

    /**
     * Handle pause event
     */
    onPause() {
        // Save current progress
        this._saveProgress();
    }

    /**
     * Clean up when switching modes or ending session
     */
    async cleanup() {
        console.log('Cleaning up Simple Spaced Repetition mode');
        
        // Save final progress
        await this._saveProgress();
        
        // Hide response buttons
        this.manager.interface.hideResponseButtons();
    }

    /**
     * Get study statistics
     */
    getStats() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        const currentTime = new Date();
        const startTime = new Date(modeData.sessionStartTime);
        const durationMinutes = Math.round((currentTime - startTime) / (1000 * 60));
        
        return {
            mode: 'simple-spaced',
            currentRound: modeData.currentRound,
            stillLearning: modeData.stillLearning.length,
            known: modeData.known.length,
            totalCards: state.totalCards,
            completionPercentage: Math.round((modeData.known.length / state.totalCards) * 100),
            studyDuration: durationMinutes,
            roundsCompleted: modeData.completedRounds.length,
            isComplete: modeData.stillLearning.length === 0
        };
    }

    /**
     * Check if session is complete
     */
    isSessionComplete() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        return modeData.stillLearning.length === 0;
    }

    /**
     * Get completion message
     */
    getCompletionMessage() {
        const stats = this.getStats();
        return `🎉 Amazing! You've mastered all ${stats.totalCards} cards in ${stats.currentRound} rounds and ${stats.studyDuration} minutes!`;
    }

    // Private methods
    /**
     * Update interface for simple spaced mode
     */
    async _updateInterface() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        // Update mode-specific UI
        this.manager.interface.updateModeSpecificUI('simple-spaced', modeData);
        
        // Update keyboard hints
        if (this.manager.interface.modeToggle?.updateKeyboardHints) {
            this.manager.interface.modeToggle.updateKeyboardHints();
        }
    }

    /**
     * Reset card flip state
     */
    _resetCardFlip() {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        // Remove all flip states instantly
        flashcard.style.transition = 'none';
        flashcard.classList.remove('flipped', 'flip-horizontal', 'flip-vertical-up', 'flip-vertical-down', 'flipping');
        
        // Force reflow
        flashcard.offsetHeight;
        
        // Restore transitions
        flashcard.style.transition = '';
        
        // Set default flip direction
        flashcard.classList.add('flip-horizontal');
        
        // Reset response collection state
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        modeData.isCollectingResponse = false;
        this.manager.interface.hideResponseButtons();
    }

    /**
     * Move card from still learning to known bucket
     */
    async _moveCardToKnown(cardId) {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        const stillLearningIndex = modeData.stillLearning.indexOf(cardId);
        if (stillLearningIndex > -1) {
            modeData.stillLearning.splice(stillLearningIndex, 1);
            if (!modeData.known.includes(cardId)) {
                modeData.known.push(cardId);
            }
        }
    }

    /**
     * Keep card in still learning bucket (or move back from known)
     */
    async _keepCardInLearning(cardId) {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        // If card was in known, move it back to still learning
        const knownIndex = modeData.known.indexOf(cardId);
        if (knownIndex > -1) {
            modeData.known.splice(knownIndex, 1);
            if (!modeData.stillLearning.includes(cardId)) {
                modeData.stillLearning.push(cardId);
            }
        }
    }

    /**
     * Show visual feedback for card response
     */
    _showCardFeedback(type) {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        // Remove existing feedback
        flashcard.classList.remove('response-correct', 'response-incorrect');
        
        // Add new feedback
        const feedbackClass = type === 'correct' ? 'response-correct' : 'response-incorrect';
        flashcard.classList.add(feedbackClass);
        
        // Remove feedback after animation
        setTimeout(() => {
            flashcard.classList.remove(feedbackClass);
        }, 1000);
    }

    /**
     * Check if current round is complete
     */
    _checkRoundCompletion() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        // If all cards are known - session complete!
        if (modeData.stillLearning.length === 0) {
            setTimeout(() => this._completeSession(), 500);
            return;
        }
        
        // Check if we've reviewed all still learning cards in this round
        const stillLearningCards = state.cards.filter(card => 
            modeData.stillLearning.includes(card.id)
        );
        
        // Get cards that have been reviewed in current round
        const cardsReviewedThisRound = new Set();
        modeData.responses.forEach((responses, cardId) => {
            if (responses.some(r => r.round === modeData.currentRound)) {
                cardsReviewedThisRound.add(cardId);
            }
        });
        
        console.log(`Round ${modeData.currentRound} check:`, {
            stillLearning: stillLearningCards.length,
            reviewedThisRound: cardsReviewedThisRound.size,
            stillLearningIds: stillLearningCards.map(c => c.id),
            reviewedIds: Array.from(cardsReviewedThisRound)
        });
        
        // If all still learning cards have been reviewed this round, start next round
        const allStillLearningReviewed = stillLearningCards.every(card => 
            cardsReviewedThisRound.has(card.id)
        );
        
        if (allStillLearningReviewed && stillLearningCards.length > 0) {
            this._startNextRound();
        }
    }

    /**
     * Start the next round
     */
    async _startNextRound() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        // Save current round info
        modeData.completedRounds.push({
            round: modeData.currentRound,
            completedAt: new Date(),
            cardsLearned: modeData.known.length,
            cardsRemaining: modeData.stillLearning.length
        });
        
        // Start next round
        modeData.currentRound++;
        modeData.roundStartTime = new Date();
        
        // Filter cards to only show "Still Learning" cards for this round
        const stillLearningCards = state.originalCards.filter(card => 
            modeData.stillLearning.includes(card.id)
        );
        
        // Update the current cards array to only include still learning cards
        state.cards = [...stillLearningCards];
        state.totalCards = stillLearningCards.length;
        
        // Start at the first card of the filtered set
        state.currentIndex = 0;
        state.currentCardId = stillLearningCards[0]?.id;
        state.isFlipped = false;
        
        // Reset response collection state
        modeData.isCollectingResponse = false;
        this.manager.interface.hideResponseButtons();
        
        // Re-render with the new filtered card set
        await this.renderCard();
        
        this._showMessage(`🔄 Round ${modeData.currentRound} started! Focusing on ${stillLearningCards.length} cards that need more practice.`, 'info');
        
        console.log(`Started round ${modeData.currentRound} with ${stillLearningCards.length} cards still learning`);
    }

    /**
     * Complete the session
     */
    _completeSession() {
        const stats = this.getStats();
        
        const completionMessage = `
            🎉 Congratulations! You've mastered all ${stats.totalCards} cards!
            
            📊 Session Summary:
            • Rounds completed: ${stats.currentRound}
            • Total time: ${stats.studyDuration} minutes
            • Cards mastered: ${stats.known}
            
            All cards are now in your "Known" pile! 🧠✨
        `;
        
        this._showCompletionOverlay(completionMessage);
    }

    /**
     * Show completion overlay
     */
    _showCompletionOverlay(message) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        overlay.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="text-xl font-semibold text-gray-900 mb-4">Session Complete!</h3>
                <div class="text-gray-600 whitespace-pre-line text-sm mb-6">${message}</div>
                <div class="flex space-x-3">
                    <button id="studyAgainBtn" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Study Again
                    </button>
                    <button id="finishSessionBtn" class="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                        Finish
                    </button>
                </div>
            </div>
        `;

        overlay.querySelector('#studyAgainBtn').addEventListener('click', async () => {
            overlay.remove();
            // Reset and restart
            await this.initialize(this.manager.state);
            this.manager.state.currentIndex = 0;
            this.manager.state.isFlipped = false;
            await this.renderCard();
        });

        overlay.querySelector('#finishSessionBtn').addEventListener('click', () => {
            overlay.remove();
            this.manager.exitStudy();
        });

        document.body.appendChild(overlay);
    }

    /**
     * Record card review to backend
     */
    async _recordCardReview(cardId, responseQuality) {
        if (!this.manager.session.isActive) return;
        
        try {
            await this.manager.session.recordCardReview(cardId, responseQuality);
        } catch (error) {
            console.warn('Failed to record card review:', error);
        }
    }

    /**
     * Save current progress
     */
    _saveProgress() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        // Save to localStorage as backup
        const progressData = {
            mode: 'simple-spaced',
            currentRound: modeData.currentRound,
            stillLearning: modeData.stillLearning,
            known: modeData.known,
            currentIndex: state.currentIndex,
            lastStudied: new Date().toISOString()
        };
        
        const storageKey = state.lastDeckId ? 
            `study_progress_deck_${state.lastDeckId}` :
            `study_progress_pod_${state.lastPodId}`;
            
        localStorage.setItem(storageKey, JSON.stringify(progressData));
    }

    /**
     * Show message to user
     */
    _showMessage(message, type = 'info') {
        if (this.manager._showMessage) {
            this.manager._showMessage(message, type);
        }
    }
}