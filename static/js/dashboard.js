'use strict';
let currentUser = null;
        
// Auto-detect environment
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api'
    : '/api';

// Get user info from localStorage
function loadUserInfo() {
    const savedUser = localStorage.getItem('flashpod_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById('userGreeting').textContent = currentUser.username;
        
        // Set user initials
        const initials = currentUser.username.substring(0, 2).toUpperCase();
        document.getElementById('userInitials').textContent = initials;
    } else {
        window.location.href = '/login';
    }
}

// Navigation functionality
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pageViews = document.querySelectorAll('.page-view');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Hide all page views
            pageViews.forEach(view => view.classList.add('hidden'));
            
            // Show corresponding page view
            const navId = item.id.replace('nav-', '');
            let targetView;
            
            // Handle special case for home/dashboard
            if (navId === 'home') {
                targetView = document.getElementById('dashboard-view');
            } else {
                targetView = document.getElementById(`${navId}-view`);
            }
            
            if (targetView) {
                targetView.classList.remove('hidden');
                updatePageHeader(navId);
            }
        });
    });
}

function updatePageHeader(page) {
    const titleElement = document.getElementById('page-title');
    const subtitleElement = document.getElementById('page-subtitle');
    
    const pageInfo = {
        'home': {
            title: 'Dashboard',
            subtitle: 'Welcome back! Here\'s your learning progress.'
        },
        'library': {
            title: 'Library',
            subtitle: 'Manage your flashcard decks and collections.'
        },
        'flashcards': {
            title: 'Flash Cards',
            subtitle: 'Study your cards with spaced repetition.'
        },
        'new-deck': {
            title: 'Create New Deck',
            subtitle: 'Add a new deck to your collection.'
        },
        'import': {
            title: 'Import Decks',
            subtitle: 'Import decks from files or other sources.'
        }
    };

    const info = pageInfo[page] || pageInfo['home'];
    titleElement.textContent = info.title;
    subtitleElement.textContent = info.subtitle;
}

// Logout functionality
function logout() {
    localStorage.removeItem('flashpod_user');
    window.location.href = '/logout';
}

