/**
 * Simple Spaced Repetition Mode Implementation
 * Integrates with existing architecture
 */
export class SimpleSpaced {
    constructor(studyManager) {
        this.manager = studyManager;
        this.modeName = 'simple-spaced';
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
        
        // Hide response buttons
        modeData.isCollectingResponse = false;
        this.manager.interface.hideResponseButtons();
        
        // Show color effect
        this.showColorEffect(response === 'remember' ? 'green' : 'red');
        
        // Auto-advance after brief delay
        setTimeout(() => this.advanceCard(), 300);
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

    showColorEffect(color) {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        const effectClass = color === 'green' ? 'flash-green' : 'flash-red';
        flashcard.classList.add(effectClass);
        
        setTimeout(() => {
            flashcard.classList.remove(effectClass);
        }, 300);
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
        
        // Create completion modal
        const modalHTML = `
            <div id="completionModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 max-w-md mx-4">
                    <div class="text-center">
                        <div class="text-4xl mb-4">🎉</div>
                        <h2 class="text-2xl font-bold mb-4 text-green-600">Congratulations!</h2>
                        <p class="mb-4">You've learned all ${modeData.known.length} cards!</p>
                        <div class="mb-6">
                            <p class="text-sm text-gray-600">Completed in ${modeData.currentRound} rounds</p>
                        </div>
                        <div class="flex gap-4">
                            <button id="studyAgainBtn" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                                Study Again
                            </button>
                            <button id="finishBtn" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                                Finish
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        document.getElementById('studyAgainBtn').onclick = () => this.restartSession();
        document.getElementById('finishBtn').onclick = () => this.finishSession();
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
        
        this.updateActiveCards();
        document.getElementById('completionModal')?.remove();
        
        this.manager._showMessage('Session restarted!', 'info');
        
        // FIX: Render the first card after restart
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
    }
}