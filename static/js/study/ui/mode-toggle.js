// static/js/study/ui/mode-toggle.js

/**
 * Handles mode switching and keyboard shortcut display
 * Updated to reflect new arrow key behavior in simple spaced mode
 */
export class ModeToggle {
    constructor(studyManager) {
        this.manager = studyManager;
        this.activeMode = 'basic';
        this.setupEventListeners();
    }

    /**
     * Initialize mode toggle functionality
     */
    initialize() {
        this.updateModeToggle();
        this.updateKeyboardHints();
    }

    /**
     * Setup event listeners for mode buttons
     */
    setupEventListeners() {
        const basicBtn = document.getElementById('basicModeBtn');
        const simpleSpacedBtn = document.getElementById('simpleSpacedModeBtn');
        const fullSpacedBtn = document.getElementById('fullSpacedModeBtn');

        if (basicBtn) {
            basicBtn.addEventListener('click', () => this.switchMode('basic'));
        }
        if (simpleSpacedBtn) {
            simpleSpacedBtn.addEventListener('click', () => this.switchMode('simple-spaced'));
        }
        if (fullSpacedBtn) {
            fullSpacedBtn.addEventListener('click', () => this.switchMode('full-spaced'));
        }
    }

    /**
     * Switch study mode
     */
    async switchMode(newMode) {
        if (newMode === this.activeMode) return;

        this.activeMode = newMode;
        
        // Update manager state
        if (this.manager.switchMode) {
            await this.manager.switchMode(newMode);
        }
        
        this.updateModeToggle();
        this.updateKeyboardHints();
    }

