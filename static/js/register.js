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
    const btn = document.getElementById('registerBtn');
    
    if (loading) {
        overlay.classList.remove('hidden');
        btn.disabled = true;
        btn.textContent = 'Creating account...';
    } else {
        overlay.classList.add('hidden');
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
}

// Validate form
function validateForm() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Check if all fields are filled
    if (!username || !email || !password || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
        return false;
    }

    // Validate username (basic check)
    if (username.length < 3 || username.length > 50) {
        showMessage('Username must be 3-50 characters long', 'error');
        return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showMessage('Username can only contain letters, numbers, and underscores', 'error');
        return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Please enter a valid email address', 'error');
        return false;
    }

    // Validate password
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long', 'error');
        return false;
    }

    // Check password confirmation
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return false;
    }

    return true;
}

// Registration form submission
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    setLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Account created successfully! Redirecting to login...', 'success');
            
            // Redirect to login after short delay
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else {
            showMessage(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
});

// Real-time password confirmation validation
document.getElementById('confirmPassword').addEventListener('input', () => {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmInput = document.getElementById('confirmPassword');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmInput.classList.add('border-red-500');
        confirmInput.classList.remove('border-gray-300');
    } else {
        confirmInput.classList.remove('border-red-500');
        confirmInput.classList.add('border-gray-300');
    }
});

// Check if already logged in - remove the complex localStorage logic
window.addEventListener('load', () => {
    // Server will handle redirects if already authenticated
});