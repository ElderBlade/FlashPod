// static/js/study/ui/study-interface.js
import { Flashcard } from './flashcard.js';
import { Navigation } from './navigation.js';
import { ModeToggle } from './mode-toggle.js';

/**
 * Main study interface that coordinates all UI components
 * Provides a consistent interface across all study modes
 */
export class StudyInterface {
    constructor(studyManager) {
        this.manager = studyManager;
        this.flashcard = new Flashcard(this);
        this.navigation = new Navigation(this);
        this.modeToggle = new ModeToggle(this);
        
        this.studyView = null;
        this.isVisible = false;
    }

    /**
     * Show the study interface
     */
    show() {
        if (!this.studyView) {
            this.studyView = this._createStudyView();
            document.querySelector('main').appendChild(this.studyView);
        }

        // Update page headers
        this._updatePageHeaders();
        
        // Show study view
        document.querySelectorAll('.page-view').forEach(view => view.classList.add('hidden'));
        this.studyView.classList.remove('hidden');
        
        // Update navigation to show flashcards as active
        this._updateNavigation();
        
        // Update keyboard hints for current mode
        this.modeToggle.updateKeyboardHints();
        
        this.isVisible = true;
    }

    /**
     * Hide the study interface
     */
    hide() {
        if (this.studyView) {
            this.studyView.classList.add('hidden');
        }
        this.isVisible = false;
    }

    /**
     * Update interface for mode change
     */
    updateModeToggle(modeName) {
        this.modeToggle.setActiveMode(modeName);
        this.modeToggle.updateKeyboardHints();
    }

    /**
     * Update mode-specific UI elements
     */
    updateModeSpecificUI(modeName, modeData) {
        const modeIndicator = document.getElementById('modeIndicator');
        const responseButtons = document.getElementById('responseButtons');
        
        // Declare button elements once at function scope
        const simpleButtons = document.getElementById('simpleSpacedButtons');
        const sm2Buttons = document.getElementById('sm2Buttons');
        
        switch (modeName) {
            case 'basic':
                if (modeIndicator) modeIndicator.innerHTML = '';
                if (responseButtons) responseButtons.classList.add('hidden');
                // Hide both button sets
                if (simpleButtons) simpleButtons.classList.add('hidden');
                if (sm2Buttons) sm2Buttons.classList.add('hidden');
                break;
                
            case 'simple-spaced':
                if (modeIndicator) {
                    modeIndicator.innerHTML = `
                        <div class="flex items-center space-x-4 text-sm text-gray-600">
                            <span class="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                Learning: ${modeData.stillLearning.length}
                            </span>
                            <span class="bg-green-100 text-green-700 px-2 py-1 rounded">
                                Known: ${modeData.known.length}
                            </span>
                            <span class="text-gray-500">Round ${modeData.currentRound}</span>
                        </div>
                    `;
                }
                
                // Always hide SM-2 buttons for simple mode
                if (sm2Buttons) sm2Buttons.classList.add('hidden');
                
                if (responseButtons && simpleButtons) {
                    if (modeData.isCollectingResponse) {
                        responseButtons.classList.remove('hidden');
                        simpleButtons.classList.remove('hidden');
                    } else {
                        responseButtons.classList.add('hidden');
                        simpleButtons.classList.add('hidden');
                    }
                }
                break;
                
            case 'full-spaced':
                if (modeIndicator) {
                    modeIndicator.innerHTML = `
                        <div class="flex items-center space-x-3 text-sm text-gray-600">
                            <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                Due: ${modeData.dueCards?.length || 0}
                            </span>
                            <span class="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                Learning: ${modeData.learningCards?.length || 0}
                            </span>
                            <span class="bg-green-100 text-green-700 px-2 py-1 rounded">
                                Mature: ${modeData.matureCards?.length || 0}
                            </span>
                        </div>
                    `;
                }
                
                // ALWAYS hide simple buttons for SM-2 mode
                if (simpleButtons) simpleButtons.classList.add('hidden');
                
                // Show/hide response buttons and SM-2 buttons based on collection state
                if (modeData.isCollectingResponse) {
                    responseButtons.classList.remove('hidden');
                    sm2Buttons.classList.remove('hidden');
                } else {
                    // responseButtons.classList.add('hidden'); 
                    sm2Buttons.classList.add('hidden');
                }
                break;
        }
    }

