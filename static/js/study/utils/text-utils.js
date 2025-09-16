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
            smallThreshold = 300,
            tinyThreshold = 450,
            microThreshold = 600,
            nanoThreshold = 750,
            newlineWeight = 30
        } = options;
        
        // Remove existing size classes
        element.classList.remove('text-small', 'text-tiny', 'text-micro', 'text-nano');
        
        // Calculate weighted text length
        const text = element.textContent || element.innerHTML.replace(/<br>/g, '\n');
        const newlineCount = (text.match(/\n/g) || []).length;
        const weightedLength = text.length + (newlineCount * newlineWeight);
        
        // Apply size class based on weighted length
        // Apply size class based on weighted length
        if (weightedLength > nanoThreshold) {
            element.classList.add('text-nano');
        } else if (weightedLength > microThreshold) {
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
            smallThreshold: 150,  // Reduced from 175
            tinyThreshold: 250,   // Reduced from 300
            microThreshold: 350,  // Reduced from 450
            nanoThreshold: 500,   // New mobile threshold
            newlineWeight: 25     // Increased from 15
        } : {
            smallThreshold: 300,
            tinyThreshold: 450,
            microThreshold: 600,
            nanoThreshold: 750,
            newlineWeight: 30
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
        if (element.innerHTML !== element.textContent) {
            return; // Element has HTML, don't override it
        }
        if (text.includes('\n')) {
            // Replace \n with <br> and set as innerHTML
            element.innerHTML = text.replace(/\n/g, '<br>');
        }
    }
}