// Message system
function showMessage(message, type = 'info') {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
    
    messageDiv.className = `${bgColor} text-white px-6 py-4 rounded-lg shadow-lg mb-3 max-w-sm`;
    messageDiv.textContent = message;
    
    messagesContainer.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Load recent decks for dashboard
async function loadRecentDecks() {
    try {
        const response = await fetch(`${API_BASE}/decks/my-decks`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            displayRecentDecks(data.decks.slice(0, 6)); // Show only 6 most recent
        } else {
            console.error('Failed to load recent decks');
        }
    } catch (error) {
        console.error('Error loading recent decks:', error);
    }
}

function displayRecentDecks(decks) {
    const container = document.getElementById('recent-decks');
    
    if (decks.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <p>No decks yet. Create your first deck to get started!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = decks.map(deck => `
        <div class="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer">
            <h4 class="font-medium text-gray-900 mb-2">${deck.name}</h4>
            <p class="text-sm text-gray-500 mb-3">${deck.description || 'No description'}</p>
            <div class="flex justify-between items-center text-sm">
                <span class="text-gray-500">${deck.card_count} cards</span>
                <button onclick="studyDeck(${deck.id})" class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">
                    Study
                </button>
            </div>
        </div>
    `).join('');
}

// Load all decks for library view
async function loadAllDecks() {
    try {
        const response = await fetch(`${API_BASE}/decks/my-decks`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            displayAllDecks(data.decks);
        } else {
            console.error('Failed to load decks');
        }
    } catch (error) {
        console.error('Error loading decks:', error);
    }
}

function displayAllDecks(decks) {
    const container = document.getElementById('decks-container');
    
    if (decks.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <p>No decks yet. Create your first deck to get started!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = decks.map(deck => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${deck.name}</h3>
            <p class="text-gray-600 mb-4">${deck.description || 'No description'}</p>
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">${deck.card_count} cards</span>
                <div class="space-x-2">
                    <button onclick="viewDeck(${deck.id})" class="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200">
                        View
                    </button>
                    <button onclick="editDeck(${deck.id})" class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded text-sm hover:bg-yellow-200">
                        Edit
                    </button>
                    <button onclick="studyDeck(${deck.id})" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                        Study
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function setupAutoResize(textarea) {
    function adjustHeight() {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        // Set height based on scroll height, with min height of 2.5rem (40px)
        textarea.style.height = Math.max(40, textarea.scrollHeight) + 'px';
    }
    
    // Adjust height on input
    textarea.addEventListener('input', adjustHeight);
    
    // Adjust height on focus (in case content was set programmatically)
    textarea.addEventListener('focus', adjustHeight);
    
    // Initial adjustment
    adjustHeight();
}

// Card management for new deck form
let cardCounter = 0;

function createCardRow(term = '', definition = '') {
    cardCounter++;
    const cardId = `card-${cardCounter}`;
    
    const cardRow = document.createElement('div');
    cardRow.className = 'card-row flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200';
    cardRow.draggable = true;
    cardRow.dataset.cardId = cardId;
    
    cardRow.innerHTML = `
        <div class="drag-handle cursor-move text-gray-400 hover:text-gray-600 mt-8"> <!-- Added mt-8 to align with inputs -->
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
            </svg>
        </div>
        <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Term</label>
                <input type="text" name="term" value="${term}" placeholder="Enter term or question" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Definition</label>
                <textarea name="definition" placeholder="Enter definition or answer" class="auto-resize w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-hidden" rows="1">${definition}</textarea>
            </div>
        </div>
        <button type="button" class="remove-card text-red-500 hover:text-red-700 p-1 mt-8"> <!-- Added mt-8 to align with inputs -->
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
        </button>
    `;

    // Add auto-resize functionality to textarea
    const textarea = cardRow.querySelector('textarea[name="definition"]');
    setupAutoResize(textarea);

    // Add remove functionality
    cardRow.querySelector('.remove-card').addEventListener('click', () => {
        const container = document.getElementById('cardsContainer');
        if (container.children.length > 1) { // Keep at least one card
            cardRow.remove();
        }
    });

    // Add drag and drop functionality
    setupDragAndDrop(cardRow);

    return cardRow;
}

function setupDragAndDrop(cardRow) {
    cardRow.addEventListener('dragstart', (e) => {
        cardRow.classList.add('opacity-50');
        e.dataTransfer.setData('text/plain', cardRow.dataset.cardId);
    });

    cardRow.addEventListener('dragend', () => {
        cardRow.classList.remove('opacity-50');
    });

    cardRow.addEventListener('dragover', (e) => {
        e.preventDefault();
        cardRow.classList.add('border-blue-400');
    });

    cardRow.addEventListener('dragleave', () => {
        cardRow.classList.remove('border-blue-400');
    });

    cardRow.addEventListener('drop', (e) => {
        e.preventDefault();
        cardRow.classList.remove('border-blue-400');
        
        const draggedCardId = e.dataTransfer.getData('text/plain');
        const draggedCard = document.querySelector(`[data-card-id="${draggedCardId}"]`);
        const container = document.getElementById('cardsContainer');
        
        if (draggedCard && draggedCard !== cardRow) {
            const allCards = Array.from(container.children);
            const draggedIndex = allCards.indexOf(draggedCard);
            const targetIndex = allCards.indexOf(cardRow);
            
            if (draggedIndex < targetIndex) {
                container.insertBefore(draggedCard, cardRow.nextSibling);
            } else {
                container.insertBefore(draggedCard, cardRow);
            }
        }
    });
}

function initializeCardRows() {
    const container = document.getElementById('cardsContainer');
    container.innerHTML = '';
    
    // Add two empty rows by default
    container.appendChild(createCardRow());
    container.appendChild(createCardRow());
}

function getCardData() {
    // Get cards from the cardsContainer in their current DOM order
    const cardRows = document.querySelectorAll('#cardsContainer .card-row');
    const cards = [];

    cardRows.forEach((row, index) => {
        const term = row.querySelector('input[name="term"]').value.trim();
        const definition = row.querySelector('textarea[name="definition"]').value.trim();

        if (term && definition) {
            cards.push({ 
                term, 
                definition,
                display_order: index  // Include the order based on DOM position
            });
        }
    });

    return cards;
}

// Import functionality - Original version restored
function parseImportData(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const cards = [];
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;
        
        let term, definition;
        
        // Try tab delimiter first, then comma
        if (trimmedLine.includes('\t')) {
            const parts = trimmedLine.split('\t');
            term = parts[0]?.trim() || '';
            definition = parts.slice(1).join('\t').trim() || '';
        } else if (trimmedLine.includes(',')) {
            const commaIndex = trimmedLine.indexOf(',');
            term = trimmedLine.substring(0, commaIndex).trim();
            definition = trimmedLine.substring(commaIndex + 1).trim();
        } else {
            // No delimiter found, treat entire line as term with empty definition
            term = trimmedLine;
            definition = '';
        }
        
        if (term) {
            cards.push({ term, definition, originalLine: line });
        }
    });
    
    return cards;
}

function createImportCardRow(term, definition, index) {
    const cardRow = document.createElement('div');
    cardRow.className = 'import-card-row flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200';
    cardRow.dataset.cardIndex = index;
    
    cardRow.innerHTML = `
        <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-2">
            <span class="text-xs font-medium text-blue-600">${index + 1}</span>
        </div>
        <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Term</label>
                <input type="text" name="import-term" value="${term}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Definition</label>
                <textarea name="import-definition" class="auto-resize w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-hidden" rows="1">${definition}</textarea>
            </div>
        </div>
        <button type="button" class="remove-import-card text-red-500 hover:text-red-700 p-1 mt-8">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
        </button>
    `;
    
    // Setup auto-resize for textarea
    const textarea = cardRow.querySelector('textarea[name="import-definition"]');
    setupAutoResize(textarea);
    
    // Setup remove functionality
    cardRow.querySelector('.remove-import-card').addEventListener('click', () => {
        cardRow.remove();
        updateCardCount();
        renumberImportCards();
    });
    
    return cardRow;
}

function displayParsedCards(cards) {
    const container = document.getElementById('importCardsContainer');
    container.innerHTML = '';
    
    cards.forEach((card, index) => {
        const cardRow = createImportCardRow(card.term, card.definition, index);
        container.appendChild(cardRow);
    });
    
    updateCardCount();
}

function updateCardCount() {
    const count = document.querySelectorAll('.import-card-row').length;
    document.getElementById('cardCount').textContent = count;
}

function renumberImportCards() {
    const cardRows = document.querySelectorAll('.import-card-row');
    cardRows.forEach((row, index) => {
        row.dataset.cardIndex = index;
        const numberElement = row.querySelector('.bg-blue-100 span');
        if (numberElement) {
            numberElement.textContent = index + 1;
        }
    });
}

function getImportCardData() {
    const cardRows = document.querySelectorAll('.import-card-row');
    const cards = [];
    
    cardRows.forEach(row => {
        const term = row.querySelector('input[name="import-term"]').value.trim();
        const definition = row.querySelector('textarea[name="import-definition"]').value.trim();
        
        if (term && definition) {
            cards.push({ term, definition });
        }
    });
    
    return cards;
}

// Initialize import functionality
function initializeImportFunctionality() {
    const parseBtn = document.getElementById('parseImportBtn');
    const importBtn = document.getElementById('importToDeckBtn');
    const clearBtn = document.getElementById('clearImportBtn');
    const importField = document.getElementById('importDataField');

    if (parseBtn) {
        parseBtn.addEventListener('click', () => {
            const text = importField.value;
            const cards = parseImportData(text);
            
            if (cards.length === 0) {
                showMessage('No valid cards found. Please check your format.', 'error');
                return;
            }
            
            displayParsedCards(cards);
            document.getElementById('importCardsSection').classList.remove('hidden');
            showMessage(`Parsed ${cards.length} cards successfully!`, 'success');
        });
    }

    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const cards = getImportCardData();
            
            if (cards.length === 0) {
                showMessage('No cards to import. Please add some cards first.', 'error');
                return;
            }
            
            // Switch to new deck view
            document.getElementById('nav-new-deck').click();
            
            // Clear existing cards in the form
            const cardsContainer = document.getElementById('cardsContainer');
            cardsContainer.innerHTML = '';
            
            // Add imported cards using existing createCardRow function
            // Cards will maintain their order from the import
            cards.forEach((card, index) => {
                const cardRow = createCardRow(card.term, card.definition);
                cardsContainer.appendChild(cardRow);
            });
            
            showMessage(`Imported ${cards.length} cards to new deck form`, 'success');
            
            // Clear import data
            importField.value = '';
            document.getElementById('importCardsSection').classList.add('hidden');
            document.getElementById('importCardsContainer').innerHTML = '';
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            importField.value = '';
            document.getElementById('importCardsSection').classList.add('hidden');
            document.getElementById('importCardsContainer').innerHTML = '';
        });
    }
}

