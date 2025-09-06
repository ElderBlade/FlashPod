// static/js/study/utils/keyboard-handler.js

/**
 * Handles keyboard events for study modes
 * Provides mode-specific keyboard shortcuts
 */
export class KeyboardHandler {
    constructor(studyManager) {
        this.manager = studyManager;
        this.keyHandler = this.handleKeyboard.bind(this);
        this.isActive = false;
    }

    /**
     * Activate keyboard event listening
     */
    activate() {
        if (this.isActive) return;
        
        document.addEventListener('keydown', this.keyHandler);
        this.isActive = true;
    }

    /**
     * Deactivate keyboard event listening
     */
    deactivate() {
        if (!this.isActive) return;
        
        document.removeEventListener('keydown', this.keyHandler);
        this.isActive = false;
    }

    /**
     * Handle keyboard events
     */
    handleKeyboard(e) {
        if (!this.manager.isStudyActive) return;
        
        // Don't handle keys if user is typing in an input
        if (this._isTypingInInput(e.target)) {
            return;
        }

        const currentMode = this.manager.state.mode;
        
        // Universal shortcuts (work in all modes)
        if (this._handleUniversalShortcuts(e)) {
            return; // Event was handled
        }

        // Mode-specific shortcuts
        switch (currentMode) {
            case 'basic':
                this._handleBasicModeKeys(e);
                break;
            case 'simple-spaced':
                this._handleSimpleSpacedKeys(e);
                break;
            case 'full-spaced':
                this._handleFullSpacedKeys(e);
                break;
        }
    }

