// static/js/study/core/study-session.js
import { APIClient } from '../utils/api-client.js';

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
            // Load deck information
            const deckResponse = await this.api.getDeck(deckId);
            this.deckData = deckResponse.deck;
            
            // Load cards for the deck
            const cardsResponse = await this.api.getDeckCards(deckId);
            this.cardsData = cardsResponse.cards || [];
            
            // Validate we have cards
            if (this.cardsData.length === 0) {
                throw new Error('This deck has no cards yet!');
            }
            
            // Create backend study session
            await this._createBackendSession('deck', deckId);
            
            console.log(`Initialized deck study: ${this.deckData.name} (${this.cardsData.length} cards)`);
            
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
            // Load pod information and its cards
            const podResponse = await this.api.getPodCards(podId);
            this.podData = podResponse.pod;
            this.cardsData = podResponse.cards || [];
            
            // Validate we have cards
            if (this.cardsData.length === 0) {
                throw new Error('This pod has no cards yet!');
            }
            
            // Create backend study session
            await this._createBackendSession('pod', podId);
            
            console.log(`Initialized pod study: ${this.podData.name} (${this.cardsData.length} cards)`);
            
        } catch (error) {
            console.error('Failed to initialize pod study:', error);
            throw error;
        }
    }

    /**
     * Create a backend study session
     */
    async _createBackendSession(type, id) {
        try {
            const sessionData = type === 'deck' ? 
                { deck_id: id } : 
                { pod_id: id };
                
            const response = await this.api.createStudySession(sessionData);
            this.sessionData = response.session;
            
            console.log(`Created backend session: ${this.sessionData.id}`);
            
        } catch (error) {
            // Don't fail session creation if backend fails
            console.warn('Failed to create backend session, continuing with local session:', error);
            this.sessionData = {
                id: 'local_' + Date.now(),
                type: type,
                started_at: new Date().toISOString()
            };
        }
    }

    /**
     * Record a card review (for spaced repetition modes)
     */
    async recordCardReview(cardId, responseQuality, responseTime = null) {
        if (!this.sessionData) {
            console.warn('No active session to record review');
            return null;
        }

        const reviewData = {
            card_id: cardId,
            response_quality: responseQuality,
            response_time: responseTime
        };

        // Add session ID if we have a real backend session
        if (this.sessionData.id && !this.sessionData.id.startsWith('local_')) {
            reviewData.session_id = this.sessionData.id;
        }

        try {
            const response = await this.api.recordCardReview(reviewData);
            console.log(`Recorded review for card ${cardId}: quality=${responseQuality}`);
            return response.review;
        } catch (error) {
            console.error('Failed to record card review:', error);
            return null;
        }
    }

    /**
     * Update session progress
     */
    async updateProgress(cardsStudied, cardsCorrect = null) {
        if (!this.sessionData || this.sessionData.id.startsWith('local_')) {
            return; // Skip for local sessions
        }

        try {
            const progressData = {
                cards_studied: cardsStudied
            };
            
            if (cardsCorrect !== null) {
                progressData.cards_correct = cardsCorrect;
            }

            await this.api.updateSessionProgress(this.sessionData.id, progressData);
            
        } catch (error) {
            console.warn('Failed to update session progress:', error);
        }
    }

    /**
     * Complete the study session
     */
    async end() {
        if (!this.sessionData || this.sessionData.id.startsWith('local_')) {
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
        const now = new Date();
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
     * Batch record multiple card reviews
     */
    async batchRecordReviews(reviews) {
        if (!reviews || reviews.length === 0) return;

        try {
            const response = await this.api.batchRecordReviews(reviews);
            console.log(`Batch recorded ${reviews.length} card reviews`);
            return response;
        } catch (error) {
            console.error('Failed to batch record reviews:', error);
            
            // Fallback: try individual recordings
            const results = [];
            for (const review of reviews) {
                const result = await this.recordCardReview(
                    review.card_id, 
                    review.response_quality, 
                    review.response_time
                );
                results.push(result);
            }
            return results;
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