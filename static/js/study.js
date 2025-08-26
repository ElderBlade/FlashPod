'use strict';

// Auto-detect API base
if (!window.API_BASE) {
    window.API_BASE = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000/api'
        : '/api';
}


class StudyMode {
    constructor() {
        this.state = {
            session: null,
            deck: null,
            cards: [],
            originalCards: [], // Store original order
            currentIndex: 0,
            isFlipped: false,
            totalCards: 0,
            cardsStudied: 0,
            flipDirection: 'Y',
            lastDeckId: null, // Track last studied deck
            isShuffled: false, // Track shuffle state
            currentCardId: null, // Track current card by ID to maintain position
            showDefinitionFirst: false // Track if showing definition first
        };
        
        this.keyHandler = this.handleKeyboard.bind(this);
        this.isActive = false;
        this.isPaused = false; // Track if study is paused (not exited)
    }


    async startStudy(deckId) {
        try {
            // If resuming same deck and has state, just show interface
            if (deckId === this.state.lastDeckId && this.state.cards.length > 0 && this.isPaused) {
                this.resumeStudy();
                return;
            }

            // First, fetch the deck details
            const deckResponse = await fetch(`${window.API_BASE}/decks/${deckId}`, {
                credentials: 'include'
            });
            
            if (!deckResponse.ok) {
                throw new Error('Failed to load deck');
            }
            
            const deckData = await deckResponse.json();
            
            // Then, fetch all cards for this deck
            const cardsResponse = await fetch(`${window.API_BASE}/cards/deck/${deckId}`, {
                credentials: 'include'
            });
            
            if (!cardsResponse.ok) {
                throw new Error('Failed to load cards');
            }
            
            const cardsData = await cardsResponse.json();
            
            // Check if deck has cards
            if (!cardsData.cards || cardsData.cards.length === 0) {
                window.showMessage?.('This deck has no cards yet!', 'error');
                return;
            }
            
            // Initialize state with real data
            this.state = {
                session: { id: Date.now() }, // Temporary session ID
                deck: deckData.deck,
                cards: [...cardsData.cards], // Current order (may be shuffled)
                originalCards: [...cardsData.cards], // Always keep original order
                currentIndex: 0,
                isFlipped: false,
                totalCards: cardsData.cards.length,
                cardsStudied: 0,
                flipDirection: 'Y',
                lastDeckId: deckId,
                isShuffled: false,
                currentCardId: cardsData.cards[0]?.id,
                showDefinitionFirst: false
            };
            
            this.showInterface();
            this.setupKeyboardHandlers();
            this.renderCurrentCard();
            this.updateShuffleButton();
            this.updateTermDefButton();
            this.isActive = true;
            this.isPaused = false;
            
        } catch (error) {
            window.showMessage?.('Error starting study session: ' + error.message, 'error');
            console.error('Study session error:', error);
        }
    }

    resumeStudy() {
        this.showInterface();
        this.setupKeyboardHandlers();
        this.renderCurrentCard();
        this.updateShuffleButton();
        this.updateTermDefButton();
        this.isActive = true;
        this.isPaused = false;
    }

    pauseStudy() {
        // Hide study view without clearing state
        const studyView = document.getElementById('study-view');
        if (studyView) {
            studyView.classList.add('hidden');
        }
        
        // Remove keyboard handlers
        document.removeEventListener('keydown', this.keyHandler);
        
        this.isActive = false;
        this.isPaused = true;
    }

    showInterface() {
        document.querySelectorAll('.page-view').forEach(view => view.classList.add('hidden'));
        
        document.getElementById('page-title').textContent = 'Study Mode';
        document.getElementById('page-subtitle').textContent = `${this.state.deck.name} - ${this.state.totalCards} cards`;
        
        let studyView = document.getElementById('study-view');
        if (!studyView) {
            studyView = this.createStudyView();
            document.querySelector('main').appendChild(studyView);
        }
        studyView.classList.remove('hidden');
        
        // Update navigation to show flashcards as active
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const flashcardsNav = document.getElementById('nav-flashcards');
        if (flashcardsNav) {
            flashcardsNav.classList.add('active');
        }
    }

