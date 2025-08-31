// static/js/study/utils/text-utils.js

/**
 * Text utilities for flashcard content management
 */
export class TextUtils {
    /**
     * Dynamically adjust text size based on content length
     * @param {HTMLElement} element - The element to adjust
     * @param {Object} options - Configuration options
     */
    static adjustTextSize(element, options = {}) {
        if (!element) return;
        
        const {
            smallThreshold = 500,
            tinyThreshold = 600,
            microThreshold = 700,
            newlineWeight = 20  // Each newline counts as ~20 characters
        } = options;
        
        // Remove existing size classes
        element.classList.remove('text-small', 'text-tiny', 'text-micro');
        
        // Calculate weighted text length
        const text = element.textContent || element.innerHTML.replace(/<br>/g, '\n');
        const newlineCount = (text.match(/\n/g) || []).length;
        const weightedLength = text.length + (newlineCount * newlineWeight);
        
        // Apply size class based on weighted length
        if (weightedLength > microThreshold) {
            element.classList.add('text-micro');
        } else if (weightedLength > tinyThreshold) {
            element.classList.add('text-tiny');
        } else if (weightedLength > smallThreshold) {
            element.classList.add('text-small');
        }

        this.preserveLineBreaks(element);
    }
    
    /**
     * Apply text sizing to both front and back content elements
     * @param {Object} options - Configuration options
     */
    // In static/js/study/utils/text-utils.js
    static adjustCardTextSizes(options = {}) {
        // Detect mobile
        const isMobile = window.innerWidth <= 768;
        
        // Default options with mobile adjustments
        const defaultOptions = isMobile ? {
            smallThreshold: 175,  // Smaller threshold for mobile
            tinyThreshold: 300,
            microThreshold: 450,
            newlineWeight: 15     // Less weight per newline on mobile
        } : {
            smallThreshold: 500,
            tinyThreshold: 600,
            microThreshold: 700,
            newlineWeight: 20
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        const frontContent = document.getElementById('frontContent');
        const backContent = document.getElementById('backContent');
        
        if (frontContent) this.adjustTextSize(frontContent, finalOptions);
        if (backContent) this.adjustTextSize(backContent, finalOptions);
    }
    /**
     * Get text length statistics for debugging/optimization
     * @param {HTMLElement} element 
     * @returns {Object} Statistics about the text
     */
    static getTextStats(element) {
        if (!element) return null;
        
        const text = element.textContent;
        return {
            length: text.length,
            wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
            lines: text.split('\n').length,
            recommendedSize: this._getRecommendedSize(text.length)
        };
    }
    
    /**
     * Private method to determine recommended size class
     */
    static _getRecommendedSize(textLength) {
        if (textLength > 700) return 'micro';
        if (textLength > 600) return 'tiny';
        // if (textLength > 100) return 'small';
        return 'default';
    }

    /**
     * Convert text newlines to HTML breaks while preserving text sizing
     */
    static preserveLineBreaks(element) {
        const text = element.textContent;
        if (text.includes('\n')) {
            // Replace \n with <br> and set as innerHTML
            element.innerHTML = text.replace(/\n/g, '<br>');
        }
    }
}