    /**
     * Handle universal keyboard shortcuts
     */
    _handleUniversalShortcuts(e) {

        // Check if simple-spaced mode is collecting responses
        const currentMode = this.manager.state.mode;
        const modeData = this.manager.state.modeData[currentMode];
        
        // In simple-spaced mode, arrow keys are response keys when collecting responses
        if (currentMode === 'simple-spaced' && modeData && modeData.isCollectingResponse) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                // These will be handled by mode-specific handler
                // return false;
                if (modeData.isCollectingResponse || this.manager.state.isFlipped) {
                    return false; // Block - let mode-specific handler deal with it
                }
            }
        }
        
        switch (e.key) {
            case ' ': // Spacebar - flip card
                e.preventDefault();
                this.manager.flipCard('horizontal');
                return true;
                
            case 'ArrowUp': // Up arrow - vertical flip up
                e.preventDefault();
                this.manager.flipCard('vertical-up');
                return true;
                
            case 'ArrowDown': // Down arrow - vertical flip down
                e.preventDefault();
                this.manager.flipCard('vertical-down');
                return true;
                
            case 'ArrowLeft': // Left arrow - previous card (only if not collecting response)
                e.preventDefault();
                this.manager.navigateCard(-1);
                return true;
                
            case 'ArrowRight': // Right arrow - next card (only if not collecting response)
                e.preventDefault();
                this.manager.navigateCard(1);
                return true;
                
            case 's':
            case 'S': // S key - toggle shuffle
                e.preventDefault();
                this.manager.toggleShuffle();
                return true;
                
            case 't':
            case 'T': // T key - toggle term/definition
                e.preventDefault();
                this.manager.toggleTermDef();
                return true;
                
            case 'Escape': // Escape - exit study
                e.preventDefault();
                this.manager.exitStudy();
                return true;
        }
        
        return false; // Event not handled
    }

    /**
     * Handle basic mode specific keys
     */
    _handleBasicModeKeys(e) {
        // Basic mode doesn't have additional shortcuts beyond universal ones
        // Could add mode-specific features later like bookmarking, etc.
        
        switch (e.key) {
            case 'b':
            case 'B': // Bookmark card (future feature)
                e.preventDefault();
                this._showMessage('Bookmarking not yet implemented', 'info');
                break;
        }
    }

    /**
     * Handle simple spaced repetition mode keys
     */
    // Update the _handleSimpleSpacedKeys method in keyboard-handler.js
    _handleSimpleSpacedKeys(e) {
        const modeData = this.manager.state.modeData['simple-spaced'];
        
        // Only handle response keys if we're collecting a response
        if (modeData && modeData.isCollectingResponse) {
            switch (e.key) {
                case 'ArrowLeft': // Left arrow - don't remember
                    e.preventDefault();
                    this.manager.handleResponse('dont-remember');
                    return;
                    
                case 'ArrowRight': // Right arrow - remember
                    e.preventDefault();
                    this.manager.handleResponse('remember');
                    return;
            }
        }
        
        // Mode-specific shortcuts
        switch (e.key) {
            case 'r':
            case 'R': // R key - show round info
                e.preventDefault();
                this._showRoundInfo();
                break;
                
            case 'p':
            case 'P': // P key - show progress
                e.preventDefault();
                this._showProgressInfo();
                break;
        }
    }

    /**
     * Handle full spaced repetition mode keys
     */
    _handleFullSpacedKeys(e) {
        const modeData = this.manager.state.modeData['full-spaced'];
        
        // Difficulty rating shortcuts (1-4)
        if (e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            const difficulty = parseInt(e.key);
            this.manager.handleResponse(difficulty);
            return;
        }
        
        // Additional SM-2 mode shortcuts
        switch (e.key) {
            case 'd':
            case 'D': // D key - show due cards info
                e.preventDefault();
                this._showDueCardsInfo();
                break;
                
            case 'i':
            case 'I': // I key - show card info
                e.preventDefault();
                this._showCardInfo();
                break;
        }
    }

    /**
     * Check if user is typing in an input field
     */
    _isTypingInInput(element) {
        const inputTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
        return inputTypes.includes(element.tagName) || 
               element.contentEditable === 'true' ||
               element.closest('[contenteditable="true"]');
    }

    /**
     * Show round information for simple spaced mode
     */
    _showRoundInfo() {
        const modeData = this.manager.state.modeData['simple-spaced'];
        const message = `Round ${modeData.currentRound} - Learning: ${modeData.stillLearning.length}, Known: ${modeData.known.length}`;
        this._showMessage(message, 'info');
    }

    /**
     * Show progress information
     */
    _showProgressInfo() {
        const state = this.manager.state;
        const current = state.currentIndex + 1;
        const total = state.totalCards;
        const percentage = Math.round((current / total) * 100);
        
        const message = `Progress: ${current}/${total} (${percentage}%) - Mode: ${state.mode}`;
        this._showMessage(message, 'info');
    }

    /**
     * Show due cards information for full spaced mode
     */
    _showDueCardsInfo() {
        const modeData = this.manager.state.modeData['full-spaced'];
        const message = `Due: ${modeData.dueCards.length}, Learning: ${modeData.learningCards.length}, Mature: ${modeData.matureCards.length}`;
        this._showMessage(message, 'info');
    }

    /**
     * Show current card information
     */
    _showCardInfo() {
        const currentCard = this.manager.currentCard;
        if (!currentCard) return;
        
        const message = `Card ID: ${currentCard.id}, Difficulty: ${currentCard.difficulty || 'Not set'}`;
        this._showMessage(message, 'info');
    }

    /**
     * Get current mode's keyboard shortcuts for help display
     */
    getCurrentModeShortcuts() {
        const mode = this.manager.state.mode;
        
        const baseShortcuts = [
            { key: 'Space', action: 'Flip card horizontally' },
            { key: '↑', action: 'Flip card up' },
            { key: '↓', action: 'Flip card down' },
            { key: '←', action: 'Previous card' },
            { key: '→', action: 'Next card' },
            { key: 'S', action: 'Toggle shuffle' },
            { key: 'T', action: 'Toggle term/definition' },
            { key: 'Escape', action: 'Exit study' },
        ];

        const modeSpecificShortcuts = {
            'basic': [],
            'simple-spaced': [
                { key: 'X', action: "Don't remember (when flipped)" },
                { key: 'C', action: 'Remember (when flipped)' },
                { key: 'R', action: 'Show round info' },
                { key: 'P', action: 'Show progress' }
            ],
            'full-spaced': [
                { key: '1-4', action: 'Rate difficulty' },
                { key: 'D', action: 'Show due cards info' },
                { key: 'I', action: 'Show card info' }
            ]
        };

        return [...baseShortcuts, ...(modeSpecificShortcuts[mode] || [])];
    }

    /**
     * Show keyboard shortcuts help
     */
    showKeyboardHelp() {
        const shortcuts = this.getCurrentModeShortcuts();
        const helpText = shortcuts.map(s => `${s.key}: ${s.action}`).join('\n');
        
        // Could create a proper modal here
        alert('Keyboard Shortcuts:\n\n' + helpText);
    }

    // Private helper
    _showMessage(message, type = 'info') {
        if (this.manager._showMessage) {
            this.manager._showMessage(message, type);
        }
    }
}