// Form handling
document.getElementById('deckForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('deckName').value;
    const description = document.getElementById('deckDescription').value;
    const cards = getCardData();

    if (cards.length === 0) {
        showMessage('Please add at least one card to your deck', 'error');
        return;
    }

    try {
        // First create the deck
        const deckResponse = await fetch(`${API_BASE}/decks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ name, description })
        });

        if (deckResponse.ok) {
            const deckData = await deckResponse.json();
            const deckId = deckData.deck_id;
            
            // Then add all the cards with display order
            let successCount = 0;
            
            // Use Promise.all to handle multiple async card creations
            const cardPromises = cards.map(async (card, index) => {
                try {
                    const cardResponse = await fetch(`${API_BASE}/cards/deck/${deckId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            front_content: card.term,
                            back_content: card.definition,
                            display_order: index  // Add display order based on position in form
                        })
                    });
                    
                    if (cardResponse.ok) {
                        return true;
                    } else {
                        console.error('Failed to add card:', await cardResponse.json());
                        return false;
                    }
                } catch (cardError) {
                    console.error('Error adding card:', cardError);
                    return false;
                }
            });
            
            // Wait for all cards to be created
            const results = await Promise.all(cardPromises);
            successCount = results.filter(result => result === true).length;
            
            document.getElementById('deckForm').reset();
            initializeCardRows(); // Reset card rows
            showMessage(`Deck created successfully with ${successCount} cards!`, 'success');
            
            // Refresh data
            loadRecentDecks();
            loadAllDecks();
            
            // Switch to library view to see the new deck
            document.getElementById('nav-library').click();
        } else {
            const data = await deckResponse.json();
            showMessage(data.error || 'Failed to create deck', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
});

