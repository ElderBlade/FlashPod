// static/js/study.js
'use strict';

// Auto-detect API base if not already set
if (!window.API_BASE) {
    window.API_BASE = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000/api'
        : '/api';
}

// Study mode functionality - modular implementation
class StudyMode {
    constructor() {
        this.state = {
            session: null,
            deck: null,
            cards: [],
            currentIndex: 0,
            isFlipped: false,
            totalCards: 0,
            cardsStudied: 0
        };
        
        this.keyHandler = this.handleKeyboard.bind(this);
        this.isActive = false;
    }

    // Initialize study mode for a deck
    async startStudy(deckId) {
        try {
            const response = await fetch(`${window.API_BASE}/study/deck/${deckId}/session`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.state = {
                    session: data.session,
                    deck: data.deck,
                    cards: data.cards,
                    currentIndex: 0,
                    isFlipped: false,
                    totalCards: data.total_cards,
                    cardsStudied: 0
                };
                
                this.showInterface();
                this.setupKeyboardHandlers();
                this.renderCurrentCard();
                this.isActive = true;
            } else {
                const errorData = await response.json();
                window.showMessage(errorData.error || 'Failed to start study session', 'error');
            }
        } catch (error) {
            window.showMessage('Error starting study session: ' + error.message, 'error');
        }
    }

    // Show the study interface
    showInterface() {
        // Hide all other views
        document.querySelectorAll('.page-view').forEach(view => view.classList.add('hidden'));
        
        // Update header
        document.getElementById('page-title').textContent = 'Study Mode';
        document.getElementById('page-subtitle').textContent = `${this.state.deck.name} - ${this.state.totalCards} cards`;
        
        // Show study view
        let studyView = document.getElementById('study-view');
        if (!studyView) {
            studyView = this.createStudyView();
            document.querySelector('main').appendChild(studyView);
        }
        studyView.classList.remove('hidden');
        
        // Update navigation active state
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    }

