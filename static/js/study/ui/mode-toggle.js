// static/js/study/ui/mode-toggle.js

/**
 * Handles the study mode toggle interface
 * Provides visual feedback for current mode and handles mode switching
 */
export class ModeToggle {
    constructor(studyInterface) {
        this.interface = studyInterface;
        this.activeMode = 'basic';
    }

    /**
     * Set the active mode and update visual state
     */
    setActiveMode(modeName) {
        this.activeMode = modeName;
        this._updateToggleButtons();
    }

    /**
     * Update visual state of toggle buttons
     */
    _updateToggleButtons() {
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

        // Add mode-specific styling to the toggle container
        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
            // Remove existing mode classes
            modeToggle.classList.remove('mode-basic', 'mode-simple-spaced', 'mode-full-spaced');
            // Add current mode class
            modeToggle.classList.add(`mode-${this.activeMode}`);
        }
    }

    /**
     * Get mode information for display
     */
    getModeInfo(modeName) {
        const modeInfo = {
            'basic': {
                name: 'Basic Review',
                description: 'Simple card review with progress tracking',
                icon: '📚',
                color: 'blue'
            },
            'simple-spaced': {
                name: 'Simple Spaced Repetition', 
                description: 'Cards move between "Still Learning" and "Known" buckets',
                icon: '🧠',
                color: 'orange'
            },
            'full-spaced': {
                name: 'Full SM-2 Algorithm',
                description: 'Advanced spaced repetition with difficulty tracking',
                icon: '🎯',
                color: 'green'
            }
        };

        return modeInfo[modeName] || modeInfo['basic'];
    }

    /**
     * Show mode transition animation
     */
    showModeTransition(fromMode, toMode) {
        const modeToggle = document.getElementById('modeToggle');
        if (!modeToggle) return;

        // Add transition animation
        modeToggle.classList.add('transition-mode');
        
        // Show brief mode info overlay
        this._showModeInfoOverlay(toMode);

        // Remove animation class after transition
        setTimeout(() => {
            modeToggle.classList.remove('transition-mode');
        }, 300);
    }

    /**
     * Show brief overlay with mode information
     */
    _showModeInfoOverlay(modeName) {
        const info = this.getModeInfo(modeName);
        
        // Create overlay element
        const overlay = document.createElement('div');
        overlay.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border p-4 z-50 transition-all duration-300';
        overlay.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="text-2xl">${info.icon}</span>
                <div>
                    <h4 class="font-semibold text-gray-900">${info.name}</h4>
                    <p class="text-sm text-gray-600">${info.description}</p>
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(overlay);

        // Animate in
        setTimeout(() => {
            overlay.classList.add('opacity-100', 'scale-100');
        }, 10);

        // Remove after delay
        setTimeout(() => {
            overlay.classList.add('opacity-0', 'scale-95');
            setTimeout(() => overlay.remove(), 300);
        }, 2000);
    }

    /**
     * Check if mode switching is allowed
     */
    canSwitchMode(fromMode, toMode) {
        // For now, allow all switches
        // In the future, might want to prevent switching mid-session in certain modes
        return true;
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
                { key: 'X', description: "don't remember" },
                { key: 'C', description: 'remember' },
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
}