// Add card button event listener
document.getElementById('addCardBtn').addEventListener('click', () => {
    const container = document.getElementById('cardsContainer');
    const newCardRow = createCardRow(); // Create empty row (no parameters = empty)
    container.appendChild(newCardRow);
    
    // Focus on the term input of the new row for better UX
    const termInput = newCardRow.querySelector('input[name="term"]');
    termInput.focus();
});

// Cancel button
document.getElementById('cancelDeck').addEventListener('click', () => {
    document.getElementById('deckForm').reset();
    document.getElementById('nav-home').click(); // Go back to dashboard
});

// Placeholder functions
function viewDeck(deckId) {
    showMessage(`View deck ${deckId} - Coming soon!`, 'info');
}

function studyDeck(deckId) {
    showMessage(`Study deck ${deckId} - Coming soon!`, 'info');
}

// Event listeners
document.getElementById('logoutBtn').addEventListener('click', logout);

// CSS for active navigation
const style = document.createElement('style');
style.textContent = `
    .nav-item {
        color: #6b7280;
        transition: all 0.2s;
    }
    .nav-item:hover {
        color: #374151;
        background-color: #f3f4f6;
    }
    .nav-item.active {
        color: #2563eb;
        background-color: #dbeafe;
    }
`;
document.head.appendChild(style);


/* EDIT DECK FUNCTIONS */
// Edit deck functionality
let editingDeckId = null;
let editingCards = [];
let originalCards = []; 

