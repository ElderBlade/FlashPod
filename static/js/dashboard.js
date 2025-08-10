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
                    <button onclick="studyDeck(${deck.id})" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                        Study
                    </button>
                </div>
            </div>
        </div>
    `).join('');
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
        <div class="drag-handle cursor-move text-gray-400 hover:text-gray-600">
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
                <input type="text" name="definition" value="${definition}" placeholder="Enter definition or answer" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
        </div>
        <button type="button" class="remove-card text-red-500 hover:text-red-700 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
        </button>
    `;

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
    const cardRows = document.querySelectorAll('.card-row');
    const cards = [];

    cardRows.forEach(row => {
    const term = row.querySelector('input[name="term"]').value.trim();
    const definition = row.querySelector('input[name="definition"]').value.trim();

    if (term && definition) {
        cards.push({ term, definition });
        }
    });

    return cards;
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
        
        // Then add all the cards
        let successCount = 0;
        
        // Use Promise.all to handle multiple async card creations
        const cardPromises = cards.map(async (card) => {
            try {
                const cardResponse = await fetch(`${API_BASE}/cards/deck/${deckId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        front_content: card.term,
                        back_content: card.definition
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

// Initialize page
window.addEventListener('load', () => {
    loadUserInfo();
    setupNavigation();
    loadRecentDecks();
    initializeCardRows(); // Initialize card rows for new deck form
    
    // Load library data when library nav is clicked
    document.getElementById('nav-library').addEventListener('click', () => {
        loadAllDecks();
    });
});