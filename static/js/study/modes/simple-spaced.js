/**
 * Simple Spaced Repetition Mode Implementation
 * Integrates with existing architecture
 */
import { CardAbsorptionAnimator } from '../ui/card-absorption-animator.js';

export class SimpleSpaced {
    constructor(studyManager) {
        this.manager = studyManager;
        this.modeName = 'simple-spaced';
        this.absorptionAnimator = new CardAbsorptionAnimator();
    }

    async initialize(state) {
        const modeData = state.modeData['simple-spaced'];
        
        // Initialize if first time
        if (modeData.stillLearning.length === 0 && modeData.known.length === 0) {
            modeData.stillLearning = state.cards.map(card => card.id);
            modeData.known = [];
            modeData.currentRound = 1;
            modeData.sessionStartTime = new Date();
            modeData.roundStartTime = new Date();
        }

        this.updateActiveCards();
        await this._updateInterface();
        console.log(`Simple Spaced initialized - Round ${modeData.currentRound}`);
    }

    updateActiveCards() {
        const state = this.manager.state;
        const modeData = state.modeData['simple-spaced'];
        
        // Filter to only still learning cards
        const stillLearningCards = state.originalCards.filter(card => 
            modeData.stillLearning.includes(card.id)
        );
        
        state.cards = stillLearningCards;
        state.totalCards = stillLearningCards.length;
        state.currentIndex = 0;
        state.currentCardId = stillLearningCards[0]?.id;
    }

    async onCardFlip(direction) {
        const state = this.manager.state;
        const modeData = state.modeData['simple-spaced'];
        const currentCard = state.cards[state.currentIndex];

        // Show response buttons immediately when flipping to back (after flip is complete)
        if (!state.isFlipped && currentCard && modeData.stillLearning.includes(currentCard.id)) {
            setTimeout(() => {
                modeData.isCollectingResponse = true;
                const responseButtons = document.getElementById('responseButtons');
                if (responseButtons) {
                    responseButtons.classList.remove('hidden');
                }
                this.manager.interface.updateModeSpecificUI('simple-spaced', modeData);
            }, 300);
        }
    }

    async handleResponse(response) {
        const state = this.manager.state;
        const modeData = state.modeData['simple-spaced'];
        
        if (!modeData.isCollectingResponse) return;
        
        const currentCard = state.cards[state.currentIndex];
        if (!currentCard) return;

        // Record response
        if (this.manager.session) {
            await this.manager.session.recordSimpleSpacedResponse(currentCard.id, response);
        }
        
        // Track in mode data
        if (!modeData.responses.has(currentCard.id)) {
            modeData.responses.set(currentCard.id, []);
        }
        modeData.responses.get(currentCard.id).push({
            response,
            timestamp: new Date(),
            round: modeData.currentRound
        });

        // Move card if remembered
        if (response === 'remember') {
            this.moveToKnown(currentCard.id);
        }
        
        // Hide response buttons immediately for this card
        modeData.isCollectingResponse = false;
        this.manager.interface.hideResponseButtons();
        
        this.manager.interface.updateModeSpecificUI('simple-spaced', modeData);

        // Trigger animation - this will handle card advancement
        await this.showAbsorptionEffect(response);
    }

    moveToKnown(cardId) {
        const modeData = this.manager.state.modeData['simple-spaced'];
        
        const index = modeData.stillLearning.indexOf(cardId);
        if (index > -1) {
            modeData.stillLearning.splice(index, 1);
        }
        
        if (!modeData.known.includes(cardId)) {
            modeData.known.push(cardId);
        }
    }

    async showAbsorptionEffect(response) {
        await this.absorptionAnimator.showAbsorptionEffect(response, () => {
            // This callback is called early in the animation to advance the card
            this.advanceCard();
        });
    }

    async advanceCard() {
        const state = this.manager.state;
        
        if (state.currentIndex + 1 < state.cards.length) {
            await this.manager.navigateCard(1);
        } else {
            await this.handleRoundCompletion();
        }
    }

    async handleRoundCompletion() {
        const modeData = this.manager.state.modeData['simple-spaced'];
        
        if (modeData.stillLearning.length === 0) {
            this.handleSessionCompletion();
        } else {
            this.startNewRound();
        }
    }