async function editDeck(deckId) {
    editingDeckId = deckId;
    
    try {
        // Load deck info
        const deckResponse = await fetch(`${API_BASE}/decks/${deckId}`, {
            credentials: 'include'
        });
        
        if (!deckResponse.ok) {
            showMessage('Failed to load deck', 'error');
            return;
        }
        
        const deckData = await deckResponse.json();
        const deck = deckData.deck;
        
        // Load deck cards
        const cardsResponse = await fetch(`${API_BASE}/cards/deck/${deckId}`, {
            credentials: 'include'
        });
        
        if (!cardsResponse.ok) {
            showMessage('Failed to load cards', 'error');
            return;
        }
        
        const cardsData = await cardsResponse.json();
        editingCards = cardsData.cards || [];
        
        // IMPORTANT: Keep a copy of the original cards for deletion tracking
        originalCards = cardsData.cards ? JSON.parse(JSON.stringify(cardsData.cards)) : [];
        
        console.log('Loaded original cards:', originalCards);
        
        // Populate form
        document.getElementById('editDeckId').value = deck.id;
        document.getElementById('editDeckName').value = deck.name;
        document.getElementById('editDeckDescription').value = deck.description || '';
        
        // Display cards
        displayEditCards();
        
        // Switch to edit view
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.page-view').forEach(view => view.classList.add('hidden'));
        document.getElementById('edit-deck-view').classList.remove('hidden');
        updatePageHeader('edit-deck');
        
    } catch (error) {
        showMessage('Error loading deck: ' + error.message, 'error');
    }
}


