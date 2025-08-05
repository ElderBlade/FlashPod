'use strict';

const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api'
    : '/api';

// Show message function
function showMessage(message, type = 'info') {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
    
    messageDiv.className = `${bgColor} text-white px-4 py-2 rounded-md shadow-md mb-2 max-w-sm`;
    messageDiv.textContent = message;
    
    messagesContainer.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Show/hide loading
function setLoading(loading) {
    const overlay = document.getElementById('loadingOverlay');
    const btn = document.getElementById('loginBtn');
    
    if (loading) {
        overlay.classList.remove('hidden');
        btn.disabled = true;
        btn.textContent = 'Signing in...';
    } else {
        overlay.classList.add('hidden');
        btn.disabled = false;
        btn.textContent = 'Sign in';
    }
}

// Save user session (simplified - mainly for username display)
function saveUserSession(user) {
    localStorage.setItem('flashpod_user', JSON.stringify(user));
}

// Login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    setLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Login successful! Redirecting...', 'success');
            saveUserSession(data.user); // Save for username display only
            
            // Server will handle auth via cookies, just redirect
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
});

// Demo account button
document.getElementById('useDemoBtn').addEventListener('click', () => {
    document.getElementById('username').value = 'testuser';
    document.getElementById('password').value = 'password123';
});

// Handle Enter key in form fields
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest('#loginForm')) {
        e.preventDefault();
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
});