    createStudyView() {
        const studyView = document.createElement('div');
        studyView.id = 'study-view';
        studyView.className = 'page-view p-6';
        
        studyView.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center space-x-4">
                    <button id="exitStudyBtn" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                        Exit Study
                    </button>
                    <div class="text-sm text-gray-600">
                        <span id="cardProgress">Card 1 of ${this.state.totalCards}</span>
                    </div>
                </div>
            </div>

            <div class="w-full bg-gray-200 rounded-full h-2 mb-8">
                <div id="progressBar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>

            <div class="max-w-4xl mx-auto">
                <div class="card-container">
                    <div id="flashcard" class="flashcard">
                        <div class="flashcard-inner">
                            <div class="flashcard-front">
                                <button id="editCardBtn" class="edit-btn">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                                <div class="card-label">Term</div>
                                <div id="frontContent" class="card-content"></div>
                            </div>
                            <div class="flashcard-back">
                                <button class="edit-btn" onclick="window.studyMode.openEditModal()">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                                <div class="card-label">Definition</div>
                                <div id="backContent" class="card-content"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="keyboard-hints">
                    <kbd>Space</kbd> flip horizontal • 
                    <kbd>↑</kbd> flip up • 
                    <kbd>↓</kbd> flip down • 
                    <kbd>←</kbd> previous • 
                    <kbd>→</kbd> next • 
                    <kbd>T</kbd> term/definition • 
                    <kbd>S</kbd> shuffle
                </div>
            </div>

            <div class="flex justify-between items-center mt-8 max-w-4xl mx-auto">
                <!-- Left spacer to balance the right side buttons -->
                <div class="w-48"></div>
                
                <!-- Centered Previous/Next buttons -->
                <div class="flex items-center space-x-6">
                    <button id="prevCardBtn" class="nav-button">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        Previous
                    </button>
                    
                    <button id="nextCardBtn" class="nav-button">
                        Next
                        <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                </div>

                <!-- Right side buttons -->
                <div class="flex justify-end items-center space-x-3 w-48">
                    <button id="termDefBtn" class="nav-button transition-all duration-200" title="Toggle Term/Definition First">
                        <span id="termDefIcon" class="w-5 h-5 flex items-center justify-center font-bold text-lg pointer-events-none">T</span>
                    </button>
                    
                    <button id="shuffleBtn" class="nav-button transition-all duration-200" title="Toggle Shuffle Cards">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4l11.733 16h4.267l-11.733-16zm0 16l11.733-16h4.267l-11.733-16zm8.467-8.467l2.733-2.733"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <div id="editCardModal" class="modal hidden">
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <h3 class="text-lg font-semibold mb-4">Edit Card</h3>
                    <form id="editCardForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Term</label>
                            <input type="text" id="editFrontContent" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Definition</label>
                            <textarea id="editBackContent" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows="4"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                            <input type="text" id="editTags" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="comma, separated, tags">
                        </div>
                        <div class="flex justify-end space-x-3 pt-4">
                            <button type="button" id="cancelEditBtn" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md">Cancel</button>
                            <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        return studyView;
    }

    setupEventListeners() {
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Setup navigation interception
        this.setupNavigationInterception();
    }