    startNewRound() {
        const state = this.manager.state;
        const modeData = state.modeData['simple-spaced'];
        
        // Record completed round
        modeData.completedRounds.push({
            round: modeData.currentRound,
            endTime: new Date(),
            cardsLearned: modeData.known.length
        });
        
        // Start new round
        modeData.currentRound++;
        modeData.roundStartTime = new Date();
        
        // Update active cards and interface
        this.updateActiveCards();
        this.manager.interface.updateModeSpecificUI('simple-spaced', modeData);
        
        this.manager._showMessage(
            `Round ${modeData.currentRound} started - ${modeData.stillLearning.length} cards to review`,
            'info'
        );
        
        // FIX: Render the first card of the new round
        this.renderCard();
    }

    handleSessionCompletion() {
        const modeData = this.manager.state.modeData['simple-spaced'];
        const totalTime = Math.round((new Date() - new Date(modeData.sessionStartTime)) / 1000 / 60);
        
        // Create completion modal
        const modalHTML = `
            <div id="completionModal" class="modal-backdrop fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-xl">
                    <div class="text-6xl mb-4">🎉</div>
                    <h3 class="text-xl font-semibold text-gray-900 mb-4">Session Complete!</h3>
                    <div class="text-gray-600 text-sm mb-6">
                        Congratulations! You've mastered all ${modeData.known.length} cards!
                        <br><br>
                        📊 Session Summary:<br>
                        • Rounds completed: ${modeData.currentRound}<br>
                        • Total time: ${totalTime} minutes<br>
                        <br><br>
                        All cards are now in your "Known" pile! 🧠✨
                    </div>
                    <div class="flex space-x-3">
                        <button data-action="study-again" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Study Again
                        </button>
                        <button data-action="finish" class="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                            Finish
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Use event delegation
        const modal = document.getElementById('completionModal');
        modal.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'study-again') {
                this.restartSession();
            } else if (action === 'finish') {
                this.finishSession();
            }
        });
    }

    restartSession() {
        const state = this.manager.state;
        const modeData = state.modeData['simple-spaced'];
        
        // Reset to all cards in still learning
        modeData.stillLearning = state.originalCards.map(card => card.id);
        modeData.known = [];
        modeData.currentRound = 1;
        modeData.responses.clear();
        modeData.sessionStartTime = new Date();
        
        // Update the active cards (this updates state.cards and state.totalCards)
        this.updateActiveCards();
        
        // Reset current position to beginning
        state.currentIndex = 0;
        state.currentCardId = state.cards[0]?.id;
        state.isFlipped = false;
        
        // Update interface components
        this.manager.interface.updateProgress(); // This updates progress bar and counter
        this.manager.interface.updateNavigationButtons();
        this.manager.interface.updateModeSpecificUI('simple-spaced', modeData);
        
        // Remove the modal
        document.getElementById('completionModal')?.remove();
        
        this.manager._showMessage('Session restarted!', 'info');
        
        // Render the first card after restart
        this.renderCard();
    }

    finishSession() {
        document.getElementById('completionModal')?.remove();
        this.manager.exitStudy();
    }

    async beforeNavigation(direction) {
        const modeData = this.manager.state.modeData['simple-spaced'];
        return !modeData.isCollectingResponse;
    }

    async onNavigation() {
        const modeData = this.manager.state.modeData['simple-spaced'];
        modeData.isCollectingResponse = false;
        this.manager.interface.hideResponseButtons();
        
        // FIX: Ensure the new card is rendered after navigation
        await this.renderCard();
    }

    async renderCard() {
        this.manager.interface.renderCurrentCard();
    }

    // In your SimpleSpaced class
    async _updateInterface() {
        // Update keyboard hints for simple spaced mode
        this.manager.interface.modeToggle.updateKeyboardHints();
    }

    getStats() {
        const modeData = this.manager.state.modeData['simple-spaced'];
        const sessionStats = this.manager.session?.getSessionStats() || {};
        
        return {
            ...sessionStats,
            mode: 'simple-spaced',
            currentRound: modeData.currentRound,
            cardsLearned: modeData.known.length,
            cardsRemaining: modeData.stillLearning.length,
            totalCards: modeData.known.length + modeData.stillLearning.length,
            retention: Math.round((modeData.known.length / (modeData.known.length + modeData.stillLearning.length)) * 100)
        };
    }

    async cleanup() {
        const modeData = this.manager.state.modeData['simple-spaced'];
        modeData.isCollectingResponse = false;
        this.manager.interface.hideResponseButtons();
        
        if (this.manager.session) {
            await this.manager.session.saveSimpleSpacedProgress(modeData);
        }

        this.absorptionAnimator.cleanup();
    }
}