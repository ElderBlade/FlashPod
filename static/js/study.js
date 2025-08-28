// static/js/study.js - Fixed modular study system

class ModularStudyManager {
    constructor() {
        this.state = this.createState();
        this.isActive = false;
        this.isPaused = false;
        this.modes = {};
        this.currentMode = null;
        this.setupKeyboardHandler();
        
        // Initialize modes
        this.initializeModes();
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
                basic: { 
                    cardsStudied: 0, 
                    startTime: null 
                },
                'simple-spaced': {
                    stillLearning: [],
                    known: [],
                    currentRound: 1,
                    responses: new Map(),
                    isCollectingResponse: false,
                    sessionStartTime: null,
                    roundStartTime: null,
                    completedRounds: []
                }
            }
        };
    }

    async initializeModes() {
        try {
            // Initialize basic mode (built-in)
            this.modes['basic'] = {
                initialize: async (state) => {
                    state.modeData.basic.startTime = new Date();
                    console.log('Basic mode initialized');
                },
                renderCard: async () => {
                    this.renderCurrentCard();
                },
                onCardFlip: async (direction) => {
                    const modeData = this.state.modeData.basic;
                    if (this.state.isFlipped) {
                        modeData.cardsStudied = Math.max(modeData.cardsStudied, this.state.currentIndex + 1);
                    }
                },
                beforeNavigation: async () => true,
                onNavigation: async () => {
                    await this.modes['basic'].renderCard();
                },
                cleanup: async () => {},
                getStats: () => {
                    const modeData = this.state.modeData.basic;
                    return {
                        mode: 'basic',
                        cardsStudied: modeData.cardsStudied,
                        totalCards: this.state.totalCards
                    };
                }
            };

            // Load the proper modular simple-spaced mode
            const studyInterface = {
                updateModeSpecificUI: (modeName, modeData) => this.updateModeSpecificUI(),
                showResponseButtons: () => {
                    const responseButtons = document.getElementById('responseButtons');
                    if (responseButtons) responseButtons.classList.remove('hidden');
                },
                hideResponseButtons: () => {
                    const responseButtons = document.getElementById('responseButtons');
                    if (responseButtons) responseButtons.classList.add('hidden');
                },
                updateProgress: () => this.updateProgress(),
                updateNavigationButtons: () => this.updateNavigationButtons()
            };

            const mockStudyManager = {
                state: this.state,
                interface: studyInterface,
                session: { 
                    isActive: true, 
                    recordCardReview: (cardId, quality) => this.recordCardReview(cardId, quality) 
                },
                _showMessage: (msg, type) => this.showMessage(msg, type),
                showCompletionOverlay: () => this.showCompletionOverlay(),
                addCardFeedback: (type) => this.addCardFeedback(type),
                renderCurrentCard: () => this.renderCurrentCard()
            };

            const SimpleSpacedModule = await import('./study/modes/simple-spaced.js');
            this.modes['simple-spaced'] = new SimpleSpacedModule.SimpleSpaced(mockStudyManager);
            console.log('✅ SimpleSpaced mode loaded from module');

        } catch (error) {
            console.error('Failed to initialize modes:', error);
            this.showMessage('Failed to load study modes. Please refresh the page.', 'error');
        }
    }

    createSimpleSpacedMode() {
        return {
            initialize: async (state) => {
                const cardIds = state.cards.map(card => card.id);
                
                // If switching to simple spaced mode mid-session, preserve any existing progress
                if (!state.modeData['simple-spaced'].sessionStartTime) {
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
                }
                
                console.log('Simple spaced mode initialized');
            },
            renderCard: async () => {
                this.renderCurrentCard();
                this.updateModeSpecificUI();
            },
            onCardFlip: async (direction) => {
                const modeData = this.state.modeData['simple-spaced'];
                const currentCard = this.state.cards[this.state.currentIndex];
                
                // Show response buttons immediately when flipping to back (after flip is complete)
                if (this.state.isFlipped && currentCard && modeData.stillLearning.includes(currentCard.id)) {
                    setTimeout(() => {
                        modeData.isCollectingResponse = true;
                        const responseButtons = document.getElementById('responseButtons');
                        if (responseButtons) {
                            responseButtons.classList.remove('hidden');
                        }
                        this.updateModeSpecificUI();
                    }, 300); // Wait for flip animation to complete
                } else if (!this.state.isFlipped) {
                    // Hide response buttons when flipping back to front
                    modeData.isCollectingResponse = false;
                    const responseButtons = document.getElementById('responseButtons');
                    if (responseButtons) {
                        responseButtons.classList.add('hidden');
                    }
                }
            },
            handleResponse: async (responseType) => {
                const modeData = this.state.modeData['simple-spaced'];
                const currentCard = this.state.cards[this.state.currentIndex];
                
                if (!modeData.isCollectingResponse || !currentCard) return;
                
                const cardId = currentCard.id;
                
                // Record the response
                if (!modeData.responses.has(cardId)) {
                    modeData.responses.set(cardId, []);
                }
                modeData.responses.get(cardId).push({
                    response: responseType,
                    timestamp: new Date(),
                    round: modeData.currentRound
                });
                
                if (responseType === 'remember') {
                    const index = modeData.stillLearning.indexOf(cardId);
                    if (index > -1) {
                        modeData.stillLearning.splice(index, 1);
                        if (!modeData.known.includes(cardId)) {
                            modeData.known.push(cardId);
                        }
                    }
                    this.addCardFeedback('correct');
                    this.showMessage(`Card moved to "Known" pile! 🎉`, 'success');
                } else {
                    this.addCardFeedback('incorrect');
                    this.showMessage(`Card stays in "Still Learning" pile`, 'info');
                }
                
                // Record to backend
                this.recordCardReview(cardId, responseType === 'remember' ? 3 : 1);
                
                modeData.isCollectingResponse = false;
                const responseButtons = document.getElementById('responseButtons');
                if (responseButtons) {
                    responseButtons.classList.add('hidden');
                }
                
                this.updateModeSpecificUI();
                
                // Check for round completion after a short delay
                setTimeout(() => {
                    this.checkRoundCompletion();
                }, 1000);
            },
            beforeNavigation: async () => true,
            onNavigation: async () => {
                const modeData = this.state.modeData['simple-spaced'];
                modeData.isCollectingResponse = false;
                const responseButtons = document.getElementById('responseButtons');
                if (responseButtons) {
                    responseButtons.classList.add('hidden');
                }
                await this.modes['simple-spaced'].renderCard();
            },
            onShuffleChange: async () => {
                await this.modes['simple-spaced'].renderCard();
            },
            cleanup: async () => {},
            getStats: () => {
                const modeData = this.state.modeData['simple-spaced'];
                return {
                    mode: 'simple-spaced',
                    stillLearning: modeData.stillLearning.length,
                    known: modeData.known.length,
                    totalCards: this.state.totalCards,
                    currentRound: modeData.currentRound
                };
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
            
            // Start with basic mode
            this.currentMode = this.modes['basic'];
            if (this.currentMode && this.currentMode.initialize) {
                await this.currentMode.initialize(this.state);
            }

            this.showInterface();
            
            if (this.currentMode && this.currentMode.renderCard) {
                await this.currentMode.renderCard();
            } else {
                this.renderCurrentCard();
            }
            
            this.isActive = true;
            this.isPaused = false;
            
            // Add CSS for response feedback
            this.addResponseFeedbackCSS();

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
                
                <!-- Mode-specific indicator -->
                <div id="modeIndicator"></div>
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
                
                <!-- Response Buttons (for spaced repetition modes) -->
                <div id="responseButtons" class="hidden max-w-4xl mx-auto mt-6">
                    <div class="flex justify-center space-x-6">
                        <button id="dontRememberBtn" class="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                            Don't Remember
                            <kbd class="ml-3 px-2 py-1 text-xs bg-red-400 rounded">X</kbd>
                        </button>
                        <button id="rememberBtn" class="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Remember
                            <kbd class="ml-3 px-2 py-1 text-xs bg-green-400 rounded">C</kbd>
                        </button>
                    </div>
                </div>

                <div class="keyboard-hints" id="keyboardHints">
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
                
                <!-- Mode Toggle (centered left) -->
                <div id="modeToggle" class="flex items-center bg-gray-100 rounded-lg p-1">
                    <button id="basicModeBtn" class="mode-toggle-btn px-3 py-2 text-sm font-medium rounded transition-colors bg-blue-500 text-white shadow-sm">
                        Basic
                    </button>
                    <button id="simpleSpacedModeBtn" class="mode-toggle-btn px-3 py-2 text-sm font-medium rounded transition-colors text-gray-600 hover:text-gray-900">
                        Simple
                    </button>
                    <button id="fullSpacedModeBtn" class="mode-toggle-btn px-3 py-2 text-sm font-medium rounded transition-colors text-gray-600 hover:text-gray-900">
                        SM-2
                    </button>
                </div>

                <!-- Navigation buttons (centered) -->
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

                <!-- Right side controls -->
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
            case 'basicModeBtn':
                this.switchMode('basic');
                break;
            case 'simpleSpacedModeBtn':
                this.switchMode('simple-spaced');
                break;
            case 'fullSpacedModeBtn':
                this.showMessage('SM-2 mode coming soon!', 'info');
                break;
            case 'dontRememberBtn':
                this.handleResponse('dont-remember');
                break;
            case 'rememberBtn':
                this.handleResponse('remember');
                break;
        }
    }

    async switchMode(newMode) {
        if (newMode === this.state.mode) return;
        
        const previousMode = this.state.mode;
        this.state.mode = newMode;
        
        // Cleanup current mode
        if (this.currentMode && this.currentMode.cleanup) {
            await this.currentMode.cleanup();
        }
        
        // Switch to new mode
        this.currentMode = this.modes[newMode];
        if (this.currentMode && this.currentMode.initialize) {
            await this.currentMode.initialize(this.state);
        }
        
        // Update UI
        this.updateModeToggle();
        this.updateModeSpecificUI();
        
        // Re-render card
        if (this.currentMode && this.currentMode.renderCard) {
            await this.currentMode.renderCard();
        }
        
        const modeNames = {
            'basic': 'Basic Review',
            'simple-spaced': 'Simple Spaced Repetition'
        };
        
        this.showMessage(`Switched to ${modeNames[newMode]} mode`, 'info');
        console.log(`Mode switched from ${previousMode} to ${newMode}`);
    }

    async handleResponse(responseType) {
        if (!this.currentMode || !this.currentMode.handleResponse) return;
        await this.currentMode.handleResponse(responseType);
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
                case 'x':
                case 'X':
                    if (this.state.mode === 'simple-spaced' && this.state.modeData['simple-spaced'].isCollectingResponse) {
                        e.preventDefault();
                        this.handleResponse('dont-remember');
                    }
                    break;
                case 'c':
                case 'C':
                    if (this.state.mode === 'simple-spaced' && this.state.modeData['simple-spaced'].isCollectingResponse) {
                        e.preventDefault();
                        this.handleResponse('remember');
                    }
                    break;
                case '1':
                    e.preventDefault();
                    this.switchMode('basic');
                    break;
                case '2':
                    e.preventDefault();
                    this.switchMode('simple-spaced');
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
        
        // Reset response collection state
        if (this.state.mode === 'simple-spaced') {
            this.state.modeData['simple-spaced'].isCollectingResponse = false;
            const responseButtons = document.getElementById('responseButtons');
            if (responseButtons) {
                responseButtons.classList.add('hidden');
            }
        }
    }

    async flipCard(direction) {
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
        
        this.state.flipDirection = direction;
        
        // Let current mode handle flip logic AFTER state is updated
        if (this.currentMode && this.currentMode.onCardFlip) {
            await this.currentMode.onCardFlip(direction);
        }
        
        setTimeout(() => flashcard.classList.remove('flipping'), 600);
    }

    async navigateCard(direction) {
        const newIndex = this.state.currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.state.totalCards) {
            // Let current mode handle pre-navigation logic
            if (this.currentMode && this.currentMode.beforeNavigation) {
                const canNavigate = await this.currentMode.beforeNavigation(direction);
                if (!canNavigate) return;
            }
            
            this.state.currentIndex = newIndex;
            this.state.currentCardId = this.state.cards[newIndex]?.id;
            this.state.isFlipped = false;
            
            // Let mode handle navigation
            if (this.currentMode && this.currentMode.onNavigation) {
                await this.currentMode.onNavigation();
            } else {
                this.renderCurrentCard();
            }
        }
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

    updateModeToggle() {
        const buttons = {
            'basic': document.getElementById('basicModeBtn'),
            'simple-spaced': document.getElementById('simpleSpacedModeBtn'),
            'full-spaced': document.getElementById('fullSpacedModeBtn')
        };

        // Reset all buttons
        Object.values(buttons).forEach(btn => {
            if (btn) {
                btn.classList.remove('bg-blue-500', 'text-white', 'shadow-sm');
                btn.classList.add('text-gray-600', 'hover:text-gray-900');
            }
        });

        // Highlight active button
        const activeBtn = buttons[this.state.mode];
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-600', 'hover:text-gray-900');
            activeBtn.classList.add('bg-blue-500', 'text-white', 'shadow-sm');
        }
    }

    updateModeSpecificUI() {
        const modeIndicator = document.getElementById('modeIndicator');
        const keyboardHints = document.getElementById('keyboardHints');
        
        switch (this.state.mode) {
            case 'basic':
                if (modeIndicator) modeIndicator.innerHTML = '';
                if (keyboardHints) {
                    keyboardHints.innerHTML = `
                        <kbd>Space</kbd> flip horizontal • 
                        <kbd>↑</kbd> flip up • 
                        <kbd>↓</kbd> flip down • 
                        <kbd>←</kbd> previous • 
                        <kbd>→</kbd> next • 
                        <kbd>T</kbd> term/definition • 
                        <kbd>S</kbd> shuffle
                    `;
                }
                break;
                
            case 'simple-spaced':
                const modeData = this.state.modeData['simple-spaced'];
                if (modeIndicator) {
                    modeIndicator.innerHTML = `
                        <div class="flex items-center space-x-4 text-sm text-gray-600">
                            <span class="bg-orange-100 text-orange-700 px-3 py-1 rounded-full flex items-center">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Still Learning: ${modeData.stillLearning.length}
                            </span>
                            <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Known: ${modeData.known.length}
                            </span>
                            <span class="text-gray-500">Round ${modeData.currentRound}</span>
                        </div>
                    `;
                }
                
                if (keyboardHints) {
                    keyboardHints.innerHTML = `
                        <kbd>Space</kbd> flip horizontal • 
                        <kbd>X</kbd> don't remember • 
                        <kbd>C</kbd> remember • 
                        <kbd>S</kbd> shuffle • 
                        <kbd>T</kbd> term/definition
                    `;
                }
                break;
        }
    }

    async toggleShuffle() {
        const currentCard = this.state.cards[this.state.currentIndex];
        
        if (this.state.isShuffled) {
            // Turn off shuffle - restore order based on current mode
            this.state.currentCardId = currentCard?.id;
            
            if (this.state.mode === 'simple-spaced') {
                // In simple spaced mode, restore order of current round's cards
                const modeData = this.state.modeData['simple-spaced'];
                if (modeData.currentRound > 1) {
                    // If in a later round, restore order of still learning cards only
                    this.state.cards = this.state.originalCards.filter(card => 
                        modeData.stillLearning.includes(card.id)
                    );
                } else {
                    // If in round 1, restore original order
                    this.state.cards = [...this.state.originalCards];
                }
            } else {
                // In basic mode, restore original order
                this.state.cards = [...this.state.originalCards];
            }
            
            this.state.isShuffled = false;
            
            if (this.state.currentCardId) {
                const newIndex = this.state.cards.findIndex(card => card.id === this.state.currentCardId);
                this.state.currentIndex = newIndex !== -1 ? newIndex : 0;
            }
            
            this.showMessage('Shuffle turned off - cards restored to original order', 'info');
        } else {
            // Turn on shuffle
            this.state.cards = this.shuffleArray([...this.state.cards]);
            this.state.isShuffled = true;
            this.state.currentIndex = 0;
            this.state.currentCardId = this.state.cards[0]?.id;
            
            this.showMessage('Shuffle turned on - cards are now randomized', 'info');
        }

        // Let current mode handle shuffle change
        if (this.currentMode && this.currentMode.onShuffleChange) {
            await this.currentMode.onShuffleChange();
        } else {
            this.renderCurrentCard();
        }

        this.updateShuffleButton();
    }

    async toggleTermDef() {
        this.state.showDefinitionFirst = !this.state.showDefinitionFirst;
        
        this.showMessage(
            this.state.showDefinitionFirst ? 
            'Now showing definitions first' : 
            'Now showing terms first', 
            'info'
        );

        this.updateTermDefButton();
        
        if (this.currentMode && this.currentMode.renderCard) {
            await this.currentMode.renderCard();
        } else {
            this.renderCurrentCard();
        }
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

    addCardFeedback(type) {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        flashcard.classList.remove('response-correct', 'response-incorrect');
        
        if (type === 'correct') {
            flashcard.classList.add('response-correct');
        } else {
            flashcard.classList.add('response-incorrect');
        }
        
        setTimeout(() => {
            flashcard.classList.remove('response-correct', 'response-incorrect');
        }, 1000);
    }

    async recordCardReview(cardId, responseQuality) {
        try {
            const reviewData = {
                card_id: cardId,
                response_quality: responseQuality,
                response_time: null
            };

            const response = await fetch(`${window.API_BASE}/study/card-review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(reviewData)
            });

            if (response.ok) {
                console.log(`Recorded review for card ${cardId}: quality=${responseQuality}`);
            }
        } catch (error) {
            console.warn('Failed to record card review:', error);
        }
    }

    showCompletionOverlay() {
        const modeData = this.state.modeData['simple-spaced'];
        const totalTime = Math.round((new Date() - new Date(modeData.sessionStartTime)) / 1000 / 60);
        
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        overlay.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="text-xl font-semibold text-gray-900 mb-4">Session Complete!</h3>
                <div class="text-gray-600 text-sm mb-6">
                    Congratulations! You've mastered all ${this.state.totalCards} cards!
                    <br><br>
                    📊 Session Summary:<br>
                    • Rounds completed: ${modeData.currentRound}<br>
                    • Total time: ${totalTime} minutes<br>
                    • Cards mastered: ${modeData.known.length}
                    <br><br>
                    All cards are now in your "Known" pile! 🧠✨
                </div>
                <div class="flex space-x-3">
                    <button id="studyAgainBtn" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Study Again
                    </button>
                    <button id="finishSessionBtn" class="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                        Finish
                    </button>
                </div>
            </div>
        `;

        overlay.querySelector('#studyAgainBtn').addEventListener('click', async () => {
            overlay.remove();
            // Reset and restart
            await this.currentMode.initialize(this.state);
            this.state.currentIndex = 0;
            this.state.isFlipped = false;
            await this.currentMode.renderCard();
        });

        overlay.querySelector('#finishSessionBtn').addEventListener('click', () => {
            overlay.remove();
            this.exitStudy();
        });

        document.body.appendChild(overlay);
    }

    checkRoundCompletion() {
        // This method is called by the fallback, but now we delegate to the proper mode
        if (this.currentMode && this.currentMode._checkRoundCompletion) {
            this.currentMode._checkRoundCompletion();
        }
    }

    startNextRound() {
        // This method is called by the fallback, but now we delegate to the proper mode  
        if (this.currentMode && this.currentMode._startNextRound) {
            this.currentMode._startNextRound();
        }
    }

    exitStudy() {
        document.removeEventListener('keydown', this.keyHandler);
        
        const studyView = document.getElementById('study-view');
        if (studyView) studyView.classList.add('hidden');
        
        this.state = this.createState();
        this.isActive = false;
        this.isPaused = false;
        this.currentMode = null;
        
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

    addResponseFeedbackCSS() {
        // Check if CSS is already added
        if (document.getElementById('response-feedback-css')) return;
        
        const style = document.createElement('style');
        style.id = 'response-feedback-css';
        style.textContent = `
            .flashcard.response-correct {
                box-shadow: 0 0 20px rgba(34, 197, 94, 0.5) !important;
                border: 2px solid #22c55e !important;
            }
            
            .flashcard.response-incorrect {
                box-shadow: 0 0 20px rgba(239, 68, 68, 0.5) !important;
                border: 2px solid #ef4444 !important;
            }
            
            .mode-toggle-btn {
                transition: all 0.2s ease-in-out;
            }
            
            .mode-toggle-btn:hover {
                transform: translateY(-1px);
            }
            
            #responseButtons {
                animation: slideUp 0.3s ease-out;
            }
            
            #responseButtons.hidden {
                animation: slideDown 0.3s ease-in;
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes slideDown {
                from {
                    opacity: 1;
                    transform: translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateY(20px);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Initialize the modular study system
window.studyManager = new ModularStudyManager();

// Export global functions for compatibility
window.studyDeck = function(deckId) {
    window.studyManager.startDeckStudy(deckId);
};

window.studyPod = function(podId) {
    console.log('Pod study not yet implemented');
};

// Add global message function if not exists
if (!window.showMessage) {
    window.showMessage = function(message, type = 'info') {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) {
            console.log(`${type.toUpperCase()}: ${message}`);
            return;
        }
        
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

console.log('✅ Modular Study System loaded - Mode 1 (Basic) and Mode 2 (Simple Spaced) ready');// static/js/study.js - Refactored entry point for modular study system

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
                basic: { 
                    cardsStudied: 0, 
                    startTime: null 
                },
                'simple-spaced': {
                    stillLearning: [],      // Array of card IDs
                    known: [],              // Array of card IDs  
                    currentRound: 1,
                    responses: new Map(),   // cardId -> [response1, response2, ...]
                    isCollectingResponse: false,
                    sessionStartTime: null,
                    roundStartTime: null,
                    completedRounds: []     // Track round completion history
                }
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
            
            // Start with basic mode
            this.currentMode = this.modes['basic'];
            if (this.currentMode && this.currentMode.initialize) {
                await this.currentMode.initialize(this.state);
            }

            this.showInterface();
            
            if (this.currentMode && this.currentMode.renderCard) {
                await this.currentMode.renderCard();
            } else {
                this.renderCurrentCard();
            }
            
            this.isActive = true;
            this.isPaused = false;
            
            // Add CSS for response feedback
            this.addResponseFeedbackCSS();SimpleSpacedMode();

            this.showInterface();
            this.renderCurrentCard();
            this.isActive = true;
            this.isPaused = false;
            
            // Add CSS for response feedback if not already added
            this.addResponseFeedbackCSS();

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
                    
                    <!-- Mode-specific indicator -->
                    <div id="modeIndicator"></div>
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
                
                <!-- Response Buttons (for spaced repetition modes) -->
                <div id="responseButtons" class="hidden max-w-4xl mx-auto mt-6">
                    <div class="flex justify-center space-x-6">
                        <button id="dontRememberBtn" class="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                            Don't Remember
                            <kbd class="ml-3 px-2 py-1 text-xs bg-red-400 rounded">X</kbd>
                        </button>
                        <button id="rememberBtn" class="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Remember
                            <kbd class="ml-3 px-2 py-1 text-xs bg-green-400 rounded">C</kbd>
                        </button>
                    </div>
                </div>

                <div class="keyboard-hints" id="keyboardHints">
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
                
                <!-- Mode Toggle (centered left) -->
                <div id="modeToggle" class="flex items-center bg-gray-100 rounded-lg p-1">
                    <button id="basicModeBtn" class="mode-toggle-btn px-3 py-2 text-sm font-medium rounded transition-colors bg-blue-500 text-white shadow-sm">
                        Basic
                    </button>
                    <button id="simpleSpacedModeBtn" class="mode-toggle-btn px-3 py-2 text-sm font-medium rounded transition-colors text-gray-600 hover:text-gray-900">
                        Simple
                    </button>
                    <button id="fullSpacedModeBtn" class="mode-toggle-btn px-3 py-2 text-sm font-medium rounded transition-colors text-gray-600 hover:text-gray-900">
                        SM-2
                    </button>
                </div>

                <!-- Navigation buttons (centered) -->
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
            case 'basicModeBtn':
                this.switchMode('basic');
                break;
            case 'simpleSpacedModeBtn':
                this.switchMode('simple-spaced');
                break;
            case 'fullSpacedModeBtn':
                this.showMessage('SM-2 mode coming soon!', 'info');
                break;
            case 'dontRememberBtn':
                this.handleResponse('dont-remember');
                break;
            case 'rememberBtn':
                this.handleResponse('remember');
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
                case 'x':
                case 'X':
                    if (this.state.mode === 'simple-spaced' && this.state.modeData['simple-spaced'].isCollectingResponse) {
                        e.preventDefault();
                        this.handleResponse('dont-remember');
                    }
                    break;
                case 'c':
                case 'C':
                    if (this.state.mode === 'simple-spaced' && this.state.modeData['simple-spaced'].isCollectingResponse) {
                        e.preventDefault();
                        this.handleResponse('remember');
                    }
                    break;
                case '1':
                    e.preventDefault();
                    this.switchMode('basic');
                    break;
                case '2':
                    e.preventDefault();
                    this.switchMode('simple-spaced');
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

    // Mode 2: Simple Spaced Repetition Methods
    initializeSimpleSpacedMode() {
        const cardIds = this.state.cards.map(card => card.id);
        this.state.modeData['simple-spaced'] = {
            stillLearning: [...cardIds],  // All cards start in "still learning"
            known: [],                    // No cards known yet
            currentRound: 1,
            responses: new Map(),
            isCollectingResponse: false,
            sessionStartTime: new Date(),
            roundStartTime: new Date(),
            completedRounds: []
        };
    }

    async switchMode(newMode) {
        if (newMode === this.state.mode) return;
        
        const previousMode = this.state.mode;
        this.state.mode = newMode;
        
        // Cleanup current mode
        if (this.currentMode && this.currentMode.cleanup) {
            await this.currentMode.cleanup();
        }
        
        // Switch to new mode
        this.currentMode = this.modes[newMode];
        if (this.currentMode && this.currentMode.initialize) {
            await this.currentMode.initialize(this.state);
        }
        
        // Update UI
        this.updateModeToggle();
        this.updateModeSpecificUI();
        
        // Re-render card
        if (this.currentMode && this.currentMode.renderCard) {
            await this.currentMode.renderCard();
        }
        
        const modeNames = {
            'basic': 'Basic Review',
            'simple-spaced': 'Simple Spaced Repetition'
        };
        
        this.showMessage(`Switched to ${modeNames[newMode]} mode`, 'info');
        console.log(`Mode switched from ${previousMode} to ${newMode}`);
    }

    async handleResponse(responseType) {
        if (!this.currentMode || !this.currentMode.handleResponse) return;
        await this.currentMode.handleResponse(responseType);
    }

    updateModeToggle() {
        const buttons = {
            'basic': document.getElementById('basicModeBtn'),
            'simple-spaced': document.getElementById('simpleSpacedModeBtn'),
            'full-spaced': document.getElementById('fullSpacedModeBtn')
        };

        // Reset all buttons
        Object.values(buttons).forEach(btn => {
            if (btn) {
                btn.classList.remove('bg-blue-500', 'text-white', 'shadow-sm');
                btn.classList.add('text-gray-600', 'hover:text-gray-900');
            }
        });

        // Highlight active button
        const activeBtn = buttons[this.state.mode];
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-600', 'hover:text-gray-900');
            activeBtn.classList.add('bg-blue-500', 'text-white', 'shadow-sm');
        }
    }

    updateModeSpecificUI() {
        const modeIndicator = document.getElementById('modeIndicator');
        const responseButtons = document.getElementById('responseButtons');
        const keyboardHints = document.getElementById('keyboardHints');
        
        switch (this.state.mode) {
            case 'basic':
                if (modeIndicator) modeIndicator.innerHTML = '';
                if (responseButtons) responseButtons.classList.add('hidden');
                if (keyboardHints) {
                    keyboardHints.innerHTML = `
                        <kbd>Space</kbd> flip horizontal • 
                        <kbd>↑</kbd> flip up • 
                        <kbd>↓</kbd> flip down • 
                        <kbd>←</kbd> previous • 
                        <kbd>→</kbd> next • 
                        <kbd>T</kbd> term/definition • 
                        <kbd>S</kbd> shuffle
                    `;
                }
                break;
                
            case 'simple-spaced':
                const modeData = this.state.modeData['simple-spaced'];
                if (modeIndicator) {
                    modeIndicator.innerHTML = `
                        <div class="flex items-center space-x-4 text-sm text-gray-600">
                            <span class="bg-orange-100 text-orange-700 px-3 py-1 rounded-full flex items-center">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Still Learning: ${modeData.stillLearning.length}
                            </span>
                            <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                Known: ${modeData.known.length}
                            </span>
                            <span class="text-gray-500">Round ${modeData.currentRound}</span>
                        </div>
                    `;
                }
                
                // Show response buttons only when collecting response
                if (responseButtons && modeData.isCollectingResponse) {
                    responseButtons.classList.remove('hidden');
                } else if (responseButtons) {
                    responseButtons.classList.add('hidden');
                }
                
                if (keyboardHints) {
                    keyboardHints.innerHTML = `
                        <kbd>Space</kbd> flip horizontal • 
                        <kbd>X</kbd> don't remember • 
                        <kbd>C</kbd> remember • 
                        <kbd>S</kbd> shuffle • 
                        <kbd>T</kbd> term/definition
                    `;
                }
                break;
        }
    }

    handleResponse(responseType) {
        if (this.state.mode !== 'simple-spaced') return;
        
        const modeData = this.state.modeData['simple-spaced'];
        if (!modeData.isCollectingResponse) return;
        
        const currentCard = this.state.cards[this.state.currentIndex];
        if (!currentCard) return;
        
        // Record the response
        const cardId = currentCard.id;
        if (!modeData.responses.has(cardId)) {
            modeData.responses.set(cardId, []);
        }
        modeData.responses.get(cardId).push({
            response: responseType,
            timestamp: new Date(),
            round: modeData.currentRound
        });
        
        // Move card between buckets
        if (responseType === 'remember') {
            // Move from still learning to known
            const stillLearningIndex = modeData.stillLearning.indexOf(cardId);
            if (stillLearningIndex > -1) {
                modeData.stillLearning.splice(stillLearningIndex, 1);
                modeData.known.push(cardId);
                
                // Visual feedback
                this.addCardFeedback('correct');
                this.showMessage(`Card moved to "Known" pile! 🎉`, 'success');
            }
        } else {
            // Keep in still learning (or move back if it was in known)
            const knownIndex = modeData.known.indexOf(cardId);
            if (knownIndex > -1) {
                modeData.known.splice(knownIndex, 1);
                modeData.stillLearning.push(cardId);
                this.showMessage(`Card moved back to "Still Learning" pile`, 'info');
            }
            
            // Visual feedback
            this.addCardFeedback('incorrect');
        }
        
        // Record to backend immediately
        this.recordCardReview(cardId, responseType === 'remember' ? 3 : 1);
        
        // Hide response buttons
        modeData.isCollectingResponse = false;
        const responseButtons = document.getElementById('responseButtons');
        if (responseButtons) {
            responseButtons.classList.add('hidden');
        }
        
        // Check if round is complete
        setTimeout(() => {
            this.checkRoundCompletion();
        }, 1000);
        
        // Update UI
        this.updateModeSpecificUI();
    }

    checkRoundCompletion() {
        if (this.state.mode !== 'simple-spaced') return;
        
        const modeData = this.state.modeData['simple-spaced'];
        
        // Check if we've reviewed all cards in still learning for this round
        const stillLearningCards = this.state.cards.filter(card => 
            modeData.stillLearning.includes(card.id)
        );
        
        const currentRoundResponses = Array.from(modeData.responses.values())
            .flat()
            .filter(response => response.round === modeData.currentRound);
            
        const cardsReviewedThisRound = new Set(
            currentRoundResponses.map(response => 
                Array.from(modeData.responses.keys()).find(cardId =>
                    modeData.responses.get(cardId).some(r => r === response)
                )
            )
        );
        
        // If all still learning cards have been reviewed this round
        if (stillLearningCards.length > 0 && 
            stillLearningCards.every(card => cardsReviewedThisRound.has(card.id))) {
            
            if (modeData.stillLearning.length === 0) {
                // All cards are known - session complete!
                this.completeSimpleSpacedSession();
            } else {
                // Start next round
                this.startNextRound();
            }
        }
    }

    startNextRound() {
        const modeData = this.state.modeData['simple-spaced'];
        
        // Save current round info
        modeData.completedRounds.push({
            round: modeData.currentRound,
            completedAt: new Date(),
            cardsLearned: modeData.known.length,
            cardsRemaining: modeData.stillLearning.length
        });
        
        // Start next round
        modeData.currentRound++;
        modeData.roundStartTime = new Date();
        
        // Reset to first card of still learning cards
        const stillLearningCards = this.state.cards.filter(card => 
            modeData.stillLearning.includes(card.id)
        );
        
        if (stillLearningCards.length > 0) {
            const firstStillLearningIndex = this.state.cards.findIndex(card => 
                card.id === stillLearningCards[0].id
            );
            if (firstStillLearningIndex !== -1) {
                this.state.currentIndex = firstStillLearningIndex;
                this.renderCurrentCard();
            }
        }
        
        this.showMessage(`Round ${modeData.currentRound} started! ${modeData.stillLearning.length} cards still learning.`, 'info');
        this.updateModeSpecificUI();
    }

    completeSimpleSpacedSession() {
        const modeData = this.state.modeData['simple-spaced'];
        const totalTime = Math.round((new Date() - new Date(modeData.sessionStartTime)) / 1000 / 60);
        
        // Show completion message
        const completionMessage = `
            🎉 Congratulations! You've mastered all ${this.state.totalCards} cards!
            
            📊 Session Summary:
            • Rounds completed: ${modeData.currentRound}
            • Total time: ${totalTime} minutes
            • Cards mastered: ${modeData.known.length}
            
            All cards are now in your "Known" pile! 🧠✨
        `;
        
        // Create completion overlay
        this.showCompletionOverlay(completionMessage);
    }

    showCompletionOverlay(message) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        overlay.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="text-xl font-semibold text-gray-900 mb-4">Session Complete!</h3>
                <div class="text-gray-600 whitespace-pre-line text-sm mb-6">${message}</div>
                <div class="flex space-x-3">
                    <button id="studyAgainBtn" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Study Again
                    </button>
                    <button id="finishSessionBtn" class="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                        Finish
                    </button>
                </div>
            </div>
        `;

        overlay.querySelector('#studyAgainBtn').addEventListener('click', () => {
            overlay.remove();
            // Reset simple spaced mode for new session
            this.initializeSimpleSpacedMode();
            this.state.currentIndex = 0;
            this.renderCurrentCard();
            this.updateModeSpecificUI();
        });

        overlay.querySelector('#finishSessionBtn').addEventListener('click', () => {
            overlay.remove();
            this.exitStudy();
        });

        document.body.appendChild(overlay);
    }

    addCardFeedback(type) {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;
        
        flashcard.classList.remove('response-correct', 'response-incorrect');
        
        if (type === 'correct') {
            flashcard.classList.add('response-correct');
        } else {
            flashcard.classList.add('response-incorrect');
        }
        
        setTimeout(() => {
            flashcard.classList.remove('response-correct', 'response-incorrect');
        }, 1000);
    }

    async recordCardReview(cardId, responseQuality) {
        try {
            const reviewData = {
                card_id: cardId,
                response_quality: responseQuality,
                response_time: null  // Could add timing later
            };

            const response = await fetch(`${window.API_BASE}/study/card-review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(reviewData)
            });

            if (response.ok) {
                console.log(`Recorded review for card ${cardId}: quality=${responseQuality}`);
            }
        } catch (error) {
            console.warn('Failed to record card review:', error);
        }
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
        
        // Reset response collection state
        if (this.state.mode === 'simple-spaced') {
            this.state.modeData['simple-spaced'].isCollectingResponse = false;
            const responseButtons = document.getElementById('responseButtons');
            if (responseButtons) {
                responseButtons.classList.add('hidden');
            }
        }
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

    async flipCard(direction) {
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) return;

        // Let current mode handle pre-flip logic
        if (this.currentMode && this.currentMode.onCardFlip) {
            await this.currentMode.onCardFlip(direction);
        }
        
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
        
        this.state.flipDirection = direction;
        
        // Let current mode handle flip logic AFTER state is updated
        if (this.currentMode && this.currentMode.onCardFlip) {
            await this.currentMode.onCardFlip(direction);
        }
        
        setTimeout(() => flashcard.classList.remove('flipping'), 600);
    }

    async navigateCard(direction) {
        const newIndex = this.state.currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.state.totalCards) {
            // Let current mode handle pre-navigation logic
            if (this.currentMode && this.currentMode.beforeNavigation) {
                const canNavigate = await this.currentMode.beforeNavigation(direction);
                if (!canNavigate) return;
            }
            
            this.state.currentIndex = newIndex;
            this.state.currentCardId = this.state.cards[newIndex]?.id;
            this.state.isFlipped = false;
            
            // Let mode handle navigation
            if (this.currentMode && this.currentMode.onNavigation) {
                await this.currentMode.onNavigation();
            } else {
                this.renderCurrentCard();
            }
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

    addResponseFeedbackCSS() {
        // Check if CSS is already added
        if (document.getElementById('response-feedback-css')) return;
        
        const style = document.createElement('style');
        style.id = 'response-feedback-css';
        style.textContent = `
            .flashcard.response-correct {
                box-shadow: 0 0 20px rgba(34, 197, 94, 0.5) !important;
                border: 2px solid #22c55e !important;
            }
            
            .flashcard.response-incorrect {
                box-shadow: 0 0 20px rgba(239, 68, 68, 0.5) !important;
                border: 2px solid #ef4444 !important;
            }
            
            .mode-toggle-btn {
                transition: all 0.2s ease-in-out;
            }
            
            .mode-toggle-btn:hover {
                transform: translateY(-1px);
            }
            
            #responseButtons {
                animation: slideUp 0.3s ease-out;
            }
            
            #responseButtons.hidden {
                animation: slideDown 0.3s ease-in;
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes slideDown {
                from {
                    opacity: 1;
                    transform: translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateY(20px);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Initialize the modular study system
window.studyManager = new ModularStudyManager();

// Export global functions for compatibility
window.studyDeck = function(deckId) {
    window.studyManager.startDeckStudy(deckId);
};

window.studyPod = function(podId) {
    window.studyManager.startPodStudy(podId);
};

console.log('✅ Modular Study System loaded - Mode 1 (Basic) and Mode 2 (Simple Spaced) ready');

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