// static/js/study.js - Refactored entry point for modular study system

// For now, let's create a simplified version that works without ES6 modules
// to maintain compatibility with the existing system

class StudyManagerSimplified {
    constructor() {
        this.state = this.createState();
        this.isActive = false;
        this.isPaused = false;
        this.setupKeyboardHandler();
    }

    createState() {
        return {
            session: null,
            deck: null,
            pod: null,
            cards: [],
            originalCards: [],
            currentIndex: 0,
            currentCardId: null,
            isFlipped: false,
            totalCards: 0,
            lastDeckId: null,
            lastPodId: null,
            isShuffled: false,
            showDefinitionFirst: false,
            flipDirection: 'horizontal',
            mode: 'basic',
            modeData: {
                basic: { cardsStudied: 0, startTime: null }
            }
        };
    }

    async startDeckStudy(deckId) {
        try {
            // Load deck and cards data
            const [deckResponse, cardsResponse] = await Promise.all([
                fetch(`${window.API_BASE}/decks/${deckId}`, { credentials: 'include' }),
                fetch(`${window.API_BASE}/cards/deck/${deckId}`, { credentials: 'include' })
            ]);

            if (!deckResponse.ok || !cardsResponse.ok) {
                throw new Error('Failed to load deck or cards');
            }

            const deckData = await deckResponse.json();
            const cardsData = await cardsResponse.json();

            if (!cardsData.cards || cardsData.cards.length === 0) {
                throw new Error('This deck has no cards yet!');
            }

            // Initialize state
            this.state.deck = deckData.deck;
            this.state.cards = [...cardsData.cards];
            this.state.originalCards = [...cardsData.cards];
            this.state.currentIndex = 0;
            this.state.currentCardId = this.state.cards[0]?.id;
            this.state.totalCards = this.state.cards.length;
            this.state.lastDeckId = deckId;
            this.state.modeData.basic.startTime = new Date();

            this.showInterface();
            this.renderCurrentCard();
            this.isActive = true;
            this.isPaused = false;

        } catch (error) {
            this.showMessage('Error starting study session: ' + error.message, 'error');
            console.error('Study session error:', error);
        }
    }

    showInterface() {
        // Hide all other views
        document.querySelectorAll('.page-view').forEach(view => view.classList.add('hidden'));
        
        // Update headers
        document.getElementById('page-title').textContent = 'Study Mode';
        document.getElementById('page-subtitle').textContent = `${this.state.deck.name} - ${this.state.totalCards} cards`;
        
        // Show or create study view
        let studyView = document.getElementById('study-view');
        if (!studyView) {
            studyView = this.createStudyView();
            document.querySelector('main').appendChild(studyView);
        }
        studyView.classList.remove('hidden');
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
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
                                <div class="card-label">Term</div>
                                <div id="frontContent" class="card-content"></div>
                            </div>
                            <div class="flashcard-back">
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
                <div class="w-48"></div>
                
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

                <div class="flex justify-end items-center space-x-3 w-48">
                    <button id="termDefBtn" class="nav-button" title="Toggle Term/Definition First">
                        <span id="termDefIcon" class="w-5 h-5 flex items-center justify-center font-bold text-lg">T</span>
                    </button>
                    
                    <button id="shuffleBtn" class="nav-button" title="Toggle Shuffle Cards">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4l11.733 16h4.267l-11.733-16zm0 16l11.733-16h4.267l-11.733-16zm8.467-8.467l2.733-2.733"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        // Setup event listeners
        studyView.addEventListener('click', (e) => this.handleClick(e));
        
        return studyView;
    }

    handleClick(e) {
        if (!this.isActive) return;

        e.preventDefault();
        e.stopPropagation();

        const button = e.target.closest('button');
        if (!button) {
            if (e.target.closest('#flashcard')) {
                this.flipCard('horizontal');
            }
            return;
        }

        switch (button.id) {
            case 'exitStudyBtn':
                this.exitStudy();
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
        }
    }

    setupKeyboardHandler() {
        this.keyHandler = (e) => {
            if (!this.isActive || this.isTypingInInput(e.target)) return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    this.flipCard('horizontal');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.flipCard('vertical-up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.flipCard('vertical-down');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigateCard(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigateCard(1);
                    break;
                case 's':
                case 'S':
                    e.preventDefault();
                    this.toggleShuffle();
                    break;
                case 't':
                case 'T':
                    e.preventDefault();
                    this.toggleTermDef();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.exitStudy();
                    break;
            }
        };

        document.addEventListener('keydown', this.keyHandler);
    }

    isTypingInInput(element) {
        const inputTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
        return inputTypes.includes(element.tagName) || 
               element.contentEditable === 'true';
    }

