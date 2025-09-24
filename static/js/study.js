// static/js/study.js
// Main entry point for the modular study system

import { StudyManager } from './study/core/study-manager.js';

/**
 * Main Study Controller - Simplified entry point that delegates to StudyManager
 * Maintains backward compatibility while using the modular architecture
 */
class StudyController {
    constructor() {
        this.studyManager = new StudyManager();
        this.isInitialized = false;
    }

    /**
     * Initialize the study system
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            console.log('Initializing study system...');
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize study system:', error);
            throw error;
        }
    }

    /**
     * Start deck study - main public API
     */
    async startDeckStudy(deckId) {
        await this.initialize();
        return this.studyManager.startDeckStudy(deckId);
    }

    /**
     * Start pod study - main public API  
     */
    async startPodStudy(podId) {
        await this.initialize();
        return this.studyManager.startPodStudy(podId);
    }

    /**
     * Resume paused study session
     */
    async resumeStudy() {
        await this.initialize();
        return this.studyManager.resumeStudy();
    }

    /**
     * Exit current study session
     */
    async exitStudy() {
        await this.studyManager.exitStudy();
    }

    /**
     * Check if there's a paused session that can be resumed
     */
    get hasPausedSession() {
        return this.studyManager?.hasPausedSession || false;
    }

    /**
     * Check if study is currently active
     */
    get isStudyActive() {
        return this.studyManager?.isStudyActive || false;
    }

    /**
     * Get current study statistics
     */
    getStats() {
        return this.studyManager?.getStats() || null;
    }

    /**
     * Get current study state (for debugging/development)
     */
    get state() {
        return this.studyManager?.state || null;
    }

    /**
     * Get current card (for external integrations)
     */
    get currentCard() {
        return this.studyManager?.currentCard || null;
    }
}

// Create global instance
window.studyController = new StudyController();

// Backward compatibility - global functions
window.studyDeck = function(deckId) {
    return window.studyController.startDeckStudy(deckId);
};

window.studyPod = function(podId) {
    return window.studyController.startPodStudy(podId);
};

// Global message function (if not already defined)
if (!window.showMessage) {
    window.showMessage = function(message, type = 'info') {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) {
            console.log(`${type.toUpperCase()}: ${message}`);
            return;
        }
        
        const messageDiv = document.createElement('div');
        const bgColorMap = {
            'error': 'bg-red-500',
            'success': 'bg-green-500', 
            'warning': 'bg-yellow-500',
            'info': 'bg-blue-500'
        };
        
        messageDiv.className = `${bgColorMap[type] || bgColorMap.info} text-white px-6 py-4 rounded-lg shadow-lg mb-3 max-w-sm`;
        messageDiv.textContent = message;
        
        messagesContainer.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    };
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Study system loaded - Modular architecture ready');
});

// Export for module systems
export { StudyController };
export default StudyController;