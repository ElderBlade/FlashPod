// static/js/study/ui/flashcard.js
import { StudyState } from '../core/study-state.js';

/**
 * Flashcard UI component - SIMPLIFIED VERSION
 * Handles card rendering and flip animations
 */
export class Flashcard {
    constructor(studyInterface) {
        this.interface = studyInterface;
        this.isFlipping = false;
    }

    /**
     * Setup flip animation listener (called after DOM is ready)
     */
    setupFlipListener() {
        // Not needed in simplified version
    }

    /**
     * Render the current card content
     */
    render() {
        const state = this.interface.manager.state;
        const displayContent = StudyState.getCardDisplayContent(state);
        
        if (!displayContent) return;
        
        // Get DOM elements
        const frontContent = document.getElementById('frontContent');
        const backContent = document.getElementById('backContent');
        const frontLabel = document.querySelector('.flashcard-front .card-label');
        const backLabel = document.querySelector('.flashcard-back .card-label');
        
        if (!frontContent || !backContent) return;
        
        // Reset card flip state for new card
        this._resetFlipState();
        
        // Update content
        frontContent.textContent = displayContent.frontText;
        backContent.textContent = displayContent.backText;
        
        // Update labels
        if (frontLabel) frontLabel.textContent = displayContent.frontLabel;
        if (backLabel) backLabel.textContent = displayContent.backLabel;
        
        console.log(`Flashcard rendered: ${displayContent.frontLabel} -> ${displayContent.backLabel}`);
    }

    /**
     * Flip the card with specified direction (DEPRECATED - use manager.flipCard)
     */
    flip(direction = 'horizontal') {
        // This is now handled directly by StudyManager.flipCard()
        this.interface.manager.flipCard(direction);
    }

    /**
     * Reset flip state for new card
     */
    _resetFlipState() {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        // Remove all flip states instantly (no animation for reset)
        flashcard.style.transition = 'none';
        flashcard.classList.remove('flipped');
        
        // Keep the default flip direction
        flashcard.classList.remove('flip-vertical-up', 'flip-vertical-down');
        flashcard.classList.add('flip-horizontal');
        
        // Force reflow
        flashcard.offsetHeight;
        
        // Restore transition for future flips
        flashcard.style.transition = '';
        
        // Update state
        this.interface.manager.state.isFlipped = false;
        this.isFlipping = false;
    }

    /**
     * Add visual feedback for response
     */
    addResponseFeedback(type) {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        const className = type === 'correct' ? 'response-correct' : 'response-incorrect';
        
        // Remove any existing feedback classes
        flashcard.classList.remove('response-correct', 'response-incorrect');
        
        // Add new feedback class
        flashcard.classList.add(className);
        
        // Remove after animation
        setTimeout(() => {
            flashcard.classList.remove(className);
        }, 1000);
    }

    /**
     * Clean up (nothing to clean in simplified version)
     */
    cleanup() {
        // Nothing to clean up
    }
}