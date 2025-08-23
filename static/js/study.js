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
            currentIndex: 0,
            isFlipped: false,
            totalCards: 0,
            cardsStudied: 0,
            flipDirection: 'Y',
            lastDeckId: null // Track last studied deck
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
                cards: cardsData.cards,
                currentIndex: 0,
                isFlipped: false,
                totalCards: cardsData.cards.length,
                cardsStudied: 0,
                flipDirection: 'Y',
                lastDeckId: deckId
            };
            
            this.showInterface();
            this.setupKeyboardHandlers();
            this.renderCurrentCard();
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
                    <kbd>→</kbd> next
                </div>
            </div>

            <div class="flex justify-center items-center mt-8 space-x-6">
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

        const target = e.target.id || e.target.closest('button')?.id;
        
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
            case 'editCardBtn':
                this.openEditModal();
                break;
            case 'cancelEditBtn':
                this.closeEditModal();
                break;
        }

        // Handle flashcard click (but not on edit buttons)
        if (e.target.closest('#flashcard') && !e.target.closest('.edit-btn')) {
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
            case 'Escape': // Escape - exit study
                e.preventDefault();
                this.exit();
                break;
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
        
        // Update card content
        frontContent.textContent = currentCard.front_content;
        backContent.textContent = currentCard.back_content;
        
        // Reset flip state
        const flashcard = document.getElementById('flashcard');
        if (flashcard) {
            flashcard.classList.remove('flipped', 'flip-horizontal', 'flip-vertical-up', 'flip-vertical-down');
            this.state.isFlipped = false;
        }
        
        // Update progress
        const progressPercent = ((this.state.currentIndex + 1) / this.state.totalCards) * 100;
        progressBar.style.width = `${progressPercent}%`;
        cardProgress.textContent = `Card ${this.state.currentIndex + 1} of ${this.state.totalCards}`;
        
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
            this.state.isFlipped = false;
            this.renderCurrentCard();
            this.updateProgress();
        }
    }

    flipCard(direction) {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        // Remove any existing flip classes
        flashcard.classList.remove('flip-horizontal', 'flip-vertical-up', 'flip-vertical-down');
        
        // Add the appropriate flip class based on direction
        flashcard.classList.add(`flip-${direction}`);
        
        // Toggle flipped state
        this.state.isFlipped = !this.state.isFlipped;
        
        if (this.state.isFlipped) {
            flashcard.classList.add('flipped');
        } else {
            flashcard.classList.remove('flipped');
        }
        
        this.state.flipDirection = direction;
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
                
                // Update the card in our local state
                Object.assign(this.state.cards[this.state.currentIndex], data.card || formData);
                
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
            currentIndex: 0,
            isFlipped: false,
            totalCards: 0,
            cardsStudied: 0,
            flipDirection: 'Y',
            lastDeckId: null
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