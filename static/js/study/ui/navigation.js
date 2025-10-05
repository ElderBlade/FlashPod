// static/js/study/ui/navigation.js

/**
 * Navigation UI component for study interface
 * Handles progress display and navigation controls
 */
export class Navigation {
    constructor(studyInterface) {
        this.interface = studyInterface;
    }

    /**
     * Update progress bar and counter
     */
    updateProgress() {
        const state = this.interface.manager.state;
        const current = state.currentIndex + 1;
        const total = state.totalCards;
        const percentage = total > 0 ? (current / total) * 100 : 0;

        // Update progress bar
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            
            // Add smooth transition
            progressBar.style.transition = 'width 0.3s ease-in-out';
        }

        // Update text counter
        const cardProgress = document.getElementById('cardProgress');
        if (cardProgress) {
            cardProgress.textContent = `Card ${current} of ${total}`;
        }

        console.log(`Progress updated: ${current}/${total} (${Math.round(percentage)}%)`);
    }

    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        const state = this.interface.manager.state;
        const prevBtn = document.getElementById('prevCardBtn');
        const nextBtn = document.getElementById('nextCardBtn');

        // Check if we're in a mode that's collecting responses
        const currentMode = state.mode;
        const modeData = state.modeData[currentMode];
        const isCollectingResponse = modeData && modeData.isCollectingResponse;

        // Update previous button
        if (prevBtn) {
            const isFirstCard = state.currentIndex === 0;
            const shouldDisable = isFirstCard || isCollectingResponse;
            prevBtn.disabled = shouldDisable;
            
            if (shouldDisable) {
                prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }

        // Update next button
        if (nextBtn) {
            const isLastCard = state.currentIndex === state.totalCards - 1;
            const shouldDisable = isLastCard || isCollectingResponse;
            nextBtn.disabled = shouldDisable;
            
            if (shouldDisable) {
                nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
                if (!isLastCard) {
                    // If disabled because of response collection, keep "Next" text
                    nextBtn.innerHTML = `
                        Next
                        <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    `;
                } else {
                    nextBtn.innerHTML = `
                        Complete
                        <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    `;
                }
            } else {
                nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                nextBtn.innerHTML = `
                    Next
                    <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                `;
            }
        }
    }

    /**
     * Show session completion state
     */
    showCompletion() {
        const stats = this.interface.manager.getStats();
        if (!stats) return;

        // Create completion overlay
        const completion = this._createCompletionOverlay(stats);
        document.body.appendChild(completion);

        // Show with animation
        setTimeout(() => {
            completion.classList.add('opacity-100');
        }, 100);
    }

    /**
     * Update mode-specific navigation elements
     */
    updateModeNavigation(mode, modeData) {
        switch (mode) {
            case 'simple-spaced':
                this._updateSimpleSpacedNavigation(modeData);
                break;
            case 'full-spaced':
                this._updateFullSpacedNavigation(modeData);
                break;
            default:
                this._updateBasicNavigation();
        }
    }

    /**
     * Show navigation tips for current mode
     */
    showNavigationTips(mode) {
        const tips = this._getNavigationTips(mode);
        this._showTipOverlay(tips);
    }

    // Private methods
    /**
     * Update navigation for simple spaced repetition mode
     */
    _updateSimpleSpacedNavigation(modeData) {
        const roundIndicator = document.getElementById('roundIndicator');
        if (roundIndicator) {
            roundIndicator.textContent = `Round ${modeData.currentRound}`;
        }

        // Update bucket indicators
        this._updateBucketIndicators(modeData.stillLearning.length, modeData.known.length);
    }

    /**
     * Update navigation for full spaced repetition mode
     */
    _updateFullSpacedNavigation(modeData) {
        // Update card type indicators
        this._updateCardTypeIndicators(modeData);
    }

    /**
     * Update navigation for basic mode
     */
    _updateBasicNavigation() {
        // Hide mode-specific elements
        const modeIndicators = document.querySelectorAll('.mode-indicator');
        modeIndicators.forEach(indicator => indicator.classList.add('hidden'));
    }

    /**
     * Update bucket indicators for simple spaced mode
     */
    _updateBucketIndicators(stillLearning, known) {
        const indicator = document.getElementById('modeIndicator');
        if (!indicator) return;

        indicator.innerHTML = `
            <div class="flex items-center space-x-4 text-sm text-gray-600">
                <span class="bg-orange-100 text-orange-700 px-3 py-1 rounded-full flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Still Learning: ${stillLearning}
                </span>
                <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Known: ${known}
                </span>
            </div>
        `;
    }

    /**
     * Update card type indicators for full spaced mode
     */
    _updateCardTypeIndicators(modeData) {
        const indicator = document.getElementById('modeIndicator');
        if (!indicator) return;

        indicator.innerHTML = `
            <div class="flex items-center space-x-3 text-sm text-gray-600">
                <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Due: ${modeData.dueCards.length}
                </span>
                <span class="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    Learning: ${modeData.learningCards.length}
                </span>
                <span class="bg-green-100 text-green-700 px-2 py-1 rounded">
                    Mature: ${modeData.matureCards.length}
                </span>
            </div>
        `;
    }

    /**
     * Create completion overlay
     */
    _createCompletionOverlay(stats) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 opacity-0 transition-opacity duration-300';
        
        overlay.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div class="mb-6">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">Session Complete!</h3>
                    <p class="text-gray-600">${this._getCompletionMessage(stats)}</p>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div class="bg-gray-50 rounded p-3">
                        <div class="font-semibold text-gray-900">${stats.cardsStudied}</div>
                        <div class="text-gray-500">Cards Studied</div>
                    </div>
                    <div class="bg-gray-50 rounded p-3">
                        <div class="font-semibold text-gray-900">${stats.studyDuration}m</div>
                        <div class="text-gray-500">Study Time</div>
                    </div>
                </div>
                
                <div class="flex space-x-3">
                    <button id="continueStudying" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Study More
                    </button>
                    <button id="finishSession" class="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                        Finish
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        overlay.querySelector('#continueStudying').addEventListener('click', () => {
            overlay.remove();
            // Restart session or go to deck selection
        });

        overlay.querySelector('#finishSession').addEventListener('click', () => {
            overlay.remove();
            this.interface.manager.exitStudy();
        });

        return overlay;
    }

    /**
     * Get completion message based on stats
     */
    _getCompletionMessage(stats) {
        if (stats.mode === 'simple-spaced') {
            return `You've mastered all ${stats.totalCards} cards! Great job on completing all rounds.`;
        } else if (stats.mode === 'full-spaced') {
            return `Excellent work! You've reviewed ${stats.cardsStudied} cards with the SM-2 algorithm.`;
        } else {
            return `You've reviewed ${stats.cardsStudied} cards in ${stats.studyDuration} minutes!`;
        }
    }

    /**
     * Get navigation tips for mode
     */
    _getNavigationTips(mode) {
        const tips = {
            'basic': [
                'Use arrow keys or buttons to navigate between cards',
                'Press Space to flip cards horizontally',
                'Use ↑↓ for vertical flips with different animations'
            ],
            'simple-spaced': [
                'After flipping, choose "Remember" or "Don\'t Remember"',
                'Cards move between "Still Learning" and "Known" buckets',
                'Complete all rounds to finish the session'
            ],
            'full-spaced': [
                'Rate each card from 1 (Again) to 4 (Easy)',
                'The algorithm will schedule future reviews',
                'Focus on cards due for review first'
            ]
        };

        return tips[mode] || tips['basic'];
    }

    /**
     * Show tip overlay
     */
    _showTipOverlay(tips) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed top-20 right-4 bg-white rounded-lg shadow-lg border p-4 max-w-xs z-40';
        
        const tipsHtml = tips.map(tip => `<li class="text-sm text-gray-600">${tip}</li>`).join('');
        overlay.innerHTML = `
            <h4 class="font-semibold text-gray-900 mb-2">Navigation Tips</h4>
            <ul class="space-y-1">${tipsHtml}</ul>
            <button class="mt-3 text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
        `;

        overlay.querySelector('button').addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);

        // Auto-remove after 10 seconds
        setTimeout(() => overlay.remove(), 10000);
    }
}