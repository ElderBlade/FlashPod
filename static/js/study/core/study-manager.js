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
    async startPodStudy(podId) {
        try {
            // Initialize session data
            await this.session.initializePod(podId);
            
            // Set up state
            this.state.pod = this.session.podData;
            this.state.cards = [...this.session.cardsData];
            this.state.originalCards = [...this.session.cardsData];
            this.state.currentIndex = 0;
            this.state.currentCardId = this.state.cards[0]?.id;
            this.state.totalCards = this.state.cards.length;
            this.state.lastPodId = podId;
            
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
            this.state.cards = [...this.state.originalCards];
            this.state.isShuffled = false;
            
            // Find current card position in original order
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
        // Cleanup current mode
        if (this.currentMode) {
            await this.currentMode.cleanup();
        }
        
        // Cleanup session
        await this.session.end();
        
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
     * Get current study statistics
     */
    getStats() {
        if (!this.currentMode || !this.currentMode.getStats) {
            return null;
        }
        
        return this.currentMode.getStats();
    }

    // Private methods
    _activateStudy() {
        this.interface.show();
        this.keyboard.activate();
        this.isActive = true;
        this.isPaused = false;
        
        console.log(`Study activated - Mode: ${this.state.mode}`);
    }

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
        
        console.log(`Study activated - Mode: ${this.state.mode}`);
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