    renderCurrentCard() {
        if (!this.state.cards.length) return;
        
        const currentCard = this.state.cards[this.state.currentIndex];
        const frontContent = document.getElementById('frontContent');
        const backContent = document.getElementById('backContent');
        
        if (!frontContent || !backContent) return;
        
        // Reset flip state
        this.resetCardFlip();
        
        // Determine content based on showDefinitionFirst
        const frontText = this.state.showDefinitionFirst ? currentCard.back_content : currentCard.front_content;
        const backText = this.state.showDefinitionFirst ? currentCard.front_content : currentCard.back_content;
        const frontLabel = this.state.showDefinitionFirst ? 'Definition' : 'Term';
        const backLabel = this.state.showDefinitionFirst ? 'Term' : 'Definition';
        
        frontContent.textContent = frontText;
        backContent.textContent = backText;
        
        // Update labels
        const frontLabelEl = document.querySelector('.flashcard-front .card-label');
        const backLabelEl = document.querySelector('.flashcard-back .card-label');
        if (frontLabelEl) frontLabelEl.textContent = frontLabel;
        if (backLabelEl) backLabelEl.textContent = backLabel;
        
        this.updateProgress();
        this.updateNavigationButtons();
    }

    resetCardFlip() {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        flashcard.style.transition = 'none';
        flashcard.classList.remove('flipped', 'flip-horizontal', 'flip-vertical-up', 'flip-vertical-down', 'flipping');
        flashcard.offsetHeight;
        flashcard.style.transition = '';
        flashcard.classList.add('flip-horizontal');
        this.state.isFlipped = false;
    }

    flipCard(direction) {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        flashcard.classList.remove('flip-horizontal', 'flip-vertical-up', 'flip-vertical-down');
        flashcard.classList.add('flipping');
        flashcard.offsetHeight;
        flashcard.classList.add(`flip-${direction}`);
        
        if (this.state.isFlipped) {
            flashcard.classList.remove('flipped');
            this.state.isFlipped = false;
        } else {
            flashcard.classList.add('flipped');
            this.state.isFlipped = true;
        }
        
        setTimeout(() => flashcard.classList.remove('flipping'), 600);
        this.state.flipDirection = direction;
    }

    navigateCard(direction) {
        const newIndex = this.state.currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.state.totalCards) {
            this.state.currentIndex = newIndex;
            this.state.currentCardId = this.state.cards[newIndex]?.id;
            this.state.isFlipped = false;
            this.renderCurrentCard();
            
            // Update cards studied
            this.state.modeData.basic.cardsStudied = Math.max(
                this.state.modeData.basic.cardsStudied, 
                newIndex + 1
            );
        }
    }

    toggleShuffle() {
        const currentCard = this.state.cards[this.state.currentIndex];
        
        if (this.state.isShuffled) {
            this.state.currentCardId = currentCard?.id;
            this.state.cards = [...this.state.originalCards];
            this.state.isShuffled = false;
            
            if (this.state.currentCardId) {
                const newIndex = this.state.cards.findIndex(card => card.id === this.state.currentCardId);
                this.state.currentIndex = newIndex !== -1 ? newIndex : 0;
            }
            
            this.showMessage('Shuffle turned off - cards restored to original order', 'info');
        } else {
            this.state.cards = this.shuffleArray([...this.state.cards]);
            this.state.isShuffled = true;
            this.state.currentIndex = 0;
            this.state.currentCardId = this.state.cards[0]?.id;
            
            this.showMessage('Shuffle turned on - cards are now randomized', 'info');
        }

        this.renderCurrentCard();
        this.updateShuffleButton();
    }

    toggleTermDef() {
        this.state.showDefinitionFirst = !this.state.showDefinitionFirst;
        
        this.showMessage(
            this.state.showDefinitionFirst ? 
            'Now showing definitions first' : 
            'Now showing terms first', 
            'info'
        );

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

    updateProgress() {
        const progress = this.state.currentIndex + 1;
        const total = this.state.totalCards;
        const percentage = (progress / total) * 100;

        const progressBar = document.getElementById('progressBar');
        const cardProgress = document.getElementById('cardProgress');

        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (cardProgress) cardProgress.textContent = `Card ${progress} of ${total}`;
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevCardBtn');
        const nextBtn = document.getElementById('nextCardBtn');

        if (prevBtn) prevBtn.disabled = this.state.currentIndex === 0;
        if (nextBtn) nextBtn.disabled = this.state.currentIndex === this.state.totalCards - 1;
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

    exitStudy() {
        document.removeEventListener('keydown', this.keyHandler);
        
        const studyView = document.getElementById('study-view');
        if (studyView) studyView.classList.add('hidden');
        
        this.state = this.createState();
        this.isActive = false;
        this.isPaused = false;
        
        if (document.getElementById('nav-library')) {
            document.getElementById('nav-library').click();
        }
    }

    showMessage(message, type = 'info') {
        if (window.showMessage) {
            window.showMessage(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialize the simplified study system
window.studyManager = new StudyManagerSimplified();

// Export global functions for compatibility
window.studyDeck = function(deckId) {
    window.studyManager.startDeckStudy(deckId);
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

console.log('✅ Study system loaded - Basic mode ready');