    /**
     * Update mode toggle button states
     */
    updateModeToggle() {
        const buttons = {
            'basic': document.getElementById('basicModeBtn'),
            'simple-spaced': document.getElementById('simpleSpacedModeBtn'),
            'full-spaced': document.getElementById('fullSpacedModeBtn')
        };

        // Reset all buttons
        Object.values(buttons).forEach(btn => {
            if (btn) {
                btn.classList.remove('bg-blue-500', 'text-white', 'shadow-sm');
                btn.classList.add('text-gray-600', 'hover:text-gray-900');
            }
        });

        // Highlight active button
        const activeBtn = buttons[this.activeMode];
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-600', 'hover:text-gray-900');
            activeBtn.classList.add('bg-blue-500', 'text-white', 'shadow-sm');
        }
    }

    /**
     * Get mode-specific keyboard shortcuts
     */
    getModeKeyboardShortcuts(modeName) {
        const shortcuts = {
            'basic': [
                { key: 'Space', description: 'flip card' },
                { key: '←/→', description: 'navigate' },
                { key: 'S', description: 'shuffle' },
                { key: 'T', description: 'term/def' }
            ],
            'simple-spaced': [
                { key: 'Space', description: 'flip card' },
                { key: '←/→', description: 'respond/navigate' },
                { key: 'S', description: 'shuffle' },
                { key: 'T', description: 'term/def' }
            ],
            'full-spaced': [
                { key: 'Space', description: 'flip card' },
                { key: '1-4', description: 'difficulty rating' },
                { key: 'S', description: 'shuffle' },
                { key: 'T', description: 'term/def' }
            ]
        };

        return shortcuts[modeName] || shortcuts['basic'];
    }

    /**
     * Update keyboard hints display
     */
    updateKeyboardHints() {
        const keyboardHints = document.querySelector('.keyboard-hints');
        if (!keyboardHints) return;

        const shortcuts = this.getModeKeyboardShortcuts(this.activeMode);
        const hintsHTML = shortcuts.map(shortcut => 
            `<kbd>${shortcut.key}</kbd> ${shortcut.description}`
        ).join(' • ');

        keyboardHints.innerHTML = hintsHTML;
    }

    /**
     * Get detailed keyboard shortcuts for help display
     */
    getDetailedShortcuts(modeName) {
        const baseShortcuts = [
            { key: 'Space', description: 'Flip card horizontally' },
            { key: '↑', description: 'Flip card up' },
            { key: '↓', description: 'Flip card down' },
            { key: 'S', description: 'Toggle shuffle' },
            { key: 'T', description: 'Toggle term/definition first' },
            { key: 'Escape', description: 'Exit study mode' },
            { key: '1, 2, 3', description: 'Quick mode switch' }
        ];

        const modeShortcuts = {
            'basic': [
                { key: '←', description: 'Previous card' },
                { key: '→', description: 'Next card' }
            ],
            'simple-spaced': [
                { key: '← (when card flipped)', description: 'Don\'t remember & auto-advance' },
                { key: '→ (when card flipped)', description: 'Remember & auto-advance' },
                { key: '← (normal)', description: 'Previous card' },
                { key: '→ (normal)', description: 'Next card' },
                { key: 'R', description: 'Show round information' },
                { key: 'P', description: 'Show progress information' }
            ],
            'full-spaced': [
                { key: '←', description: 'Previous card' },
                { key: '→', description: 'Next card' },
                { key: '1', description: 'Again (hardest)' },
                { key: '2', description: 'Hard' },
                { key: '3', description: 'Good' },
                { key: '4', description: 'Easy' },
                { key: 'D', description: 'Show due cards info' },
                { key: 'I', description: 'Show current card info' }
            ]
        };

        return {
            universal: baseShortcuts,
            modeSpecific: modeShortcuts[modeName] || []
        };
    }

    /**
     * Show detailed keyboard help modal
     */
    showKeyboardHelp() {
        const shortcuts = this.getDetailedShortcuts(this.activeMode);
        
        // Create help modal content
        const modalContent = this._createHelpModalContent(shortcuts);
        
        // Show modal (implementation depends on your modal system)
        this._showHelpModal(modalContent);
    }

    /**
     * Create help modal content
     */
    _createHelpModalContent(shortcuts) {
        const universalSection = shortcuts.universal.map(s => 
            `<div class="flex justify-between"><kbd class="kbd">${s.key}</kbd><span>${s.description}</span></div>`
        ).join('');

        const modeSection = shortcuts.modeSpecific.map(s => 
            `<div class="flex justify-between"><kbd class="kbd">${s.key}</kbd><span>${s.description}</span></div>`
        ).join('');

        return `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold">Universal Shortcuts</h3>
                <div class="space-y-2">${universalSection}</div>
                
                ${shortcuts.modeSpecific.length > 0 ? `
                    <h3 class="text-lg font-semibold">${this._getModeName(this.activeMode)} Mode</h3>
                    <div class="space-y-2">${modeSection}</div>
                ` : ''}
                
                ${this.activeMode === 'simple-spaced' ? `
                    <div class="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p class="text-sm text-blue-700">
                            <strong>Simple Spaced Mode:</strong> After flipping a card, use left arrow (←) for "don't remember" 
                            or right arrow (→) for "remember". The card will automatically advance to the next one!
                        </p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Get human-readable mode name
     */
    _getModeName(mode) {
        const names = {
            'basic': 'Basic Review',
            'simple-spaced': 'Simple Spaced Repetition',
            'full-spaced': 'Full Spaced Repetition'
        };
        return names[mode] || mode;
    }

    /**
     * Show help modal (basic implementation)
     */
    _showHelpModal(content) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        const modal = document.createElement('div');
        modal.className = 'bg-white rounded-lg p-6 max-w-2xl max-h-96 overflow-y-auto';
        
        modal.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold">Keyboard Shortcuts</h2>
                <button class="close-modal text-gray-400 hover:text-gray-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            ${content}
            <div class="mt-6 text-center">
                <button class="close-modal bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    Got it!
                </button>
            </div>
        `;
        
        // Add event listeners
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(overlay);
            });
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    /**
     * Update button display based on current response state
     */
    updateResponseButtons() {
        const responseButtons = document.getElementById('responseButtons');
        if (!responseButtons) return;

        if (this.activeMode === 'simple-spaced') {
            // Update button labels to show new keyboard shortcuts
            const dontRememberBtn = document.getElementById('dontRememberBtn');
            const rememberBtn = document.getElementById('rememberBtn');
            
            if (dontRememberBtn) {
                const kbd = dontRememberBtn.querySelector('kbd');
                if (kbd) kbd.textContent = '←';
            }
            
            if (rememberBtn) {
                const kbd = rememberBtn.querySelector('kbd');
                if (kbd) kbd.textContent = '→';
            }
        }
    }

    /**
     * Set active mode (called externally)
     */
    setActiveMode(mode) {
        this.activeMode = mode;
        this.updateModeToggle();
        this.updateKeyboardHints();
        this.updateResponseButtons();
    }
}