function displayEditCards() {
    const container = document.getElementById('editCardsContainer');
    
    if (editingCards.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>No cards in this deck yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = editingCards.map((card, index) => `
        <div class="card-row flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200" 
             data-card-id="${card.id}" 
             draggable="true">
            <div class="drag-handle cursor-move text-gray-400 hover:text-gray-600 mt-8">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                </svg>
            </div>
            <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Term</label>
                    <input type="text" name="term" value="${card.front_content}" placeholder="Enter term or question" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Definition</label>
                    <textarea name="definition" placeholder="Enter definition or answer" class="auto-resize w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-hidden" rows="1">${card.back_content}</textarea>
                </div>
            </div>
            <button type="button" class="remove-card text-red-500 hover:text-red-700 p-1 mt-8" onclick="removeEditCard(${card.id})">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        </div>
    `).join('');
    
    // Setup auto-resize for all textareas
    container.querySelectorAll('textarea[name="definition"]').forEach(textarea => {
        setupAutoResize(textarea);
    });
    
    // Setup drag and drop for all card rows
    container.querySelectorAll('.card-row').forEach(cardRow => {
        setupEditCardDragAndDrop(cardRow);
    });
}

function removeEditCard(cardId) {
    console.log('Removing card:', cardId);
    editingCards = editingCards.filter(card => card.id !== cardId);
    displayEditCards();
}

function setupEditCardDragAndDrop(cardRow) {
    cardRow.addEventListener('dragstart', (e) => {
        cardRow.classList.add('opacity-50');
        e.dataTransfer.setData('text/plain', cardRow.dataset.cardId);
    });

    cardRow.addEventListener('dragend', () => {
        cardRow.classList.remove('opacity-50');
    });

    cardRow.addEventListener('dragover', (e) => {
        e.preventDefault();
        cardRow.classList.add('border-blue-400');
    });

    cardRow.addEventListener('dragleave', () => {
        cardRow.classList.remove('border-blue-400');
    });

    cardRow.addEventListener('drop', (e) => {
        e.preventDefault();
        cardRow.classList.remove('border-blue-400');
        
        const draggedCardId = e.dataTransfer.getData('text/plain');
        const draggedCard = document.querySelector(`[data-card-id="${draggedCardId}"]`);
        const container = document.getElementById('editCardsContainer');
        
        if (draggedCard && draggedCard !== cardRow) {
            const allCards = Array.from(container.children);
            const draggedIndex = allCards.indexOf(draggedCard);
            const targetIndex = allCards.indexOf(cardRow);
            
            // Update the DOM
            if (draggedIndex < targetIndex) {
                container.insertBefore(draggedCard, cardRow.nextSibling);
            } else {
                container.insertBefore(draggedCard, cardRow);
            }
            
            // Update the editingCards array to match new order
            updateEditCardsOrder();
        }
    });
}

function updateEditCardsOrder() {
    const container = document.getElementById('editCardsContainer');
    const cardElements = Array.from(container.querySelectorAll('.card-row'));
    
    console.log('Updating edit cards order...');
    console.log('Card elements found:', cardElements.length);
    console.log('Current editingCards:', editingCards);
    
    // Reorder the editingCards array to match DOM order
    const newOrder = [];
    cardElements.forEach((element, index) => {
        const cardId = element.dataset.cardId;
        const card = editingCards.find(c => c.id == cardId);
        console.log(`Position ${index}: cardId=${cardId}, found=${!!card}`);
        if (card) {
            newOrder.push(card);
        }
    });
    
    editingCards = newOrder;
    console.log('New editingCards order:', editingCards);
}

function addNewEditCard() {
    // Add a new empty card to the editingCards array
    const newCard = {
        id: 'new_' + Date.now(), // Temporary ID for new cards
        front_content: '',
        back_content: '',
        is_new: true
    };
    
    editingCards.push(newCard);
    displayEditCards();
    
    // Focus on the new card's term input
    const container = document.getElementById('editCardsContainer');
    const newCardElement = container.querySelector(`[data-card-id="${newCard.id}"]`);
    if (newCardElement) {
        const termInput = newCardElement.querySelector('input[name="term"]');
        termInput.focus();
    }
}


async function saveEditedDeck() {
    const deckId = document.getElementById('editDeckId').value;
    const name = document.getElementById('editDeckName').value;
    const description = document.getElementById('editDeckDescription').value;
    
    if (!name.trim()) {
        showMessage('Deck name is required', 'error');
        return;
    }
    
    console.log('=== SAVE DECK DEBUG ===');
    console.log('Original cards from server:', originalCards);
    console.log('Current editingCards array:', editingCards);
    
    try {
        // Update deck info
        const deckResponse = await fetch(`${API_BASE}/decks/${deckId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ name, description })
        });
        
        if (!deckResponse.ok) {
            throw new Error('Failed to update deck');
        }
        
        // Get current card data from form (in display order)
        updateEditCardsOrder(); // Make sure order is current
        const cardRows = document.querySelectorAll('#editCardsContainer .card-row');
        const currentCards = [];
        
        cardRows.forEach((row, index) => {
            const cardId = row.dataset.cardId;
            const term = row.querySelector('input[name="term"]').value.trim();
            const definition = row.querySelector('textarea[name="definition"]').value.trim();
            
            if (term && definition) {
                const originalCard = editingCards.find(c => c.id == cardId);
                currentCards.push({
                    id: cardId,
                    front_content: term,
                    back_content: definition,
                    display_order: index,
                    is_new: originalCard?.is_new || false
                });
            }
        });
        
        console.log('Current cards from form:', currentCards);
        
        // Separate new cards from existing cards
        const newCards = currentCards.filter(c => c.is_new);
        const existingCards = currentCards.filter(c => !c.is_new);
        
        console.log('New cards:', newCards);
        console.log('Existing cards:', existingCards);
        
        // Find cards to delete by comparing original cards to current cards
        const currentCardIds = currentCards.map(c => parseInt(c.id)).filter(id => !isNaN(id));
        const originalCardIds = originalCards.map(c => parseInt(c.id));
        const deletedCardIds = originalCardIds.filter(id => !currentCardIds.includes(id));
        
        console.log('Current card IDs (including new):', currentCardIds);
        console.log('Original card IDs:', originalCardIds);
        console.log('Cards to delete:', deletedCardIds);
        
        // Handle operations
        const promises = [];
        
        // 1. Create new cards
        for (const card of newCards) {
            console.log('Creating new card:', card);
            promises.push(
                fetch(`${API_BASE}/cards/deck/${deckId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        front_content: card.front_content,
                        back_content: card.back_content,
                        display_order: card.display_order
                    })
                }).then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to create card: ${response.status}`);
                    }
                    return response.json();
                })
            );
        }
        
        // 2. Update existing cards
        for (const card of existingCards) {
            const originalCard = originalCards.find(c => parseInt(c.id) === parseInt(card.id));
            
            // Check if card actually changed
            const hasChanged = !originalCard || 
                originalCard.front_content !== card.front_content || 
                originalCard.back_content !== card.back_content ||
                (originalCard.display_order || 0) !== card.display_order;
            
            if (hasChanged) {
                console.log('Updating card:', card.id, card);
                promises.push(
                    fetch(`${API_BASE}/cards/${card.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            front_content: card.front_content,
                            back_content: card.back_content,
                            display_order: card.display_order
                        })
                    }).then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to update card ${card.id}: ${response.status}`);
                        }
                        return response.json();
                    })
                );
            }
        }
        
        // 3. Delete removed cards
        for (const cardId of deletedCardIds) {
            console.log('Deleting card:', cardId);
            promises.push(
                fetch(`${API_BASE}/cards/${cardId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                }).then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to delete card ${cardId}: ${response.status}`);
                    }
                    return { deleted: cardId };
                })
            );
        }
        
        // Wait for all operations to complete
        console.log('Executing', promises.length, 'operations...');
        const results = await Promise.all(promises);
        console.log('All operations completed:', results);
        
        // 4. Update card orders if there are existing cards to reorder
        if (existingCards.length > 0) {
            const cardOrders = existingCards.map(card => ({
                card_id: parseInt(card.id),
                order: card.display_order
            }));
            
            console.log('Updating card orders:', cardOrders);
            
            const reorderResponse = await fetch(`${API_BASE}/cards/deck/${deckId}/reorder`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ card_orders: cardOrders })
            });
            
            if (!reorderResponse.ok) {
                console.warn('Failed to update card order, but other operations succeeded');
            }
        }
        
        showMessage('Deck updated successfully!', 'success');
        
        // Refresh data and go back to library
        await loadAllDecks();
        await loadRecentDecks();
        document.getElementById('nav-library').click();
        
    } catch (error) {
        console.error('Error saving deck:', error);
        showMessage('Error saving deck: ' + error.message, 'error');
    }
}


async function deleteDeck() {
    const deckId = document.getElementById('editDeckId').value;
    const deckName = document.getElementById('editDeckName').value;
    
    if (!confirm(`Are you sure you want to delete "${deckName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/decks/${deckId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete deck');
        }
        
        showMessage('Deck deleted successfully', 'success');
        
        // Refresh data and go back to library
        await loadAllDecks();
        await loadRecentDecks();
        document.getElementById('nav-library').click();
        
    } catch (error) {
        showMessage('Error deleting deck: ' + error.message, 'error');
    }
}

