'use strict';

// Use dynamic API base that works with any port
const API_BASE = window.location.origin + '/api';
console.log('🌐 API_BASE:', API_BASE);

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
        overlay?.classList.remove('hidden');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Signing in...';
        }
    } else {
        overlay?.classList.add('hidden');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Sign in';
        }
    }
}

// Save user session (simplified - mainly for username display)
function saveUserSession(user) {
    localStorage.setItem('flashpod_user', JSON.stringify(user));
}

// Login form submission
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
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
            credentials: 'include', // Important for cookies
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Login successful! Redirecting...', 'success');
            saveUserSession(data.user);
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
        console.error('Login error:', error);
    } finally {
        setLoading(false);
    }
});

// Demo account button
document.getElementById('useDemoBtn')?.addEventListener('click', () => {
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