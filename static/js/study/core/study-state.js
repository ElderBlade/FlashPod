// static/js/study/core/study-state.js

/**
 * Centralized state management for all study modes
 * Provides a consistent state structure that can be extended by different modes
 */
export class StudyState {
    static create() {
        return {
            // Session identification
            session: null,
            deck: null,
            pod: null,
            lastDeckId: null,
            lastPodId: null,
            
            // Card data
            cards: [],
            originalCards: [],
            totalCards: 0,
            
            // Current position
            currentIndex: 0,
            currentCardId: null,
            isFlipped: false,
            
            // Display settings
            isShuffled: false,
            showDefinitionFirst: false,
            flipDirection: 'horizontal',
            
            // Mode management
            mode: 'basic',
            modeData: {
                // Mode 1: Basic Review
                basic: {
                    cardsStudied: 0,
                    startTime: null
                },
                
                // Mode 2: Simple Spaced Repetition
                'simple-spaced': {
                    stillLearning: [],      // Array of card IDs
                    known: [],              // Array of card IDs  
                    currentRound: 1,
                    responses: new Map(),   // cardId -> [response1, response2, ...]
                    isCollectingResponse: false,
                    sessionStartTime: null,
                    roundStartTime: null,
                    completedRounds: []     // Track round completion history
                },
                
                // Mode 3: Full SM-2 Spaced Repetition
                'full-spaced': {
                    reviews: new Map(),         // cardId -> CardReview data
                    nextReviewDates: new Map(), // cardId -> Date
                    difficulty: new Map(),      // cardId -> difficulty level
                    dueCards: [],              // Cards due for review
                    newCards: [],              // Never reviewed cards
                    learningCards: [],         // Cards in learning phase
                    matureCards: []            // Well-learned cards
                }
            }
        };
    }

    /**
     * Get mode-specific data for current mode
     */
    static getModeData(state, mode = null) {
        const targetMode = mode || state.mode;
        return state.modeData[targetMode] || {};
    }

    /**
     * Update mode-specific data
     */
    static updateModeData(state, updates, mode = null) {
        const targetMode = mode || state.mode;
        if (state.modeData[targetMode]) {
            Object.assign(state.modeData[targetMode], updates);
        }
    }

    /**
     * Reset mode data to defaults
     */
    static resetModeData(state, mode) {
        if (!state.modeData[mode]) return;
        
        switch (mode) {
            case 'basic':
                state.modeData.basic = {
                    cardsStudied: 0,
                    startTime: new Date()
                };
                break;
                
            case 'simple-spaced':
                // Keep card classifications but reset round progress
                const currentStillLearning = state.modeData['simple-spaced'].stillLearning || [];
                const currentKnown = state.modeData['simple-spaced'].known || [];
                
                state.modeData['simple-spaced'] = {
                    stillLearning: currentStillLearning,
                    known: currentKnown,
                    currentRound: currentStillLearning.length > 0 ? 1 : 0,
                    responses: new Map(),
                    isCollectingResponse: false,
                    sessionStartTime: new Date(),
                    roundStartTime: new Date(),
                    completedRounds: []
                };
                break;
                
            case 'full-spaced':
                state.modeData['full-spaced'] = {
                    reviews: new Map(),
                    nextReviewDates: new Map(),
                    difficulty: new Map(),
                    dueCards: [],
                    newCards: [...state.cards.map(card => card.id)],
                    learningCards: [],
                    matureCards: []
                };
                break;
        }
    }

    /**
     * Initialize mode data based on existing card data
     */
    static initializeModeData(state, mode, cards) {
        switch (mode) {
            case 'basic':
                state.modeData.basic.startTime = new Date();
                break;
                
            case 'simple-spaced':
                // All cards start in "still learning" bucket
                const cardIds = cards.map(card => card.id);
                state.modeData['simple-spaced'] = {
                    stillLearning: [...cardIds],
                    known: [],
                    currentRound: 1,
                    responses: new Map(),
                    isCollectingResponse: false,
                    sessionStartTime: new Date(),
                    roundStartTime: new Date(),
                    completedRounds: []
                };
                break;
                
            case 'full-spaced':
                // Categorize cards based on existing review data
                const modeData = state.modeData['full-spaced'];
                modeData.newCards = [];
                modeData.dueCards = [];
                modeData.learningCards = [];
                matureCards = [];
                
                cards.forEach(card => {
                    // This would be populated from backend CardReview data
                    modeData.newCards.push(card.id);
                });
                break;
        }
    }

