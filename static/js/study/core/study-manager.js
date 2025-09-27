// static/js/study/core/study-manager.js
import { StudyState } from './study-state.js';
import { StudySession } from './study-session.js';
import { StudyInterface } from '../ui/study-interface.js';
import { KeyboardHandler } from '../utils/keyboard-handler.js';
import { BasicReview } from '../modes/basic-review.js';
import { SimpleSpaced } from '../modes/simple-spaced.js';
import { FullSpaced } from '../modes/full-spaced.js';

export class StudyManager {
    constructor() {
        this.state = StudyState.create();
        this.session = new StudySession();
        this.interface = new StudyInterface(this);
        this.keyboard = new KeyboardHandler(this);
        
        // Mode instances
        this.modes = {
            'basic': new BasicReview(this),
            'simple-spaced': new SimpleSpaced(this),
            'full-spaced': new FullSpaced(this),
        };
        
        this.currentMode = null;
        this.isActive = false;
        this.isPaused = false;
    }

    /**
     * Start study session for a deck
     */
    async startDeckStudy(deckId) {
        try {
            // Initialize session data
            await this.session.initializeDeck(deckId);

            // Store resume flag in state for the entire session
            this.wasSessionResumed = this.session.wasResumed;
            
            // Show resume message if applicable
            if (this.wasSessionResumed) {
                this._showMessage(`📚 Resumed ${this.session.deckData.name} study session`, 'success');
            }
            
            // Set up state
            this.state.deck = this.session.deckData;
            this.state.cards = [...this.session.cardsData];
            this.state.originalCards = [...this.session.cardsData];
            this.state.currentIndex = 0;
            this.state.currentCardId = this.state.cards[0]?.id;
            this.state.totalCards = this.state.cards.length;
            this.state.lastDeckId = deckId;
            
            // Start with basic mode
            await this.switchMode('basic');
            
            this._activateStudy();
            
        } catch (error) {
            this._showMessage('Error starting study session: ' + error.message, 'error');
            console.error('Study session error:', error);
        }
    }

    /**
     * Start study session for a pod
     */
    async startPodStudy(podId, selectedDeckIds = null) {
        try {
            // Initialize session data
            await this.session.initializePod(podId);

            // Store resume flag in state for the entire session
            this.wasSessionResumed = this.session.wasResumed;

            console.log('🔍 After initialization, session.wasResumed:', this.session.wasResumed);

            // Show resume message if applicable
            if (this.wasSessionResumed) {
                console.log('🔍 About to show resume message');
                this._showMessage(`📂 Resumed ${this.session.podData.name} pod study session`, 'success');
                console.log('🔍 Resume message sent');
            }
            
            // Set up state
            this.state.pod = this.session.podData;
            this.state.cards = [...this.session.cardsData];
            this.state.originalCards = [...this.session.cardsData];
            this.state.currentIndex = 0;
            this.state.currentCardId = this.state.cards[0]?.id;
            this.state.totalCards = this.state.cards.length;
            this.state.lastPodId = podId;
            this.state.selectedDeckIds = selectedDeckIds;
            
            if (this.state.cards.length === 0) {
                this._showMessage('No cards found in this pod', 'warning');
                return;
            }
            
            // Start with basic mode
            await this.switchMode('basic');
            
            this._activateStudy();
            
        } catch (error) {
            this._showMessage('Error starting pod study: ' + error.message, 'error');
            console.error('Pod study error:', error);
        }
    }

    /**
     * Resume paused study session
     */
    async resumeStudy() {
        if (!this.isPaused || (!this.state.lastDeckId && !this.state.lastPodId)) {
            this._showMessage('No paused session to resume', 'error');
            return;
        }

        // Switch to the last active mode
        await this.switchMode(this.state.mode);
        this._activateStudy();
    }

    /**
     * Switch study mode (can be done mid-session)
     */
    async switchMode(modeName) {
        if (!this.modes[modeName]) {
            throw new Error(`Unknown study mode: ${modeName}`);
        }

        // Cleanup current mode
        if (this.currentMode) {
            await this.currentMode.cleanup();
        }

        // Switch mode
        this.state.mode = modeName;
        this.currentMode = this.modes[modeName];

        // Initialize new mode
        await this.currentMode.initialize(this.state);
        
        // Update interface
        this.interface.updateModeToggle(modeName);
        this.interface.updateModeSpecificUI(modeName, this.state.modeData[modeName]);
        
        // Render current card with new mode
        await this.currentMode.renderCard();
        
        console.log(`Switched to ${modeName} mode`);
    }