    setupNavigationInterception() {
        // Intercept navigation clicks
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // If study mode is active and not clicking flashcards
                if (this.isActive && item.id !== 'nav-flashcards') {
                    this.pauseStudy();
                }
                // If clicking flashcards and have a paused session
                else if (item.id === 'nav-flashcards' && this.isPaused && this.state.lastDeckId) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.resumeStudy();
                }
            });
        });
    }

    handleClick(e) {
        if (!this.isActive) return;

        // Stop event bubbling immediately
        e.preventDefault();
        e.stopPropagation();

        const clickedElement = e.target;
        const button = clickedElement.closest('button');
        const target = button?.id;
        
        switch (target) {
            case 'exitStudyBtn':
                this.exit();
                break;
            case 'prevCardBtn':
                this.navigateCard(-1);
                break;
            case 'nextCardBtn':
                this.navigateCard(1);
                break;
            case 'shuffleBtn':
                this.toggleShuffle();
                break;
            case 'termDefBtn':
                this.toggleTermDef();
                break;
            case 'editCardBtn':
                this.openEditModal();
                break;
            case 'cancelEditBtn':
                this.closeEditModal();
                break;
        }

        // Handle flashcard click (but not on edit buttons or control buttons)
        if (clickedElement.closest('#flashcard') && !clickedElement.closest('.edit-btn') && !button) {
            this.flipCard('horizontal');
        }
    }

    handleSubmit(e) {
        if (!this.isActive) return;
        
        if (e.target.id === 'editCardForm') {
            e.preventDefault();
            this.saveCardEdit();
        }
    }

    setupKeyboardHandlers() {
        document.removeEventListener('keydown', this.keyHandler);
        document.addEventListener('keydown', this.keyHandler);
    }

    handleKeyboard(e) {
        if (!this.isActive) return;
        
        // Don't handle keys if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (e.key) {
            case ' ': // Spacebar - horizontal flip (like turning a page)
                e.preventDefault();
                this.flipCard('horizontal');
                break;
            case 'ArrowUp': // Up arrow - vertical flip up
                e.preventDefault();
                this.flipCard('vertical-up');
                break;
            case 'ArrowDown': // Down arrow - vertical flip down
                e.preventDefault();
                this.flipCard('vertical-down');
                break;
            case 'ArrowLeft': // Left arrow - previous card
                e.preventDefault();
                this.navigateCard(-1);
                break;
            case 'ArrowRight': // Right arrow - next card
                e.preventDefault();
                this.navigateCard(1);
                break;
            case 's':
            case 'S': // S key - toggle shuffle
                e.preventDefault();
                this.toggleShuffle();
                break;
            case 't':
            case 'T': // T key - toggle term/definition
                e.preventDefault();
                this.toggleTermDef();
                break;
            case 'Escape': // Escape - exit study
                e.preventDefault();
                this.exit();
                break;
        }
    }

    toggleShuffle() {
        const currentCard = this.state.cards[this.state.currentIndex];

        if (this.state.isShuffled) {
            // Turn off shuffle - restore original order, keep current card
            this.state.currentCardId = currentCard?.id;
            this.state.cards = [...this.state.originalCards];
            this.state.isShuffled = false;
            
            // Find the current card in the original order and update index
            if (this.state.currentCardId) {
                const newIndex = this.state.cards.findIndex(card => card.id === this.state.currentCardId);
                this.state.currentIndex = newIndex !== -1 ? newIndex : 0;
            }
            
            window.showMessage?.('Shuffle turned off - cards restored to original order', 'info');
        } else {
            // Turn on shuffle - go to first card
            this.state.cards = this.shuffleArray([...this.state.cards]);
            this.state.isShuffled = true;
            this.state.currentIndex = 0; // Move to first card in shuffled deck
            this.state.currentCardId = this.state.cards[0]?.id;
            
            window.showMessage?.('Shuffle turned on - cards are now randomized', 'info');
        }

        this.renderCurrentCard();
        this.updateShuffleButton();
    }

    toggleTermDef() {
        console.log('Toggle term/def clicked, current state:', this.state.showDefinitionFirst);
        
        this.state.showDefinitionFirst = !this.state.showDefinitionFirst;
        
        console.log('New state:', this.state.showDefinitionFirst);
        
        if (this.state.showDefinitionFirst) {
            window.showMessage?.('Now showing definitions first', 'info');
        } else {
            window.showMessage?.('Now showing terms first', 'info');
        }

        // Update UI immediately
        this.updateTermDefButton();
        this.renderCurrentCard();
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    updateShuffleButton() {
        const shuffleBtn = document.getElementById('shuffleBtn');
        if (!shuffleBtn) return;

        if (this.state.isShuffled) {
            shuffleBtn.classList.remove('bg-gray-100', 'text-gray-500');
            shuffleBtn.classList.add('bg-blue-100', 'text-blue-700', 'border-blue-200');
            shuffleBtn.style.backgroundColor = '#dbeafe';
            shuffleBtn.style.color = '#1d4ed8';
            shuffleBtn.style.borderColor = '#93c5fd';
            shuffleBtn.title = 'Shuffle is ON - Click to restore original order';
        } else {
            shuffleBtn.classList.remove('bg-blue-100', 'text-blue-700', 'border-blue-200');
            shuffleBtn.classList.add('bg-gray-100', 'text-gray-500');
            shuffleBtn.style.backgroundColor = '';
            shuffleBtn.style.color = '';
            shuffleBtn.style.borderColor = '';
            shuffleBtn.title = 'Shuffle is OFF - Click to randomize cards';
        }
    }

    updateTermDefButton() {
        const termDefBtn = document.getElementById('termDefBtn');
        const termDefIcon = document.getElementById('termDefIcon');
        if (!termDefBtn || !termDefIcon) return;

        if (this.state.showDefinitionFirst) {
            termDefBtn.classList.remove('bg-gray-100', 'text-gray-500');
            termDefBtn.classList.add('bg-purple-100', 'text-purple-700', 'border-purple-200');
            termDefBtn.style.backgroundColor = '#f3e8ff';
            termDefBtn.style.color = '#7c3aed';
            termDefBtn.style.borderColor = '#c4b5fd';
            termDefBtn.title = 'Currently showing Definition First - Click to show Term First';
            termDefIcon.textContent = 'D';
        } else {
            termDefBtn.classList.remove('bg-purple-100', 'text-purple-700', 'border-purple-200');
            termDefBtn.classList.add('bg-gray-100', 'text-gray-500');
            termDefBtn.style.backgroundColor = '';
            termDefBtn.style.color = '';
            termDefBtn.style.borderColor = '';
            termDefBtn.title = 'Currently showing Term First - Click to show Definition First';
            termDefIcon.textContent = 'T';
        }
    }

    renderCurrentCard() {
        if (!this.state.cards.length) return;
        
        const currentCard = this.state.cards[this.state.currentIndex];
        const frontContent = document.getElementById('frontContent');
        const backContent = document.getElementById('backContent');
        const progressBar = document.getElementById('progressBar');
        const cardProgress = document.getElementById('cardProgress');
        
        if (!frontContent || !backContent) return;
        
        const flashcard = document.getElementById('flashcard');
        if (flashcard) {
            // INSTANT reset without animation - this prevents the flash
            flashcard.style.transition = 'none';
            flashcard.classList.remove('flipped', 'flip-horizontal', 'flip-vertical-up', 'flip-vertical-down', 'flipping');
            
            // Force reflow to apply the instant changes
            flashcard.offsetHeight;
            
            // Restore transition for future flips
            flashcard.style.transition = '';
            
            // Set default flip direction
            flashcard.classList.add('flip-horizontal');
            
            // Reset flip state
            this.state.isFlipped = false;
        }
        
        // Determine what to show based on showDefinitionFirst setting
        const frontText = this.state.showDefinitionFirst ? currentCard.back_content : currentCard.front_content;
        const backText = this.state.showDefinitionFirst ? currentCard.front_content : currentCard.back_content;
        const frontLabel = this.state.showDefinitionFirst ? 'Definition' : 'Term';
        const backLabel = this.state.showDefinitionFirst ? 'Term' : 'Definition';
        
        // Update card content AFTER resetting the card position
        frontContent.textContent = frontText;
        backContent.textContent = backText;
        
        // Update labels
        const frontLabelEl = document.querySelector('.flashcard-front .card-label');
        const backLabelEl = document.querySelector('.flashcard-back .card-label');
        if (frontLabelEl) frontLabelEl.textContent = frontLabel;
        if (backLabelEl) backLabelEl.textContent = backLabel;
        
        // Update progress
        const progressPercent = ((this.state.currentIndex + 1) / this.state.totalCards) * 100;
        if (progressBar) progressBar.style.width = `${progressPercent}%`;
        if (cardProgress) cardProgress.textContent = `Card ${this.state.currentIndex + 1} of ${this.state.totalCards}`;
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prevCardBtn');
        const nextBtn = document.getElementById('nextCardBtn');
        
        if (prevBtn) prevBtn.disabled = this.state.currentIndex === 0;
        if (nextBtn) nextBtn.disabled = this.state.currentIndex === this.state.totalCards - 1;
    }

    navigateCard(direction) {
        const newIndex = this.state.currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.state.totalCards) {
            this.state.currentIndex = newIndex;
            this.state.currentCardId = this.state.cards[newIndex]?.id;
            this.state.isFlipped = false;
            this.renderCurrentCard();
            this.updateProgress();
        }
    }

    flipCard(direction) {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        // Remove existing flip classes
        flashcard.classList.remove('flip-horizontal', 'flip-vertical-up', 'flip-vertical-down');
        
        // Add a flipping class to prevent hover effects during animation
        flashcard.classList.add('flipping');
        
        // Force reflow
        flashcard.offsetHeight;
        
        // Add the direction class
        flashcard.classList.add(`flip-${direction}`);
        
        // Toggle the flipped state
        if (this.state.isFlipped) {
            flashcard.classList.remove('flipped');
            this.state.isFlipped = false;
        } else {
            flashcard.classList.add('flipped');
            this.state.isFlipped = true;
        }
        
        // Remove flipping class after animation completes
        setTimeout(() => {
            flashcard.classList.remove('flipping');
        }, 800);
        
        this.state.flipDirection = direction;
    }

    flipCard3D(flashcard, direction) {
        // Remove any existing flip direction classes
        flashcard.classList.remove('flip-horizontal', 'flip-vertical-up', 'flip-vertical-down');
        
        // Force a reflow
        flashcard.offsetHeight;
        
        // Add the new direction class
        flashcard.classList.add(`flip-${direction}`);
        
        // Toggle flipped state
        if (this.state.isFlipped) {
            flashcard.classList.remove('flipped');
            this.state.isFlipped = false;
        } else {
            flashcard.classList.add('flipped');
            this.state.isFlipped = true;
        }
    }

    flipCardFallback(flashcard) {
        // Simple opacity-based fallback for browsers with poor 3D support
        flashcard.style.transition = 'opacity 0.3s ease-in-out';
        flashcard.style.opacity = '0';
        
        setTimeout(() => {
            if (this.state.isFlipped) {
                flashcard.classList.remove('flipped');
                this.state.isFlipped = false;
            } else {
                flashcard.classList.add('flipped');
                this.state.isFlipped = true;
            }
            flashcard.style.opacity = '1';
        }, 150);
        
        // Clean up transition after animation
        setTimeout(() => {
            flashcard.style.transition = '';
        }, 300);
    }

    openEditModal() {
        const currentCard = this.state.cards[this.state.currentIndex];
        
        document.getElementById('editFrontContent').value = currentCard.front_content;
        document.getElementById('editBackContent').value = currentCard.back_content;
        document.getElementById('editTags').value = currentCard.tags || '';
        
        document.getElementById('editCardModal').classList.remove('hidden');
    }

    closeEditModal() {
        document.getElementById('editCardModal').classList.add('hidden');
    }

    async saveCardEdit() {
        const currentCard = this.state.cards[this.state.currentIndex];
        const formData = {
            front_content: document.getElementById('editFrontContent').value,
            back_content: document.getElementById('editBackContent').value,
            tags: document.getElementById('editTags').value
        };
        
        try {
            // Send update to backend
            const response = await fetch(`${window.API_BASE}/cards/${currentCard.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Update the card in both current and original arrays
                const updatedCard = data.card || { ...currentCard, ...formData };
                Object.assign(this.state.cards[this.state.currentIndex], updatedCard);
                
                // Also update in original cards array
                const originalIndex = this.state.originalCards.findIndex(card => card.id === currentCard.id);
                if (originalIndex !== -1) {
                    Object.assign(this.state.originalCards[originalIndex], updatedCard);
                }
                
                // Re-render the card
                this.renderCurrentCard();
                
                // Close modal
                this.closeEditModal();
                
                window.showMessage?.('Card updated successfully', 'success');
            } else {
                throw new Error('Failed to update card');
            }
        } catch (error) {
            console.error('Error updating card:', error);
            window.showMessage?.('Failed to update card: ' + error.message, 'error');
        }
    }

    async updateProgress() {
        // Progress tracking for future backend integration
        console.log('Progress updated:', this.state.currentIndex + 1, 'of', this.state.totalCards);
    }

    async exit() {
        // Cleanup
        document.removeEventListener('keydown', this.keyHandler);
        
        // Hide study view
        const studyView = document.getElementById('study-view');
        if (studyView) {
            studyView.classList.add('hidden');
        }
        
        // Reset state completely
        this.state = {
            session: null,
            deck: null,
            cards: [],
            originalCards: [],
            currentIndex: 0,
            isFlipped: false,
            totalCards: 0,
            cardsStudied: 0,
            flipDirection: 'Y',
            lastDeckId: null,
            isShuffled: false,
            currentCardId: null,
            showDefinitionFirst: false
        };
        
        this.isActive = false;
        this.isPaused = false;
        
        // Return to library view
        if (document.getElementById('nav-library')) {
            document.getElementById('nav-library').click();
        }
    }

    isStudyActive() {
        return this.isActive;
    }

    hasPausedSession() {
        return this.isPaused && this.state.lastDeckId;
    }
}

// Create global study instance
window.studyMode = new StudyMode();

// Export the studyDeck function for compatibility
window.studyDeck = function(deckId) {
    window.studyMode.startStudy(deckId);
};

// Add global message function if not exists
if (!window.showMessage) {
    window.showMessage = function(message, type = 'info') {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
        
        messageDiv.className = `${bgColor} text-white px-6 py-4 rounded-lg shadow-lg mb-3 max-w-sm`;
        messageDiv.textContent = message;
        
        messagesContainer.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    };
}