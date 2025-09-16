// static/js/study/ui/flashcard.js
import { StudyState } from '../core/study-state.js';
import { TextUtils } from '../utils/text-utils.js';
import { marked } from 'marked';

marked.setOptions({
  sanitize: false,  // Remove potentially dangerous HTML
  breaks: false,    // Convert line breaks to <br>
  gfm: true,
  smartypants: false
});

/**
 * Flashcard UI component
 * Handles card rendering and flip animations
 */
export class Flashcard {
    constructor(studyInterface) {
        this.interface = studyInterface;
        this.isFlipping = false;
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
        frontContent.innerHTML = marked(displayContent.frontText);
        backContent.innerHTML = marked(displayContent.backText);

        console.log('Marked options:', marked.getDefaults());

        // Dynamically adjust text size
        TextUtils.adjustCardTextSizes();
        
        // Update labels
        if (frontLabel) frontLabel.textContent = displayContent.frontLabel;
        if (backLabel) backLabel.textContent = displayContent.backLabel;
        
        console.log(`Flashcard rendered: ${displayContent.frontLabel} -> ${displayContent.backLabel}`);
    }

    /**
     * Flip the card with specified direction
     */
    flip(direction = 'horizontal') {
        if (this.isFlipping) return; // Prevent rapid clicking
        
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        this.isFlipping = true;
        
        // Remove existing flip classes
        flashcard.classList.remove('flip-horizontal', 'flip-vertical-up', 'flip-vertical-down');
        
        // Add flipping state to prevent hover effects
        flashcard.classList.add('flipping');
        
        // Force reflow to ensure class changes are applied
        flashcard.offsetHeight;
        
        // Add the new flip direction
        flashcard.classList.add(`flip-${direction}`);
        
        // Toggle flipped state
        const wasFlipped = flashcard.classList.contains('flipped');
        if (wasFlipped) {
            flashcard.classList.remove('flipped');
        } else {
            flashcard.classList.add('flipped');
        }
        
        // Update state
        this.interface.manager.state.isFlipped = !wasFlipped;
        this.interface.manager.state.flipDirection = direction;
        
        // Clear flipping state after animation
        setTimeout(() => {
            flashcard.classList.remove('flipping');
            this.isFlipping = false;
        }, 600); // Match CSS animation duration
        
        console.log(`Card flipped ${direction}, now showing: ${wasFlipped ? 'front' : 'back'}`);
    }

    /**
     * Reset flip state for new card
     */
    _resetFlipState() {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        // Remove all flip states instantly (no animation for new cards)
        flashcard.style.transition = 'none';
        flashcard.classList.remove('flipped', 'flip-horizontal', 'flip-vertical-up', 'flip-vertical-down', 'flipping');
        
        // Force reflow to apply changes immediately
        flashcard.offsetHeight;
        
        // Restore transition for future flips
        flashcard.style.transition = '';
        
        // Set default flip direction
        flashcard.classList.add('flip-horizontal');
        
        // Reset flip state
        this.interface.manager.state.isFlipped = false;
        this.isFlipping = false;
    }

    /**
     * Get current card display state
     */
    getDisplayState() {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return null;
        
        return {
            isFlipped: flashcard.classList.contains('flipped'),
            flipDirection: this.interface.manager.state.flipDirection,
            isFlipping: this.isFlipping
        };
    }

    /**
     * Force card to front side
     */
    showFront() {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        if (flashcard.classList.contains('flipped')) {
            this.flip(this.interface.manager.state.flipDirection);
        }
    }

    /**
     * Force card to back side
     */
    showBack() {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        if (!flashcard.classList.contains('flipped')) {
            this.flip(this.interface.manager.state.flipDirection);
        }
    }

    /**
     * Add visual feedback for correct/incorrect responses
     */
    addResponseFeedback(responseType) {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        // Remove existing feedback classes
        flashcard.classList.remove('response-correct', 'response-incorrect', 'response-neutral');
        
        // Add appropriate feedback class
        const feedbackClass = this._getFeedbackClass(responseType);
        flashcard.classList.add(feedbackClass);
        
        // Remove feedback after animation
        setTimeout(() => {
            flashcard.classList.remove(feedbackClass);
        }, 1000);
    }

    /**
     * Get CSS class for response feedback
     */
    _getFeedbackClass(responseType) {
        switch (responseType) {
            case 'remember':
            case 'correct':
            case 4: // SM-2 easy
                return 'response-correct';
            case 'dont-remember':
            case 'incorrect':
            case 1: // SM-2 again
                return 'response-incorrect';
            default:
                return 'response-neutral';
        }
    }

    /**
     * Highlight card for editing
     */
    showEditState() {
        const flashcard = document.getElementById('flashcard');
        if (flashcard) {
            flashcard.classList.add('editing');
        }
    }

    /**
     * Remove edit highlighting
     */
    hideEditState() {
        const flashcard = document.getElementById('flashcard');
        if (flashcard) {
            flashcard.classList.remove('editing');
        }
    }
}