    /**
     * Show response buttons for spaced repetition modes
     */
    showResponseButtons() {
        const responseButtons = document.getElementById('responseButtons');
        if (responseButtons) {
            responseButtons.classList.remove('hidden');
        }
    }

    /**
     * Hide response buttons
     */
    hideResponseButtons() {
        const responseButtons = document.getElementById('responseButtons');
        if (responseButtons) {
            responseButtons.classList.add('hidden');
        }
    }

    /**
    * Update progress display
     */
    updateProgress() {
        const state = this.manager.state;
        
        // Handle SM-2 mode differently - show cards reviewed vs total session cards
        if (state.mode === 'full-spaced') {
            const modeData = state.modeData['full-spaced'];
            const cardsReviewed = modeData.sessionStats.cardsReviewed;
            const totalSessionCards = modeData.originalSessionSize || state.originalCards.length;
            const percentage = totalSessionCards > 0 ? (cardsReviewed / totalSessionCards) * 100 : 0;

            const progressBar = document.getElementById('progressBar');
            const cardProgress = document.getElementById('cardProgress');

            if (progressBar) {
                progressBar.style.width = `${percentage}%`;
            }
            
            if (cardProgress) {
                cardProgress.textContent = `${cardsReviewed} reviewed of ${totalSessionCards} due`;
            }
        } else {
            // Original logic for basic and simple-spaced modes
            const progress = state.currentIndex + 1;
            const total = state.totalCards;
            const percentage = (progress / total) * 100;

            const progressBar = document.getElementById('progressBar');
            const cardProgress = document.getElementById('cardProgress');

            if (progressBar) {
                progressBar.style.width = `${percentage}%`;
            }
            
            if (cardProgress) {
                cardProgress.textContent = `Card ${progress} of ${total}`;
            }
        }
    }

    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        const state = this.manager.state;
        const prevBtn = document.getElementById('prevCardBtn');
        const nextBtn = document.getElementById('nextCardBtn');