    // Create the study view HTML
    createStudyView() {
        const studyView = document.createElement('div');
        studyView.id = 'study-view';
        studyView.className = 'page-view p-6';
        
        studyView.innerHTML = `
            <!-- Study Controls -->
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

            <!-- Progress Bar -->
            <div class="w-full bg-gray-200 rounded-full h-2 mb-8">
                <div id="progressBar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>

            <!-- Flashcard -->
            <div class="max-w-4xl mx-auto">
                <div id="flashcard" class="relative bg-white rounded-xl shadow-lg border border-gray-200 min-h-96 cursor-pointer transition-transform duration-300 hover:shadow-xl">
                    <!-- Edit button -->
                    <button id="editCardBtn" class="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    
                    <!-- Card content -->
                    <div class="p-8 h-full flex flex-col justify-center">
                        <div id="cardSide" class="text-sm text-gray-500 mb-2">Term</div>
                        <div id="cardContent" class="text-2xl text-gray-900 text-center leading-relaxed">
                            <!-- Card content will be inserted here -->
                        </div>
                    </div>
                    
                    <!-- Flip indicator -->
                    <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 text-center">
                        <div>
                            Press <kbd class="px-1 py-0.5 bg-gray-100 rounded text-gray-600 text-xs">Space</kbd> to flip • 
                            <kbd class="px-1 py-0.5 bg-gray-100 rounded text-gray-600 text-xs">←</kbd><kbd class="px-1 py-0.5 bg-gray-100 rounded text-gray-600 text-xs">→</kbd> to navigate
                        </div>
                    </div>
                </div>
            </div>

            <!-- Navigation Controls -->
            <div class="flex justify-center items-center mt-8 space-x-6">
                <button id="prevCardBtn" class="flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Previous
                </button>
                
                <button id="flipCardBtn" class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                    Flip Card
                </button>
                
                <button id="nextCardBtn" class="flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
                    Next
                    <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            </div>

            <!-- Card Edit Modal -->
            <div id="editCardModal" class="fixed inset-0 flex items-center justify-center hidden z-50">
                <!-- Blurred backdrop -->
                <div class="absolute inset-0 bg-opacity-30 backdrop-blur-sm"></div>
                
                <!-- Modal content -->
                <div class="relative bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-2xl">
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

    // Setup event listeners for study interface
    setupEventListeners() {
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('submit', this.handleSubmit.bind(this));
    }

    // Handle click events
    handleClick(e) {
        if (!this.isActive) return;

        switch (e.target.id || e.target.closest('button')?.id) {
            case 'exitStudyBtn':
                this.exit();
                break;
            case 'prevCardBtn':
                this.navigateCard(-1);
                break;
            case 'nextCardBtn':
                this.navigateCard(1);
                break;
            case 'flipCardBtn':
                this.flipCard();
                break;
            case 'editCardBtn':
                this.openEditModal();
                break;
            case 'cancelEditBtn':
                this.closeEditModal();
                break;
        }

        // Handle flashcard click
        if (e.target.closest('#flashcard') && !e.target.closest('#editCardBtn')) {
            this.flipCard();
        }
    }

    // Handle form submissions
    handleSubmit(e) {
        if (!this.isActive) return;
        
        if (e.target.id === 'editCardForm') {
            e.preventDefault();
            this.saveCardEdit();
        }
    }

    // Setup keyboard handlers
    setupKeyboardHandlers() {
        document.removeEventListener('keydown', this.keyHandler);
        document.addEventListener('keydown', this.keyHandler);
    }

    // Keyboard handler
    handleKeyboard(e) {
        if (!this.isActive) return;
        
        // Don't handle keys if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (e.key) {
            case ' ': // Spacebar - flip card
                e.preventDefault();
                this.flipCard();
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

    // Render the current card
    renderCurrentCard() {
        if (!this.state.cards.length) return;
        
        const currentCard = this.state.cards[this.state.currentIndex];
        const cardContent = document.getElementById('cardContent');
        const cardSide = document.getElementById('cardSide');
        const progressBar = document.getElementById('progressBar');
        const cardProgress = document.getElementById('cardProgress');
        
        if (!cardContent) return; // Safety check
        
        // Update card content
        if (this.state.isFlipped) {
            cardContent.textContent = currentCard.back_content;
            cardSide.textContent = 'Definition';
        } else {
            cardContent.textContent = currentCard.front_content;
            cardSide.textContent = 'Term';
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

    // Navigate to next/previous card
    navigateCard(direction) {
        const newIndex = this.state.currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.state.totalCards) {
            this.state.currentIndex = newIndex;
            this.state.isFlipped = false; // Reset flip state
            this.renderCurrentCard();
            this.updateProgress();
        }
    }

    // Flip the current card
    flipCard() {
        this.state.isFlipped = !this.state.isFlipped;
        this.renderCurrentCard();
        
        // Add flip animation
        const flashcard = document.getElementById('flashcard');
        if (flashcard) {
            flashcard.style.transform = 'rotateY(10deg)';
            setTimeout(() => {
                flashcard.style.transform = 'rotateY(0deg)';
            }, 150);
        }
    }

    // Open edit modal for current card
    openEditModal() {
        const currentCard = this.state.cards[this.state.currentIndex];
        
        document.getElementById('editFrontContent').value = currentCard.front_content;
        document.getElementById('editBackContent').value = currentCard.back_content;
        document.getElementById('editTags').value = currentCard.tags || '';
        
        document.getElementById('editCardModal').classList.remove('hidden');
    }

    // Close edit modal
    closeEditModal() {
        document.getElementById('editCardModal').classList.add('hidden');
    }

    // Save card edits
    async saveCardEdit() {
        const currentCard = this.state.cards[this.state.currentIndex];
        const formData = {
            front_content: document.getElementById('editFrontContent').value,
            back_content: document.getElementById('editBackContent').value,
            tags: document.getElementById('editTags').value
        };
        
        try {
            const response = await fetch(`${window.API_BASE}/study/card/${currentCard.id}`, {
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
                Object.assign(this.state.cards[this.state.currentIndex], data.card);
                
                // Re-render the card
                this.renderCurrentCard();
                
                // Close modal
                this.closeEditModal();
                
                window.showMessage('Card updated successfully', 'success');
            } else {
                const errorData = await response.json();
                window.showMessage(errorData.error || 'Failed to update card', 'error');
            }
        } catch (error) {
            window.showMessage('Error updating card: ' + error.message, 'error');
        }
    }

    // Update study progress on server
    async updateProgress() {
        if (!this.state.session) return;
        
        try {
            await fetch(`${window.API_BASE}/study/session/${this.state.session.id}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    current_index: this.state.currentIndex,
                    cards_studied: this.state.currentIndex + 1
                })
            });
        } catch (error) {
            console.warn('Failed to update study progress:', error);
        }
    }

    // Exit study mode
    async exit() {
        if (this.state.session) {
            try {
                await fetch(`${window.API_BASE}/study/session/${this.state.session.id}/complete`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.warn('Failed to complete study session:', error);
            }
        }
        
        // Remove keyboard handler
        document.removeEventListener('keydown', this.keyHandler);
        
        // Hide study view
        const studyView = document.getElementById('study-view');
        if (studyView) {
            studyView.classList.add('hidden');
        }
        
        // Reset state
        this.state = {
            session: null,
            deck: null,
            cards: [],
            currentIndex: 0,
            isFlipped: false,
            totalCards: 0,
            cardsStudied: 0
        };
        
        this.isActive = false;
        
        // Return to library view
        if (document.getElementById('nav-library')) {
            document.getElementById('nav-library').click();
        }
    }

    // Public method to check if study mode is active
    isStudyActive() {
        return this.isActive;
    }
}

// Create global study instance
window.studyMode = new StudyMode();

// Export the studyDeck function for compatibility with existing code
window.studyDeck = function(deckId) {
    window.studyMode.startStudy(deckId);
};