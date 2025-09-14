// static/js/study/modes/basic-review.js
import { StudyState } from '../core/study-state.js';
import { TextUtils } from '../utils/text-utils.js';
import { timezoneHandler } from '../../utils/timezone.js';

/**
 * Mode 1: Basic Review
 * Simple flashcard review with progress tracking
 * No spaced repetition - just sequential card review
 */
export class BasicReview {
    constructor(studyManager) {
        this.manager = studyManager;
        this.mode = 'basic';
    }

    /**
     * Initialize basic review mode
     */
    async initialize(state) {
        console.log('Initializing Basic Review mode');
        
        // Initialize mode-specific data
        StudyState.updateModeData(state, {
            cardsStudied: 0,
            startTime: timezoneHandler.getCurrentDateInServerTimezone()
        }, 'basic');
        
        // Update interface for basic mode
        await this._updateInterface();
    }

    /**
     * Render current card
     */
    async renderCard() {
        // Use the common flashcard module for rendering
        this.manager.interface.renderCurrentCard();
        
        // Update progress and navigation (basic mode specific)
        this.manager.interface.updateProgress();
        this.manager.interface.updateNavigationButtons();
    }

    /**
     * Handle card flip event
     */
    async onCardFlip(direction) {
        const modeData = StudyState.getModeData(this.manager.state, 'basic');
        
        if (!this.manager.state.isFlipped) {
            // Card is being flipped to show answer
            modeData.cardsStudied = Math.max(modeData.cardsStudied, this.manager.state.currentIndex + 1);
        }
        
        console.log(`Basic mode: Card flipped ${direction}, cards studied: ${modeData.cardsStudied}`);
    }

    /**
     * Handle navigation between cards
     */
    async beforeNavigation(direction) {
        // Always allow navigation in basic mode
        return true;
    }

    /**
     * Handle post-navigation logic
     */
    async onNavigation() {
        // Re-render the new card
        await this.renderCard();
        
        // Update session progress
        const modeData = StudyState.getModeData(this.manager.state, 'basic');
        const currentIndex = this.manager.state.currentIndex;
        
        // Update cards studied count
        modeData.cardsStudied = Math.max(modeData.cardsStudied, currentIndex + 1);
        
        // Update backend session if available
        if (this.manager.session.isActive) {
            await this.manager.session.updateProgress(modeData.cardsStudied);
        }
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
        console.log('Cleaning up Basic Review mode');
        
        // Save final progress
        await this._saveProgress();
    }

    /**
     * Get study statistics for basic mode
     */
    getStats() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'basic');
        const currentTime = timezoneHandler.getCurrentDateInServerTimezone();
        const startTime = new Date(modeData.startTime);
        const durationMinutes = Math.round((currentTime - startTime) / (1000 * 60));
        
        return {
            mode: 'basic',
            cardsStudied: modeData.cardsStudied,
            totalCards: state.totalCards,
            currentPosition: state.currentIndex + 1,
            completionPercentage: Math.round((modeData.cardsStudied / state.totalCards) * 100),
            studyDuration: durationMinutes,
            cardsPerMinute: durationMinutes > 0 ? Math.round((modeData.cardsStudied / durationMinutes) * 10) / 10 : 0,
            isComplete: modeData.cardsStudied >= state.totalCards
        };
    }

    /**
     * Check if session is complete
     */
    isSessionComplete() {
        const state = this.manager.state;
        const modeData = StudyState.getModeData(state, 'basic');
        return modeData.cardsStudied >= state.totalCards;
    }

    /**
     * Get completion message
     */
    getCompletionMessage() {
        const stats = this.getStats();
        return `Great job! You've reviewed ${stats.cardsStudied} cards in ${stats.studyDuration} minutes.`;
    }

    // Private methods
    /**
     * Update interface for basic mode
     */
    async _updateInterface() {
        // Hide response buttons (not needed in basic mode)
        this.manager.interface.hideResponseButtons();
        
        // Update mode-specific UI
        const modeData = StudyState.getModeData(this.manager.state, 'basic');
        this.manager.interface.updateModeSpecificUI('basic', modeData);
        
        // Update keyboard hints
        this.manager.interface.modeToggle.updateKeyboardHints();
    }

    /**
     * Save current progress
     */
    async _saveProgress() {
        const modeData = StudyState.getModeData(this.manager.state, 'basic');
        
        // Update session progress if backend is available
        if (this.manager.session.isActive) {
            try {
                await this.manager.session.updateProgress(modeData.cardsStudied);
            } catch (error) {
                console.warn('Failed to save progress to backend:', error);
            }
        }
        
        // Save to localStorage as backup
        const progressData = {
            mode: 'basic',
            cardsStudied: modeData.cardsStudied,
            currentIndex: this.manager.state.currentIndex,
            lastStudied: timezoneHandler.getCurrentDateInServerTimezone().toISOString()
        };
        
        const storageKey = this.manager.state.lastDeckId ? 
            `study_progress_deck_${this.manager.state.lastDeckId}` :
            `study_progress_pod_${this.manager.state.lastPodId}`;
            
        localStorage.setItem(storageKey, JSON.stringify(progressData));
    }

    /**
     * Load saved progress
     */
    _loadSavedProgress() {
        const storageKey = this.manager.state.lastDeckId ? 
            `study_progress_deck_${this.manager.state.lastDeckId}` :
            `study_progress_pod_${this.manager.state.lastPodId}`;
            
        try {
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const progressData = JSON.parse(savedData);
                if (progressData.mode === 'basic') {
                    return progressData;
                }
            }
        } catch (error) {
            console.warn('Failed to load saved progress:', error);
        }
        
        return null;
    }
}