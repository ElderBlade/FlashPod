// static/js/study/core/study-session.js
import { APIClient } from '../utils/api-client.js';
import { timezoneHandler } from '../../utils/timezone.js';

/**
 * Manages study session lifecycle and data loading
 * Handles both deck and pod study sessions
 */
export class StudySession {
    constructor() {
        this.api = new APIClient();
        this.sessionData = null;
        this.deckData = null;
        this.podData = null;
        this.cardsData = [];
    }

    /**
     * Initialize study session for a deck
     */
    async initializeDeck(deckId) {
        try {
            // Create/resume session (this also loads deck and card data)
            const sessionResponse = await this.api.createStudySession({deck_id: deckId});
            this.sessionData = sessionResponse.session;
            this.deckData = sessionResponse.deck;
            this.cardsData = sessionResponse.cards || [];
            this.wasResumed = sessionResponse.resumed; 
            
            // Validate we have cards
            if (this.cardsData.length === 0) {
                throw new Error('This deck has no cards yet!');
            }
            
            console.log(`Initialized deck study: ${this.deckData.name} (${this.cardsData.length} cards)`);
            
            // Log if this was a resumed session
            if (sessionResponse.resumed) {
                console.log('Resumed existing paused session');
            }
            
        } catch (error) {
            console.error('Failed to initialize deck study:', error);
            throw error;
        }
    }

    /**
     * Initialize study session for a pod
     */
    async initializePod(podId) {
        try {
            // Create/resume session (this also loads pod and card data)
            const sessionResponse = await this.api.createStudySession({pod_id: podId});
            this.sessionData = sessionResponse.session;
            this.podData = sessionResponse.pod;
            this.cardsData = sessionResponse.cards || [];
            this.wasResumed = sessionResponse.resumed; 
            
            // Validate we have cards
            if (this.cardsData.length === 0) {
                throw new Error('This pod has no cards yet!');
            }
            
            console.log(`Initialized pod study: ${this.podData.name} (${this.cardsData.length} cards)`);
            
            // Log if this was a resumed session
            if (sessionResponse.resumed) {
                console.log('Resumed existing paused session');
            }
        } catch (error) {
            console.error('Failed to initialize pod study:', error);
            throw error;
        }
    }

    /**
     * Update session progress with mode information
     */
    async updateProgress(cardsStudied, cardsCorrect = null, mode = null) {
        if (!this.sessionData || typeof this.sessionData.id === 'string' && this.sessionData.id.startsWith('local_')) {
            return; // Skip for local sessions
        }

        try {
            const progressData = {
                cards_studied: cardsStudied
            };
            
            if (cardsCorrect !== null) {
                progressData.cards_correct = cardsCorrect;
            }
            
            if (mode !== null) {
                progressData.mode = mode;
            }
            
            console.log("UPDATING progress with mode:", mode);
            await this.api.updateSessionProgress(this.sessionData.id, progressData);
            
        } catch (error) {
            console.warn('Failed to update session progress:', error);
        }
    }

    /**
     * Complete the study session
     */
    async end() {
        if (!this.sessionData || typeof this.sessionData.id === 'string' && this.sessionData.id.startsWith('local_')) {
            return; // Skip for local sessions
        }
        
        try {
            await this.api.completeSession(this.sessionData.id);
            console.log(`Completed session: ${this.sessionData.id}`);
        } catch (error) {
            console.warn('Failed to complete session:', error);
        }

        // Clean up session data
        this.sessionData = null;
        this.deckData = null;
        this.podData = null;
        this.cardsData = [];
    }

    /**
     * Get session statistics
     */
    getSessionStats() {
        if (!this.sessionData) return null;

        const startTime = new Date(this.sessionData.started_at);
        const now = timezoneHandler.getCurrentDateInServerTimezone();
        const durationMinutes = Math.round((now - startTime) / (1000 * 60));

        return {
            id: this.sessionData.id,
            startTime: startTime,
            duration: durationMinutes,
            type: this.deckData ? 'deck' : 'pod',
            name: this.deckData?.name || this.podData?.name,
            totalCards: this.cardsData.length
        };
    }

    /**
     * Load existing card review data (for full SM-2 mode)
     */
    async loadCardReviews(cardIds) {
        try {
            const reviews = await this.api.getCardReviews(cardIds);
            return reviews;
        } catch (error) {
            console.warn('Failed to load card reviews:', error);
            return [];
        }
    }

    /**
     * Save simple spaced progress
     */
    async saveSimpleSpacedProgress(modeData) {
        if (!this.sessionData) return false;
        
        try {
            const progressKey = `simple_spaced_${this.sessionData.id}`;
            const progressData = {
                currentRound: modeData.currentRound,
                stillLearning: modeData.stillLearning,
                known: modeData.known,
                completedRounds: modeData.completedRounds,
                timestamp: timezoneHandler.getCurrentDateInServerTimezone().toISOString()
            };
            
            localStorage.setItem(progressKey, JSON.stringify(progressData));
            return true;
        } catch (error) {
            console.error('Failed to save simple spaced progress:', error);
            return false;
        }
    }

    /**
     * Pause the current session
     */
    async pauseSession() {
        if (!this.sessionData || this.sessionData.id.toString().startsWith('local_')) {
            return;
        }
        
        try {
            await this.api.pauseSession(this.sessionData.id);
            console.log(`Paused session: ${this.sessionData.id}`);
        } catch (error) {
            console.warn('Failed to pause session:', error);
        }
    }

    // Getters
    get isActive() {
        return this.sessionData !== null;
    }

    get sessionId() {
        return this.sessionData?.id;
    }

    get studyType() {
        return this.deckData ? 'deck' : 'pod';
    }

    get studyName() {
        return this.deckData?.name || this.podData?.name;
    }

    get cardCount() {
        return this.cardsData.length;
    }
}