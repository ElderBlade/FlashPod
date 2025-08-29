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
    }

    /**
     * Update mode-specific UI elements
     */
    updateModeSpecificUI(modeName, modeData) {
        const modeIndicator = document.getElementById('modeIndicator');
        const responseButtons = document.getElementById('responseButtons');
        
        switch (modeName) {
            case 'basic':
                if (modeIndicator) modeIndicator.innerHTML = '';
                if (responseButtons) responseButtons.classList.add('hidden');
                break;
                
            case 'simple-spaced':
                if (modeIndicator) {
                    modeIndicator.innerHTML = `
                        <div class="flex items-center space-x-4 text-sm text-gray-600">
                            <span class="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                Still Learning: ${modeData.stillLearning.length}
                            </span>
                            <span class="bg-green-100 text-green-700 px-2 py-1 rounded">
                                Known: ${modeData.known.length}
                            </span>
                            <span class="text-gray-500">Round ${modeData.currentRound}</span>
                        </div>
                    `;
                }
                if (responseButtons) {
                    if (modeData.isCollectingResponse) {
                        responseButtons.classList.remove('hidden');
                    } else {
                        responseButtons.classList.add('hidden');
                    }
                }
                break;
                
            case 'full-spaced':
                if (modeIndicator) {
                    modeIndicator.innerHTML = `
                        <div class="flex items-center space-x-3 text-sm text-gray-600">
                            <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                Due: ${modeData.dueCards.length}
                            </span>
                            <span class="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                Learning: ${modeData.learningCards.length}
                            </span>
                            <span class="bg-green-100 text-green-700 px-2 py-1 rounded">
                                Mature: ${modeData.matureCards.length}
                            </span>
                        </div>
                    `;
                }
                if (responseButtons) responseButtons.classList.remove('hidden');
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
        const progress = this.manager.state.currentIndex + 1;
        const total = this.manager.state.totalCards;
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

    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        const state = this.manager.state;
        const prevBtn = document.getElementById('prevCardBtn');
        const nextBtn = document.getElementById('nextCardBtn');

        if (prevBtn) {
            prevBtn.disabled = state.currentIndex === 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = state.currentIndex === state.totalCards - 1;
        }
    }

    /**
     * Update shuffle button visual state
     */
    updateShuffleButton() {
        const shuffleBtn = document.getElementById('shuffleBtn');
        if (!shuffleBtn) return;

        if (this.manager.state.isShuffled) {
            shuffleBtn.classList.remove('bg-gray-100', 'text-gray-500');
            shuffleBtn.classList.add('bg-blue-100', 'text-blue-700');
            shuffleBtn.title = 'Shuffle is ON - Click to restore original order';
        } else {
            shuffleBtn.classList.remove('bg-blue-100', 'text-blue-700');
            shuffleBtn.classList.add('bg-gray-100', 'text-gray-500');
            shuffleBtn.title = 'Shuffle is OFF - Click to randomize cards';
        }
    }

    /**
     * Update term/definition button visual state
     */
    updateTermDefButton() {
        const termDefBtn = document.getElementById('termDefBtn');
        const termDefIcon = document.getElementById('termDefIcon');
        if (!termDefBtn || !termDefIcon) return;

        if (this.manager.state.showDefinitionFirst) {
            termDefBtn.classList.remove('bg-gray-100', 'text-gray-500');
            termDefBtn.classList.add('bg-purple-100', 'text-purple-700');
            termDefBtn.title = 'Currently showing Definition First - Click to show Term First';
            termDefIcon.textContent = 'D';
        } else {
            termDefBtn.classList.remove('bg-purple-100', 'text-purple-700');
            termDefBtn.classList.add('bg-gray-100', 'text-gray-500');
            termDefBtn.title = 'Currently showing Term First - Click to show Definition First';
            termDefIcon.textContent = 'T';
        }
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
        e.preventDefault();
        e.stopPropagation();

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
            case 'prevCardBtn':
                this.manager.navigateCard(-1);
                break;
            case 'nextCardBtn':
                this.manager.navigateCard(1);
                break;
            case 'shuffleBtn':
                this.manager.toggleShuffle();
                break;
            case 'termDefBtn':
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
        }
    }

    /**
     * Handle form submissions
     */
    handleSubmit(e) {
        if (e.target.id === 'editCardForm') {
            e.preventDefault();
            this._saveCardEdit();
        }
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
                    <button id="exitStudyBtn" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                        Exit Study
                    </button>
                    <div class="text-sm text-gray-600">
                        <span id="cardProgress">Card 1 of 0</span>
                    </div>
                </div>
                
                <!-- Mode-specific indicator -->
                <div id="modeIndicator"></div>
            </div>

            <!-- Progress Bar -->
            <div class="w-full bg-gray-200 rounded-full h-2 mb-8">
                <div id="progressBar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>

            <!-- Flashcard Container -->
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
                                <button class="edit-btn" onclick="this.closest('.page-view').studyInterface._openEditModal()">
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
                
                <!-- Keyboard Hints -->
                <div class="keyboard-hints">
                    <kbd>Space</kbd> flip horizontal • 
                    <kbd>↑</kbd> flip up • 
                    <kbd>↓</kbd> flip down • 
                    <kbd>←</kbd> previous / don't remember • 
                    <kbd>→</kbd> next / remember • 
                    <kbd>T</kbd> term/definition • 
                    <kbd>S</kbd> shuffle
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
                        <kbd class="ml-3 px-2 py-1 text-xs bg-red-400 rounded">←</kbd>
                    </button>
                    <button id="rememberBtn" class="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Remember
                        <kbd class="ml-3 px-2 py-1 text-xs bg-green-400 rounded">→</kbd>
                    </button>
                </div>
            </div>

            <!-- Navigation Controls -->
            <div class="flex justify-between items-center mt-8 max-w-4xl mx-auto">
                <!-- Left spacer -->
                <div class="w-48"></div>
                
                <!-- Mode Toggle (centered left) -->
                <div id="modeToggle" class="flex items-center bg-gray-100 rounded-lg p-1">
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
                            <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Store reference for event handling
        studyView.studyInterface = this;
        
        // Setup event listeners
        studyView.addEventListener('click', this.handleClick.bind(this));
        studyView.addEventListener('submit', this.handleSubmit.bind(this));
        
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
}