        // In SM-2 mode, always disable navigation buttons
        if (state.mode === 'full-spaced') {
            if (prevBtn) {
                prevBtn.disabled = true;
                prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            if (nextBtn) {
                nextBtn.disabled = true;
                nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            return;
        }

        // For other modes, use normal logic
        if (prevBtn) {
            const shouldDisable = state.currentIndex === 0;
            prevBtn.disabled = shouldDisable;
            
            if (shouldDisable) {
                prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
        
        if (nextBtn) {
            const shouldDisable = state.currentIndex === state.totalCards - 1;
            nextBtn.disabled = shouldDisable;
            
            if (shouldDisable) {
                nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    }

    /**
     * Update shuffle button visual state
     */
    updateShuffleButton() {
        const shuffleBtns = [
            document.getElementById('shuffleBtn'),
            document.getElementById('shuffleBtnDesktop')
        ];
        shuffleBtns.forEach(shuffleBtn => {
            if (!shuffleBtn) return;
            
            if (this.manager.state.isShuffled) {
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
        });
    }

    /**
     * Update term/definition button visual state
     */
    updateTermDefButton() {
        const termDefBtns = [
            document.getElementById('termDefBtn'),
            document.getElementById('termDefBtnDesktop')
        ];
        
        const termDefIcons = [
            document.querySelector('#termDefBtn span'),
            document.querySelector('#termDefBtnDesktop span') // Desktop version
        ];

        termDefBtns.forEach((termDefBtn, index) => {
            const termDefIcon = termDefIcons[index];
            
            if (this.manager.state.showDefinitionFirst) {
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
        });
    }

    /**
     * Flip the flashcard with animation
     */
    flipCard(direction) {
        this.flashcard.flip(direction);
    }

    /**
     * Render the current card content
     */
    renderCurrentCard() {
        this.flashcard.render();
    }

    /**
     * Handle click events
     */
    handleClick(e) {
        const button = e.target.closest('button');
        if (!button) {
            // Click on flashcard
            if (e.target.closest('#flashcard') && !e.target.closest('.edit-btn')) {
                this.manager.flipCard('horizontal');
            }
            return;
        }

        const action = button.id;
        
        switch (action) {
            case 'exitStudyBtn':
                this.manager.exitStudy();
                break;
            case 'saveChangesBtn':  // Add this case
                console.log('Save button clicked - calling _saveCardEdit');
                this._saveCardEdit();
                break;
            case 'prevCardBtn':
                // Block completely in SM-2 mode
                if (this.manager.state.mode === 'full-spaced') return;
                if (button.disabled) return;
                this.manager.navigateCard(-1);
                break;
            case 'nextCardBtn':
                // Block completely in SM-2 mode
                if (this.manager.state.mode === 'full-spaced') return;
                if (button.disabled) return;
                this.manager.navigateCard(1);
                break;
            case 'shuffleBtn':
            case 'shuffleBtnDesktop':
                this.manager.toggleShuffle();
                break;
            case 'termDefBtn':
            case 'termDefBtnDesktop':
                this.manager.toggleTermDef();
                break;
            case 'editCardBtn':
                this._openEditModal();
                break;
            case 'cancelEditBtn':
                this._closeEditModal();
                break;
            case 'dontRememberBtn':
                this.manager.handleResponse('dont-remember');
                break;
            case 'rememberBtn':
                this.manager.handleResponse('remember');
                break;
            // Mode toggle buttons
            case 'basicModeBtn':
                this.manager.switchMode('basic');
                break;
            case 'simpleSpacedModeBtn':
                this.manager.switchMode('simple-spaced');
                break;
            case 'fullSpacedModeBtn':
                this.manager.switchMode('full-spaced');
                break;
            // SM-2 buttons
            case 'againBtn':
                this.manager.handleResponse(1);
                break;
            case 'hardBtn':
                this.manager.handleResponse(2);
                break;
            case 'goodBtn':
                this.manager.handleResponse(3);
                break;
            case 'easyBtn':
                this.manager.handleResponse(4);
                break;
        }

        e.preventDefault();
        e.stopPropagation();
    }

    // Private methods
    _createStudyView() {
        const studyView = document.createElement('div');
        studyView.id = 'study-view';
        studyView.className = 'page-view p-6';
        
        studyView.innerHTML = `
            <!-- Study Header -->
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center space-x-4">
                    <button id="exitStudyBtn" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors dark:bg-gray-600 dark:hover:bg-gray-700">
                        Exit Study
                    </button>
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                        <span id="cardProgress">Card 1 of 0</span>
                    </div>
                </div>
                
                <!-- Mode-specific indicator -->
                <div id="modeIndicator"></div>
            </div>

            <!-- Progress Bar -->
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-8">
                <div id="progressBar" class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>

            <!-- Flashcard Container -->
            <div class="max-w-4xl mx-auto">
                <div class="card-container">
                    <div id="flashcard" class="flashcard dark:bg-gray-800 dark:border-gray-700 dark:shadow-gray-900/20">
                        <div class="flashcard-inner">
                            <div class="flashcard-front">
                                <button id="editCardBtn" class="edit-btn dark:text-gray-500 dark:hover:text-gray-300">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                                <div class="card-label dark:text-gray-400">Term</div>
                                <div id="frontContent" class="card-content dark:text-white"></div>
                            </div>
                            <div class="flashcard-back">
                                <button class="edit-btn dark:text-gray-500 dark:hover:text-gray-300" onclick="this.closest('.page-view').studyInterface._openEditModal()">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                                <div class="card-label dark:text-gray-400">Definition</div>
                                <div id="backContent" class="card-content dark:text-white"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Keyboard Hints -->
                <div class="keyboard-hints">
                    <!-- Will be populated dynamically by updateKeyboardHints() -->
                </div>
            </div>

            <!-- Response Buttons (for spaced repetition modes) -->
            <div id="responseButtons" class="hidden max-w-4xl mx-auto mt-6">
                <!-- Simple Spaced Mode Buttons -->
                <div id="simpleSpacedButtons" class="flex justify-center space-x-6">
                    <button id="dontRememberBtn" class="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        Don't Remember
                        <kbd class="ml-3 px-2 py-1 text-xs bg-red-400 dark:bg-red-500 rounded">←</kbd>
                    </button>
                    <button id="rememberBtn" class="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Remember
                        <kbd class="ml-3 px-2 py-1 text-xs bg-green-400 dark:bg-green-500 rounded">→</kbd>
                    </button>
                </div>

                <!-- SM-2 Mode Buttons -->
                <div id="sm2Buttons" class="hidden flex justify-center space-x-3">
                    <button id="againBtn" class="response-btn bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 px-4 py-3 rounded-lg font-medium transition-colors flex items-center text-sm shadow-sm">
                        <span class="mr-1">🔴</span>
                        Again
                        <kbd class="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded border">1</kbd>
                    </button>
                    <button id="hardBtn" class="response-btn bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 px-4 py-3 rounded-lg font-medium transition-colors flex items-center text-sm shadow-sm">
                        <span class="mr-1">🟠</span>
                        Hard
                        <kbd class="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded border">2</kbd>
                    </button>
                    <button id="goodBtn" class="response-btn bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 px-4 py-3 rounded-lg font-medium transition-colors flex items-center text-sm shadow-sm">
                        <span class="mr-1">🟢</span>
                        Good
                        <kbd class="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded border">3</kbd>
                    </button>
                    <button id="easyBtn" class="response-btn bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 px-4 py-3 rounded-lg font-medium transition-colors flex items-center text-sm shadow-sm">
                        <span class="mr-1">🔵</span>
                        Easy
                        <kbd class="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded border">4</kbd>
                    </button>
                </div>
            </div>

            <!-- Navigation Controls -->
            <div class="navigation-container flex justify-between items-center mt-8 max-w-4xl mx-auto px-16">
                
                <!-- Mode Toggle with side buttons -->
                <div id="modeToggle" class="flex items-center bg-gray-100 rounded-lg p-1">
                    <!-- Shuffle button (mobile only) -->
                    <button id="shuffleBtn" class="md:hidden" title="Toggle Shuffle Cards">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4l11.733 16h4.267l-11.733-16zm0 16l11.733-16h4.267l-11.733-16zm8.467-8.467l2.733-2.733"></path>
                        </svg>
                    </button>
                    
                    <!-- Mode buttons container -->
                    <div class="mode-toggle-container">
                        <button id="basicModeBtn" class="mode-toggle-btn px-3 py-2 text-sm font-medium rounded transition-colors">
                            Basic
                        </button>
                        <button id="simpleSpacedModeBtn" class="mode-toggle-btn px-3 py-2 text-sm font-medium rounded transition-colors">
                            Simple
                        </button>
                        <button id="fullSpacedModeBtn" class="mode-toggle-btn px-3 py-2 text-sm font-medium rounded transition-colors">
                            SM-2
                        </button>
                    </div>
                    
                    <!-- Term/Def button (mobile only) -->
                    <button id="termDefBtn" class="md:hidden" title="Toggle Term/Definition First">
                        <span class="font-bold text-sm">T</span>
                    </button>
                </div>

                <!-- Navigation buttons -->
                <div class="nav-buttons-container flex items-center space-x-6">
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

                <!-- Right side controls (desktop only) -->
                <div class="hidden md:flex justify-end items-center space-x-3 w-48">
                    <button id="termDefBtnDesktop" class="nav-button transition-all duration-200" title="Toggle Term/Definition First">
                        <span class="w-5 h-5 flex items-center justify-center font-bold text-lg">T</span>
                    </button>
                    
                    <button id="shuffleBtnDesktop" class="nav-button transition-all duration-200" title="Toggle Shuffle Cards">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4l11.733 16h4.267l-11.733-16zm0 16l11.733-16h4.267l-11.733-16zm8.467-8.467l2.733-2.733"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Edit Card Modal -->
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
                            <button type="submit" id="saveChangesBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Store reference for event handling
        studyView.studyInterface = this;
        
        // Setup event listeners
        studyView.addEventListener('click', this.handleClick.bind(this));
        
        return studyView;
    }

    _updatePageHeaders() {
        const state = this.manager.state;
        const studyName = state.deck?.name || state.pod?.name || 'Study Session';
        const subtitle = `${studyName} - ${state.totalCards} cards`;

        // Desktop headers
        const titleElement = document.getElementById('page-title');
        const subtitleElement = document.getElementById('page-subtitle');
        if (titleElement) titleElement.textContent = 'Study Mode';
        if (subtitleElement) subtitleElement.textContent = subtitle;

        // Mobile headers
        const mobileTitle = document.getElementById('mobile-page-title');
        const mobileSubtitle = document.getElementById('mobile-page-subtitle');
        if (mobileTitle) mobileTitle.textContent = 'Study Mode';
        if (mobileSubtitle) mobileSubtitle.textContent = studyName;
    }

    _updateNavigation() {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        const flashcardsNav = document.getElementById('nav-flashcards');
        if (flashcardsNav) {
            flashcardsNav.classList.add('active');
        }
    }

    _openEditModal() {
        const currentCard = this.manager.currentCard;
        if (!currentCard) return;
        
        document.getElementById('editFrontContent').value = currentCard.front_content;
        document.getElementById('editBackContent').value = currentCard.back_content;
        document.getElementById('editTags').value = currentCard.tags || '';
        
        document.getElementById('editCardModal').classList.remove('hidden');

        // DEBUG: Check if form exists
        setTimeout(() => {
            const form = document.getElementById('editCardForm');
            const submitBtn = document.querySelector('#editCardForm button[type="submit"]');
            console.log('Form exists:', !!form);
            console.log('Submit button exists:', !!submitBtn);
            console.log('Form element:', form);
        }, 100);
    }

    _closeEditModal() {
        document.getElementById('editCardModal').classList.add('hidden');
    }

    async _saveCardEdit() {
        const currentCard = this.manager.currentCard;
        if (!currentCard) return;
        
        const formData = {
            front_content: document.getElementById('editFrontContent').value,
            back_content: document.getElementById('editBackContent').value,
            tags: document.getElementById('editTags').value
        };
        
        try {
            const response = await fetch(`${window.API_BASE}/cards/${currentCard.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                // Update the card in state
                Object.assign(currentCard, formData);
                
                // Update in original cards array too
                const originalCard = this.manager.state.originalCards.find(card => card.id === currentCard.id);
                if (originalCard) {
                    Object.assign(originalCard, formData);
                }
                
                // Re-render the card
                this.renderCurrentCard();
                this._closeEditModal();
                
                this.manager._showMessage('Card updated successfully', 'success');
            } else {
                throw new Error('Failed to update card');
            }
        } catch (error) {
            console.error('Error updating card:', error);
            this.manager._showMessage('Failed to update card: ' + error.message, 'error');
        }
    }

    /**
     * Update card display
     */
    async updateCard() {
        const currentCard = this.manager.currentCard;
        if (!currentCard) return;
        
        // Update card content
        this._updateCardContent(currentCard);
        
        // Update progress
        this._updateProgress();
        
        // Update pod-specific UI if in pod mode
        if (this.manager.state.pod) {
            this._updatePodInterface(currentCard);
        }
        
        // Update mode-specific UI
        if (this.manager.currentMode && this.manager.currentMode.updateInterface) {
            await this.manager.currentMode.updateInterface();
        }
    }

    /**
     * Update interface for pod study mode
     */
    _updatePodInterface(currentCard) {
        const podInfo = this.manager.state.pod;
        
        // Update header to show pod name
        const headerEl = document.querySelector('.study-header-title');
        if (headerEl) {
            headerEl.innerHTML = `
                <div class="pod-study-title">
                    <h2 class="text-xl font-semibold">${podInfo.name}</h2>
                    <span class="text-sm text-gray-600">Pod Study Mode</span>
                </div>
            `;
        }
        
        // Add deck indicator to card
        this._addDeckIndicator(currentCard);
    }

    /**
     * Add deck indicator to show which deck the current card is from
     */
    _addDeckIndicator(currentCard) {
        const cardContainer = document.querySelector('.study-card-container');
        if (!cardContainer) return;
        
        let deckIndicator = cardContainer.querySelector('.deck-indicator');
        if (!deckIndicator) {
            deckIndicator = document.createElement('div');
            deckIndicator.className = 'deck-indicator absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium';
            cardContainer.style.position = 'relative';
            cardContainer.appendChild(deckIndicator);
        }
        
        deckIndicator.textContent = currentCard.source_deck_name || 'Unknown Deck';
    }
}