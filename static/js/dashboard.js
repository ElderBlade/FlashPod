'use strict';

let currentUser = null;
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api'
    : '/api';

// Get user info from localStorage (saved during login)
function loadUserInfo() {
    const savedUser = localStorage.getItem('flashpod_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById('userGreeting').textContent = `Welcome, ${currentUser.username}!`;
        console.debug('Loaded user from localStorage:', currentUser);
    } else {
        console.log('No user found in localStorage');
        return;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('flashpod_user');
    window.location.href = '/logout';
}

function showMessage(message, type = 'info') {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
    
    messageDiv.className = `${bgColor} text-white px-4 py-2 rounded-md shadow-md mb-2`;
    messageDiv.textContent = message;
    
    messagesContainer.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Form show/hide event listeners
document.getElementById('showDeckForm').addEventListener('click', () => {
    document.getElementById('deckSection').classList.remove('hidden');
    document.getElementById('cardSection').classList.add('hidden');
    document.getElementById('podSection').classList.add('hidden');
});

document.getElementById('showCardForm').addEventListener('click', () => {
    document.getElementById('cardSection').classList.remove('hidden');
    document.getElementById('deckSection').classList.add('hidden');
    document.getElementById('podSection').classList.add('hidden');
    populateDeckSelect();
});

document.getElementById('showPodForm').addEventListener('click', () => {
    document.getElementById('podSection').classList.remove('hidden');
    document.getElementById('deckSection').classList.add('hidden');
    document.getElementById('cardSection').classList.add('hidden');
});

// Cancel buttons
document.getElementById('cancelDeck').addEventListener('click', () => {
    document.getElementById('deckSection').classList.add('hidden');
    document.getElementById('deckForm').reset();
});

document.getElementById('cancelCard').addEventListener('click', () => {
    document.getElementById('cardSection').classList.add('hidden');
    document.getElementById('cardForm').reset();
});

document.getElementById('cancelPod').addEventListener('click', () => {
    document.getElementById('podSection').classList.add('hidden');
    document.getElementById('podForm').reset();
});

document.getElementById('logoutBtn').addEventListener('click', logout);

// Simplified API call function with better error handling
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            credentials: 'include' // Important: include cookies
        });
        
        
        return response;
    } catch (error) {
        console.error('API call failed:', error);
        showMessage('Network error: ' + error.message, 'error');
        return null;
    }
}

// Form submissions
document.getElementById('deckForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('deckName').value;
    const description = document.getElementById('deckDescription').value;
    
    const response = await apiCall(`${API_BASE}/decks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description })
    });
    
    if (response) {
        const data = await response.json();
        if (response.ok) {
            document.getElementById('deckForm').reset();
            document.getElementById('deckSection').classList.add('hidden');
            showMessage('Deck created successfully!', 'success');
            loadDecks();
        } else {
            showMessage(data.error, 'error');
        }
    }
});


document.getElementById('cardForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const deckId = document.getElementById('deckSelect').value;
    if (!deckId) {
        showMessage('Please select a deck first', 'error');
        return;
    }
    
    const frontContent = document.getElementById('frontContent').value;
    const backContent = document.getElementById('backContent').value;
    
    try {
        const response = await fetch(`${API_BASE}/cards/deck/${deckId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                front_content: frontContent,
                back_content: backContent
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('cardForm').reset();
            document.getElementById('cardSection').classList.add('hidden');
            showMessage('Card added successfully!', 'success');
            loadDecks();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
});

document.getElementById('podForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('podName').value;
    const description = document.getElementById('podDescription').value;
    
    try {
        const response = await fetch(`${API_BASE}/pods`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                name,
                description
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('podForm').reset();
            document.getElementById('podSection').classList.add('hidden');
            showMessage('Pod created successfully!', 'success');
            loadPods();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
});

async function populateDeckSelect() {
    try {
        const response = await fetch(`${API_BASE}/decks/my-decks`);
        const data = await response.json();
        
        const select = document.getElementById('deckSelect');
        select.innerHTML = '<option value="">Choose a deck...</option>';
        
        if (response.ok && data.decks.length > 0) {
            data.decks.forEach(deck => {
                const option = document.createElement('option');
                option.value = deck.id;
                option.textContent = `${deck.name} (${deck.card_count} cards)`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        showMessage('Error loading decks: ' + error.message, 'error');
    }
}

// Need to build my-decks route instead of grabbing user id.
async function loadDecks() {
    try {
        const response = await fetch(`${API_BASE}/decks/my-decks`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        if (response.ok) {
            displayDecks(data.decks);
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}


function displayDecks(decks) {
    const container = document.getElementById('decksContainer');
    
    if (decks.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No decks yet. Create your first deck above!</p>';
        return;
    }
    
    container.innerHTML = decks.map(deck => `
        <div class="bg-white rounded-lg shadow-md p-4">
            <h3 class="text-lg font-semibold mb-2">${deck.name}</h3>
            <p class="text-gray-600 mb-3">${deck.description || 'No description'}</p>
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">${deck.card_count} cards</span>
                <div class="space-x-2">
                    <button onclick="viewDeck(${deck.id})" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                        View
                    </button>
                    <button onclick="studyDeck(${deck.id})" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                        Study
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}


async function loadPods() {
    try {
        const response = await fetch(`${API_BASE}/pods/my-pods`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        if (response.ok) {
            displayPods(data.pods);
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

async function displayPods(pods) {
    const container = document.getElementById('podsContainer');
    
    if (pods.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No pods yet. Create your first pod above!</p>';
        return;
    }
    
    container.innerHTML = pods.map(pod => `
        <div class="bg-white rounded-lg shadow-md p-4">
            <h3 class="text-lg font-semibold mb-2">${pod.name}</h3>
            <p class="text-gray-600 mb-3">${pod.description || 'No description'}</p>
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">${pod.deck_count} decks • ${pod.total_card_count} cards</span>
                <div class="space-x-2">
                    <button onclick="viewPod(${pod.id})" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                        View
                    </button>
                    <button onclick="studyPod(${pod.id})" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                        Study
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function viewDeck(deckId) {
    showMessage(`View deck ${deckId} - Coming soon!`, 'info');
}

function studyDeck(deckId) {
    showMessage(`Study deck ${deckId} - Coming soon!`, 'info');
}

function viewPod(podId) {
    showMessage(`View pod ${podId} - Coming soon!`, 'info');
}

function studyPod(podId) {
    showMessage(`Study pod ${podId} - Coming soon!`, 'info');
}

// Initialize page
window.addEventListener('load', () => {
    console.log('Dashboard loading...');
    loadUserInfo();
    loadDecks();
    loadPods();
    
});