// Event listeners for edit functionality
document.getElementById('editDeckForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveEditedDeck();
});

document.getElementById('addCardToEdit').addEventListener('click', addNewEditCard);

document.getElementById('cancelEdit').addEventListener('click', () => {
    document.getElementById('nav-library').click();
});

document.getElementById('cancelEditDeck').addEventListener('click', () => {
    document.getElementById('nav-library').click();
});

document.getElementById('deleteDeck').addEventListener('click', deleteDeck);

// Update the page header info to include edit-deck
const originalUpdatePageHeader = updatePageHeader;
updatePageHeader = function(page) {
    const titleElement = document.getElementById('page-title');
    const subtitleElement = document.getElementById('page-subtitle');
    
    const pageInfo = {
        'home': {
            title: 'Dashboard',
            subtitle: 'Welcome back! Here\'s your learning progress.'
        },
        'library': {
            title: 'Library',
            subtitle: 'Manage your flashcard decks and collections.'
        },
        'flashcards': {
            title: 'Flash Cards',
            subtitle: 'Study your cards with spaced repetition.'
        },
        'new-deck': {
            title: 'Create New Deck',
            subtitle: 'Add a new deck to your collection.'
        },
        'import': {
            title: 'Import Decks',
            subtitle: 'Import decks from files or other sources.'
        },
        'edit-deck': {
            title: 'Edit Deck',
            subtitle: 'Modify your deck and cards.'
        }
    };

    const info = pageInfo[page] || pageInfo['home'];
    titleElement.textContent = info.title;
    subtitleElement.textContent = info.subtitle;
};

// Initialize page
window.addEventListener('load', () => {
    loadUserInfo();
    setupNavigation();
    loadRecentDecks();
    initializeCardRows(); // Initialize card rows for new deck form
    initializeImportFunctionality(); // Initialize import functionality
    
    // Load library data when library nav is clicked
    document.getElementById('nav-library').addEventListener('click', () => {
        loadAllDecks();
    });

    // Update the existing import cards button click handler
    document.querySelector('#importCardsBtn').addEventListener('click', () => {
        document.querySelector('#nav-import').click();
    });
});