    /**
     * Get current card from state
     */
    static getCurrentCard(state) {
        return state.cards[state.currentIndex] || null;
    }

    /**
     * Get progress information
     */
    static getProgress(state) {
        const current = state.currentIndex + 1;
        const total = state.totalCards;
        const percentage = total > 0 ? (current / total) * 100 : 0;
        
        return {
            current,
            total,
            percentage: Math.round(percentage * 10) / 10
        };
    }

    /**
     * Check if session can be resumed
     */
    static canResume(state) {
        return (state.lastDeckId || state.lastPodId) && 
               state.cards.length > 0;
    }

    /**
     * Get display content for current card based on settings
     */
    static getCardDisplayContent(state) {
        const card = StudyState.getCurrentCard(state);
        if (!card) return null;
        
        const showDefFirst = state.showDefinitionFirst;
        
        return {
            frontText: showDefFirst ? card.back_content : card.front_content,
            backText: showDefFirst ? card.front_content : card.back_content,
            frontLabel: showDefFirst ? 'Definition' : 'Term',
            backLabel: showDefFirst ? 'Term' : 'Definition'
        };
    }

    /**
     * Serialize state for persistence
     */
    static serialize(state) {
        const serialized = { ...state };
        
        // Convert Maps to Objects for JSON serialization
        Object.keys(serialized.modeData).forEach(mode => {
            const modeData = serialized.modeData[mode];
            if (modeData.responses instanceof Map) {
                modeData.responses = Object.fromEntries(modeData.responses);
            }
            if (modeData.reviews instanceof Map) {
                modeData.reviews = Object.fromEntries(modeData.reviews);
            }
            if (modeData.nextReviewDates instanceof Map) {
                modeData.nextReviewDates = Object.fromEntries(modeData.nextReviewDates);
            }
            if (modeData.difficulty instanceof Map) {
                modeData.difficulty = Object.fromEntries(modeData.difficulty);
            }
        });
        
        return JSON.stringify(serialized);
    }

    /**
     * Deserialize state from persistence
     */
    static deserialize(serializedState) {
        const state = JSON.parse(serializedState);
        
        // Convert Objects back to Maps
        Object.keys(state.modeData).forEach(mode => {
            const modeData = state.modeData[mode];
            if (modeData.responses && !(modeData.responses instanceof Map)) {
                modeData.responses = new Map(Object.entries(modeData.responses));
            }
            if (modeData.reviews && !(modeData.reviews instanceof Map)) {
                modeData.reviews = new Map(Object.entries(modeData.reviews));
            }
            if (modeData.nextReviewDates && !(modeData.nextReviewDates instanceof Map)) {
                modeData.nextReviewDates = new Map(Object.entries(modeData.nextReviewDates));
            }
            if (modeData.difficulty && !(modeData.difficulty instanceof Map)) {
                modeData.difficulty = new Map(Object.entries(modeData.difficulty));
            }
        });
        
        return state;
    }

    /**
     * Validate state integrity
     */
    static validate(state) {
        const errors = [];
        
        // Basic validation
        if (!state.cards || !Array.isArray(state.cards)) {
            errors.push('Cards array is missing or invalid');
        }
        
        if (state.currentIndex < 0 || state.currentIndex >= state.cards.length) {
            errors.push('Current index is out of bounds');
        }
        
        if (!state.mode || !state.modeData[state.mode]) {
            errors.push('Invalid or missing study mode');
        }
        
        // Mode-specific validation
        if (state.mode === 'simple-spaced') {
            const modeData = state.modeData['simple-spaced'];
            if (!Array.isArray(modeData.stillLearning) || !Array.isArray(modeData.known)) {
                errors.push('Simple spaced mode data is corrupted');
            }
        }
        
        return errors;
    }
}