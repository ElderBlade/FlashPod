// static/js/study/utils/api-client.js

/**
 * API client for study-related backend calls
 * Centralized API handling for study modes
 */
export class APIClient {
    constructor() {
        this.baseURL = window.API_BASE || '/api';
    }

    /**
     * Generic API request method
     */
    async request(endpoint, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...defaultOptions,
                ...options
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    throw new Error('Unauthorized');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // Deck and Pod Data Loading
    /**
     * Get deck information
     */
    async getDeck(deckId) {
        return await this.request(`/decks/${deckId}`);
    }

    /**
     * Get cards for a deck
     */
    async getDeckCards(deckId) {
        return await this.request(`/cards/deck/${deckId}`);
    }

    /**
     * Get pod information
     */
    async getPod(podId) {
        return await this.request(`/pods/${podId}`);
    }

    /**
     * Get pod cards (all cards from all decks in pod)
     */
    async getPodCards(podId) {
        return await this.request(`/pods/${podId}/cards`);
    }

    // Study Session Management
    /**
     * Create a new study session
     */
    async createStudySession(sessionData) {
        const endpoint = sessionData.deck_id ? 
            `/study/deck/${sessionData.deck_id}/session` :
            `/study/pod/${sessionData.pod_id}/session`;
            
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
    }

    /**
     * Update session progress
     */
    async updateSessionProgress(sessionId, progressData) {
        return await this.request(`/study/session/${sessionId}/progress`, {
            method: 'POST',
            body: JSON.stringify(progressData)
        });
    }

    /**
     * Complete study session
     */
    async completeSession(sessionId) {
        return await this.request(`/study/session/${sessionId}/complete`, {
            method: 'POST'
        });
    }

    /**
     * Get card review history for cards
     */
    async getCardReviews(cardIds) {
        const params = new URLSearchParams();
        cardIds.forEach(id => params.append('card_ids', id));
        
        return await this.request(`/study/card-reviews?${params.toString()}`);
    }

    /**
     * Get cards due for review (for SM-2 mode)
     */
    async getDueCards(deckId = null, podId = null) {
        const params = new URLSearchParams();
        if (deckId) params.append('deck_id', deckId);
        if (podId) params.append('pod_id', podId);
        
        return await this.request(`/study/due-cards?${params.toString()}`);
    }

    // Card Management (during study)
    /**
     * Update card content during study
     */
    async updateCard(cardId, cardData) {
        return await this.request(`/cards/${cardId}`, {
            method: 'PUT',
            body: JSON.stringify(cardData)
        });
    }

    /**
     * Pause study session
     */
    async pauseSession(sessionId) {
        return await this.request(`/study/session/${sessionId}/pause`, {
            method: 'POST',
            body: JSON.stringify({})
        });
    }

    // Statistics and Analytics
    /**
     * Get study statistics for user
     */
    async getStudyStats(timeframe = '30days') {
        return await this.request(`/study/stats?timeframe=${timeframe}`);
    }

    /**
     * Get deck-specific study statistics
     */
    async getDeckStudyStats(deckId) {
        return await this.request(`/study/stats/deck/${deckId}`);
    }

    /**
     * Get pod-specific study statistics
     */
    async getPodStudyStats(podId) {
        return await this.request(`/study/stats/pod/${podId}`);
    }

    /**
     * Get pod with enhanced data including study stats
     */
    async getPodWithStats(podId) {
        return await this.request(`/pods/${podId}?include_stats=true`);
    }

    // Error Handling Helpers
    /**
     * Handle network errors with user-friendly messages
     */
    formatErrorMessage(error) {
        if (error.message.includes('Failed to fetch')) {
            return 'Network error - please check your connection';
        }
        
        if (error.message.includes('Unauthorized')) {
            return 'Session expired - please log in again';
        }
        
        if (error.message.includes('HTTP 404')) {
            return 'Content not found - it may have been deleted';
        }
        
        if (error.message.includes('HTTP 500')) {
            return 'Server error - please try again later';
        }
        
        return error.message || 'An unexpected error occurred';
    }

    /**
     * Retry failed requests with exponential backoff
     */
    async requestWithRetry(endpoint, options = {}, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await this.request(endpoint, options);
            } catch (error) {
                lastError = error;
                
                // Don't retry on auth errors or client errors (4xx)
                if (error.message.includes('Unauthorized') || 
                    error.message.includes('HTTP 4')) {
                    throw error;
                }
                
                // Wait before retrying (exponential backoff)
                if (attempt < maxRetries - 1) {
                    const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }

    // Utility Methods
    /**
     * Check if API is reachable
     */
    async healthCheck() {
        try {
            await this.request('/health');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get API version info
     */
    async getVersion() {
        try {
            return await this.request('/version');
        } catch (error) {
            return { version: 'unknown', error: error.message };
        }
    }
}