    /**
     * Navigate to different card
     */
    async navigateCard(direction) {
        const newIndex = this.state.currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.state.totalCards) {
            // Let current mode handle pre-navigation logic
            const canNavigate = await this.currentMode.beforeNavigation(direction);
            if (!canNavigate) return;
            
            // Update state
            this.state.currentIndex = newIndex;
            this.state.currentCardId = this.state.cards[newIndex]?.id;
            this.state.isFlipped = false;
            
            // Let mode handle the navigation
            await this.currentMode.onNavigation();
            
            // Update interface
            this.interface.updateProgress();
            this.interface.updateNavigationButtons();
        }
    }

    /**
     * Flip the current card
     */
    async flipCard(direction = 'horizontal') {
        if (!this.currentMode) return;
        
        // Let mode handle flip logic
        await this.currentMode.onCardFlip(direction);
        
        // Update interface
        this.interface.flipCard(direction);
        
        // Update state
        this.state.isFlipped = !this.state.isFlipped;
        this.state.flipDirection = direction;
    }

    /**
     * Handle mode-specific response (for spaced repetition modes)
     */
    async handleResponse(responseType) {
        if (!this.currentMode || !this.currentMode.handleResponse) {
            return;
        }
        
        await this.currentMode.handleResponse(responseType);
    }

    /**
     * Toggle shuffle
     */
    async toggleShuffle() {
        const currentCard = this.state.cards[this.state.currentIndex];
        
        if (this.state.isShuffled) {
            // Turn off shuffle - restore original order
            this.state.currentCardId = currentCard?.id;
            
            // For pod study, re-aggregate cards in original deck order
            if (this.state.pod && this.state.selectedDeckIds) {
                this.state.cards = await this._aggregatePodCards(
                    this.state.pod.id, 
                    this.state.selectedDeckIds, 
                    false // no shuffle
                );
                // Update original cards reference for future operations
                this.state.originalCards = [...this.state.cards];
            } else {
                // For deck study, use stored original order
                this.state.cards = [...this.state.originalCards];
            }
            
            this.state.isShuffled = false;
            
            // Find current card position in restored order
            if (this.state.currentCardId) {
                const newIndex = this.state.cards.findIndex(card => card.id === this.state.currentCardId);
                this.state.currentIndex = newIndex !== -1 ? newIndex : 0;
            }
            
            this._showMessage('Shuffle turned off - cards restored to original order', 'info');
        } else {
            // Turn on shuffle
            this.state.cards = this._shuffleArray([...this.state.cards]);
            this.state.isShuffled = true;
            this.state.currentIndex = 0;
            this.state.currentCardId = this.state.cards[0]?.id;
            
            this._showMessage('Shuffle turned on - cards are now randomized', 'info');
        }

        // Let current mode handle shuffle change
        if (this.currentMode.onShuffleChange) {
            await this.currentMode.onShuffleChange();
        }

        // Update interface
        await this.currentMode.renderCard();
        this.interface.updateShuffleButton();
    }

    /**
     * Toggle term/definition display
     */
    async toggleTermDef() {
        this.state.showDefinitionFirst = !this.state.showDefinitionFirst;
        
        this._showMessage(
            this.state.showDefinitionFirst ? 
            'Now showing definitions first' : 
            'Now showing terms first', 
            'info'
        );

        // Update interface
        this.interface.updateTermDefButton();
        await this.currentMode.renderCard();
    }

    /**
     * Pause study session
     */
    pauseStudy() {
        this.interface.hide();
        this.keyboard.deactivate();
        this.isActive = false;
        this.isPaused = true;
        
        // Let current mode handle pause
        if (this.currentMode && this.currentMode.onPause) {
            this.currentMode.onPause();
        }
    }

    /**
     * Exit study session completely
     */
    async exitStudy() {
        // Check if session should be paused vs completed before cleanup
        if (this.session && this.session.isActive) {
            const isSessionComplete = this.currentMode?.isSessionComplete?.() || false;
            
            if (isSessionComplete) {
                // Actually completed - mark as complete
                await this.session.end();
            } else {
                // Exited early - pause the session instead of ending it
                await this.session.pauseSession();
            }
        } else {
            // Cleanup session normally (for cases where session is already ended)
            await this.session.end();
        }

        // Cleanup current mode
        if (this.currentMode) {
            await this.currentMode.cleanup();
        }
        
        // Reset state
        this.state = StudyState.create();
        this.currentMode = null;
        this.isActive = false;
        this.isPaused = false;
        
        // Cleanup interface
        this.interface.hide();
        this.keyboard.deactivate();
        
        // Return to library
        this._navigateToLibrary();
    }

    /**
     * Get all cards from pod decks with filtering and shuffle support
     */
    async _aggregatePodCards(podId, selectedDeckIds = null, shuffle = false) {
        try {
            const podData = await this.api.getPod(podId);
            let allCards = [];
            
            // Filter decks if specific ones are selected
            const decksToStudy = selectedDeckIds ? 
                podData.decks.filter(deck => selectedDeckIds.includes(deck.id)) :
                podData.decks;
            
            // Get cards from each selected deck
            for (const deck of decksToStudy) {
                const deckCards = await this.api.getDeckCards(deck.id);
                // Tag cards with source deck info for session tracking
                const taggedCards = deckCards.map(card => ({
                    ...card,
                    source_deck_id: deck.id,
                    source_deck_name: deck.name
                }));
                allCards.push(...taggedCards);
            }
            
            if (shuffle) {
                allCards = this._shuffleArray(allCards);
            }
            
            return allCards;
        } catch (error) {
            console.error('Failed to aggregate pod cards:', error);
            throw error;
        }
    }

    /**
     * Show deck selection modal for pod study
     */
    async _showPodDeckSelector(podData) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 class="text-lg font-semibold mb-4">Select Decks to Study</h3>
                    <div class="space-y-2 max-h-60 overflow-y-auto">
                        ${podData.decks.map(deck => `
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" value="${deck.id}" checked 
                                    class="deck-checkbox rounded border-gray-300">
                                <span class="flex-1">${deck.name}</span>
                                <span class="text-sm text-gray-500">${deck.card_count || 0} cards</span>
                            </label>
                        `).join('')}
                    </div>
                    <div class="flex items-center justify-between mt-4 pt-4 border-t">
                        <button id="select-all-decks" class="text-blue-600 hover:text-blue-800 text-sm">
                            Select All
                        </button>
                        <div class="space-x-2">
                            <button id="cancel-deck-selection" 
                                    class="px-4 py-2 text-gray-600 hover:text-gray-800">
                                Cancel
                            </button>
                            <button id="start-pod-study" 
                                    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                Start Study
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Event handlers
            modal.querySelector('#select-all-decks').onclick = () => {
                const checkboxes = modal.querySelectorAll('.deck-checkbox');
                const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                checkboxes.forEach(cb => cb.checked = !allChecked);
            };
            
            modal.querySelector('#cancel-deck-selection').onclick = () => {
                document.body.removeChild(modal);
                resolve(null);
            };
            
            modal.querySelector('#start-pod-study').onclick = () => {
                const selectedDeckIds = Array.from(modal.querySelectorAll('.deck-checkbox:checked'))
                    .map(cb => parseInt(cb.value));
                document.body.removeChild(modal);
                resolve(selectedDeckIds);
            };
            
            // Close on backdrop click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve(null);
                }
            };
        });
    }

    /**
     * Get current study statistics
     */
    getStats() {
        if (!this.currentMode || !this.currentMode.getStats) {
            return null;
        }
        
        return this.currentMode.getStats();
    }

    // Private methods
    _shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    _showMessage(message, type = 'info') {
        if (window.showMessage) {
            window.showMessage(message, type);
        }
    }

    _navigateToLibrary() {
        if (document.getElementById('nav-library')) {
            document.getElementById('nav-library').click();
        }
    }

    _activateStudy() {
        this.interface.show();
        this.keyboard.activate();
        this.isActive = true;
        this.isPaused = false;
        
        // Render the first card
        if (this.currentMode) {
            this.currentMode.renderCard();
        }

        this._setupAutoPause();
        
        console.log(`Study activated - Mode: ${this.state.mode}`);
    }

    _setupAutoPause() {
        // Handle page refresh, close, or navigation away
        this.beforeUnloadHandler = async (event) => {
            if (this.session && this.session.isActive) {
                // Use sendBeacon for reliable delivery during page unload
                navigator.sendBeacon('/api/study/session/' + this.session.sessionId + '/pause', '{}');
            }
        };
        
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
        
        // Also handle when user navigates within the app
        this.visibilityHandler = async () => {
            if (document.visibilityState === 'hidden' && this.session && this.session.isActive) {
                await this.session.pauseSession();
            }
        };
        
        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    // Getters for external access
    get isStudyActive() {
        return this.isActive;
    }

    get hasPausedSession() {
        return this.isPaused && (this.state.lastDeckId || this.state.lastPodId);
    }

    get currentCard() {
        return this.state.cards[this.state.currentIndex];
    }
}