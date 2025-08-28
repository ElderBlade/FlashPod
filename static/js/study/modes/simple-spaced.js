// static/js/study/modes/simple-spaced.js
import { StudyState } from '../core/study-state.js';

/**
 * Mode 2: Simple Spaced Repetition
 * Cards move between "Still Learning" and "Known" buckets
 * Multiple rounds until all cards are in "Known" bucket
 * Updated to use left/right arrow keys for responses and auto-advance
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
        const frontLabel = document.querySelector('.card-front .card-label');
        const backLabel = document.querySelector('.card-back .card-label');
        
        if (frontContent && backContent) {
            frontContent.textContent = displayContent.frontText;
            backContent.textContent = displayContent.backText;
        }
        
        if (frontLabel && backLabel) {
            frontLabel.textContent = displayContent.frontLabel;
            backLabel.textContent = displayContent.backLabel;
        }
        
        // Update progress and interface
        this._updateProgress();
        this._updateInterface();
        
        // CRITICAL FIX: Update progress display directly
        this._updateProgressDisplay();
    }

    /**
     * Handle card flip - show response options when flipped to back
     * This method is called by the study manager AFTER the flip state is updated
     */
    async onCardFlip(direction) {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        const currentCard = StudyState.getCurrentCard(state);
        
        if (!currentCard) return;
        
        if (state.isFlipped) {
            // Card was flipped to back - start collecting response
            // Only show buttons for cards that are still learning
            if (modeData.stillLearning.includes(currentCard.id)) {
                setTimeout(() => {
                    modeData.isCollectingResponse = true;
                    
                    // Show response buttons
                    const responseButtons = document.getElementById('responseButtons');
                    if (responseButtons) {
                        responseButtons.classList.remove('hidden');
                    }
                    
                    console.log('Simple spaced: Response buttons shown, collecting response');
                }, 300); // Wait for flip animation to complete
            }
        } else {
            // Hide response buttons when flipping back to front
            modeData.isCollectingResponse = false;
            const responseButtons = document.getElementById('responseButtons');
            if (responseButtons) {
                responseButtons.classList.add('hidden');
            }
            console.log('Simple spaced: Response buttons hidden');
        }
        
        console.log(`Simple spaced mode: Card flipped ${direction}, isFlipped: ${state.isFlipped}, collecting response: ${modeData.isCollectingResponse}`);
    }

    /**
     * Handle user response (remember/don't remember)
     * Now automatically advances to next card after response
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
        
        // Move card between buckets and show feedback
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
        const responseButtons = document.getElementById('responseButtons');
        if (responseButtons) {
            responseButtons.classList.add('hidden');
        }
        
        // Auto-advance to next card after a short delay for feedback
        setTimeout(async () => {
            await this._advanceToNextCard();
        }, 800);
    }

    /**
     * Handle mode-specific keyboard events
     * Called by the main keyboard handler for simple-spaced mode
     */
    handleKeyboard(e, modeData) {
        // Only handle response keys if we're collecting a response
        if (modeData.isCollectingResponse) {
            switch (e.key) {
                case 'ArrowLeft': // Left arrow - don't remember
                    e.preventDefault();
                    this.handleResponse('dont-remember');
                    return true;
                    
                case 'ArrowRight': // Right arrow - remember
                    e.preventDefault();
                    this.handleResponse('remember');
                    return true;
            }
        }
        
        // Mode-specific shortcuts (non-response keys)
        switch (e.key) {
            case 'r':
            case 'R': // R key - show round info
                e.preventDefault();
                this._showRoundInfo();
                return true;
                
            case 'p':
            case 'P': // P key - show progress
                e.preventDefault();
                this._showProgressInfo();
                return true;
        }
        
        return false; // Let other handlers process the key
    }

    /**
     * Auto-advance to next card
     */
    async _advanceToNextCard() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        // Check if round is complete before advancing
        if (await this._checkRoundCompletion()) {
            return; // Round completion handling will take over
        }
        
        // Advance to next card
        const nextIndex = (state.currentIndex + 1) % state.cards.length;
        state.currentIndex = nextIndex;
        state.currentCardId = state.cards[nextIndex]?.id;
        
        // Reset card flip state to show front side
        state.isFlipped = false;
        
        // Use the manager's reset method if available, otherwise reset manually
        if (this.manager.resetCardFlip) {
            this.manager.resetCardFlip();
        } else {
            // Fallback manual reset
            const flashcard = document.getElementById('flashcard');
            if (flashcard) {
                flashcard.style.transition = 'none';
                flashcard.classList.remove('flipped', 'flip-horizontal', 'flip-vertical-up', 'flip-vertical-down', 'flipping');
                flashcard.offsetHeight;
                flashcard.style.transition = '';
                flashcard.classList.add('flip-horizontal');
            }
        }
        
        // Reset response collection state
        modeData.isCollectingResponse = false;
        const responseButtons = document.getElementById('responseButtons');
        if (responseButtons) {
            responseButtons.classList.add('hidden');
        }
        
        // Render new card
        await this.renderCard();
        
        // CRITICAL FIX: Update progress bar and card counter directly
        this._updateProgressDisplay();
        
        console.log(`Auto-advanced to next card: ${nextIndex + 1}/${state.cards.length}`);
    }

    /**
     * Handle navigation between cards - override default navigation during response collection
     */
    async beforeNavigation(direction) {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        // If collecting response, prevent manual navigation (arrows are for responses)
        if (modeData.isCollectingResponse) {
            this._showMessage('Use arrow keys to respond: ← Don\'t Remember, → Remember', 'info');
            return false;
        }
        
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
        const responseButtons = document.getElementById('responseButtons');
        if (responseButtons) {
            responseButtons.classList.add('hidden');
        }
        
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
        const responseButtons = document.getElementById('responseButtons');
        if (responseButtons) {
            responseButtons.classList.add('hidden');
        }
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
        return `🎉 Amazing! You've completed ${stats.roundsCompleted} round${stats.roundsCompleted !== 1 ? 's' : ''} and mastered all ${stats.totalCards} cards in ${stats.studyDuration} minutes!`;
    }

    // Private helper methods

    /**
     * Update progress display directly (fixes progress bar and card counter)
     */
    _updateProgressDisplay() {
        const state = this.manager.state;
        const progress = state.currentIndex + 1;
        const total = state.totalCards;
        const percentage = (progress / total) * 100;

        // Update progress bar
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }

        // Update card counter
        const cardProgress = document.getElementById('cardProgress');
        if (cardProgress) {
            cardProgress.textContent = `Card ${progress} of ${total}`;
        }

        console.log(`Progress updated: ${progress}/${total} (${Math.round(percentage)}%)`);
    }

    /**
     * Update the interface for simple spaced mode
     */
    async _updateInterface() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        // Update mode-specific UI
        this.manager.interface.updateModeSpecificUI('simple-spaced', modeData);
        
        // Update progress display
        this._updateProgress();
    }

    /**
     * Update progress display
     */
    _updateProgress() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        const progressElement = document.getElementById('progress');
        if (progressElement) {
            const knownCount = modeData.known.length;
            const totalCards = state.totalCards;
            const percentage = Math.round((knownCount / totalCards) * 100);
            
            progressElement.innerHTML = `
                <div class="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Round ${modeData.currentRound}</span>
                    <span>${knownCount}/${totalCards} Known (${percentage}%)</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-green-500 h-2 rounded-full transition-all duration-300" style="width: ${percentage}%"></div>
                </div>
            `;
        }
    }

    /**
     * Move card to known bucket
     */
    async _moveCardToKnown(cardId) {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        const stillLearningIndex = modeData.stillLearning.indexOf(cardId);
        if (stillLearningIndex > -1) {
            modeData.stillLearning.splice(stillLearningIndex, 1);
            modeData.known.push(cardId);
        }
    }

    /**
     * Keep card in learning bucket
     */
    async _keepCardInLearning(cardId) {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        // Ensure card is in still learning bucket
        if (!modeData.stillLearning.includes(cardId)) {
            const knownIndex = modeData.known.indexOf(cardId);
            if (knownIndex > -1) {
                modeData.known.splice(knownIndex, 1);
            }
            modeData.stillLearning.push(cardId);
        }
    }

    /**
     * Show visual feedback for card response
     */
    _showCardFeedback(type) {
        const cardContainer = document.querySelector('.card-container');
        const flashcard = document.getElementById('flashcard');
        const targetElement = cardContainer || flashcard;
        
        if (!targetElement) return;
        
        const feedbackClass = type === 'correct' ? 'feedback-correct' : 'feedback-incorrect';
        
        // Add appropriate CSS class for visual feedback
        targetElement.classList.add(feedbackClass);
        
        // Remove the class after animation completes
        setTimeout(() => {
            targetElement.classList.remove(feedbackClass);
        }, 600);
        
        // Also try the manager's method if available
        if (this.manager.addCardFeedback) {
            this.manager.addCardFeedback(type);
        }
    }

    /**
     * Show message to user
     */
    _showMessage(message, type = 'info') {
        if (this.manager.showMessage) {
            this.manager.showMessage(message, type);
        }
    }

    /**
     * Record card review to backend (optional - won't fail if endpoint doesn't exist)
     */
    async _recordCardReview(cardId, rating) {
        try {
            const response = await fetch(`${window.API_BASE}/study/card-review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    card_id: cardId,
                    response_quality: rating
                })
            });
            
            if (response.ok) {
                console.log(`Recorded review for card ${cardId}: quality=${rating}`);
            } else if (response.status === 404) {
                console.warn('Card review endpoint not implemented on backend');
            }
        } catch (error) {
            // Don't throw error, just log warning
            console.warn('Failed to record review (non-critical):', error);
        }
    }

    /**
     * Check if current round is complete
     */
    async _checkRoundCompletion() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        // Check if all cards are now known - session complete!
        if (modeData.stillLearning.length === 0) {
            await this._handleSessionCompletion();
            return true;
        }
        
        // Check if we've gone through all cards in the current round
        const currentCardId = StudyState.getCurrentCard(state)?.id;
        const isLastCard = state.currentIndex === state.cards.length - 1;
        const hasProcessedCurrentCard = modeData.responses.has(currentCardId);
        
        if (isLastCard && hasProcessedCurrentCard) {
            // We've processed the last card, check if round should advance
            const stillLearningThisRound = state.cards.filter(card => 
                modeData.stillLearning.includes(card.id)
            );
            
            if (stillLearningThisRound.length > 0) {
                // Start new round with remaining cards
                await this._startNewRound();
                return true;
            }
        }
        
        return false;
    }

    /**
     * Start a new round with remaining cards
     */
    async _startNewRound() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        // Record completed round
        modeData.completedRounds.push({
            round: modeData.currentRound,
            completedAt: new Date(),
            cardsLearned: modeData.known.length
        });
        
        modeData.currentRound++;
        modeData.roundStartTime = new Date();
        
        // Filter cards to only those still learning
        state.cards = state.originalCards.filter(card => 
            modeData.stillLearning.includes(card.id)
        );
        
        // CRITICAL FIX: Reset to first card AND ensure front side shows
        state.currentIndex = 0;
        state.currentCardId = state.cards[0]?.id;
        state.isFlipped = false;  // Ensure card shows front side
        
        // Reset card flip visual state
        if (this.manager.resetCardFlip) {
            this.manager.resetCardFlip();
        } else {
            // Fallback manual reset
            const flashcard = document.getElementById('flashcard');
            if (flashcard) {
                flashcard.style.transition = 'none';
                flashcard.classList.remove('flipped', 'flip-horizontal', 'flip-vertical-up', 'flip-vertical-down', 'flipping');
                flashcard.offsetHeight;
                flashcard.style.transition = '';
                flashcard.classList.add('flip-horizontal');
            }
        }
        
        // Show round transition message
        this._showMessage(
            `Starting Round ${modeData.currentRound} with ${modeData.stillLearning.length} cards`,
            'info'
        );
        
        // Render new round with front side showing
        await this.renderCard();
    }

    /**
     * Handle session completion
     */
    async _handleSessionCompletion() {
        const stats = this.getStats();
        
        this._showMessage('🎉 Congratulations! You\'ve mastered all cards!', 'success');
        
        // CRITICAL FIX: Call manager's completion method with our custom reset logic
        if (this.manager.showCompletionOverlay) {
            // Use manager's method but with custom message
            const modeData = StudyState.getModeData(this.manager.state, 'simple-spaced');
            const totalTime = Math.round((new Date() - new Date(modeData.sessionStartTime)) / 1000 / 60);
            
            const completionMessage = `🎉 Congratulations! You've mastered all ${stats.totalCards} cards!
            
📊 Session Summary:
• Rounds completed: ${stats.currentRound}
• Total time: ${totalTime} minutes
• Cards mastered: ${stats.known}

All cards are now in your "Known" pile! 🧠✨`;

            // Override the manager's reset function temporarily
            const originalShowCompletionOverlay = this.manager.showCompletionOverlay.bind(this.manager);
            this.manager.showCompletionOverlay = (message) => {
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
                    
                    // CRITICAL FIX: Properly reset the deck to all original cards
                    const state = this.manager.state;
                    
                    // Reset to original cards (all cards, not just current filtered ones)
                    state.cards = [...state.originalCards];
                    state.totalCards = state.originalCards.length;
                    state.currentIndex = 0;
                    state.currentCardId = state.cards[0]?.id;
                    state.isFlipped = false;
                    
                    // Reset simple spaced mode data completely
                    const allCardIds = state.cards.map(card => card.id);
                    StudyState.updateModeData(state, {
                        stillLearning: [...allCardIds],  // All cards back to still learning
                        known: [],
                        currentRound: 1,
                        responses: new Map(),
                        isCollectingResponse: false,
                        sessionStartTime: new Date(),
                        roundStartTime: new Date(),
                        completedRounds: []
                    }, 'simple-spaced');
                    
                    // Re-initialize mode and render
                    if (this.manager.currentMode && this.manager.currentMode.initialize) {
                        await this.manager.currentMode.initialize(state);
                    }
                    await this.renderCard();
                    
                    console.log(`Study Again: Reset with all ${state.totalCards} cards`);
                });

                overlay.querySelector('#finishSessionBtn').addEventListener('click', () => {
                    overlay.remove();
                    if (this.manager.exitStudy) {
                        this.manager.exitStudy();
                    }
                });

                document.body.appendChild(overlay);
                
                // Restore original method
                this.manager.showCompletionOverlay = originalShowCompletionOverlay;
            };
            
            this.manager.showCompletionOverlay(completionMessage);
        } else {
            // Fallback to our own completion overlay
            this._showCompletionOverlay();
        }
        
        console.log('Simple spaced session completed!', stats);
    }

    /**
     * Show completion overlay (fallback method)
     */
    _showCompletionOverlay() {
        const stats = this.getStats();
        const modeData = StudyState.getModeData(this.manager.state, 'simple-spaced');
        
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        overlay.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="text-xl font-semibold text-gray-900 mb-4">Session Complete!</h3>
                <div class="text-gray-600 text-sm mb-6">
                    Congratulations! You've mastered all ${stats.totalCards} cards!
                    <br><br>
                    📊 Session Summary:<br>
                    • Rounds completed: ${stats.currentRound}<br>
                    • Total time: ${stats.studyDuration} minutes<br>
                    • Cards mastered: ${stats.known}
                    <br><br>
                    All cards are now in your "Known" pile! 🧠✨
                </div>
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
            
            // CRITICAL FIX: Properly reset the session
            const state = this.manager.state;
            
            // Reset to original cards (all cards, not just remaining ones)
            state.cards = [...state.originalCards];
            state.totalCards = state.originalCards.length;
            state.currentIndex = 0;
            state.currentCardId = state.cards[0]?.id;
            state.isFlipped = false;
            
            // Reset simple spaced mode data completely
            const allCardIds = state.cards.map(card => card.id);
            StudyState.updateModeData(state, {
                stillLearning: [...allCardIds],  // All cards back to still learning
                known: [],
                currentRound: 1,
                responses: new Map(),
                isCollectingResponse: false,
                sessionStartTime: new Date(),
                roundStartTime: new Date(),
                completedRounds: []
            }, 'simple-spaced');
            
            // Re-initialize and render
            await this.initialize(state);
            await this.renderCard();
            
            console.log(`Study Again: Reset with all ${state.totalCards} cards`);
        });

        overlay.querySelector('#finishSessionBtn').addEventListener('click', () => {
            overlay.remove();
            if (this.manager.exitStudy) {
                this.manager.exitStudy();
            } else {
                // Fallback - reload page or redirect
                window.location.reload();
            }
        });

        document.body.appendChild(overlay);
    }
    _showRoundInfo() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        const message = `Round ${modeData.currentRound} - Still Learning: ${modeData.stillLearning.length}, Known: ${modeData.known.length}`;
        this._showMessage(message, 'info');
    }

    /**
     * Show progress information
     */
    _showProgressInfo() {
        const stats = this.getStats();
        const message = `Progress: ${stats.completionPercentage}% complete, ${stats.studyDuration} minutes studied`;
        this._showMessage(message, 'info');
    }

    /**
     * Save current progress
     */
    _saveProgress() {
        // Implementation for saving progress to localStorage or backend
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'simple-spaced');
        
        const progressData = {
            mode: 'simple-spaced',
            currentRound: modeData.currentRound,
            stillLearning: modeData.stillLearning,
            known: modeData.known,
            responses: Array.from(modeData.responses.entries()),
            sessionStartTime: modeData.sessionStartTime,
            completedRounds: modeData.completedRounds
        };
        
        console.log('Saving simple spaced progress:', progressData);
    }
}