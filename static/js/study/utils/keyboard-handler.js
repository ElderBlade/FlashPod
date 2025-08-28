// static/js/study/utils/keyboard-handler.js

/**
 * Handles keyboard events for study modes
 * Provides mode-specific keyboard shortcuts
 * Updated to support arrow key responses in simple spaced mode
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
        
        // Mode-specific shortcuts first (they may override universal ones)
        let handled = false;
        switch (currentMode) {
            case 'basic':
                handled = this._handleBasicModeKeys(e);
                break;
            case 'simple-spaced':
                handled = this._handleSimpleSpacedKeys(e);
                break;
            case 'full-spaced':
                handled = this._handleFullSpacedKeys(e);
                break;
        }

        // If mode-specific handler didn't handle it, try universal shortcuts
        if (!handled) {
            this._handleUniversalShortcuts(e);
        }
    }

    /**
     * Handle universal keyboard shortcuts
     * These work in all modes unless overridden by mode-specific handlers
     */
    _handleUniversalShortcuts(e) {
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
                
            case 'ArrowLeft': // Left arrow - previous card (default behavior)
                e.preventDefault();
                this.manager.navigateCard(-1);
                return true;
                
            case 'ArrowRight': // Right arrow - next card (default behavior)
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
                
            case '1': // Quick mode switches
                e.preventDefault();
                this.manager.switchMode('basic');
                return true;
                
            case '2':
                e.preventDefault();
                this.manager.switchMode('simple-spaced');
                return true;
                
            case '3':
                e.preventDefault();
                this.manager.switchMode('full-spaced');
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
                return true;
        }
        
        return false;
    }

    /**
     * Handle simple spaced repetition mode keys
     * Arrow keys are overridden for responses when collecting responses
     */
    _handleSimpleSpacedKeys(e) {
        const modeData = this.manager.state.modeData['simple-spaced'];
        
        // Override arrow key behavior when collecting responses
        if (modeData && modeData.isCollectingResponse) {
            switch (e.key) {
                case 'ArrowLeft': // Left arrow - don't remember
                    e.preventDefault();
                    this.manager.handleResponse('dont-remember');
                    return true;
                    
                case 'ArrowRight': // Right arrow - remember
                    e.preventDefault();
                    this.manager.handleResponse('remember');
                    return true;
            }
        }
        
        // Legacy key support (X and C) - can be removed if not needed
        if (modeData && modeData.isCollectingResponse) {
            switch (e.key) {
                case 'x':
                case 'X': // X key - don't remember (legacy)
                    e.preventDefault();
                    this.manager.handleResponse('dont-remember');
                    return true;
                    
                case 'c':
                case 'C': // C key - remember (legacy)
                    e.preventDefault();
                    this.manager.handleResponse('remember');
                    return true;
            }
        }
        
        // Mode-specific shortcuts
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
        
        return false;
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
            return true;
        }
        
        // Additional SM-2 mode shortcuts
        switch (e.key) {
            case 'd':
            case 'D': // D key - show due cards info
                e.preventDefault();
                this._showDueCardsInfo();
                return true;
                
            case 'i':
            case 'I': // I key - show card info
                e.preventDefault();
                this._showCardInfo();
                return true;
        }
        
        return false;
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
        const message = `Round ${modeData.currentRound} - Still Learning: ${modeData.stillLearning.length}, Known: ${modeData.known.length}`;
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
        if (!modeData) return;
        
        const message = `Due: ${modeData.dueCards?.length || 0}, Learning: ${modeData.learningCards?.length || 0}, Mature: ${modeData.matureCards?.length || 0}`;
        this._showMessage(message, 'info');
    }

    /**
     * Show current card information
     */
    _showCardInfo() {
        const currentCard = this.manager.state.cards[this.manager.state.currentIndex];
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
            { key: 'S', action: 'Toggle shuffle' },
            { key: 'T', action: 'Toggle term/definition' },
            { key: 'Escape', action: 'Exit study' },
            { key: '1,2,3', action: 'Quick mode switch' }
        ];

        const modeSpecificShortcuts = {
            'basic': [
                { key: '←', action: 'Previous card' },
                { key: '→', action: 'Next card' }
            ],
            'simple-spaced': [
                { key: '← (when flipped)', action: "Don't remember & advance" },
                { key: '→ (when flipped)', action: 'Remember & advance' },
                { key: '← (normal)', action: 'Previous card' },
                { key: '→ (normal)', action: 'Next card' },
                { key: 'R', action: 'Show round info' },
                { key: 'P', action: 'Show progress' }
            ],
            'full-spaced': [
                { key: '←', action: 'Previous card' },
                { key: '→', action: 'Next card' },
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
        if (this.manager.showMessage) {
            this.manager.showMessage(message, type);
        } else if (this.manager._showMessage) {
            this.manager._showMessage(message, type);
        }
    }
}